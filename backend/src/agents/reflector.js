import { callHuggingFace } from '../config/huggingface.js';

/**
 * Reflection Agent
 * Analyzes user progress and adapts plans based on what worked/didn't work
 * This is the "adaptive" part - makes your AI truly agentic!
 */
export class ReflectionAgent {
  constructor() {
    this.name = "Reflection Agent";
  }

  /**
   * Reflect on current plan and user progress
   * @param {Object} currentPlan - Current schedule/plan
   * @param {Array} userProgress - Array of completed/missed tasks
   * @param {Object} userMemory - Historical patterns and preferences
   * @returns {Promise<Object>} Adjusted plan with insights
   */
  async reflect(currentPlan, userProgress, userMemory = {}) {
    try {
      const prompt = this.buildPrompt(currentPlan, userProgress, userMemory);
      const response = await callHuggingFace(prompt, {
        maxTokens: 1200,
        maxRetries: 3
      });

      return this.parseResponse(response, currentPlan, userProgress, userMemory);
    } catch (error) {
      console.error('Reflection failed:', error);
      return this.createFallbackReflection(currentPlan, userProgress, userMemory);
    }
  }

  /**
   * Build the prompt for reflection
   * @private
   */
  buildPrompt(currentPlan, userProgress, userMemory) {
    const completedTasks = userProgress.filter(p => p.status === 'completed');
    const missedTasks = userProgress.filter(p => p.status === 'missed' || p.status === 'incomplete');
    const onTimeTasks = completedTasks.filter(p => p.completedOnTime);
    
    const completionRate = userProgress.length > 0 
      ? ((completedTasks.length / userProgress.length) * 100).toFixed(0) 
      : 0;

    const progressSummary = `
Completed: ${completedTasks.length}/${userProgress.length} tasks (${completionRate}%)
On-time completion: ${onTimeTasks.length}/${completedTasks.length}
Missed/Incomplete: ${missedTasks.length}
`;

    const missedTasksList = missedTasks.length > 0
      ? missedTasks.map(t => `- ${t.taskDescription} (scheduled: ${t.scheduledTime}, priority: ${t.priorityScore}/10)`).join('\n')
      : 'None';

    const completedTasksList = completedTasks.slice(0, 5).map(t => 
      `- ${t.taskDescription} (${t.completedOnTime ? '✓ on-time' : '⚠ late'})`
    ).join('\n');

    const patterns = userMemory.patterns || [];
    const patternsSummary = patterns.length > 0
      ? patterns.map(p => `- ${p.pattern}: ${p.description}`).join('\n')
      : 'No patterns identified yet';

    return `Analyze this user's progress and suggest plan adjustments.

CURRENT PROGRESS:
${progressSummary}

COMPLETED TASKS:
${completedTasksList}

MISSED/INCOMPLETE TASKS:
${missedTasksList}

USER PATTERNS (from memory):
${patternsSummary}

REMAINING SCHEDULE:
${this.summarizeRemainingSchedule(currentPlan)}

ANALYZE:
1. Why were tasks missed? (time estimates off? priorities wrong? scheduling issues?)
2. What patterns emerge? (procrastination? overestimation? specific times work better?)
3. How should the plan adjust? (more buffer time? different times? re-prioritize?)
4. What new patterns to remember?

Respond ONLY with valid JSON:

{
  "analysis": {
    "whyTasksMissed": "brief explanation",
    "identifiedPatterns": ["pattern 1", "pattern 2"],
    "userTendency": "procrastinator/overachiever/realistic"
  },
  "adjustments": {
    "scheduleChanges": [
      {
        "change": "increase buffer time by 30%",
        "reason": "tasks taking longer than estimated"
      }
    ],
    "priorityChanges": [
      {
        "taskId": "task_id",
        "newPriority": 9,
        "reason": "blocking other tasks"
      }
    ],
    "recommendedBufferPercent": 25
  },
  "memoryUpdates": [
    {
      "pattern": "evening_productivity",
      "description": "User completes 80% more tasks in evening",
      "confidence": "high"
    }
  ],
  "insights": [
    "insight 1",
    "insight 2"
  ]
}`;
  }

  /**
   * Summarize remaining schedule
   * @private
   */
  summarizeRemainingSchedule(currentPlan) {
    if (!currentPlan?.schedule) return 'No schedule available';
    
    const today = new Date().toISOString().split('T')[0];
    const remaining = currentPlan.schedule.filter(day => day.date >= today);
    
    return remaining.slice(0, 3).map(day => 
      `Day ${day.day} (${day.date}): ${day.tasks.length} tasks, ${day.totalHours}h`
    ).join('\n');
  }

