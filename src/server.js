require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const connectDB = require("./config/db");

const Report = require("./models/Report");

const app = express();

app.use(express.json());

connectDB();

app.get("/", (req, res) => {
    res.json({
        message: "WhistleDrop API is running"
    });
});
app.post("/api/reports", async (req, res) => {
    try {
        const { category, description, evidenceUrl } = req.body;

        if (!category || !description) {
            return res.status(400).json({
                message: "Category and description are required"
            });
        }

        const caseCode = "WD-" + crypto.randomBytes(8).toString("hex").toUpperCase();

        const report = await Report.create({
            caseCode,
            category,
            description,
            evidenceUrl
        });

        res.status(201).json({
            message: "Report submitted successfully",
            caseCode: report.caseCode
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to submit report"
        });
    }
});

app.get("/api/reports/:caseCode", async (req, res) => {
    try {
        const report = await Report.findOne({
            caseCode: req.params.caseCode
        });

        if (!report) {
            return res.status(404).json({
                message: "Report not found"
            });
        }

        res.json({
            caseCode: report.caseCode,
            category: report.category,
            description: report.description,
            status: report.status,
            createdAt: report.createdAt
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch report"
        });
    }
});

app.patch("/api/reports/:caseCode/status", async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            "SUBMITTED",
            "UNDER_REVIEW",
            "RESOLVED",
            "DISMISSED"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const report = await Report.findOneAndUpdate(
            { caseCode: req.params.caseCode },
            { status },
            { new: true }
        );

        if (!report) {
            return res.status(404).json({
                message: "Report not found"
            });
        }

        res.json({
            message: "Report status updated successfully",
            caseCode: report.caseCode,
            status: report.status
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to update report status"
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});