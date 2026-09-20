const paymentModel = require("../models/paymentModel");

// Get all payment methods for a user (Protected)
const getUserPaymentMethods = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.userId;
        if (Number(currentUserId) !== Number(userId)) {
            return res.status(403).json({
                error: "Forbidden: You cannot view another user's payment methods."
            });
        }

        const methods = await paymentModel.getPaymentMethodsByUser(userId);
        res.json(methods);
    } catch (error) {
        console.error("GET PAYMENT METHODS ERROR:", error);
        res.status(500).json({ error: "Failed to retrieve payment methods" });
    }
};

// Add a payment method for a user (Protected, Customer only)
const addPaymentMethod = async (req, res) => {
    try {
        const user_id = req.user.userId;
        const { method_name } = req.body;

        if (!user_id || !method_name || !method_name.trim()) {
            return res.status(400).json({ error: "Method name is required" });
        }

        const newMethod = await paymentModel.addPaymentMethod(user_id, method_name.trim());

        res.status(201).json({
            message: "Payment method added successfully",
            payment_method: newMethod
        });
    } catch (error) {
        console.error("ADD PAYMENT METHOD ERROR:", error);
        res.status(500).json({ error: "Failed to add payment method" });
    }
};

// Delete a payment method (Protected, Customer only)
const deletePaymentMethod = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.userId;

        const deleted = await paymentModel.deletePaymentMethod(id, user_id);

        if (!deleted) {
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
