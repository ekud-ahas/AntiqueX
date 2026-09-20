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
        // 1. Check if token was revoked (server-side logout invalidation per §3.1)
        const revokedCheck = await pool.query(
            "SELECT token_id FROM revoked_tokens WHERE token = $1",
            [token]
        );

        if (revokedCheck.rows.length > 0) {
            return res.status(401).json({
                error: "Session has expired or token was revoked. Please log in again."
            });
        }

        const decoded = verifyToken(token);

        // 2. Verify account existence and active status from DB
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
        } else {
            const adminCheck = await pool.query(
                "SELECT admin_id, role FROM admins WHERE admin_id = $1",
                [decoded.userId]
            );

            if (adminCheck.rows.length === 0) {
                return res.status(401).json({
                    error: "Admin account no longer exists."
                });
            }
        }

        req.user = decoded;
        req.token = token;
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
