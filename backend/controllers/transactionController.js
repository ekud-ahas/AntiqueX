const transactionModel = require("../models/transactionModel");

// Exported internal helper for closing auction
const closeAuctionAndRecordWinner = async (auctionId, customClient = null) => {
    return await transactionModel.closeAuctionAndRecordWinner(auctionId, customClient);
};

// Trigger close auction via API
const closeAuctionEndpoint = async (req, res) => {
    try {
        const { auctionId } = req.params;
        if (isNaN(Number(auctionId)) || Number(auctionId) <= 0) return res.status(400).json({ error: "Invalid ID parameter" });
        const transaction = await transactionModel.closeAuctionAndRecordWinner(auctionId);

        res.json({
            message: "Auction closed successfully",
            transaction
        });
    } catch (error) {
        console.error("CLOSE AUCTION ENDPOINT ERROR:", error);
        res.status(500).json({ error: "Failed to close auction" });
    }
};

// Get single transaction details (Protected, Buyer, Seller, or Admin)
const getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(Number(id)) || Number(id) <= 0) return res.status(400).json({ error: "Invalid ID parameter" });
        const transaction = await transactionModel.getTransactionDetails(id);

        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        const currentUserId = req.user ? req.user.userId : null;
        const isAdmin = req.user && (req.user.role === "admin" || req.user.role === "moderator");

        // Object ownership check
        if (currentUserId && !isAdmin) {
            const isBuyer = Number(transaction.buyer_id) === Number(currentUserId);
            const isSeller = Number(transaction.seller_id) === Number(currentUserId);
            if (!isBuyer && !isSeller) {
                return res.status(403).json({
                    error: "Forbidden: You are not authorized to view this transaction."
                });
            }
        }

        res.json(transaction);
    } catch (error) {
        console.error("GET TRANSACTION ERROR:", error);
        res.status(500).json({ error: "Failed to retrieve transaction" });
    }
};

// Get all transactions for a user (Protected, User or Admin)
const getUserTransactions = async (req, res) => {
    try {
        const { userId } = req.params;
        if (isNaN(Number(userId)) || Number(userId) <= 0) return res.status(400).json({ error: "Invalid ID parameter" });
        const currentUserId = req.user ? req.user.userId : null;
        const isAdmin = req.user && (req.user.role === "admin" || req.user.role === "moderator");

        // Object ownership check
        if (currentUserId && Number(currentUserId) !== Number(userId) && !isAdmin) {
            return res.status(403).json({
                error: "Forbidden: You cannot view another user's transactions."
            });
        }

        const { role } = req.query; // 'buyer', 'seller', or undefined

        const transactions = await transactionModel.getUserTransactions(userId, role);
        res.json(transactions);
    } catch (error) {
        console.error("GET USER TRANSACTIONS ERROR:", error);
        res.status(500).json({ error: "Failed to retrieve user transactions" });
    }
};

module.exports = {
    closeAuctionAndRecordWinner,
    closeAuctionEndpoint,
    getTransactionById,
    getUserTransactions
};