  /**
   * Parse the AI response
   * @private
   */
  parseResponse(response, currentPlan, userProgress, userMemory) {
    try {
      // Clean the response
      let cleanedResponse = response.trim();
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      cleanedResponse = cleanedResponse.trim();

      // Parse JSON
      const reflection = JSON.parse(cleanedResponse);

      // Apply adjustments to current plan
      const adjustedPlan = this.applyAdjustments(currentPlan, reflection.adjustments);

      // Update user memory
      const updatedMemory = this.updateMemory(userMemory, reflection.memoryUpdates, userProgress);

      return {
        adjustedPlan,
        analysis: reflection.analysis || {},
        insights: reflection.insights || [],
        memoryUpdates: reflection.memoryUpdates || [],
        updatedMemory,
        adjustmentsMade: reflection.adjustments || {},
        reflectedAt: new Date().toISOString(),
        progressAnalyzed: {
          totalTasks: userProgress.length,
          completed: userProgress.filter(p => p.status === 'completed').length,
          missed: userProgress.filter(p => p.status === 'missed' || p.status === 'incomplete').length
        }
      };
    } catch (error) {
      console.error('Failed to parse reflection:', error);
      console.log('Raw response:', response);
      
      return this.createFallbackReflection(currentPlan, userProgress, userMemory);
    }
  }

  /**
   * Apply adjustments to the plan
   * @private
   */
  applyAdjustments(currentPlan, adjustments) {
    if (!adjustments || !currentPlan?.schedule) return currentPlan;

    const adjustedSchedule = currentPlan.schedule.map(day => {
      const adjustedTasks = day.tasks.map(task => {
        // Apply priority changes
        const priorityChange = adjustments.priorityChanges?.find(
          pc => pc.taskId === task.taskId
        );

        if (priorityChange) {
          return {
            ...task,
            priorityScore: priorityChange.newPriority,
            adjustmentReason: priorityChange.reason
          };
        }

        // Apply buffer time adjustments
        if (adjustments.recommendedBufferPercent) {
          const newBuffer = task.duration * (adjustments.recommendedBufferPercent / 100);
          return {
            ...task,
            bufferAfter: parseFloat(newBuffer.toFixed(1)),
            bufferAdjusted: true
          };
        }

        return task;
      });

      // Recalculate total hours
      const totalHours = adjustedTasks.reduce(
        (sum, task) => sum + task.duration + (task.bufferAfter || 0), 
        0
      );

      return {
        ...day,
        tasks: adjustedTasks,
        totalHours: parseFloat(totalHours.toFixed(1)),
        adjusted: true
      };
    });

    return {
      ...currentPlan,
      schedule: adjustedSchedule,
      lastAdjusted: new Date().toISOString()
    };
  }

  /**
   * Update user memory with new patterns
   * @private
   */
  updateMemory(currentMemory, memoryUpdates, userProgress) {
    const patterns = currentMemory.patterns || [];
    const newPatterns = memoryUpdates || [];

    // Add or update patterns
    newPatterns.forEach(update => {
      const existingIndex = patterns.findIndex(p => p.pattern === update.pattern);
      
      if (existingIndex >= 0) {
        // Update existing pattern
        patterns[existingIndex] = {
          ...patterns[existingIndex],
          ...update,
          lastUpdated: new Date().toISOString(),
          occurrences: (patterns[existingIndex].occurrences || 1) + 1
        };
      } else {
        // Add new pattern
        patterns.push({
          ...update,
          firstIdentified: new Date().toISOString(),
          occurrences: 1
        });
      }
    });

    // Calculate overall stats
    const completedCount = userProgress.filter(p => p.status === 'completed').length;
    const totalCount = userProgress.length;
    const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return {
      ...currentMemory,
      patterns,
      stats: {
        totalTasksAttempted: totalCount,
        totalTasksCompleted: completedCount,
        overallCompletionRate: parseFloat(completionRate.toFixed(1)),
        lastUpdated: new Date().toISOString()
      }
    };
  }

