const pool = require("../config/db");

// Raw SQL aggregation: total registered users
const getTotalUsers = async () => {
    const sql = `SELECT COUNT(*) AS total_users FROM users`;
    const result = await pool.query(sql);
    return parseInt(result.rows[0].total_users, 10);
};

// Raw SQL aggregation: currently active auctions
const getActiveAuctions = async () => {
    const sql = `SELECT COUNT(*) AS active_auctions FROM auctions WHERE status = 'active'`;
    const result = await pool.query(sql);
    return parseInt(result.rows[0].active_auctions, 10);
};

// Raw SQL aggregation: completed transactions count + total sales volume
const getSalesStats = async () => {
    const sql = `
        SELECT
            COUNT(*)                    AS total_transactions,
            COALESCE(SUM(amount), 0)    AS total_sales_volume
        FROM transactions
        WHERE payment_status = 'completed'
    `;
    const result = await pool.query(sql);
    return {
        totalTransactions: parseInt(result.rows[0].total_transactions, 10),
        totalSalesVolume: parseFloat(result.rows[0].total_sales_volume)
    };
};

// Raw SQL aggregation: total listed items
const getTotalItems = async () => {
    const sql = `SELECT COUNT(*) AS total_items FROM items`;
    const result = await pool.query(sql);
    return parseInt(result.rows[0].total_items, 10);
};

// Raw SQL aggregation: most recent 5 bids across all auctions
const getRecentBids = async () => {
    const sql = `
        SELECT
            b.bid_id,
            b.bid_amount,
            b.bid_time,
            u.username   AS bidder,
            i.title      AS item_title
        FROM bids b
        JOIN users    u ON b.bidder_id = u.user_id
        JOIN auctions a ON b.auction_id = a.auction_id
        JOIN items    i ON a.item_id    = i.item_id
        ORDER BY b.bid_time DESC
        LIMIT 5
    `;
    const result = await pool.query(sql);
    return result.rows;
};

// Raw SQL: get all users with summary stats
const getAllUsersDetailed = async () => {
    const sql = `
        SELECT
            u.user_id,
            u.username,
            u.full_name,
            u.email,
            u.status,
            COALESCE(w.balance, 0.00) AS wallet_balance,
            COUNT(i.item_id) AS items_listed
        FROM users u
        LEFT JOIN wallets w ON u.user_id = w.user_id
        LEFT JOIN items i   ON u.user_id = i.seller_id
        GROUP BY u.user_id, u.username, u.full_name, u.email, u.status, w.balance
        ORDER BY u.user_id ASC
    `;
    const result = await pool.query(sql);
    return result.rows;
};

// Raw SQL: toggle user status between 'active' and 'suspended'
const updateUserStatus = async (userId, status) => {
    const sql = `
        UPDATE users
        SET status = $1
        WHERE user_id = $2
        RETURNING user_id, username, full_name, email, status
    `;
    const result = await pool.query(sql, [status, userId]);
    return result.rows[0] || null;
};

// Raw SQL: get all items across platform for moderation
const getAllItemsDetailed = async () => {
    const sql = `
        SELECT
            i.item_id,
            i.title,
            i.starting_price,
            c.category_name,
            u.username AS seller_username,
            a.auction_id,
            COALESCE(a.status, 'unlisted') AS auction_status,
            a.start_time,
            a.end_time,
            COALESCE(
                (SELECT MAX(bid_amount) FROM bids WHERE bids.auction_id = a.auction_id),
                i.starting_price
            ) AS current_price,
            (SELECT COUNT(*) FROM bids WHERE bids.auction_id = a.auction_id) AS total_bids
        FROM items i
        JOIN categories c ON i.category_id = c.category_id
        JOIN users u      ON i.seller_id = u.user_id
        LEFT JOIN auctions a ON i.item_id = a.item_id
        ORDER BY i.item_id DESC
    `;
    const result = await pool.query(sql);
    return result.rows;
};

