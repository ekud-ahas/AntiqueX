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
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

            const query = `
                INSERT INTO payment_methods (user_id, method_name, provider, account_number, secret_code)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const result = await client.query(query, [userId, methodName, provider, accountNumber, secretCode]);
            await client.query("COMMIT");

            return result.rows[0];

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }};

/**
 * Delete a payment method by ID and user ID
 */
const deletePaymentMethod = async (methodId, userId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

            const query = `
                DELETE FROM payment_methods
                WHERE method_id = $1 AND user_id = $2
                RETURNING *
            `;
            const result = await client.query(query, [methodId, userId]);
            await client.query("COMMIT");

            return result.rows[0] || null;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }};

module.exports = {
    getPaymentMethodsByUser,
    addPaymentMethod,
    deletePaymentMethod
};
