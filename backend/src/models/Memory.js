import mongoose from "mongoose";

const memorySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        completionRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        preferredTimes: [{
            type: String,
        }],
        missedTaskPatterns: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        insights: [{
            type: String,
        }],
    },
    {timestamps: true},
);

const Memory = mongoose.model("Memory", memorySchema);

export default Memory;
