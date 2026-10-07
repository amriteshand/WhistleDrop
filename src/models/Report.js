const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
    {
        caseCode: {
            type: String,
            unique: true,
            required: true
        },

        category: {
            type: String,
            required: true
        },

        description: {
            type: String,
            required: true
        },

        evidenceUrl: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: [
                "SUBMITTED",
                "UNDER_REVIEW",
                "RESOLVED",
                "DISMISSED"
            ],
            default: "SUBMITTED"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Report", reportSchema);