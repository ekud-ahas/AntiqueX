const pool = require("../config/db");

// Get all payment methods for a user
const getUserPaymentMethods = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            `
            SELECT method_id, user_id, method_name
            FROM payment_methods
            WHERE user_id = $1
            ORDER BY method_id DESC
            `,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("GET PAYMENT METHODS ERROR:", error);
        res.status(500).json({ error: "Failed to retrieve payment methods" });
    }
};

// Add a payment method for a user
const addPaymentMethod = async (req, res) => {
    try {
        const { user_id, method_name } = req.body;

        if (!user_id || !method_name || !method_name.trim()) {
            return res.status(400).json({ error: "User ID and method name are required" });
        }

        const result = await pool.query(
            `
            INSERT INTO payment_methods (user_id, method_name)
            VALUES ($1, $2)
            RETURNING *
            `,
            [user_id, method_name.trim()]
        );

        res.status(201).json({
            message: "Payment method added successfully",
            payment_method: result.rows[0]
        });
    } catch (error) {
        console.error("ADD PAYMENT METHOD ERROR:", error);
        res.status(500).json({ error: "Failed to add payment method" });
    }
};

// Delete a payment method
const deletePaymentMethod = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: "user_id is required" });
        }

        const result = await pool.query(
            `
            DELETE FROM payment_methods
            WHERE method_id = $1 AND user_id = $2
            RETURNING *
            `,
            [id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Payment method not found or unauthorized" });
        }

        res.json({ message: "Payment method deleted successfully" });
    } catch (error) {
        console.error("DELETE PAYMENT METHOD ERROR:", error);
        res.status(500).json({ error: "Failed to delete payment method" });
    }
};

module.exports = {
    getUserPaymentMethods,
    addPaymentMethod,
    deletePaymentMethod
};
