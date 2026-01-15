import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        originalGoal: {
            type: String,
            required: true,
        },
        parsedDeadline: {
            type: String,
            default: 'not specified',
        },
        subject: {
            type: String,
            required: true,
        },
        complexity: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        recommendedApproach: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'abandoned'],
            default: 'active',
        },
    },
    {timestamps: true},
);

const Goal = mongoose.model("Goal", goalSchema)

export default Goal;