const pool = require("../config/db");

/**
 * Find or create a user's wallet
 */
const getOrCreateWallet = async (userId) => {
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

        // Re-fetch if conflict occurred
        if (walletRes.rows.length === 0) {
            walletRes = await pool.query(
                `SELECT wallet_id, user_id, balance FROM wallets WHERE user_id = $1`,
                [userId]
            );
        }
    }

    return walletRes.rows[0];
};

/**
 * Get transaction history for a wallet
 */
const getWalletTransactions = async (walletId, limit = 50) => {
    const query = `
        SELECT wallet_txn_id, wallet_id, type, amount, time AS transaction_time
        FROM wallet_transactions
        WHERE wallet_id = $1
        ORDER BY time DESC
        LIMIT $2
    `;
    const result = await pool.query(query, [walletId, limit]);
    return result.rows;
};

/**
 * Deposit funds into wallet (with transaction)
 */
const depositFunds = async (userId, depositAmount) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Ensure wallet exists and update balance
        const walletRes = await client.query(
            `
            INSERT INTO wallets (user_id, balance)
            VALUES ($1, $2)
            ON CONFLICT (user_id)
            DO UPDATE SET balance = wallets.balance + $2
            RETURNING wallet_id, user_id, balance
            `,
            [userId, depositAmount]
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
            [userId, `Successfully deposited ৳${depositAmount.toLocaleString()} into your AntiqueX wallet.`]
        );

        await client.query("COMMIT");

        return {
            wallet,
            transaction: txnRes.rows[0]
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Withdraw funds from wallet (with transaction & row locking)
 */
const withdrawFunds = async (userId, withdrawAmount) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Check wallet balance with row-level lock
        const walletCheck = await client.query(
            `
            SELECT wallet_id, balance
            FROM wallets
            WHERE user_id = $1
            FOR UPDATE
            `,
            [userId]
        );

        if (walletCheck.rows.length === 0 || Number(walletCheck.rows[0].balance) < withdrawAmount) {
            await client.query("ROLLBACK");
            return { error: "Insufficient wallet balance", status: 400 };
        }

        const walletId = walletCheck.rows[0].wallet_id;

        // Deduct balance
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
            [userId, `Withdrew ৳${withdrawAmount.toLocaleString()} from your AntiqueX wallet.`]
        );

        await client.query("COMMIT");

        return {
            wallet: updatedWallet.rows[0],
            transaction: txnRes.rows[0]
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    getOrCreateWallet,
    getWalletTransactions,
    depositFunds,
    withdrawFunds
};
