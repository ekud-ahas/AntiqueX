const pool = require("../config/db");

// Internal helper to close an auction, select top bidder, and create a transaction
const closeAuctionAndRecordWinner = async (auctionId, customClient = null) => {
    const client = customClient || await pool.connect();
    const shouldManageTransaction = !customClient;

    try {
        if (shouldManageTransaction) await client.query("BEGIN");

        // 1. Mark auction as ended
        const auctionRes = await client.query(
            `
            UPDATE auctions
            SET status = 'ended'
            WHERE auction_id = $1
            RETURNING auction_id, item_id, status
            `,
            [auctionId]
        );

        if (auctionRes.rows.length === 0) {
            if (shouldManageTransaction) await client.query("ROLLBACK");
            return null;
        }

        // 2. Fetch top bid & item details
        const topBidRes = await client.query(
            `
            SELECT
                b.bid_id,
                b.bid_amount,
                b.bidder_id,
                u.username AS buyer_username,
                i.seller_id,
                i.title,
                i.item_id,
                seller_u.username AS seller_username
            FROM auctions a
            JOIN items i ON a.item_id = i.item_id
            JOIN users seller_u ON i.seller_id = seller_u.user_id
            LEFT JOIN bids b ON a.auction_id = b.auction_id
            LEFT JOIN users u ON b.bidder_id = u.user_id
            WHERE a.auction_id = $1
            ORDER BY b.bid_amount DESC, b.bid_time ASC
            LIMIT 1
            `,
            [auctionId]
        );

        const data = topBidRes.rows[0];

        // 3. If bids were placed, record the transaction
        let transaction = null;
        if (data && data.bid_id && data.bidder_id) {
            const txnRes = await client.query(
                `
                INSERT INTO transactions
                (
                    auction_id,
                    buyer_id,
                    seller_id,
                    winner_bid_id,
                    amount,
                    payment_status,
                    close_date
                )
                VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
                ON CONFLICT (auction_id)
                DO UPDATE SET
                    buyer_id = EXCLUDED.buyer_id,
                    winner_bid_id = EXCLUDED.winner_bid_id,
                    amount = EXCLUDED.amount
                RETURNING *
                `,
                [
                    auctionId,
                    data.bidder_id,
                    data.seller_id,
                    data.bid_id,
                    Number(data.bid_amount)
                ]
            );

            transaction = txnRes.rows[0];

            // Notify winner
            await client.query(
                `
                INSERT INTO notifications (user_id, type, message)
                VALUES ($1, 'auction_won', $2)
                `,
                [
                    data.bidder_id,
                    `🎉 Congratulations! You won the auction for "${data.title}" at ৳${Number(data.bid_amount).toLocaleString()}. Please complete your payment.`
                ]
            );

            // Notify seller
            await client.query(
                `
                INSERT INTO notifications (user_id, type, message)
                VALUES ($1, 'auction_sold', $2)
                `,
                [
                    data.seller_id,
                    `🏷️ Your antique "${data.title}" was sold for ৳${Number(data.bid_amount).toLocaleString()} to @${data.buyer_username}. Waiting for buyer payment.`
                ]
            );
        } else if (data) {
            // Notify seller of unsold auction
            await client.query(
                `
                INSERT INTO notifications (user_id, type, message)
                VALUES ($1, 'auction_unsold', $2)
                `,
                [
                    data.seller_id,
                    `ℹ️ Your auction for "${data.title}" closed with no bids placed.`
                ]
            );
        }

        if (shouldManageTransaction) await client.query("COMMIT");
        return transaction;

    } catch (error) {
        if (shouldManageTransaction) await client.query("ROLLBACK");
        console.error("CLOSE AUCTION ERROR:", error);
        throw error;
    } finally {
        if (shouldManageTransaction) client.release();
    }
};

// Trigger close auction via API
const closeAuctionEndpoint = async (req, res) => {
    try {
        const { auctionId } = req.params;
        const transaction = await closeAuctionAndRecordWinner(auctionId);

        res.json({
            message: "Auction closed successfully",
            transaction: transaction
        });
    } catch (error) {
        console.error("CLOSE AUCTION ENDPOINT ERROR:", error);
        res.status(500).json({ error: "Failed to close auction" });
    }
};

