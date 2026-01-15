import { callHuggingFace } from '../config/huggingface.js';

/**
 * Scheduler Agent
 * Creates day-by-day schedules for prioritized tasks
 */
export class SchedulerAgent {
  constructor() {
    this.name = "Scheduler";
  }

  /**
   * Create a day-by-day schedule for tasks
   * @param {Array} tasks - Prioritized tasks with scores
   * @param {Object} preferences - User scheduling preferences
   * @returns {Promise<Object>} Schedule object with daily plan
   */
  async createSchedule(tasks, preferences = {}) {
    try {
      const prompt = this.buildPrompt(tasks, preferences);
      const response = await callHuggingFace(prompt, {
        maxTokens: 1200,
        maxRetries: 3
      });

      return this.parseResponse(response, tasks, preferences);
    } catch (error) {
      console.error('Schedule creation failed:', error);
      // Fallback to rule-based scheduling
      return this.createFallbackSchedule(tasks, preferences);
    }
  }

  /**
   * Build the prompt for schedule creation
   * @private
   */
  buildPrompt(tasks, preferences) {
    const {
      availableHoursPerDay = 4,
      preferredStudyTimes = ['morning', 'afternoon'],
      bufferTimePercent = 20,
      startDate = new Date().toISOString().split('T')[0]
    } = preferences;

    const taskList = tasks
      .sort((a, b) => (b.priorityScore || 5) - (a.priorityScore || 5))
      .map((task, i) => 
        `${i + 1}. [Score: ${task.priorityScore || 5}/10] ${task.description} (${task.estimatedHours}h)`
      ).join('\n');

    const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const daysNeeded = Math.ceil(totalHours / availableHoursPerDay);

    return `Create a day-by-day schedule for these tasks.

TASKS (sorted by priority):
${taskList}

CONSTRAINTS:
- Available hours per day: ${availableHoursPerDay}h
- Preferred times: ${preferredStudyTimes.join(', ')}
- Buffer time: ${bufferTimePercent}% (for breaks/unexpected delays)
- Start date: ${startDate}
- Total hours needed: ${totalHours}h
- Estimated days: ~${daysNeeded} days

SCHEDULING RULES:
1. Higher priority tasks should be scheduled earlier
2. Respect daily hour limits
3. Include buffer time between tasks
4. Distribute work evenly across days
5. Consider task dependencies (earlier order = do first)
6. Keep related tasks on same day when possible

Respond ONLY with valid JSON:

{
  "schedule": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "tasks": [
        {
          "taskDescription": "task name",
          "startTime": "HH:MM",
          "duration": 2.0,
          "bufferAfter": 0.5
        }
      ],
      "totalHours": 2.5,
      "timeOfDay": "morning"
    }
  ],
  "summary": {
    "totalDays": 5,
    "totalHours": 20,
    "averageHoursPerDay": 4
  }
}`;
  }

  /**
   * Parse the AI response into schedule object
   * @private
   */
  parseResponse(response, tasks, preferences) {
    try {
      // Clean the response
      let cleanedResponse = response.trim();
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      cleanedResponse = cleanedResponse.trim();

      // Parse JSON
      const scheduleData = JSON.parse(cleanedResponse);

      // Validate and enhance
      if (!scheduleData.schedule || !Array.isArray(scheduleData.schedule)) {
        throw new Error('Invalid schedule format');
      }

      return {
        schedule: scheduleData.schedule.map((day, index) => ({
          day: day.day || index + 1,
          date: day.date || this.calculateDate(preferences.startDate, index),
          tasks: day.tasks || [],
          totalHours: day.totalHours || 0,
          timeOfDay: day.timeOfDay || 'morning',
          createdAt: new Date().toISOString()
        })),
        summary: {
          totalDays: scheduleData.summary?.totalDays || scheduleData.schedule.length,
          totalHours: scheduleData.summary?.totalHours || this.calculateTotalHours(tasks),
          averageHoursPerDay: scheduleData.summary?.averageHoursPerDay || 
            (this.calculateTotalHours(tasks) / scheduleData.schedule.length).toFixed(1),
          tasksScheduled: tasks.length,
          generatedAt: new Date().toISOString()
        },
        preferences
      };
    } catch (error) {
      console.error('Failed to parse schedule:', error);
      console.log('Raw response:', response);
      
      // Return fallback schedule
      return this.createFallbackSchedule(tasks, preferences);
    }
  }

