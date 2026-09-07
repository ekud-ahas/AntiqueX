const pool = require("../config/db");

/**
 * Find user by username or email (for duplicate checks)
 */
const findByUsernameOrEmail = async (username, email) => {
    const query = `
        SELECT user_id, username, email
        FROM users
        WHERE username = $1 OR email = $2
    `;
    const result = await pool.query(query, [username, email]);
    return result.rows[0] || null;
};

/**
 * Find user by email including hashed password (for authentication)
 */
const findByEmail = async (email) => {
    const query = `
        SELECT user_id, username, full_name, email, password, status
        FROM users
        WHERE email = $1
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
};

/**
 * Create a new user with hashed password
 */
const createUser = async ({ username, full_name, email, passwordHash }) => {
    const query = `
        INSERT INTO users (username, full_name, email, password)
        VALUES ($1, $2, $3, $4)
        RETURNING user_id, username, full_name, email
    `;
    const result = await pool.query(query, [username, full_name, email, passwordHash]);
    return result.rows[0];
};

/**
 * Find user by ID without sensitive fields
 */
const findById = async (userId) => {
    const query = `
        SELECT user_id, username, full_name, email
        FROM users
        WHERE user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
};

module.exports = {
    findByUsernameOrEmail,
    findByEmail,
    createUser,
    findById
};
