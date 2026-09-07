const pool = require("../config/db");
const { verifyToken } = require("../utils/jwt");

/**
 * Middleware to authenticate requests via JWT Bearer token
 * Returns 401 Unauthorized if token is missing or invalid
 * Returns 403 Forbidden if user account is suspended by an admin
 */
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Access denied. Authentication token is required."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verifyToken(token);

        // If regular user (customer), verify active status from database
        if (!decoded.isAdmin) {
            const userCheck = await pool.query(
                "SELECT status FROM users WHERE user_id = $1",
                [decoded.userId]
            );

            if (userCheck.rows.length === 0) {
                return res.status(401).json({
                    error: "User account no longer exists."
                });
            }

            if (userCheck.rows[0].status === "suspended") {
                return res.status(403).json({
                    error: "Your account has been suspended by an administrator. All actions are blocked."
                });
            }
        }

        req.user = decoded;
        next();
    } catch (err) {
        console.error("JWT Verification Failed:", err.message);
        return res.status(401).json({
            error: "Invalid or expired token. Please log in again."
        });
    }
};

/**
 * Middleware to enforce role-based access control (RBAC)
 * Returns 403 Forbidden if the authenticated user's role is not allowed
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: "Authentication required before checking permissions."
            });
        }

        const userRole = req.user.role;

        // Check if user has one of the allowed roles
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: `Forbidden: Action requires one of [${allowedRoles.join(", ")}] roles. Your current role is '${userRole}'.`
            });
        }

        next();
    };
};

/**
 * Optional authentication middleware:
 * Attaches req.user if a valid token is provided, but does not block unauthenticated requests
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];

    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
            const decoded = verifyToken(token);
            req.user = decoded;
        } catch {
            // Ignore invalid token for optional auth
        }
    }

    next();
};

module.exports = {
    authenticateToken,
    requireRole,
    optionalAuth
};
