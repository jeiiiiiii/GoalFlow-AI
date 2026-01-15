import { GoalAnalyzerAgent } from '../agents/goalAnalyzer.js';
import { PriorityScorerAgent } from '../agents/priorityScorer.js';
import { ReflectionAgent } from '../agents/reflector.js';
import { SchedulerAgent } from '../agents/scheduler.js';
import { TaskDecomposerAgent } from '../agents/taskDecomposer.js';

/**
 * Agent Orchestrator
 * Master controller that coordinates all AI agents to create study plans
 */
export class AgentOrchestrator {
  constructor() {
    this.goalAnalyzer = new GoalAnalyzerAgent();
    this.taskDecomposer = new TaskDecomposerAgent();
    this.priorityScorer = new PriorityScorerAgent();
    this.scheduler = new SchedulerAgent();
    this.reflector = new ReflectionAgent();
    
    this.executionLog = [];
  }

  /**
   * Main orchestration method: Create complete study plan from goal
   * @param {string} goalText - User's goal description
   * @param {Object} options - Configuration options
   * @param {Object} options.userContext - User context (history, preferences)
   * @param {Object} options.schedulingPreferences - Scheduling preferences
   * @returns {Promise<Object>} Complete plan with all agent outputs
   */
  async createStudyPlan(goalText, options = {}) {
    const startTime = Date.now();
    this.executionLog = [];
    
    try {
      this.log('ORCHESTRATION_START', 'Starting study plan creation');

      // STEP 1: Analyze Goal
      this.log('STEP_1_START', 'Calling Goal Analyzer Agent');
      const analyzedGoal = await this.goalAnalyzer.analyzeGoal(goalText);
      this.log('STEP_1_COMPLETE', 'Goal analysis complete', { analyzedGoal });

      if (!analyzedGoal) {
        throw new Error('Goal analysis failed');
      }

      // STEP 2: Decompose into Tasks
      this.log('STEP_2_START', 'Calling Task Decomposer Agent');
      const tasks = await this.taskDecomposer.decompose(analyzedGoal);
      this.log('STEP_2_COMPLETE', `Generated ${tasks.length} tasks`, { taskCount: tasks.length });

      if (!tasks || tasks.length === 0) {
        throw new Error('Task decomposition produced no tasks');
      }

      // STEP 3: Score Task Priorities
      this.log('STEP_3_START', 'Calling Priority Scorer Agent');
      const userContext = this.buildUserContext(options.userContext, analyzedGoal);
      const scoredTasks = await this.priorityScorer.scoreTasks(tasks, userContext);
      this.log('STEP_3_COMPLETE', 'Task priorities assigned', { 
        avgScore: this.priorityScorer.getAverageScore(scoredTasks) 
      });

      // STEP 4: Create Schedule
      this.log('STEP_4_START', 'Calling Scheduler Agent');
      const schedulingPrefs = this.buildSchedulingPreferences(
        options.schedulingPreferences, 
        analyzedGoal
      );
      const schedule = await this.scheduler.createSchedule(scoredTasks, schedulingPrefs);
      this.log('STEP_4_COMPLETE', 'Schedule created', { 
        days: schedule.summary.totalDays,
        hours: schedule.summary.totalHours 
      });

      // Calculate execution time
      const executionTime = Date.now() - startTime;
      this.log('ORCHESTRATION_COMPLETE', `Plan created in ${executionTime}ms`);

      // Return comprehensive plan
      return {
        success: true,
        plan: {
          goal: analyzedGoal,
          tasks: scoredTasks,
          schedule: schedule,
          metadata: {
            createdAt: new Date().toISOString(),
            executionTimeMs: executionTime,
            agentsInvolved: 4,
            totalTasks: tasks.length,
            totalHours: schedule.summary.totalHours,
            estimatedDays: schedule.summary.totalDays
          }
        },
        executionLog: this.executionLog
      };

    } catch (error) {
      this.log('ORCHESTRATION_ERROR', error.message, { error: error.stack });
      
      return {
        success: false,
        error: error.message,
        executionLog: this.executionLog,
        failedAt: this.getLastCompletedStep()
      };
    }
  }