// Get single transaction details
const getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT
                t.txn_id,
                t.auction_id,
                t.buyer_id,
                t.seller_id,
                t.winner_bid_id,
                t.payment_method_id,
                t.amount,
                t.payment_status,
                t.close_date,

                buyer.username AS buyer_username,
                buyer.full_name AS buyer_name,
                buyer.email AS buyer_email,

                seller.username AS seller_username,
                seller.full_name AS seller_name,
                seller.email AS seller_email,

                i.item_id,
                i.title AS item_title,
                i.description AS item_description,
                i.condition AS item_condition,
                i.starting_price,

                (
                    SELECT img_url
                    FROM item_images
                    WHERE item_images.item_id = i.item_id
                    ORDER BY img_id
                    LIMIT 1
                ) AS thumbnail_url,

                pm.method_name AS payment_method_name,

                s.shipment_id,
                s.carrier,
                s.tracking_number,
                s.status AS shipment_status,
                s.shipping_date,
                s.delivery_date

            FROM transactions t
            JOIN users buyer ON t.buyer_id = buyer.user_id
            JOIN users seller ON t.seller_id = seller.user_id
            JOIN auctions a ON t.auction_id = a.auction_id
            JOIN items i ON a.item_id = i.item_id
            LEFT JOIN payment_methods pm ON t.payment_method_id = pm.method_id
            LEFT JOIN shipments s ON t.txn_id = s.txn_id
            WHERE t.txn_id = $1 OR t.auction_id = $1
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("GET TRANSACTION ERROR:", error);
        res.status(500).json({ error: "Failed to retrieve transaction" });
    }
};

// Get all transactions for a user
const getUserTransactions = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.query; // 'buyer', 'seller', or undefined

        let queryText = `
            SELECT
                t.txn_id,
                t.auction_id,
                t.buyer_id,
                t.seller_id,
                t.amount,
                t.payment_status,
                t.close_date,

                buyer.username AS buyer_username,
                seller.username AS seller_username,

                i.item_id,
                i.title AS item_title,

                (
                    SELECT img_url
                    FROM item_images
                    WHERE item_images.item_id = i.item_id
                    ORDER BY img_id
                    LIMIT 1
                ) AS thumbnail_url,

                s.shipment_id,
                s.status AS shipment_status,
                s.tracking_number

            FROM transactions t
            JOIN users buyer ON t.buyer_id = buyer.user_id
            JOIN users seller ON t.seller_id = seller.user_id
            JOIN auctions a ON t.auction_id = a.auction_id
            JOIN items i ON a.item_id = i.item_id
            LEFT JOIN shipments s ON t.txn_id = s.txn_id
        `;

        const params = [userId];

        if (role === "buyer") {
            queryText += ` WHERE t.buyer_id = $1`;
        } else if (role === "seller") {
            queryText += ` WHERE t.seller_id = $1`;
        } else {
            queryText += ` WHERE t.buyer_id = $1 OR t.seller_id = $1`;
        }

        queryText += ` ORDER BY t.close_date DESC`;

        const result = await pool.query(queryText, params);
        res.json(result.rows);
    } catch (error) {
        console.error("GET USER TRANSACTIONS ERROR:", error);
        res.status(500).json({ error: "Failed to retrieve user transactions" });
    }
};

