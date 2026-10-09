require("dotenv").config();

// Validate required environment variables at startup
if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET environment variable is missing.");
    process.exit(1);
}

const express = require("express");
const crypto = require("crypto");
const helmet = require("helmet");
const cors = require("cors");
const connectDB = require("./config/db");

const Report = require("./models/Report");
const authRoutes = require("./routes/authRoutes");
const { verifyToken } = require("./middleware/auth");
const { swaggerSpec, swaggerUi } = require("./config/swagger");

const app = express();

// Security Middleware
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                "script-src": ["'self'", "'unsafe-inline'"],
                "style-src": ["'self'", "'unsafe-inline'"],
                "img-src": ["'self'", "data:"]
            }
        }
    })
);

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : false;

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// API Documentation
app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(swaggerSpec);
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs", (req, res) => res.redirect("/api-docs"));
app.get("/docs", (req, res) => res.redirect("/api-docs"));

// Routes
app.use("/api/auth", authRoutes);

if (process.env.NODE_ENV !== "test") {
    connectDB();
}

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

// Protected: Only authenticated moderators can access the report listing with pagination and filters
app.get("/api/reports", verifyToken, async (req, res) => {
    try {
        const { status, category } = req.query;

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
        const skip = (page - 1) * limit;

        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (category) {
            filter.category = category;
        }

        const [reports, total] = await Promise.all([
            Report.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Report.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);

        res.json({
            reports,
            total,
            page,
            limit,
            totalPages,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch reports"
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

// Protected: Only authenticated moderators can update report status
app.patch("/api/reports/:caseCode/status", verifyToken, async (req, res) => {
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

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;