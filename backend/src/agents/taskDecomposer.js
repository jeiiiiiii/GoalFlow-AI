import { callHuggingFace } from '../config/huggingface.js';

/**
 * Task Decomposition Agent
 * Breaks down analyzed goals into concrete, actionable tasks
 */
export class TaskDecomposerAgent {
  constructor() {
    this.name = "Task Decomposer";
  }

  /**
   * Decompose a goal into specific tasks
   * @param {Object} analyzedGoal - The analyzed goal object from GoalAnalyzerAgent
   * @returns {Promise<Array>} Array of task objects
   */
  async decompose(analyzedGoal) {
    try {
      const prompt = this.buildPrompt(analyzedGoal);
      const response = await callHuggingFace(prompt, {
        maxTokens: 1000,
        maxRetries: 3
      });

      return this.parseResponse(response, analyzedGoal);
    } catch (error) {
      console.error('Task decomposition failed:', error);
      throw new Error(`Failed to decompose tasks: ${error.message}`);
    }
  }

  /**
   * Build the prompt for task decomposition
   * @private
   */
  buildPrompt(analyzedGoal) {
    const { originalGoal, parsedDeadline, complexity, subject } = analyzedGoal;

    return `Break down this goal into specific, actionable tasks with time estimates.

Goal: "${originalGoal}"
Subject: ${subject}
Complexity: ${complexity}
Deadline: ${parsedDeadline}

Provide a JSON array of tasks. Each task should have:
- description: clear, actionable task description
- estimatedHours: realistic time estimate in hours (as a number)
- priority: "high", "medium", or "low"
- order: sequence number (1, 2, 3, etc.)

Requirements:
- Create 3-10 tasks depending on complexity
- Make tasks specific and actionable
- Include time estimates that are realistic
- Order tasks logically
- Tasks should be completable steps

Respond ONLY with valid JSON array, no other text:

[
  {
    "description": "task description",
    "estimatedHours": 2,
    "priority": "high",
    "order": 1
  }
]`;
  }

  /**
   * Parse the AI response into task array
   * @private
   */
  parseResponse(response, analyzedGoal) {
    try {
      // Clean the response
      let cleanedResponse = response.trim();
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      cleanedResponse = cleanedResponse.trim();

      // Parse JSON
      const tasks = JSON.parse(cleanedResponse);

      // Validate and enhance tasks
      if (!Array.isArray(tasks)) {
        throw new Error('Response is not an array');
      }

      return tasks.map((task, index) => ({
        id: `task_${Date.now()}_${index}`,
        description: task.description || `Task ${index + 1}`,
        estimatedHours: this.validateHours(task.estimatedHours),
        priority: this.validatePriority(task.priority),
        order: task.order || index + 1,
        status: 'pending',
        createdAt: new Date().toISOString(),
        goalReference: analyzedGoal.originalGoal
      }));
    } catch (error) {
      console.error('Failed to parse task decomposition:', error);
      console.log('Raw response:', response);
      
      // Return fallback tasks
      return this.createFallbackTasks(analyzedGoal);
    }
  }

  /**
   * Validate estimated hours
   * @private
   */
  validateHours(hours) {
    const num = parseFloat(hours);
    if (isNaN(num) || num <= 0) return 2; // default 2 hours
    if (num > 40) return 40; // cap at 40 hours
    return Math.round(num * 2) / 2; // round to nearest 0.5
  }

  /**
   * Validate priority level
   * @private
   */
  validatePriority(priority) {
    const valid = ['high', 'medium', 'low'];
    const normalized = priority?.toLowerCase();
    return valid.includes(normalized) ? normalized : 'medium';
  }

  /**
   * Create fallback tasks if parsing fails
   * @private
   */
  createFallbackTasks(analyzedGoal) {
    const { originalGoal, complexity } = analyzedGoal;
    
    // Generate basic tasks based on complexity
    const taskCount = complexity === 'high' ? 5 : complexity === 'medium' ? 4 : 3;
    const baseHours = complexity === 'high' ? 3 : complexity === 'medium' ? 2 : 1.5;

    return Array.from({ length: taskCount }, (_, i) => ({
      id: `task_${Date.now()}_${i}`,
      description: `Step ${i + 1}: Work on ${originalGoal}`,
      estimatedHours: baseHours + (i * 0.5),
      priority: i < 2 ? 'high' : 'medium',
      order: i + 1,
      status: 'pending',
      createdAt: new Date().toISOString(),
      goalReference: originalGoal,
      note: 'Auto-generated fallback task'
    }));
  }

  /**
   * Calculate total time for all tasks
   * @param {Array} tasks - Array of task objects
   * @returns {number} Total hours
   */
  calculateTotalTime(tasks) {
    return tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
  }

  /**
   * Format tasks for display
   * @param {Array} tasks - Array of task objects
   * @returns {string} Formatted string
   */
  formatTasks(tasks) {
    const totalHours = this.calculateTotalTime(tasks);
    
    let output = `
📋 Task Breakdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Tasks: ${tasks.length}
Total Estimated Time: ${totalHours} hours

Tasks:
`;

    tasks.forEach((task) => {
      const priorityIcon = {
        high: '🔴',
        medium: '🟡',
        low: '🟢'
      }[task.priority];

      output += `
${task.order}. ${task.description}
   ${priorityIcon} Priority: ${task.priority.toUpperCase()}
   ⏱️  Estimated: ${task.estimatedHours} hours
   Status: ${task.status}
`;
    });

    return output.trim();
  }

  /**
   * Get tasks by priority
   * @param {Array} tasks - Array of task objects
   * @param {string} priority - Priority level to filter
   * @returns {Array} Filtered tasks
   */
  getTasksByPriority(tasks, priority) {
    return tasks.filter(task => task.priority === priority);
  }

  /**
   * Sort tasks by order
   * @param {Array} tasks - Array of task objects
   * @returns {Array} Sorted tasks
   */
  sortTasks(tasks) {
    return [...tasks].sort((a, b) => a.order - b.order);
  }
}

export default TaskDecomposerAgent;