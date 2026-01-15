import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
    {
        goalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Goal",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        estimatedHours: {
            type: Number,
            required: true,
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        priorityScore: {
            type: Number,
            min: 1,
            max: 10,
            default: 5,
        },
        order: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'missed'],
            default: 'pending',
        },
        scoreReasoning: {
            type: String,
            default: '',
        },
        completedAt: {
            type: Date,
        },
        completedLate: {
            type: Boolean,
            default: false,
        },
    },
    {timestamps: true},
);

const Task = mongoose.model("Task", taskSchema)

export default Task;