  /**
   * Adjust existing plan based on user progress (uses Reflection Agent)
   * @param {Object} currentPlan - The current study plan
   * @param {Array} userProgress - Array of task progress updates
   * @param {Object} userMemory - User's historical memory data
   * @returns {Promise<Object>} Adjusted plan with reflection insights
   */
  async adjustPlan(currentPlan, userProgress, userMemory = {}) {
    const startTime = Date.now();
    this.executionLog = [];

    try {
      this.log('ADJUSTMENT_START', 'Starting plan adjustment');

      // STEP 1: Reflect on Progress
      this.log('REFLECTION_START', 'Calling Reflection Agent');
      const reflection = await this.reflector.reflect(
        currentPlan.schedule,
        userProgress,
        userMemory
      );
      this.log('REFLECTION_COMPLETE', 'Reflection analysis complete', {
        insightsGenerated: reflection.insights?.length || 0
      });

      // STEP 2: Re-score remaining tasks if needed
      let adjustedTasks = currentPlan.tasks;
      if (reflection.adjustmentsMade?.priorityChanges?.length > 0) {
        this.log('RESCORE_START', 'Re-scoring tasks based on reflection');
        
        adjustedTasks = currentPlan.tasks.map(task => {
          const priorityChange = reflection.adjustmentsMade.priorityChanges.find(
            pc => pc.taskId === task.id
          );
          
          if (priorityChange) {
            return {
              ...task,
              priorityScore: priorityChange.newPriority,
              scoreReasoning: priorityChange.reason,
              adjustedAt: new Date().toISOString()
            };
          }
          return task;
        });
        
        this.log('RESCORE_COMPLETE', 'Task scores updated');
      }

      // STEP 3: Regenerate schedule if significant changes
      let newSchedule = reflection.adjustedPlan;
      if (reflection.needsReplanning && reflection.needsReplanning(reflection)) {
        this.log('RESCHEDULE_START', 'Regenerating schedule due to significant changes');
        
        // Filter out completed tasks
        const remainingTasks = adjustedTasks.filter(
          task => !userProgress.find(p => p.taskId === task.id && p.status === 'completed')
        );

        if (remainingTasks.length > 0) {
          // Use updated buffer time from reflection
          const updatedPrefs = {
            ...currentPlan.schedule.preferences,
            bufferTimePercent: reflection.adjustmentsMade?.recommendedBufferPercent || 
                              currentPlan.schedule.preferences?.bufferTimePercent || 20
          };

          newSchedule = await this.scheduler.createSchedule(remainingTasks, updatedPrefs);
          this.log('RESCHEDULE_COMPLETE', 'New schedule generated');
        }
      }

      const executionTime = Date.now() - startTime;
      this.log('ADJUSTMENT_COMPLETE', `Plan adjusted in ${executionTime}ms`);

      return {
        success: true,
        adjustedPlan: {
          goal: currentPlan.goal,
          tasks: adjustedTasks,
          schedule: newSchedule,
          reflection: {
            analysis: reflection.analysis,
            insights: reflection.insights,
            memoryUpdates: reflection.memoryUpdates,
            adjustmentsMade: reflection.adjustmentsMade
          },
          metadata: {
            adjustedAt: new Date().toISOString(),
            executionTimeMs: executionTime,
            originalPlanDate: currentPlan.metadata?.createdAt
          }
        },
        userMemory: reflection.updatedMemory,
        executionLog: this.executionLog
      };

    } catch (error) {
      this.log('ADJUSTMENT_ERROR', error.message, { error: error.stack });
      
      return {
        success: false,
        error: error.message,
        executionLog: this.executionLog
      };
    }
  }