  /**
   * Create fallback reflection using rule-based analysis
   * @private
   */
  createFallbackReflection(currentPlan, userProgress, userMemory) {
    const completedTasks = userProgress.filter(p => p.status === 'completed');
    const missedTasks = userProgress.filter(p => p.status === 'missed' || p.status === 'incomplete');
    const completionRate = userProgress.length > 0 
      ? (completedTasks.length / userProgress.length) * 100 
      : 0;

    // Simple pattern detection
    const insights = [];
    if (completionRate < 50) {
      insights.push('Completion rate is low - consider reducing daily workload');
    }
    if (missedTasks.length > completedTasks.length) {
      insights.push('More tasks missed than completed - time estimates may be too optimistic');
    }

    // Detect time patterns
    const eveningTasks = completedTasks.filter(t => 
      t.completedTime && parseInt(t.completedTime.split(':')[0]) >= 18
    );
    if (eveningTasks.length > completedTasks.length * 0.6) {
      insights.push('User tends to complete tasks in the evening');
    }

    // Recommend buffer adjustment
    const recommendedBuffer = completionRate < 60 ? 30 : completionRate < 80 ? 20 : 15;

    return {
      adjustedPlan: currentPlan,
      analysis: {
        whyTasksMissed: missedTasks.length > 0 
          ? 'Likely due to time underestimation or scheduling conflicts' 
          : 'No significant issues detected',
        identifiedPatterns: ['Pattern detection limited in fallback mode'],
        userTendency: completionRate > 80 ? 'realistic' : completionRate > 50 ? 'slightly optimistic' : 'overly optimistic'
      },
      insights,
      memoryUpdates: [],
      updatedMemory: userMemory,
      adjustmentsMade: {
        recommendedBufferPercent: recommendedBuffer,
        scheduleChanges: insights
      },
      reflectedAt: new Date().toISOString(),
      progressAnalyzed: {
        totalTasks: userProgress.length,
        completed: completedTasks.length,
        missed: missedTasks.length
      },
      note: 'Fallback reflection used'
    };
  }

  /**
   * Format reflection results for display
   * @param {Object} reflection - Reflection result
   * @returns {string} Formatted string
   */
  formatReflection(reflection) {
    const { analysis, insights, progressAnalyzed, adjustmentsMade } = reflection;

    let output = `
🔍 Reflection & Adaptation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Progress Analyzed:
   Completed: ${progressAnalyzed.completed}/${progressAnalyzed.totalTasks} tasks
   Missed: ${progressAnalyzed.missed} tasks

📈 Analysis:
   Why tasks were missed: ${analysis.whyTasksMissed || 'N/A'}
   User tendency: ${analysis.userTendency || 'Unknown'}
`;

    if (analysis.identifiedPatterns?.length > 0) {
      output += `\n   Patterns identified:\n`;
      analysis.identifiedPatterns.forEach(pattern => {
        output += `   • ${pattern}\n`;
      });
    }

    if (insights?.length > 0) {
      output += `\n💡 Insights:\n`;
      insights.forEach(insight => {
        output += `   • ${insight}\n`;
      });
    }

    if (adjustmentsMade?.scheduleChanges?.length > 0) {
      output += `\n⚙️  Schedule Adjustments Made:\n`;
      adjustmentsMade.scheduleChanges.forEach(change => {
        output += `   • ${change.change || change}\n`;
        if (change.reason) output += `     Reason: ${change.reason}\n`;
      });
    }

    if (adjustmentsMade?.recommendedBufferPercent) {
      output += `\n   Buffer time adjusted to: ${adjustmentsMade.recommendedBufferPercent}%\n`;
    }

    return output.trim();
  }

  /**
   * Get actionable recommendations
   * @param {Object} reflection - Reflection result
   * @returns {Array} Array of recommendations
   */
  getRecommendations(reflection) {
    const recommendations = [];
    
    if (reflection.insights) {
      recommendations.push(...reflection.insights);
    }

    if (reflection.adjustmentsMade?.scheduleChanges) {
      recommendations.push(
        ...reflection.adjustmentsMade.scheduleChanges.map(c => c.change || c)
      );
    }

    return recommendations;
  }

  /**
   * Check if re-planning is needed
   * @param {Object} reflection - Reflection result
   * @returns {boolean} True if significant changes warrant re-planning
   */
  needsReplanning(reflection) {
    const { progressAnalyzed, adjustmentsMade } = reflection;
    
    // Re-plan if completion rate < 50%
    const completionRate = progressAnalyzed.totalTasks > 0
      ? (progressAnalyzed.completed / progressAnalyzed.totalTasks) * 100
      : 100;
    
    if (completionRate < 50) return true;

    // Re-plan if significant adjustments made
    if (adjustmentsMade?.scheduleChanges?.length > 3) return true;
    if (adjustmentsMade?.priorityChanges?.length > 2) return true;

    return false;
  }
}

export default ReflectionAgent;