// Cancel an auction and atomically return the currently held escrow to the top bidder.
const cancelAuctionAndRefundEscrow = async (auctionId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const auctionResult = await client.query(
            `SELECT a.auction_id, a.status, i.title
             FROM auctions a
             JOIN items i ON i.item_id = a.item_id
             WHERE a.auction_id = $1
             FOR UPDATE OF a`,
            [auctionId]
        );
        const auction = auctionResult.rows[0];
        if (!auction) {
            await client.query("ROLLBACK");
            return null;
        }
        if (!["active", "scheduled"].includes(auction.status)) {
            const error = new Error("Only active or scheduled auctions can be cancelled.");
            error.statusCode = 400;
            throw error;
        }
        // Under Option A Escrow Pre-Funded Bidding, previous outbid bidders were
        // already refunded immediately upon being outbid. Therefore, only the
        // current leading (highest) bidder has funds locked in escrow.
        const topBidResult = await client.query(
            `SELECT bid_id, bidder_id, bid_amount
             FROM bids
             WHERE auction_id = $1
             ORDER BY bid_amount DESC, bid_time ASC
             LIMIT 1`,
            [auctionId]
        );
        const topBid = topBidResult.rows[0];

        if (topBid) {
            const walletResult = await client.query(
                `SELECT wallet_id FROM wallets WHERE user_id = $1 FOR UPDATE`,
                [topBid.bidder_id]
            );
            const wallet = walletResult.rows[0];
            if (!wallet) {
                throw new Error("Bidder wallet is missing; cancellation could not be settled safely.");
            }

            const refundAmount = Number(topBid.bid_amount);

            await client.query(
                `UPDATE wallets SET balance = balance + $1 WHERE wallet_id = $2`,
                [refundAmount, wallet.wallet_id]
            );
            await client.query(
                `INSERT INTO wallet_transactions (wallet_id, bid_id, type, amount)
                 VALUES ($1, $2, 'auction_cancel_refund', $3)`,
                [wallet.wallet_id, topBid.bid_id, refundAmount]
            );
            await client.query(
                `INSERT INTO notifications (user_id, type, message)
                 VALUES ($1, 'auction_cancelled', $2)`,
                [
                    topBid.bidder_id,
                    `The auction for "${auction.title}" was cancelled. Your bid of BDT ${refundAmount.toLocaleString()} has been returned to your wallet.`
                ]
            );
        }

        const updatedResult = await client.query(
            `UPDATE auctions SET status = 'cancelled' WHERE auction_id = $1 RETURNING auction_id, status`,
            [auctionId]
        );
        await client.query("COMMIT");
        return updatedResult.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

// A cancelled auction can only be restored when it has no bid history. Otherwise
// the prior high bid has already been refunded and must not become active again.
const reactivateAuctionWithoutBids = async (auctionId) => {
    const result = await pool.query(
        `UPDATE auctions a
         SET status = 'active'
         WHERE a.auction_id = $1
           AND a.status = 'cancelled'
           AND NOT EXISTS (SELECT 1 FROM bids b WHERE b.auction_id = a.auction_id)
         RETURNING a.auction_id, a.status`,
        [auctionId]
    );
    return result.rows[0] || null;
};

// Raw SQL: delete category (if no items reference it)
const deleteCategory = async (categoryId) => {
    const checkSql = `SELECT COUNT(*) AS count FROM items WHERE category_id = $1`;
    const checkRes = await pool.query(checkSql, [categoryId]);
    if (parseInt(checkRes.rows[0].count, 10) > 0) {
        throw new Error("Cannot delete category because it contains active items.");
    }
    const sql = `DELETE FROM categories WHERE category_id = $1 RETURNING category_id, category_name`;
    const result = await pool.query(sql, [categoryId]);
    return result.rows[0] || null;
};


const getAllDisputes = async () => {
    const sql = `
        SELECT
            d.dispute_id,
            d.status AS dispute_status,
            d.reason,
            d.date AS raised_at,
            s.shipment_id,
            s.status AS shipment_status,
            s.carrier,
            s.tracking_number,
            i.title AS item_title,
            i.starting_price,
            t.amount AS payment_amount,
            t.txn_id,
            buyer.user_id AS buyer_id,
            buyer.username AS buyer_username,
            buyer.email AS buyer_email,
            seller.user_id AS seller_id,
            seller.username AS seller_username,
            seller.email AS seller_email
        FROM disputes d
        JOIN shipments s ON d.shipment_id = s.shipment_id
        JOIN transactions t ON s.txn_id = t.txn_id
        JOIN auctions a ON t.auction_id = a.auction_id
        JOIN items i ON a.item_id = i.item_id
        JOIN users buyer ON d.raised_by = buyer.user_id
        JOIN users seller ON i.seller_id = seller.user_id
        ORDER BY CASE WHEN d.status = 'open' THEN 0 ELSE 1 END, d.date DESC
    `;
    const result = await pool.query(sql);
    return result.rows;
};

const resolveDispute = async (disputeId, adminId, decision) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        // 1. Get dispute details
        const disputeRes = await client.query(
            `SELECT d.shipment_id, d.status, s.txn_id, t.amount, buyer.user_id AS buyer_id, seller.user_id AS seller_id
             FROM disputes d
             JOIN shipments s ON d.shipment_id = s.shipment_id
             JOIN transactions t ON s.txn_id = t.txn_id
             JOIN auctions a ON t.auction_id = a.auction_id
             JOIN items i ON a.item_id = i.item_id
             JOIN users buyer ON d.raised_by = buyer.user_id
             JOIN users seller ON i.seller_id = seller.user_id
             WHERE d.dispute_id = $1 FOR UPDATE`,
            [disputeId]
        );
        
        if (disputeRes.rows.length === 0) throw new Error("Dispute not found");
        const dispute = disputeRes.rows[0];
        
        if (dispute.status !== 'open') throw new Error("Dispute is already resolved");
        
        const paymentAmount = Number(dispute.amount);
        
        if (decision === 'refund_buyer') {
            // Update dispute
            await client.query("UPDATE disputes SET status = 'resolved', resolved_by = $1 WHERE dispute_id = $2", [adminId, disputeId]);
            // Update shipment
            await client.query("UPDATE shipments SET status = 'dispute_refunded' WHERE shipment_id = $1", [dispute.shipment_id]);
            // Refund wallet
            const walletRes = await client.query("SELECT wallet_id FROM wallets WHERE user_id = $1 FOR UPDATE", [dispute.buyer_id]);
            if (walletRes.rows.length > 0) {
                const buyerWalletId = walletRes.rows[0].wallet_id;
                await client.query("UPDATE wallets SET balance = balance + $1 WHERE wallet_id = $2", [paymentAmount, buyerWalletId]);
                await client.query("INSERT INTO wallet_transactions (wallet_id, txn_id, type, amount) VALUES ($1, $2, 'dispute_refund', $3)", [buyerWalletId, dispute.txn_id, paymentAmount]);
            }
            // Notify buyer
            await client.query("INSERT INTO notifications (user_id, type, message) VALUES ($1, 'dispute_resolved', $2)", [dispute.buyer_id, `Admin sided with you in the dispute. Escrow amount of ৳${paymentAmount.toLocaleString()} has been refunded to your wallet.`]);
            // Update txn
            await client.query("UPDATE transactions SET payment_status = 'refunded' WHERE txn_id = $1", [dispute.txn_id]);
        } else if (decision === 'release_seller') {
            // Update dispute
            await client.query("UPDATE disputes SET status = 'resolved', resolved_by = $1 WHERE dispute_id = $2", [adminId, disputeId]);
            // Update shipment
            await client.query("UPDATE shipments SET status = 'delivered' WHERE shipment_id = $1", [dispute.shipment_id]);
            // Call Escrow release proc
            await client.query('CALL release_escrow($1, $2, $3)', [dispute.txn_id, dispute.seller_id, paymentAmount]);
            // Notify seller
            await client.query("INSERT INTO notifications (user_id, type, message) VALUES ($1, 'dispute_resolved', $2)", [dispute.seller_id, `Admin sided with you in the dispute. Escrow amount of ৳${paymentAmount.toLocaleString()} has been released to your wallet.`]);
        } else {
            throw new Error("Invalid decision type");
        }
        
        await client.query("COMMIT");
        return { success: true };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

module.exports = {
    getAllDisputes,
    resolveDispute,
    getTotalUsers,
    getActiveAuctions,
    getSalesStats,
    getTotalItems,
    getRecentBids,
    getAllUsersDetailed,
    updateUserStatus,
    getAllItemsDetailed,
    cancelAuctionAndRefundEscrow,
    reactivateAuctionWithoutBids,
    deleteCategory
};
