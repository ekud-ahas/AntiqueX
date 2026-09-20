const pool = require("../config/db");

/**
 * Close an auction, select highest bidder, create transaction, and send notifications
 */
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
                    winner_bid_id,
                    amount,
                    payment_status,
                    date
                )
                VALUES ($1, $2, $3, 'pending', NOW())
                ON CONFLICT (auction_id)
                DO UPDATE SET
                    winner_bid_id = EXCLUDED.winner_bid_id,
                    amount = EXCLUDED.amount
                RETURNING *
                `,
                [
                    auctionId,
                    data.bid_id,
                    Number(data.bid_amount)
                ]
            );

            // Also update auctions table with winner_bid_id
            await client.query(
                `
                UPDATE auctions
                SET winner_bid_id = $1, status = 'ended'
                WHERE auction_id = $2
                `,
                [data.bid_id, auctionId]
            );

            transaction = txnRes.rows[0];

            // Under Escrow Pre-Funded Bidding (Option A):
            // The winner's winning bid was already deducted and held at bid time.
            // Settle immediately: credit the seller's wallet, mark transaction as completed, and provision shipment!
            const winningAmount = Number(data.bid_amount);

            // Credit seller wallet
            const sellerWalletRes = await client.query(
                `INSERT INTO wallets (user_id, balance)
                 VALUES ($1, $2)
                 ON CONFLICT (user_id)
                 DO UPDATE SET balance = wallets.balance + $2
                 RETURNING wallet_id`,
                [data.seller_id, winningAmount]
            );
            const sellerWalletId = sellerWalletRes.rows[0].wallet_id;

            // Log sale proceeds in seller's wallet ledger
            await client.query(
                `INSERT INTO wallet_transactions (wallet_id, txn_id, type, amount)
                 VALUES ($1, $2, 'sale_proceeds', $3)`,
                [sellerWalletId, transaction.txn_id, winningAmount]
            );

            // Mark transaction completed (pre-funded escrow settled)
            await client.query(
                `UPDATE transactions SET payment_status = 'completed', date = NOW() WHERE txn_id = $1`,
                [transaction.txn_id]
            );
            transaction.payment_status = "completed";

            // Automatically provision shipment linked to buyer address
            const buyerAddrRes = await client.query(
                `SELECT address_id FROM addresses WHERE user_id = $1 ORDER BY address_id DESC LIMIT 1`,
                [data.bidder_id]
            );
            let addressId = buyerAddrRes.rows[0]?.address_id;
            if (!addressId) {
                const newAddr = await client.query(
                    `INSERT INTO addresses (user_id, street, city) VALUES ($1, 'Default Delivery Address', 'Dhaka') RETURNING address_id`,
                    [data.bidder_id]
                );
                addressId = newAddr.rows[0].address_id;
            }

            await client.query(
                `INSERT INTO shipments (txn_id, address_id, status)
                 VALUES ($1, $2, 'pending')
                 ON CONFLICT (txn_id) DO NOTHING`,
                [transaction.txn_id, addressId]
            );

            // Notify winner
            await client.query(
                `
                INSERT INTO notifications (user_id, type, message)
                VALUES ($1, 'auction_won', $2)
                `,
                [
                    data.bidder_id,
                    `Congratulations! You won the auction for "${data.title}". Your held bid of BDT ${winningAmount.toLocaleString()} has been finalized. Shipment is now pending seller dispatch.`
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
                    `Your antique "${data.title}" was sold for BDT ${winningAmount.toLocaleString()} to @${data.buyer_username}. BDT ${winningAmount.toLocaleString()} has been credited to your wallet.`
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
                    `Your auction for "${data.title}" closed with no bids placed.`
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

/**
 * Get full transaction details by txn_id or auction_id
 */
const getTransactionDetails = async (id) => {
    const query = `
        SELECT
            t.txn_id,
            t.auction_id,
            b.bidder_id AS buyer_id,
            i.seller_id,
            t.winner_bid_id,
            wt.payment_method_id,
            t.amount,
            t.payment_status,
            t.date AS close_date,

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
            s.deliver_date AS delivery_date

        FROM transactions t
        JOIN auctions a ON t.auction_id = a.auction_id
        JOIN items i ON a.item_id = i.item_id
        JOIN users seller ON i.seller_id = seller.user_id
        LEFT JOIN bids b ON t.winner_bid_id = b.bid_id
        LEFT JOIN users buyer ON b.bidder_id = buyer.user_id
        LEFT JOIN wallet_transactions wt ON t.txn_id = wt.txn_id
        LEFT JOIN payment_methods pm ON wt.payment_method_id = pm.method_id
        LEFT JOIN shipments s ON t.txn_id = s.txn_id
        WHERE t.txn_id = $1 OR t.auction_id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
};

/**
 * Get all transactions for a user (as buyer, seller, or either)
 */
const getUserTransactions = async (userId, role) => {
    let queryText = `
        SELECT
            t.txn_id,
            t.auction_id,
            b.bidder_id AS buyer_id,
            i.seller_id,
            t.amount,
            t.payment_status,
            t.date AS close_date,

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
        JOIN auctions a ON t.auction_id = a.auction_id
        JOIN items i ON a.item_id = i.item_id
        JOIN users seller ON i.seller_id = seller.user_id
        LEFT JOIN bids b ON t.winner_bid_id = b.bid_id
        LEFT JOIN users buyer ON b.bidder_id = buyer.user_id
        LEFT JOIN shipments s ON t.txn_id = s.txn_id
    `;

    const params = [userId];

    if (role === "buyer") {
        queryText += ` WHERE b.bidder_id = $1`;
    } else if (role === "seller") {
        queryText += ` WHERE i.seller_id = $1`;
    } else {
        queryText += ` WHERE b.bidder_id = $1 OR i.seller_id = $1`;
    }

    queryText += ` ORDER BY t.date DESC`;

    const result = await pool.query(queryText, params);
    return result.rows;
};

