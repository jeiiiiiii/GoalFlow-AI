import { callHuggingFace } from '../config/huggingface.js';

/**
 * Priority Scorer Agent
 * Scores tasks 1-10 based on urgency, importance, dependencies, and user history
 */
export class PriorityScorerAgent {
  constructor() {
    this.name = "Priority Scorer";
  }

  /**
   * Score a list of tasks with context
   * @param {Array} tasks - Array of task objects
   * @param {Object} context - User context (deadline, past behavior, etc.)
   * @returns {Promise<Array>} Tasks with priority scores
   */
  async scoreTasks(tasks, context = {}) {
    try {
      const prompt = this.buildPrompt(tasks, context);
      const response = await callHuggingFace(prompt, {
        maxTokens: 1000,
        maxRetries: 3
      });

      return this.parseResponse(response, tasks);
    } catch (error) {
      console.error('Priority scoring failed:', error);
      // Fallback to rule-based scoring
      return this.applyFallbackScoring(tasks, context);
    }
  }

  /**
   * Build the prompt for priority scoring
   * @private
   */
  buildPrompt(tasks, context) {
    const {
      deadline = 'not specified',
      userTendency = 'balanced',
      completedTasksCount = 0,
      overdueHistory = 0
    } = context;

    const taskList = tasks.map((task, i) => 
      `${i + 1}. ${task.description} (${task.estimatedHours}h, priority: ${task.priority})`
    ).join('\n');

    return `Score these tasks from 1-10 based on multiple factors.

TASKS:
${taskList}

CONTEXT:
- Deadline: ${deadline}
- User tendency: ${userTendency} (procrastinator/balanced/proactive)
- Completed tasks: ${completedTasksCount}
- Past overdue tasks: ${overdueHistory}

SCORING FACTORS:
1. Urgency (how close is deadline?)
2. Importance (impact on goal)
3. Dependencies (does this unlock other tasks?)
4. User's historical performance

Score each task 1-10 where:
- 10 = highest priority (urgent, important, blocking others)
- 5-7 = medium priority
- 1-4 = lower priority (can wait)
- Set the score based on the overall context, if the user need to do certain tasks sooner. Set it at a higher score.

Consider:
- Tasks with "high" priority should score 7-10
- Earlier tasks in sequence often have higher priority
- If user is a procrastinator, boost urgent task scores
- Foundation tasks that unlock others score higher

Respond ONLY with valid JSON array:

[
  {
    "taskIndex": 0,
    "score": 8,
    "reasoning": "brief explanation"
  }
]`;
  }

  /**
   * Parse the AI response into scored tasks
   * @private
   */
  parseResponse(response, tasks) {
    try {
      // Clean the response
      let cleanedResponse = response.trim();
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      cleanedResponse = cleanedResponse.trim();

      // Parse JSON
      const scores = JSON.parse(cleanedResponse);

      if (!Array.isArray(scores)) {
        throw new Error('Response is not an array');
      }

      console.log(`✅ Successfully parsed ${scores.length} priority scores from AI`);

      // Apply scores to tasks
      return tasks.map((task, index) => {
        const scoreData = scores.find(s => s.taskIndex === index);
        
        if (!scoreData) {
          console.warn(`⚠️  No score found for task ${index}, using fallback`);
        }
        
        return {
          ...task,
          priorityScore: scoreData ? this.validateScore(scoreData.score) : this.calculateFallbackScore(task, index),
          scoreReasoning: scoreData?.reasoning || 'Fallback scoring applied',
          scoredAt: new Date().toISOString()
        };
      });
    } catch (error) {
      console.error('Failed to parse priority scores:', error);
      console.log('Raw response:', response);
      
      // Use fallback scoring instead of default 5
      console.log('Using rule-based fallback scoring...');
      return this.applyFallbackScoring(tasks, {});
    }
  }

  /**
   * Validate score is between 1-10
   * @private
   */
  validateScore(score) {
    const num = parseInt(score);
    if (isNaN(num)) return 5;
    if (num < 1) return 1;
    if (num > 10) return 10;
    return num;
  }

