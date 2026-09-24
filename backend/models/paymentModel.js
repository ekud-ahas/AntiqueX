const pool = require("../config/db");

/**
 * Get all payment methods for a specific user
 */
const getPaymentMethodsByUser = async (userId) => {
    const query = `
        SELECT method_id, user_id, method_name, provider, account_number
        FROM payment_methods
        WHERE user_id = $1
        ORDER BY method_id DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
};

/**
 * Add a payment method for a user
 */
const addPaymentMethod = async (userId, methodName, provider, accountNumber, secretCode) => {
    const query = `
        INSERT INTO payment_methods (user_id, method_name, provider, account_number, secret_code)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const result = await pool.query(query, [userId, methodName, provider, accountNumber, secretCode]);
    return result.rows[0];
};

/**
 * Delete a payment method by ID and user ID
 */
const deletePaymentMethod = async (methodId, userId) => {
    const query = `
        DELETE FROM payment_methods
        WHERE method_id = $1 AND user_id = $2
        RETURNING *
    `;
    const result = await pool.query(query, [methodId, userId]);
    return result.rows[0] || null;
};

module.exports = {
    getPaymentMethodsByUser,
    addPaymentMethod,
    deletePaymentMethod
};
