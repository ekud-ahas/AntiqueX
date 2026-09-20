const transactionModel = require("../models/transactionModel");

// Exported internal helper for closing auction
const closeAuctionAndRecordWinner = async (auctionId, customClient = null) => {
    return await transactionModel.closeAuctionAndRecordWinner(auctionId, customClient);
};

// Trigger close auction via API
const closeAuctionEndpoint = async (req, res) => {
    try {
        const { auctionId } = req.params;
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

// Pay for a pending transaction (Protected, Buyer only)
const payTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const buyer_id = req.user.userId;
        const { payment_method_type, payment_method_id, address_id, delivery_address_note } = req.body;

        const result = await transactionModel.processPayment({
            txnId: id,
            buyerId: buyer_id,
            paymentMethodType: payment_method_type,
            paymentMethodId: payment_method_id,
            addressId: address_id,
            deliveryAddressNote: delivery_address_note
        });

        if (result.error) {
            return res.status(result.status || 400).json({ error: result.error });
        }

        res.status(200).json({
            message: "Payment processed successfully",
            transaction: result.transaction
        });

    } catch (error) {
        console.error("PAY TRANSACTION ERROR:", error);
        res.status(500).json({ error: "Failed to process payment" });
    }
};

module.exports = {
    closeAuctionAndRecordWinner,
    closeAuctionEndpoint,
    getTransactionById,
    getUserTransactions,
    payTransaction
};
