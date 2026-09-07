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

// Raw SQL: change auction status (e.g. flag/cancel or reactivate)
const updateAuctionStatus = async (auctionId, status) => {
    const sql = `
        UPDATE auctions
        SET status = $1
        WHERE auction_id = $2
        RETURNING auction_id, status
    `;
    const result = await pool.query(sql, [status, auctionId]);
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

module.exports = {
    getTotalUsers,
    getActiveAuctions,
    getSalesStats,
    getTotalItems,
    getRecentBids,
    getAllUsersDetailed,
    updateUserStatus,
    getAllItemsDetailed,
    updateAuctionStatus,
    deleteCategory
};