// Pay for a pending transaction (via Wallet or Payment Method)
const payTransaction = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { buyer_id, payment_method_type, payment_method_id, address_id } = req.body;

        if (!buyer_id) {
            return res.status(400).json({ error: "buyer_id is required" });
        }

        await client.query("BEGIN");

        // 1. Fetch transaction with lock
        const txnCheck = await client.query(
            `
            SELECT
                t.txn_id,
                t.auction_id,
                t.buyer_id,
                t.seller_id,
                t.amount,
                t.payment_status,
                i.title AS item_title
            FROM transactions t
            JOIN auctions a ON t.auction_id = a.auction_id
            JOIN items i ON a.item_id = i.item_id
            WHERE t.txn_id = $1
            FOR UPDATE
            `,
            [id]
        );

        if (txnCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Transaction not found" });
        }

        const txn = txnCheck.rows[0];

        if (txn.buyer_id !== Number(buyer_id)) {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "You are not authorized to pay for this transaction" });
        }

        if (txn.payment_status === "completed" || txn.payment_status === "paid") {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Transaction is already paid" });
        }

        const paymentAmount = Number(txn.amount);

        // 2. Process Payment based on type
        if (payment_method_type === "wallet") {
            // Check buyer wallet
            const buyerWalletRes = await client.query(
                `
                SELECT wallet_id, balance
                FROM wallets
                WHERE user_id = $1
                FOR UPDATE
                `,
                [buyer_id]
            );

            if (buyerWalletRes.rows.length === 0 || Number(buyerWalletRes.rows[0].balance) < paymentAmount) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: `Insufficient wallet balance. You need ৳${paymentAmount.toLocaleString()}, but have ৳${Number(buyerWalletRes.rows[0]?.balance || 0).toLocaleString()}.`
                });
            }

            const buyerWallet = buyerWalletRes.rows[0];

            // Deduct from buyer
            await client.query(
                `
                UPDATE wallets
                SET balance = balance - $1
                WHERE wallet_id = $2
                `,
                [paymentAmount, buyerWallet.wallet_id]
            );

            // Log buyer transaction
            await client.query(
                `
                INSERT INTO wallet_transactions (wallet_id, type, amount)
                VALUES ($1, 'payment', $2)
                `,
                [buyerWallet.wallet_id, paymentAmount]
            );
        }

        // Credit seller wallet (for all payment types)
        let sellerWalletRes = await client.query(
            `
            INSERT INTO wallets (user_id, balance)
            VALUES ($1, $2)
            ON CONFLICT (user_id)
            DO UPDATE SET balance = wallets.balance + $2
            RETURNING wallet_id, balance
            `,
            [txn.seller_id, paymentAmount]
        );

        const sellerWallet = sellerWalletRes.rows[0];

        // Log seller transaction
        await client.query(
            `
            INSERT INTO wallet_transactions (wallet_id, type, amount)
            VALUES ($1, 'sale_proceeds', $2)
            `,
            [sellerWallet.wallet_id, paymentAmount]
        );

        // 3. Update Transaction status
        const updatedTxn = await client.query(
            `
            UPDATE transactions
            SET
                payment_status = 'completed',
                payment_method_id = $1,
                close_date = NOW()
            WHERE txn_id = $2
            RETURNING *
            `,
            [payment_method_id || null, txn.txn_id]
        );

        // 4. Provision Shipment if address is available
        let resolvedAddressId = address_id;
        if (!resolvedAddressId) {
            // Find buyer default or first address
            const addrRes = await client.query(
                `SELECT address_id FROM addresses WHERE user_id = $1 LIMIT 1`,
                [buyer_id]
            );
            if (addrRes.rows.length > 0) {
                resolvedAddressId = addrRes.rows[0].address_id;
            }
        }

        if (resolvedAddressId) {
            await client.query(
                `
                INSERT INTO shipments (txn_id, address_id, status)
                VALUES ($1, $2, 'pending')
                ON CONFLICT (txn_id) DO NOTHING
                `,
                [txn.txn_id, resolvedAddressId]
            );
        }

        // 5. Create notifications
        await client.query(
            `
            INSERT INTO notifications (user_id, type, message)
            VALUES ($1, 'payment_success', $2)
            `,
            [
                buyer_id,
                `✅ Payment of ৳${paymentAmount.toLocaleString()} for "${txn.item_title}" was successful! Your shipment will be prepared soon.`
            ]
        );

        await client.query(
            `
            INSERT INTO notifications (user_id, type, message)
            VALUES ($1, 'payment_received', $2)
            `,
            [
                txn.seller_id,
                `💰 Payment of ৳${paymentAmount.toLocaleString()} for "${txn.item_title}" has been received and credited to your wallet. Please dispatch the shipment.`
            ]
        );

        await client.query("COMMIT");

        res.status(200).json({
            message: "Payment processed successfully",
            transaction: updatedTxn.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("PAY TRANSACTION ERROR:", error);
        res.status(500).json({ error: "Failed to process payment" });
    } finally {
        client.release();
    }
};

module.exports = {
    closeAuctionAndRecordWinner,
    closeAuctionEndpoint,
    getTransactionById,
    getUserTransactions,
    payTransaction
};