/**
 * Process payment for a pending transaction
 */
const processPayment = async ({
    txnId,
    buyerId,
    paymentMethodType = "wallet",
    paymentMethodId = null,
    addressId = null,
    deliveryAddressNote = null
}) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Fetch transaction with lock
        const txnCheck = await client.query(
            `
            SELECT
                t.txn_id,
                t.auction_id,
                b.bidder_id AS buyer_id,
                i.seller_id,
                t.amount,
                t.payment_status,
                i.title AS item_title
            FROM transactions t
            JOIN auctions a ON t.auction_id = a.auction_id
            JOIN items i ON a.item_id = i.item_id
            LEFT JOIN bids b ON t.winner_bid_id = b.bid_id
            WHERE t.txn_id = $1
            FOR UPDATE OF t
            `,
            [txnId]
        );

        if (txnCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return { error: "Transaction not found", status: 404 };
        }

        const txn = txnCheck.rows[0];

        if (txn.buyer_id !== Number(buyerId)) {
            await client.query("ROLLBACK");
            return { error: "You are not authorized to pay for this transaction", status: 403 };
        }

        if (txn.payment_status === "completed" || txn.payment_status === "paid") {
            await client.query("ROLLBACK");
            return { error: "Transaction is already paid", status: 400 };
        }

        const paymentAmount = Number(txn.amount);
        // The only checkout source is the buyer's AntiqueX wallet.
        const buyerWalletRes = await client.query(
            `SELECT wallet_id, balance
             FROM wallets
             WHERE user_id = $1
             FOR UPDATE`,
            [buyerId]
        );

        if (buyerWalletRes.rows.length === 0 || Number(buyerWalletRes.rows[0].balance) < paymentAmount) {
            await client.query("ROLLBACK");
            return {
                error: `Insufficient wallet balance. You need BDT ${paymentAmount.toLocaleString()}, but have BDT ${Number(buyerWalletRes.rows[0]?.balance || 0).toLocaleString()}. Please deposit funds first.`,
                status: 400
            };
        }

        const buyerWallet = buyerWalletRes.rows[0];
        await client.query(
            `UPDATE wallets
             SET balance = balance - $1
             WHERE wallet_id = $2`,
            [paymentAmount, buyerWallet.wallet_id]
        );
        await client.query(
            `INSERT INTO wallet_transactions (wallet_id, txn_id, type, amount)
             VALUES ($1, $2, 'payment', $3)`,
            [buyerWallet.wallet_id, txn.txn_id, paymentAmount]
        );

        // Credit seller wallet
        const sellerWalletRes = await client.query(
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
            INSERT INTO wallet_transactions (wallet_id, txn_id, payment_method_id, type, amount)
            VALUES ($1, $2, $3, 'sale_proceeds', $4)
            `,
            [sellerWallet.wallet_id, txn.txn_id, paymentAmount]
        );

        // 3. Update Transaction status
        const updatedTxn = await client.query(
            `
            UPDATE transactions
            SET
                payment_status = 'completed',
                date = NOW()
            WHERE txn_id = $1
            RETURNING *
            `,
            [txn.txn_id]
        );

        // 4. Provision Shipment with robust address resolution
        let resolvedAddressId = addressId;
        if (deliveryAddressNote && deliveryAddressNote.trim()) {
            const newAddr = await client.query(
                `INSERT INTO addresses (user_id, street, city)
                 VALUES ($1, $2, 'Dhaka')
                 RETURNING address_id`,
                [buyerId, deliveryAddressNote.trim()]
            );
            resolvedAddressId = newAddr.rows[0].address_id;
        } else if (!resolvedAddressId) {
            const addrRes = await client.query(
                `SELECT address_id FROM addresses WHERE user_id = $1 ORDER BY address_id DESC LIMIT 1`,
                [buyerId]
            );
            if (addrRes.rows.length > 0) {
                resolvedAddressId = addrRes.rows[0].address_id;
            } else {
                const defaultAddr = await client.query(
                    `INSERT INTO addresses (user_id, street, city)
                     VALUES ($1, 'Primary Delivery Address', 'Dhaka')
                     RETURNING address_id`,
                    [buyerId]
                );
                resolvedAddressId = defaultAddr.rows[0].address_id;
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
                buyerId,
                `Payment of BDT ${paymentAmount.toLocaleString()} for "${txn.item_title}" was successful. Your shipment will be prepared soon.`
            ]
        );

        await client.query(
            `
            INSERT INTO notifications (user_id, type, message)
            VALUES ($1, 'payment_received', $2)
            `,
            [
                txn.seller_id,
                `Payment of BDT ${paymentAmount.toLocaleString()} for "${txn.item_title}" has been received and credited to your wallet. Please dispatch the shipment.`
            ]
        );

        await client.query("COMMIT");

        return {
            transaction: updatedTxn.rows[0]
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    closeAuctionAndRecordWinner,
    getTransactionDetails,
    getUserTransactions,
    processPayment
};
