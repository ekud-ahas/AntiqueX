const pool = require("../config/db");

// Get or initialize user wallet and transaction history
const getWallet = async (req, res) => {
    try {
        const { userId } = req.params;

        // Ensure wallet exists for user
        let walletRes = await pool.query(
            `
            SELECT wallet_id, user_id, balance
            FROM wallets
            WHERE user_id = $1
            `,
            [userId]
        );

        if (walletRes.rows.length === 0) {
            walletRes = await pool.query(
                `
                INSERT INTO wallets (user_id, balance)
                VALUES ($1, 0.00)
                ON CONFLICT (user_id) DO NOTHING
                RETURNING wallet_id, user_id, balance
                `,
                [userId]
            );

            // Re-fetch if conflict
            if (walletRes.rows.length === 0) {
                walletRes = await pool.query(
                    `SELECT wallet_id, user_id, balance FROM wallets WHERE user_id = $1`,
                    [userId]
                );
            }
        }

        const wallet = walletRes.rows[0];

        // Fetch wallet transactions history
        const txnsRes = await pool.query(
            `
            SELECT wallet_txn_id, wallet_id, type, amount, transaction_time
            FROM wallet_transactions
            WHERE wallet_id = $1
            ORDER BY transaction_time DESC
            LIMIT 50
            `,
            [wallet.wallet_id]
        );

        res.json({
            ...wallet,
            transactions: txnsRes.rows
        });
    } catch (error) {
        console.error("GET WALLET ERROR:", error);
        res.status(500).json({ error: "Failed to retrieve wallet details" });
    }
};

// Deposit funds into wallet
const depositFunds = async (req, res) => {
    const client = await pool.connect();
    try {
        const { user_id, amount } = req.body;
        const depositAmount = Number(amount);

        if (!user_id || isNaN(depositAmount) || depositAmount <= 0) {
            return res.status(400).json({ error: "Valid user ID and deposit amount (> 0) are required" });
        }

        await client.query("BEGIN");

        // Ensure wallet exists
        let walletRes = await client.query(
            `
            INSERT INTO wallets (user_id, balance)
            VALUES ($1, $2)
            ON CONFLICT (user_id)
            DO UPDATE SET balance = wallets.balance + $2
            RETURNING wallet_id, user_id, balance
            `,
            [user_id, depositAmount]
        );

        const wallet = walletRes.rows[0];

        // Record transaction
        const txnRes = await client.query(
            `
            INSERT INTO wallet_transactions (wallet_id, type, amount)
            VALUES ($1, 'deposit', $2)
            RETURNING *
            `,
            [wallet.wallet_id, depositAmount]
        );

        // Notify user
        await client.query(
            `
            INSERT INTO notifications (user_id, type, message)
            VALUES ($1, 'wallet_deposit', $2)
            `,
            [user_id, `Successfully deposited ৳${depositAmount.toLocaleString()} into your AntiqueX wallet.`]
        );

        await client.query("COMMIT");

        res.status(200).json({
            message: "Deposit successful",
            wallet: wallet,
            transaction: txnRes.rows[0]
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("DEPOSIT FUNDS ERROR:", error);
        res.status(500).json({ error: "Failed to process deposit" });
    } finally {
        client.release();
    }
};

// Withdraw funds from wallet
const withdrawFunds = async (req, res) => {
    const client = await pool.connect();
    try {
        const { user_id, amount } = req.body;
        const withdrawAmount = Number(amount);

        if (!user_id || isNaN(withdrawAmount) || withdrawAmount <= 0) {
            return res.status(400).json({ error: "Valid user ID and withdrawal amount (> 0) are required" });
        }

        await client.query("BEGIN");

        // Check wallet balance
        const walletCheck = await client.query(
            `
            SELECT wallet_id, balance
            FROM wallets
            WHERE user_id = $1
            FOR UPDATE
            `,
            [user_id]
        );

        if (walletCheck.rows.length === 0 || Number(walletCheck.rows[0].balance) < withdrawAmount) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Insufficient wallet balance" });
        }

        const walletId = walletCheck.rows[0].wallet_id;

        // Deduct
        const updatedWallet = await client.query(
            `
            UPDATE wallets
            SET balance = balance - $1
            WHERE wallet_id = $2
            RETURNING wallet_id, user_id, balance
            `,
            [withdrawAmount, walletId]
        );

        // Record transaction
        const txnRes = await client.query(
            `
            INSERT INTO wallet_transactions (wallet_id, type, amount)
            VALUES ($1, 'withdrawal', $2)
            RETURNING *
            `,
            [walletId, withdrawAmount]
        );

        // Notify user
        await client.query(
            `
            INSERT INTO notifications (user_id, type, message)
            VALUES ($1, 'wallet_withdrawal', $2)
            `,
            [user_id, `Withdrew ৳${withdrawAmount.toLocaleString()} from your AntiqueX wallet.`]
        );

        await client.query("COMMIT");

        res.status(200).json({
            message: "Withdrawal successful",
            wallet: updatedWallet.rows[0],
            transaction: txnRes.rows[0]
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("WITHDRAW FUNDS ERROR:", error);
        res.status(500).json({ error: "Failed to process withdrawal" });
    } finally {
        client.release();
    }
};

module.exports = {
    getWallet,
    depositFunds,
    withdrawFunds
};
