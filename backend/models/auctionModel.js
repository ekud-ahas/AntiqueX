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
 * Atomically validate and place a bid under a row-level lock and transaction
 */
const placeBidWithLock = async ({ id, bidderId, bidAmount }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const isUUID = typeof id === "string" && id.includes("-");

        // 1. Lock the auction row for update to prevent concurrent race conditions
        const lockQuery = `
            SELECT
                a.auction_id,
                a.min_increment,
                a.status,
                a.end_time,
                a.start_time,
                i.starting_price,
                i.seller_id,
                i.title
            FROM auctions a
            JOIN items i ON a.item_id = i.item_id
            WHERE ${isUUID ? "i.item_uuid = $1" : "a.auction_id = $1 OR a.item_id = $1"}
            FOR UPDATE OF a
        `;
        let result = await client.query(lockQuery, [id]);

        // Fallback: If auction hasn't been created yet, create it atomically
        if (result.rows.length === 0) {
            const itemRes = await client.query(
                `SELECT item_id, starting_price, seller_id, title FROM items WHERE ${isUUID ? "item_uuid = $1" : "item_id = $1"}`,
                [id]
            );

            if (itemRes.rows.length === 0) {
                await client.query("ROLLBACK");
                const err = new Error("Auction not found");
                err.statusCode = 404;
                throw err;
            }

            const item = itemRes.rows[0];
            const calculatedMinInc = Math.max(100, Math.round((Number(item.starting_price) * 0.05) / 100) * 100);

            const newAuctionRes = await client.query(
                `INSERT INTO auctions (item_id, start_time, end_time, min_increment, status)
                 VALUES ($1, NOW(), NOW() + INTERVAL '7 days', $2, 'active')
                 RETURNING auction_id, min_increment, status, end_time, start_time`,
                [item.item_id, calculatedMinInc]
            );

            result = {
                rows: [{
                    ...newAuctionRes.rows[0],
                    starting_price: item.starting_price,
                    seller_id: item.seller_id,
                    title: item.title
                }]
            };
        }

        const auction = result.rows[0];

        // 2. Validate auction status
        if (auction.status !== "active") {
            await client.query("ROLLBACK");
            const err = new Error(`Auction is not active (current status: ${auction.status})`);
            err.statusCode = 400;
            throw err;
        }

        // 3. Validate real-time expiration
        const endTime = new Date(auction.end_time).getTime();
        if (endTime <= Date.now()) {
            await client.query("ROLLBACK");
            const err = new Error("Auction has already ended. Bidding is closed.");
            err.statusCode = 400;
            throw err;
        }

        // 4. Verify seller is not bidding on own item
        if (Number(auction.seller_id) === Number(bidderId)) {
            await client.query("ROLLBACK");
            const err = new Error("Sellers are prohibited from bidding on their own listings.");
            err.statusCode = 400;
            throw err;
        }

        // 5. Query current highest bid under the lock
        const prevTopBidderRes = await client.query(
            `SELECT bid_id, bidder_id, bid_amount FROM bids
             WHERE auction_id = $1
             ORDER BY bid_amount DESC LIMIT 1`,
            [auction.auction_id]
        );
        const prevTopBid = prevTopBidderRes.rows[0] || null;
        const highestBid = prevTopBid ? Number(prevTopBid.bid_amount) : 0;
        const startingPrice = Number(auction.starting_price);
        const minIncrement = Number(auction.min_increment);

        const minimumBid = highestBid === 0
            ? startingPrice
            : highestBid + minIncrement;

        if (Number(bidAmount) < minimumBid) {
            await client.query("ROLLBACK");
            const err = new Error(`Bid must be at least ৳${minimumBid.toLocaleString()}`);
            err.statusCode = 400;
            throw err;
        }

        // 6. ESCROW WALLET DEDUCTION (Option A)
        // Lock bidder's wallet to check balance
        const bidderWalletRes = await client.query(
            `SELECT wallet_id, balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
            [bidderId]
        );

        let bidderWallet = bidderWalletRes.rows[0];
        if (!bidderWallet) {
            const createWalletRes = await client.query(
                `INSERT INTO wallets (user_id, balance) VALUES ($1, 0.00) RETURNING wallet_id, balance`,
                [bidderId]
            );
            bidderWallet = createWalletRes.rows[0];
        }

        const bidderBalance = Number(bidderWallet.balance);
        const isSelfRaising = prevTopBid && Number(prevTopBid.bidder_id) === Number(bidderId);
        // If bidder is already top bidder raising their own bid, deduct only difference
        const requiredDeduction = isSelfRaising
            ? Number(bidAmount) - Number(prevTopBid.bid_amount)
            : Number(bidAmount);

        if (bidderBalance < requiredDeduction) {
            await client.query("ROLLBACK");
            const err = new Error(
                `Insufficient wallet balance to place this bid. Required: ৳${requiredDeduction.toLocaleString()}, Available: ৳${bidderBalance.toLocaleString()}. Please deposit funds first.`
            );
            err.statusCode = 400;
            throw err;
        }

        // Deduct escrow amount from bidder's wallet
        await client.query(
            `UPDATE wallets SET balance = balance - $1 WHERE wallet_id = $2`,
            [requiredDeduction, bidderWallet.wallet_id]
        );

        // 7. Insert new bid
        const newBidRes = await client.query(
            `INSERT INTO bids (auction_id, bidder_id, bid_amount)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [auction.auction_id, bidderId, Number(bidAmount)]
        );
        const newBid = newBidRes.rows[0];

        // Log wallet transaction for the escrow hold
        await client.query(
            `INSERT INTO wallet_transactions (wallet_id, bid_id, type, amount)
             VALUES ($1, $2, 'bid_escrow', $3)`,
            [bidderWallet.wallet_id, newBid.bid_id, requiredDeduction]
        );

        // 8. Immediately refund the previous top bidder if they are a different user
        if (prevTopBid && Number(prevTopBid.bidder_id) !== Number(bidderId)) {
            const refundAmount = Number(prevTopBid.bid_amount);

            const prevWalletRes = await client.query(
                `SELECT wallet_id FROM wallets WHERE user_id = $1 FOR UPDATE`,
                [prevTopBid.bidder_id]
            );

            if (prevWalletRes.rows.length > 0) {
                const prevWalletId = prevWalletRes.rows[0].wallet_id;

                await client.query(
                    `UPDATE wallets SET balance = balance + $1 WHERE wallet_id = $2`,
                    [refundAmount, prevWalletId]
                );

                await client.query(
                    `INSERT INTO wallet_transactions (wallet_id, bid_id, type, amount)
                     VALUES ($1, $2, 'bid_refund', $3)`,
                    [prevWalletId, prevTopBid.bid_id, refundAmount]
                );

                await client.query(
                    `INSERT INTO notifications (user_id, type, message)
                     VALUES ($1, 'outbid_alert', $2)`,
                    [
                        prevTopBid.bidder_id,
                        `You have been outbid on "${auction.title}". Your bid of BDT ${refundAmount.toLocaleString()} has been refunded to your wallet.`
                    ]
                );
            }
        }

        await client.query("COMMIT");
        return newBid;


    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
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
    placeBidWithLock
};