  /**
   * Create rule-based fallback schedule
   * @private
   */
  createFallbackSchedule(tasks, preferences) {
    const {
      availableHoursPerDay = 4,
      bufferTimePercent = 20,
      startDate = new Date().toISOString().split('T')[0],
      preferredStudyTimes = ['morning']
    } = preferences;

    // Sort by priority score
    const sortedTasks = [...tasks].sort((a, b) => 
      (b.priorityScore || 5) - (a.priorityScore || 5)
    );

    const schedule = [];
    let currentDay = 0;
    let currentDayHours = 0;
    let currentDayTasks = [];

    sortedTasks.forEach((task) => {
      const taskDuration = task.estimatedHours;
      const bufferTime = taskDuration * (bufferTimePercent / 100);
      const totalTime = taskDuration + bufferTime;

      // If task doesn't fit in current day, start new day
      if (currentDayHours + totalTime > availableHoursPerDay && currentDayTasks.length > 0) {
        schedule.push({
          day: currentDay + 1,
          date: this.calculateDate(startDate, currentDay),
          tasks: currentDayTasks,
          totalHours: parseFloat(currentDayHours.toFixed(1)),
          timeOfDay: preferredStudyTimes[0] || 'morning'
        });
        currentDay++;
        currentDayHours = 0;
        currentDayTasks = [];
      }

      // Add task to current day
      const startTime = this.calculateStartTime(currentDayHours, preferredStudyTimes[0]);
      currentDayTasks.push({
        taskDescription: task.description,
        taskId: task.id,
        priorityScore: task.priorityScore,
        startTime,
        duration: taskDuration,
        bufferAfter: parseFloat(bufferTime.toFixed(1))
      });
      currentDayHours += totalTime;
    });

    // Add final day if has tasks
    if (currentDayTasks.length > 0) {
      schedule.push({
        day: currentDay + 1,
        date: this.calculateDate(startDate, currentDay),
        tasks: currentDayTasks,
        totalHours: parseFloat(currentDayHours.toFixed(1)),
        timeOfDay: preferredStudyTimes[0] || 'morning'
      });
    }

    const totalHours = this.calculateTotalHours(tasks);

    return {
      schedule,
      summary: {
        totalDays: schedule.length,
        totalHours,
        averageHoursPerDay: (totalHours / schedule.length).toFixed(1),
        tasksScheduled: tasks.length,
        generatedAt: new Date().toISOString(),
        note: 'Fallback schedule generated'
      },
      preferences
    };
  }

  /**
   * Calculate date from start date and day offset
   * @private
   */
  calculateDate(startDateStr, dayOffset) {
    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    return targetDate.toISOString().split('T')[0];
  }

  /**
   * Calculate start time based on hours into day
   * @private
   */
  calculateStartTime(hoursIntoDay, timeOfDay = 'morning') {
    const baseHour = timeOfDay === 'morning' ? 9 : 
                     timeOfDay === 'afternoon' ? 14 : 
                     timeOfDay === 'evening' ? 18 : 9;
    
    const hour = baseHour + Math.floor(hoursIntoDay);
    const minutes = Math.round((hoursIntoDay % 1) * 60);
    
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate total hours from tasks
   * @private
   */
  calculateTotalHours(tasks) {
    return parseFloat(tasks.reduce((sum, t) => sum + t.estimatedHours, 0).toFixed(1));
  }

  /**
   * Format schedule for display
   * @param {Object} scheduleData - Schedule object
   * @returns {string} Formatted string
   */
  formatSchedule(scheduleData) {
    const { schedule, summary } = scheduleData;

    let output = `
📅 Your Personalized Schedule
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary:
   Total Days: ${summary.totalDays}
   Total Hours: ${summary.totalHours}h
   Avg per Day: ${summary.averageHoursPerDay}h
   Tasks: ${summary.tasksScheduled}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    schedule.forEach((day) => {
      output += `
📆 Day ${day.day} - ${this.formatDate(day.date)} (${day.timeOfDay})
   Total: ${day.totalHours}h

`;
      day.tasks.forEach((task, index) => {
        output += `   ${index + 1}. ⏰ ${task.startTime} | ${task.duration}h
      ${task.taskDescription}`;
        if (task.priorityScore) {
          output += ` [Priority: ${task.priorityScore}/10]`;
        }
        if (task.bufferAfter > 0) {
          output += `\n      💤 Buffer: ${task.bufferAfter}h`;
        }
        output += '\n\n';
      });
    });

    return output.trim();
  }

  /**
   * Format date in readable format
   * @private
   */
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  }

  /**
   * Get today's tasks from schedule
   * @param {Object} scheduleData - Schedule object
   * @returns {Object|null} Today's schedule or null
   */
  getTodaysTasks(scheduleData) {
    const today = new Date().toISOString().split('T')[0];
    return scheduleData.schedule.find(day => day.date === today) || null;
  }

  /**
   * Get next N days of schedule
   * @param {Object} scheduleData - Schedule object
   * @param {number} days - Number of days to return
   * @returns {Array} Array of day schedules
   */
  getUpcoming(scheduleData, days = 3) {
    const today = new Date().toISOString().split('T')[0];
    return scheduleData.schedule
      .filter(day => day.date >= today)
      .slice(0, days);
  }

  /**
   * Check if schedule is feasible
   * @param {Object} scheduleData - Schedule object
   * @returns {Object} Feasibility analysis
   */
  analyzeFeasibility(scheduleData) {
    const { schedule, summary, preferences } = scheduleData;
    const maxHoursPerDay = preferences?.availableHoursPerDay || 4;

    const overloadedDays = schedule.filter(day => day.totalHours > maxHoursPerDay);
    const avgLoad = parseFloat(summary.averageHoursPerDay);
    
    return {
      isFeasible: overloadedDays.length === 0,
      overloadedDays: overloadedDays.length,
      loadPercentage: ((avgLoad / maxHoursPerDay) * 100).toFixed(0) + '%',
      recommendation: overloadedDays.length > 0 
        ? 'Consider extending deadline or reducing scope'
        : avgLoad > maxHoursPerDay * 0.8
        ? 'Schedule is tight but achievable'
        : 'Schedule has comfortable margins'
    };
  }
}

export default SchedulerAgent;