  /**
   * Quick analysis: Just analyze goal without creating full plan
   * @param {string} goalText - User's goal description
   * @returns {Promise<Object>} Goal analysis result
   */
  async analyzeGoalOnly(goalText) {
    try {
      this.log('QUICK_ANALYSIS_START', 'Analyzing goal only');
      const analyzedGoal = await this.goalAnalyzer.analyzeGoal(goalText);
      this.log('QUICK_ANALYSIS_COMPLETE', 'Analysis complete');

      return {
        success: true,
        analysis: analyzedGoal
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get next recommended task for user
   * @param {Object} plan - Current study plan
   * @param {Array} completedTaskIds - IDs of completed tasks
   * @returns {Object|null} Next recommended task
   */
  getNextTask(plan, completedTaskIds = []) {
    const remainingTasks = plan.tasks.filter(
      task => !completedTaskIds.includes(task.id)
    );

    if (remainingTasks.length === 0) {
      return null;
    }

    // Return highest priority task
    return this.priorityScorer.sortByPriority(remainingTasks)[0];
  }

  /**
   * Build user context for priority scoring
   * @private
   */
  buildUserContext(userContext = {}, analyzedGoal) {
    return {
      deadline: analyzedGoal.parsedDeadline,
      userTendency: userContext.tendency || 'balanced',
      completedTasksCount: userContext.completedTasksCount || 0,
      overdueHistory: userContext.overdueHistory || 0,
      preferredTimes: userContext.preferredTimes || ['morning'],
      ...userContext
    };
  }

  /**
   * Build scheduling preferences
   * @private
   */
  buildSchedulingPreferences(preferences = {}, analyzedGoal) {
    // Calculate available hours based on deadline
    const defaultHours = this.estimateAvailableHours(analyzedGoal.parsedDeadline);
    
    return {
      availableHoursPerDay: preferences.availableHoursPerDay || defaultHours,
      preferredStudyTimes: preferences.preferredStudyTimes || ['morning', 'afternoon'],
      bufferTimePercent: preferences.bufferTimePercent || 20,
      startDate: preferences.startDate || new Date().toISOString().split('T')[0],
      ...preferences
    };
  }

  /**
   * Estimate available hours per day based on deadline urgency
   * @private
   */
  estimateAvailableHours(deadline) {
    if (!deadline || deadline === 'not specified') {
      return 4; // default
    }

    // Check for urgent keywords
    const urgentKeywords = ['tomorrow', 'today', 'urgent', 'asap', '1 day', '2 day'];
    const isUrgent = urgentKeywords.some(keyword => 
      deadline.toLowerCase().includes(keyword)
    );

    if (isUrgent) return 6; // more hours for urgent tasks

    // Check for short timeframes
    const shortKeywords = ['week', '7 day', '5 day'];
    const isShort = shortKeywords.some(keyword => 
      deadline.toLowerCase().includes(keyword)
    );

    if (isShort) return 5; // moderate hours

    return 4; // normal pace
  }

  /**
   * Log execution steps
   * @private
   */
  log(step, message, data = {}) {
    const logEntry = {
      step,
      message,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    this.executionLog.push(logEntry);
    console.log(`[Orchestrator] ${step}: ${message}`);
  }

  /**
   * Get the last completed step before error
   * @private
   */
  getLastCompletedStep() {
    const completedSteps = this.executionLog
      .filter(log => log.step.includes('COMPLETE'))
      .map(log => log.step);
    
    return completedSteps.length > 0 
      ? completedSteps[completedSteps.length - 1] 
      : 'NONE';
  }

  /**
   * Format execution log for display
   * @returns {string} Formatted log
   */
  formatExecutionLog() {
    let output = `
🤖 Agent Orchestrator Execution Log
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    this.executionLog.forEach((log, index) => {
      const icon = log.step.includes('ERROR') ? '❌' : 
                   log.step.includes('COMPLETE') ? '✅' : 
                   log.step.includes('START') ? '▶️' : '📝';
      
      output += `${icon} [${index + 1}] ${log.step}\n`;
      output += `   ${log.message}\n`;
      
      if (log.step.includes('COMPLETE') && Object.keys(log).length > 3) {
        const extraData = Object.entries(log)
          .filter(([key]) => !['step', 'message', 'timestamp'].includes(key))
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join(', ');
        if (extraData) output += `   📊 ${extraData}\n`;
      }
      
      output += '\n';
    });

    return output.trim();
  }

  /**
   * Get orchestrator statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const steps = this.executionLog.length;
    const errors = this.executionLog.filter(log => log.step.includes('ERROR')).length;
    const completedSteps = this.executionLog.filter(log => log.step.includes('COMPLETE')).length;

    return {
      totalSteps: steps,
      completedSteps,
      errors,
      successRate: steps > 0 ? ((completedSteps / steps) * 100).toFixed(1) + '%' : 'N/A'
    };
  }
}

export default AgentOrchestrator;