  /**
   * Calculate fallback score for a single task
   * @private
   */
  calculateFallbackScore(task, index) {
    let score = 5; // base score

    // Priority level adjustment
    if (task.priority === 'high') score += 2;
    if (task.priority === 'low') score -= 1;

    // Order adjustment (earlier tasks score higher)
    if (index < 2) score += 1;

    // Validate final score
    return Math.max(1, Math.min(10, Math.round(score)));
  }

  /**
   * Apply rule-based scoring as fallback
   * @private
   */
  applyFallbackScoring(tasks, context) {
    const { deadline, userTendency = 'balanced' } = context;
    
    return tasks.map((task, index) => {
      let score = 5; // base score

      // Priority level adjustment
      if (task.priority === 'high') score += 3;
      if (task.priority === 'low') score -= 2;

      // Order adjustment (earlier tasks score higher)
      score += Math.max(0, 3 - index * 0.5);

      // Deadline urgency
      if (deadline && deadline !== 'not specified') {
        const hasUrgentDeadline = /(\d+\s*(day|week)|tomorrow|urgent)/i.test(deadline);
        if (hasUrgentDeadline) score += 2;
      }

      // User tendency adjustment
      if (userTendency === 'procrastinator') {
        // Boost early tasks for procrastinators
        if (index < 2) score += 1;
      }

      // Validate final score
      score = Math.max(1, Math.min(10, Math.round(score)));

      return {
        ...task,
        priorityScore: score,
        scoreReasoning: 'Rule-based scoring (fallback)',
        scoredAt: new Date().toISOString()
      };
    });
  }

  /**
   * Sort tasks by priority score (highest first)
   * @param {Array} tasks - Tasks with priority scores
   * @returns {Array} Sorted tasks
   */
  sortByPriority(tasks) {
    return [...tasks].sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Get high priority tasks (score >= 7)
   * @param {Array} tasks - Tasks with priority scores
   * @returns {Array} High priority tasks
   */
  getHighPriorityTasks(tasks) {
    return tasks.filter(task => task.priorityScore >= 7);
  }

  /**
   * Calculate average priority score
   * @param {Array} tasks - Tasks with priority scores
   * @returns {number} Average score
   */
  getAverageScore(tasks) {
    if (tasks.length === 0) return 0;
    const sum = tasks.reduce((acc, task) => acc + task.priorityScore, 0);
    return (sum / tasks.length).toFixed(1);
  }

  /**
   * Format scored tasks for display
   * @param {Array} tasks - Tasks with priority scores
   * @returns {string} Formatted string
   */
  formatScoredTasks(tasks) {
    const sorted = this.sortByPriority(tasks);
    const avgScore = this.getAverageScore(tasks);

    let output = `
⭐ Priority Scores
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Average Score: ${avgScore}/10
High Priority Tasks: ${this.getHighPriorityTasks(tasks).length}

Ranked Tasks:
`;

    sorted.forEach((task, index) => {
      const scoreBar = this.createScoreBar(task.priorityScore);
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      
      output += `
${medal} [${task.priorityScore}/10] ${scoreBar}
   ${task.description}
   💭 ${task.scoreReasoning}
   ⏱️  ${task.estimatedHours}h | 📍 Order: ${task.order}
`;
    });

    return output.trim();
  }

  /**
   * Create visual score bar
   * @private
   */
  createScoreBar(score) {
    const filled = Math.round(score);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Get next task recommendation
   * @param {Array} tasks - Tasks with priority scores
   * @returns {Object|null} Highest priority pending task
   */
  getNextTask(tasks) {
    const pending = tasks.filter(task => task.status === 'pending');
    if (pending.length === 0) return null;
    
    const sorted = this.sortByPriority(pending);
    return sorted[0];
  }

  /**
   * Update user context based on completed task
   * @param {Object} context - Current user context
   * @param {Object} completedTask - The completed task
   * @param {boolean} wasOnTime - Whether task was completed on time
   * @returns {Object} Updated context
   */
  updateUserContext(context, completedTask, wasOnTime) {
    return {
      ...context,
      completedTasksCount: (context.completedTasksCount || 0) + 1,
      overdueHistory: wasOnTime ? context.overdueHistory || 0 : (context.overdueHistory || 0) + 1,
      lastCompletedTask: completedTask.description,
      lastCompletedAt: new Date().toISOString()
    };
  }
}

export default PriorityScorerAgent;