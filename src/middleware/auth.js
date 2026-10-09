const jwt = require("jsonwebtoken");

/**
 * Middleware to verify JWT token and protect moderator routes.
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Access denied. No token provided."
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Access denied. No token provided."
        });
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({
                message: "Server misconfiguration: JWT_SECRET is not configured."
            });
        }
        const decoded = jwt.verify(token, secret);
        req.moderator = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
};

module.exports = {
    verifyToken
};
