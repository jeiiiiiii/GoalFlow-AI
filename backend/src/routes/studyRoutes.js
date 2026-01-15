import express from 'express';
import {
    createStudyPlan,
    getGoalDetails,
    getInsights,
    getPlan,
    getTasks,
    triggerReflection,
    updateTaskStatus
} from '../controllers/studyPlanController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Create a new study plan based on user goal
router.post('/goals', auth, createStudyPlan);

// Get specific goal details with progress
// goa
router.get('/goals/:id', auth, getGoalDetails);

// Get all tasks for a specific goal
router.get('/goals/:id/tasks', auth, getTasks);

// Get complete plan with schedule for a goal
router.get('/plans/:goalId', auth, getPlan);

// Update task status (completed/missed/in-progress)
router.patch('/tasks/:id', auth, updateTaskStatus);

// Trigger reflection and plan adjustment after goal period
router.post('/reflect/:goalId', auth, triggerReflection);

// Get user insights and learning patterns
router.get('/insights', auth, getInsights);



export default router;