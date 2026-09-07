const pool = require("../config/db");

/**
 * Find admin by email
 */
const findByEmail = async (email) => {
    const query = `
        SELECT admin_id, username, email, password, role
        FROM admins
        WHERE email = $1
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
};

/**
 * Find admin by username
 */
const findByUsername = async (username) => {
    const query = `
        SELECT admin_id, username, email, password, role
        FROM admins
        WHERE username = $1
    `;
    const result = await pool.query(query, [username]);
    return result.rows[0] || null;
};

/**
 * Find admin by ID
 */
const findById = async (adminId) => {
    const query = `
        SELECT admin_id, username, email, role
        FROM admins
        WHERE admin_id = $1
    `;
    const result = await pool.query(query, [adminId]);
    return result.rows[0] || null;
};

/**
 * Get all admins
 */
const getAllAdmins = async () => {
    const query = `
        SELECT admin_id, username, email, role
        FROM admins
        ORDER BY admin_id
    `;
    const result = await pool.query(query);
    return result.rows;
};

module.exports = {
    findByEmail,
    findByUsername,
    findById,
    getAllAdmins
};
