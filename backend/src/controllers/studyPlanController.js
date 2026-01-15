import Goal from '../models/Goal.js';
import Memory from '../models/Memory.js';
import Plan from '../models/Plan.js';
import Task from '../models/Task.js';
import { AgentOrchestrator } from '../services/agentOrchestrator.js';

/**
 * Create complete study plan (Full Agent Orchestration)
 * Triggers: Goal Analyzer → Task Decomposer → Priority Scorer → Scheduler
 */
export async function createStudyPlan(req, res) {
    try {
        const { goalText, preferences = {} } = req.body;
        const userId = req.user.id; // from auth middleware

        console.log(`🎯 Creating study plan for user ${userId}`);

        // Get user's memory for context (if exists)
        const userMemory = await Memory.findOne({ userId });

        // Build user context from memory
        const userContext = {
            tendency: userMemory?.missedTaskPatterns?.tendency || 'balanced',
            completedTasksCount: userMemory?.completionRate ? 
                Math.round(userMemory.completionRate / 10) : 0,
            overdueHistory: 0,
            preferredTimes: userMemory?.preferredTimes || ['morning']
        };

        // Call full orchestrator workflow
        const orchestrator = new AgentOrchestrator();
        const result = await orchestrator.createStudyPlan(goalText, {
            userContext,
            schedulingPreferences: {
                availableHoursPerDay: preferences.hoursPerDay || 4,
                preferredStudyTimes: preferences.preferredTimes || ['morning', 'afternoon'],
                bufferTimePercent: preferences.bufferTimePercent || 20,
                startDate: preferences.startDate || new Date().toISOString().split('T')[0]
            }
        });

        if (!result.success) {
            return res.status(500).json({ 
                message: "Failed to create study plan", 
                error: result.error 
            });
        }

        // Save Goal to database
        const newGoal = new Goal({
            userId,
            originalGoal: result.plan.goal.originalGoal,
            parsedDeadline: result.plan.goal.parsedDeadline,
            subject: result.plan.goal.subject,
            complexity: result.plan.goal.complexity,
            recommendedApproach: result.plan.goal.recommendedApproach,
            status: 'active'
        });
        const savedGoal = await newGoal.save();

        // Save Tasks to database
        const taskDocs = result.plan.tasks.map(task => ({
            goalId: savedGoal._id,
            userId,
            description: task.description,
            estimatedHours: task.estimatedHours,
            priority: task.priority,
            priorityScore: task.priorityScore,
            order: task.order,
            status: task.status || 'pending',
            scoreReasoning: task.scoreReasoning
        }));
        const savedTasks = await Task.insertMany(taskDocs);

        // Save Plan to database
        const newPlan = new Plan({
            goalId: savedGoal._id,
            userId,
            schedule: result.plan.schedule.schedule,
            summary: result.plan.schedule.summary,
            preferences: result.plan.schedule.preferences,
            metadata: result.plan.metadata
        });
        const savedPlan = await newPlan.save();

        console.log(`✅ Study plan created: ${savedTasks.length} tasks, ${savedPlan.summary.totalDays} days`);

        res.status(201).json({
            message: "Study plan created successfully",
            goal: savedGoal,
            tasks: savedTasks,
            plan: savedPlan,
            executionTime: result.plan.metadata.executionTimeMs
        });

    } catch (error) {
        console.error("Error in createStudyPlan controller", error);
        res.status(500).json({ 
            message: "Internal server error", 
            error: error.message 
        });
    }
}

/**
 * Get goal details by ID
 */
