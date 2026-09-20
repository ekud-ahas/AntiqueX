const walletModel = require("../models/walletModel");
const { processMockGatewayTransaction } = require("../services/mockPaymentGateway");

// Get or initialize the authenticated customer's wallet and transaction history.
const getWallet = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.userId;
        if (Number(currentUserId) !== Number(userId)) {
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

// Deposit funds into wallet via Mock Gateway (Protected, Customer only)
const depositFunds = async (req, res) => {
    try {
        const user_id = req.user.userId;
        const { amount, method = "bkash", accountNumber, pin } = req.body;
        const depositAmount = Number(amount);

        if (!user_id || isNaN(depositAmount) || depositAmount <= 0) {
            return res.status(400).json({ error: "Valid deposit amount (> 0) is required" });
        }

        // Process through Mock Payment Gateway Server
        const gatewayRes = await processMockGatewayTransaction({
            amount: depositAmount,
            method,
            accountNumber,
            pin,
            userId: user_id
        });

        if (!gatewayRes.success) {
            return res.status(gatewayRes.statusCode || 400).json({
                error: gatewayRes.error || "Payment gateway authorization failed"
            });
        }

        const result = await walletModel.depositFunds(user_id, depositAmount, {
            gatewayTxnId: gatewayRes.gatewayTxnId,
            provider: gatewayRes.provider
        });

        res.status(200).json({
            message: "Deposit successful",
            gateway: gatewayRes,
            wallet: result.wallet,
            transaction: result.transaction
        });
    } catch (error) {
        console.error("DEPOSIT FUNDS ERROR:", error);
        res.status(500).json({ error: "Failed to process deposit" });
    }
};

// Withdraw funds from wallet (Protected, Customer only)
const withdrawFunds = async (req, res) => {
    try {
        const user_id = req.user.userId;
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
