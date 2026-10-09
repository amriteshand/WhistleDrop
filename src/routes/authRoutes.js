const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Moderator = require("../models/Moderator");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticates moderator credentials and issues a JWT token.
 */
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const moderator = await Moderator.findOne({ username });
        if (!moderator) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const isMatch = await bcrypt.compare(password, moderator.password);
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({
                message: "Server misconfiguration: JWT_SECRET is not configured."
            });
        }
        const expiresIn = process.env.JWT_EXPIRES_IN || "24h";

        const token = jwt.sign(
            {
                id: moderator._id,
                username: moderator.username
            },
            secret,
            { expiresIn }
        );

        res.json({
            message: "Login successful",
            token,
            moderator: {
              id: moderator._id,
              username: moderator.username
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Login failed"
        });
    }
});

/**
 * GET /api/auth/me
 * Returns authenticated moderator profile.
 */
router.get("/me", verifyToken, async (req, res) => {
    try {
        const moderator = await Moderator.findById(req.moderator.id).select("-password");

        if (!moderator) {
            return res.status(404).json({
                message: "Moderator not found"
            });
        }

        res.json({
            moderator: {
                id: moderator._id,
                username: moderator.username,
                createdAt: moderator.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch moderator details"
        });
    }
});

module.exports = router;
