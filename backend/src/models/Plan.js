import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        goalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Goal",
            required: true,
        },
        schedule: [{
            day: Number,
            date: String,
            tasks: [{
                taskDescription: String,
                taskId: String,
                priorityScore: Number,
                startTime: String,
                duration: Number,
                bufferAfter: Number,
            }],
            totalHours: Number,
            timeOfDay: String,
            createdAt: String,
        }],
        summary: {
            totalDays: Number,
            totalHours: Number,
            averageHoursPerDay: Number,
            tasksScheduled: Number,
            generatedAt: String,
        },
        preferences: {
            availableHoursPerDay: Number,
            preferredStudyTimes: [String],
            bufferTimePercent: Number,
            startDate: String,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        adjustments: [{
            adjustedAt: Date,
            analysis: mongoose.Schema.Types.Mixed,
            insights: [String],
            changes: mongoose.Schema.Types.Mixed,
        }],
    },
    {timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
    },
);

planSchema.virtual('tasks', {
    ref: 'Task',
    localField: 'goalId',
    foreignField: 'goalId'
});

const Plan = mongoose.model("Plan", planSchema)

export default Plan;