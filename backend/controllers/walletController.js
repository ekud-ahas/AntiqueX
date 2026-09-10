const walletModel = require("../models/walletModel");

// Get or initialize user wallet and transaction history (Protected, User or Admin)
const getWallet = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.userId;
        const isAdmin = req.user.role === "admin" || req.user.role === "moderator";

        // Object-level ownership check (Section 3.2 item 3)
        if (Number(currentUserId) !== Number(userId) && !isAdmin) {
            return res.status(403).json({
                error: "Forbidden: You cannot access another user's wallet."
            });
        }

        const wallet = await walletModel.getOrCreateWallet(userId);
        const transactions = await walletModel.getWalletTransactions(wallet.wallet_id);

        res.json({
            ...wallet,
            transactions
        });
    } catch (error) {
        console.error("GET WALLET ERROR:", error);
        res.status(500).json({ error: "Failed to retrieve wallet details" });
    }
};

// Deposit funds into wallet (Protected)
const depositFunds = async (req, res) => {
    try {
        // Securely resolve user_id from token
        const user_id = req.user ? req.user.userId : req.body.user_id;
        const { amount } = req.body;
        const depositAmount = Number(amount);

        if (!user_id || isNaN(depositAmount) || depositAmount <= 0) {
            return res.status(400).json({ error: "Valid deposit amount (> 0) is required" });
        }

        const result = await walletModel.depositFunds(user_id, depositAmount);

        res.status(200).json({
            message: "Deposit successful",
            wallet: result.wallet,
            transaction: result.transaction
        });
    } catch (error) {
        console.error("DEPOSIT FUNDS ERROR:", error);
        res.status(500).json({ error: "Failed to process deposit" });
    }
};

// Withdraw funds from wallet (Protected)
const withdrawFunds = async (req, res) => {
    try {
        // Securely resolve user_id from token
        const user_id = req.user ? req.user.userId : req.body.user_id;
        const { amount } = req.body;
        const withdrawAmount = Number(amount);

        if (!user_id || isNaN(withdrawAmount) || withdrawAmount <= 0) {
            return res.status(400).json({ error: "Valid withdrawal amount (> 0) is required" });
        }

        const result = await walletModel.withdrawFunds(user_id, withdrawAmount);

        if (result.error) {
            return res.status(result.status || 400).json({ error: result.error });
        }

        res.status(200).json({
            message: "Withdrawal successful",
            wallet: result.wallet,
            transaction: result.transaction
        });
    } catch (error) {
        console.error("WITHDRAW FUNDS ERROR:", error);
        res.status(500).json({ error: "Failed to process withdrawal" });
    }
};

module.exports = {
    getWallet,
    depositFunds,
    withdrawFunds
};
