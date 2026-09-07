const pool = require("../config/db");

/**
 * Get expired active auctions
 */
const getExpiredActiveAuctions = async () => {
    const query = `
        SELECT auction_id
        FROM auctions
        WHERE status = 'active' AND end_time <= NOW()
    `;
    const result = await pool.query(query);
    return result.rows;
};

/**
 * Find auction and item details by auction_id OR item_id
 */
const getAuctionDetails = async (id) => {
    const isUUID = typeof id === "string" && id.includes("-");
    const query = `
        SELECT
            a.auction_id,
            a.start_time,
            a.end_time,
            a.min_increment,
            a.status,
            a.winner_bid_id,

            i.item_id,
            i.item_uuid,
            i.title,
            i.description,
            i.year_of_origin,
            i.condition,
            i.starting_price,
            i.seller_id,

            c.category_id,
            c.category_name,

            u.username AS seller

        FROM items i

        JOIN users u
            ON i.seller_id = u.user_id

        JOIN categories c
            ON i.category_id = c.category_id

        LEFT JOIN auctions a
            ON a.item_id = i.item_id

        WHERE ${isUUID ? "i.item_uuid = $1" : "a.auction_id = $1 OR i.item_id = $1"}
    `;
    const result = await pool.query(query, [id]);
    return result.rows;
};

/**
 * Find item price info by item_id or item_uuid
 */
const getItemPriceInfo = async (id) => {
    const isUUID = typeof id === "string" && id.includes("-");
    const query = `
        SELECT item_id, item_uuid, starting_price
        FROM items
        WHERE ${isUUID ? "item_uuid = $1" : "item_id = $1"}
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
};

/**
 * Create default auction for item if missing
 */
const createDefaultAuction = async (itemId, minIncrement) => {
    const query = `
        INSERT INTO auctions
        (item_id, start_time, end_time, min_increment, status)
        VALUES ($1, NOW(), NOW() + INTERVAL '7 days', $2, 'active')
        ON CONFLICT (item_id) DO NOTHING
    `;
    await pool.query(query, [itemId, minIncrement]);
};

/**
 * Create or activate auction for item (used during bid placement fallback)
 */
const upsertActiveAuction = async (itemId, minIncrement) => {
    const query = `
        INSERT INTO auctions
        (item_id, start_time, end_time, min_increment, status)
        VALUES ($1, NOW(), NOW() + INTERVAL '7 days', $2, 'active')
        ON CONFLICT (item_id) DO UPDATE SET status = 'active'
        RETURNING auction_id, min_increment, status
    `;
    const result = await pool.query(query, [itemId, minIncrement]);
    return result.rows[0];
};

/**
 * Get all bids for an auction ordered by bid_amount DESC
 */
const getBidsByAuctionId = async (auctionId) => {
    const query = `
        SELECT
            b.bid_id,
            b.bid_amount,
            b.bid_time,
            b.bidder_id,
            u.username AS bidder_username
        FROM bids b
        JOIN users u ON b.bidder_id = u.user_id
        WHERE b.auction_id = $1
        ORDER BY b.bid_amount DESC, b.bid_time ASC
    `;
    const result = await pool.query(query, [auctionId]);
    return result.rows;
};

/**
 * Get transaction for auction if one exists
 */
const getAuctionTransaction = async (auctionId) => {
    const query = `
        SELECT
            t.txn_id,
            b.bidder_id AS buyer_id,
            t.winner_bid_id,
            t.amount,
            t.payment_status,
            t.date AS close_date,
            u.username AS buyer_username
        FROM transactions t
        LEFT JOIN bids b ON t.winner_bid_id = b.bid_id
        LEFT JOIN users u ON b.bidder_id = u.user_id
        WHERE t.auction_id = $1
    `;
    const result = await pool.query(query, [auctionId]);
    return result.rows[0] || null;
};

/**
 * Get auction info for placing a bid
 */
const getAuctionForBidding = async (id) => {
    const isUUID = typeof id === "string" && id.includes("-");
    const query = `
        SELECT a.auction_id, a.min_increment, a.status, i.starting_price, i.seller_id
        FROM auctions a
        JOIN items i ON a.item_id = i.item_id
        WHERE ${isUUID ? "i.item_uuid = $1" : "a.auction_id = $1 OR a.item_id = $1"}
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
};

/**
 * Get highest bid amount for an auction
 */
const getHighestBidAmount = async (auctionId) => {
    const query = `
        SELECT COALESCE(MAX(bid_amount), 0) AS highest_bid
        FROM bids
        WHERE auction_id = $1
    `;
    const result = await pool.query(query, [auctionId]);
    return Number(result.rows[0]?.highest_bid || 0);
};

/**
 * Insert a new bid
 */
const insertBid = async (auctionId, bidderId, bidAmount) => {
    const query = `
        INSERT INTO bids
        (auction_id, bidder_id, bid_amount)
        VALUES ($1, $2, $3)
        RETURNING *
    `;
    const result = await pool.query(query, [auctionId, bidderId, bidAmount]);
    return result.rows[0];
};

module.exports = {
    getExpiredActiveAuctions,
    getAuctionDetails,
    getItemPriceInfo,
    createDefaultAuction,
    upsertActiveAuction,
    getBidsByAuctionId,
    getAuctionTransaction,
    getAuctionForBidding,
    getHighestBidAmount,
    insertBid
};
