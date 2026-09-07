const jwt = require("jsonwebtoken");
const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "../.env")
});

const JWT_SECRET = process.env.JWT_SECRET || "antiquex_default_fallback_secret_key_2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Generate a signed JWT token
 */
const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
};

/**
 * Verify a JWT token
 */
const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

module.exports = {
    generateToken,
    verifyToken
};