export async function getGoalDetails(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const goal = await Goal.findOne({ _id: id, userId });
        if (!goal) {
            return res.status(404).json({ message: "Goal not found" });
        }

        // Get counts
        const totalTasks = await Task.countDocuments({ goalId: id, userId });
        const completedTasks = await Task.countDocuments({ goalId: id, userId, status: 'completed' });

        res.status(200).json({ 
            goal,
            progress: {
                totalTasks,
                completedTasks,
                completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
            }
        });
    } catch (error) {
        console.error("Error in getGoalDetails controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * Get all tasks for a specific goal
 */
export async function getTasks(req, res) {
    try {
        const { id } = req.params; // goalId
        const userId = req.user.id;

        // Verify goal ownership
        const goal = await Goal.findOne({ _id: id, userId });
        if (!goal) {
            return res.status(404).json({ message: "Goal not found" });
        }

        const tasks = await Task.find({ goalId: id, userId })
            .sort({ priorityScore: -1, order: 1 });

        res.status(200).json({ 
            tasks,
            goal: {
                id: goal._id,
                originalGoal: goal.originalGoal,
                subject: goal.subject
            }
        });
    } catch (error) {
        console.error("Error in getTasks controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


// Patch
export async function updateTaskStatus(req, res) {
    try {
        const { id } = req.params; // taskId
        const { status } = req.body;
        const userId = req.user.id; // from auth middleware

        // Validate allowed status values
        const allowedStatuses = ['pending', 'in-progress', 'completed', 'missed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid task status" });
        }

        // Find task and ensure ownership
        const task = await Task.findOne({ _id: id, userId });
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Update task status
        task.status = status;

        await task.save();

        res.status(200).json({
            message: "Task status updated successfully",
            task
        });

    } catch (error) {
        console.error("Error in updateTaskStatus controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

// Get
export async function getPlan(req, res) {
    try {
        const { goalId } = req.params;
        const userId = req.user.id; // from auth middleware

        // Verify goal ownership
        const goal = await Goal.findOne({ _id: goalId, userId });
        if (!goal) {
            return res.status(404).json({ message: "Goal not found" });
        }

        // Fetch the plan for this goal
        const plan = await Plan.findOne({ goalId, userId })
            .populate({
                path: 'tasks',
                select: 'title description status priority dueDate estimatedTime'
            });

        if (!plan) {
            return res.status(404).json({ message: "Study plan not found" });
        }

        res.status(200).json({ plan });

    } catch (error) {
        console.error("Error in getPlan controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function triggerReflection(req, res) {
    try {
        const { goalId } = req.params;
        const userId = req.user.id;

        // 1. Verify goal ownership
        const goal = await Goal.findOne({ _id: goalId, userId });
        if (!goal) {
            return res.status(404).json({ message: "Goal not found" });
        }

        // 2. Load current plan
        const plan = await Plan.findOne({ goalId, userId });
        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        // 3. Load related tasks
        const tasks = await Task.find({ goalId, userId });

        // 4. Run reflection via orchestrator
        const orchestrator = new AgentOrchestrator();

        const reflectionResult = await orchestrator.reflect({
            goal,
            plan,
            tasks
        });

        // 5. Persist adjustment (audit trail)
        if (reflectionResult.adjusted) {
            plan.adjustments.push({
                reason: reflectionResult.reason,
                changes: reflectionResult.changes
            });

            await plan.save();
        }

        res.status(200).json({
            message: "Reflection completed",
            adjusted: reflectionResult.adjusted,
            plan
        });

    } catch (error) {
        console.error("Error in triggerReflection controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

// Get user insights/memory
export async function getInsights(req, res) {
    try {
        const userId = req.user.id; // from auth middleware

        // Find or create user memory
        let memory = await Memory.findOne({ userId });

        if (!memory) {
            // Create default memory if doesn't exist
            memory = new Memory({
                userId,
                completionRate: 0,
                preferredTimes: [],
                missedTaskPatterns: {},
                insights: []
            });
            await memory.save();
        }

        // Get additional statistics
        const totalTasks = await Task.countDocuments({ userId });
        const completedTasks = await Task.countDocuments({ userId, status: 'completed' });
        const missedTasks = await Task.countDocuments({ userId, status: 'missed' });
        const inProgressTasks = await Task.countDocuments({ userId, status: 'in-progress' });

        // Calculate current completion rate
        const currentCompletionRate = totalTasks > 0 
            ? Math.round((completedTasks / totalTasks) * 100) 
            : 0;

        // Update memory completion rate
        memory.completionRate = currentCompletionRate;
        await memory.save();

        res.status(200).json({
            memory: {
                completionRate: memory.completionRate,
                preferredTimes: memory.preferredTimes,
                missedTaskPatterns: memory.missedTaskPatterns,
                insights: memory.insights,
                lastUpdated: memory.updatedAt
            },
            statistics: {
                totalTasks,
                completedTasks,
                missedTasks,
                inProgressTasks,
                pendingTasks: totalTasks - completedTasks - missedTasks - inProgressTasks
            }
        });

    } catch (error) {
        console.error("Error in getInsights controller", error);
        res.status(500).json({ message: "Internal server error" });
    }
}