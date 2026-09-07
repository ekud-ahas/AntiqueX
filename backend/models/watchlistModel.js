const pool = require("../config/db");

/**
 * Get user's watchlist with auction, bids, and thumbnail
 */
const getWatchlistByUserId = async (userId) => {
    const query = `
        SELECT
            w.watchlist_id,
            w.date AS watched_since,

            i.item_id,
            i.title,
            i.starting_price,

            a.auction_id,
            a.status AS auction_status,
            a.end_time,

            COALESCE(MAX(b.bid_amount), 0) AS highest_bid,

            (
                SELECT img_url
                FROM item_images
                WHERE item_images.item_id = i.item_id
                ORDER BY img_id
                LIMIT 1
            ) AS thumbnail_url

        FROM watchlist w

        JOIN items i
            ON w.item_id = i.item_id

        LEFT JOIN auctions a
            ON a.item_id = i.item_id

        LEFT JOIN bids b
            ON b.auction_id = a.auction_id

        WHERE w.user_id = $1

        GROUP BY
            w.watchlist_id,
            i.item_id,
            a.auction_id

        ORDER BY w.date DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
};

/**
 * Check if item exists in items table
 */
const checkItemExists = async (itemId) => {
    const query = "SELECT item_id FROM items WHERE item_id = $1";
    const result = await pool.query(query, [itemId]);
    return result.rows.length > 0;
};

/**
 * Check if item is already in user's watchlist
 */
const findWatchlistEntry = async (userId, itemId) => {
    const query = `
        SELECT watchlist_id
        FROM watchlist
        WHERE user_id = $1 AND item_id = $2
    `;
    const result = await pool.query(query, [userId, itemId]);
    return result.rows[0] || null;
};

/**
 * Add item to watchlist
 */
const addToWatchlist = async (userId, itemId) => {
    const query = `
        INSERT INTO watchlist (user_id, item_id)
        VALUES ($1, $2)
        RETURNING *
    `;
    const result = await pool.query(query, [userId, itemId]);
    return result.rows[0];
};

/**
 * Remove item from watchlist
 */
const removeFromWatchlist = async (userId, itemId) => {
    const query = `
        DELETE FROM watchlist
        WHERE user_id = $1 AND item_id = $2
        RETURNING *
    `;
    const result = await pool.query(query, [userId, itemId]);
    return result.rows[0] || null;
};

module.exports = {
    getWatchlistByUserId,
    checkItemExists,
    findWatchlistEntry,
    addToWatchlist,
    removeFromWatchlist
};
