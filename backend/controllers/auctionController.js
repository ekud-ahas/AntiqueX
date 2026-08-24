const pool = require("../config/db");
const { closeAuctionAndRecordWinner } = require("./transactionController");

// Get one auction (looks up by auction_id OR item_id, and auto-creates auction if missing)
const getAuction = async (req, res) => {
    try {
        const { id } = req.params;

        // Auto-close expired active auctions and record winners & transactions
        const expiredAuctions = await pool.query(`
            SELECT auction_id
            FROM auctions
            WHERE status = 'active' AND end_time <= NOW()
        `);

        for (const row of expiredAuctions.rows) {
            await closeAuctionAndRecordWinner(row.auction_id);
        }

        // First attempt: lookup auction
        let auctionQuery = await pool.query(
            `
            SELECT
                a.auction_id,
                a.start_time,
                a.end_time,
                a.min_increment,
                a.status,

                i.item_id,
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

            WHERE a.auction_id = $1 OR i.item_id = $1
            `,
            [id]
        );

        // If no auction row exists for this item yet, create one on-the-fly
        if (auctionQuery.rows.length === 0 || !auctionQuery.rows[0].auction_id) {
            const itemCheck = await pool.query(
                `SELECT item_id, starting_price FROM items WHERE item_id = $1`,
                [id]
            );

            if (itemCheck.rows.length === 0) {
                return res.status(404).json({
                    error: "Auction / Item not found"
                });
            }

            const item = itemCheck.rows[0];
            const calculatedMinInc = Math.max(100, Math.round((Number(item.starting_price) * 0.05) / 100) * 100);

            await pool.query(
                `
                INSERT INTO auctions
                (item_id, start_time, end_time, min_increment, status)
                VALUES ($1, NOW(), NOW() + INTERVAL '7 days', $2, 'active')
                ON CONFLICT (item_id) DO NOTHING
                `,
                [item.item_id, calculatedMinInc]
            );

            // Re-fetch after creation
            auctionQuery = await pool.query(
                `
                SELECT
                    a.auction_id,
                    a.start_time,
                    a.end_time,
                    a.min_increment,
                    a.status,

                    i.item_id,
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

                JOIN auctions a
                    ON a.item_id = i.item_id

                WHERE a.auction_id = $1 OR i.item_id = $1
                `,
                [id]
            );
        }

        if (auctionQuery.rows.length === 0) {
            return res.status(404).json({
                error: "Auction not found"
            });
        }

        const auctionData = auctionQuery.rows[0];

        // Fetch all bids for this auction (ordered highest to lowest)
        const bidsResult = await pool.query(
            `
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
            `,
            [auctionData.auction_id]
        );

        const bids = bidsResult.rows;
        const totalBids = bids.length;
        const highestBid = totalBids > 0 ? Number(bids[0].bid_amount) : 0;
        const highestBidder = totalBids > 0 ? bids[0].bidder_username : null;
        const highestBidderId = totalBids > 0 ? bids[0].bidder_id : null;
        const winnerBidId = totalBids > 0 ? bids[0].bid_id : null;

        // Check if there is an existing transaction record
        const txnResult = await pool.query(
            `
            SELECT
                t.txn_id,
                t.buyer_id,
                t.winner_bid_id,
                t.amount,
                t.payment_status,
                t.close_date,
                u.username AS buyer_username
            FROM transactions t
            JOIN users u ON t.buyer_id = u.user_id
            WHERE t.auction_id = $1
            `,
            [auctionData.auction_id]
        );

        const transaction = txnResult.rows.length > 0 ? txnResult.rows[0] : null;

        res.json({
            ...auctionData,
            highest_bid: highestBid,
            highest_bidder: highestBidder,
            highest_bidder_id: highestBidderId,
            winner_bid_id: transaction ? transaction.winner_bid_id : winnerBidId,
            winner_id: transaction ? transaction.buyer_id : highestBidderId,
            winner_username: transaction ? transaction.buyer_username : highestBidder,
            total_bids: totalBids,
            bids: bids,
            transaction: transaction
        });

    } catch (error) {
        console.error("GET AUCTION ERROR:", error);

        res.status(500).json({
            error: "Failed to retrieve auction"
        });
    }
};


// Place a bid
const placeBid = async (req, res) => {
    try {
        const { id } = req.params;
        const { bidder_id, bid_amount } = req.body;

        if (!bidder_id || !bid_amount) {
            return res.status(400).json({
                error: "Bidder ID and bid amount are required"
            });
        }

        // Find auction by auction_id OR item_id
        let auctionResult = await pool.query(
            `
            SELECT a.auction_id, a.min_increment, a.status, i.starting_price
            FROM auctions a
            JOIN items i ON a.item_id = i.item_id
            WHERE a.auction_id = $1 OR a.item_id = $1
            `,
            [id]
        );

        if (auctionResult.rows.length === 0) {
            // Check if item exists and create auction
            const itemCheck = await pool.query(
                `SELECT item_id, starting_price FROM items WHERE item_id = $1`,
                [id]
            );

            if (itemCheck.rows.length === 0) {
                return res.status(404).json({
                    error: "Auction not found"
                });
            }

            const item = itemCheck.rows[0];
            const calculatedMinInc = Math.max(100, Math.round((Number(item.starting_price) * 0.05) / 100) * 100);

            const newAuction = await pool.query(
                `
                INSERT INTO auctions
                (item_id, start_time, end_time, min_increment, status)
                VALUES ($1, NOW(), NOW() + INTERVAL '7 days', $2, 'active')
                ON CONFLICT (item_id) DO UPDATE SET status = 'active'
                RETURNING auction_id, min_increment, status
                `,
                [item.item_id, calculatedMinInc]
            );

            auctionResult = {
                rows: [{
                    ...newAuction.rows[0],
                    starting_price: item.starting_price
                }]
            };
        }

        const auction = auctionResult.rows[0];

        if (auction.status !== "active") {
            return res.status(400).json({
                error: `Auction is not active (current status: ${auction.status})`
            });
        }

        const highestBidResult = await pool.query(
            `
            SELECT COALESCE(MAX(bid_amount), 0) AS highest_bid
            FROM bids
            WHERE auction_id = $1
            `,
            [auction.auction_id]
        );

        const highestBid = Number(highestBidResult.rows[0].highest_bid);
        const startingPrice = Number(auction.starting_price);
        const minIncrement = Number(auction.min_increment);

        const minimumBid =
            highestBid === 0
                ? startingPrice
                : highestBid + minIncrement;

        if (Number(bid_amount) < minimumBid) {
            return res.status(400).json({
                error: `Bid must be at least ৳${minimumBid.toLocaleString()}`
            });
        }

        const result = await pool.query(
            `
            INSERT INTO bids
            (auction_id, bidder_id, bid_amount)
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [auction.auction_id, bidder_id, Number(bid_amount)]
        );

        res.status(201).json({
            message: "Bid placed successfully",
            bid: result.rows[0]
        });

    } catch (error) {
        console.error("PLACE BID ERROR:", error);

        res.status(500).json({
            error: "Failed to place bid"
        });
    }
};


module.exports = {
    getAuction,
    placeBid
};