const pool = require("../config/db");

// Get one auction
const getAuction = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
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

                u.username AS seller,

                COALESCE(MAX(b.bid_amount), 0) AS highest_bid

            FROM auctions a

            JOIN items i
                ON a.item_id = i.item_id

            JOIN users u
                ON i.seller_id = u.user_id

            LEFT JOIN bids b
                ON a.auction_id = b.auction_id

            WHERE a.auction_id = $1

            GROUP BY
                a.auction_id,
                i.item_id,
                u.username
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Auction not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

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

        const auctionResult = await pool.query(
            `
            SELECT auction_id, min_increment, status
            FROM auctions
            WHERE auction_id = $1
            `,
            [id]
        );

        if (auctionResult.rows.length === 0) {
            return res.status(404).json({
                error: "Auction not found"
            });
        }

        const auction = auctionResult.rows[0];

        if (auction.status !== "active") {
            return res.status(400).json({
                error: "Auction is not active"
            });
        }

        const highestBidResult = await pool.query(
            `
            SELECT COALESCE(MAX(bid_amount), 0) AS highest_bid
            FROM bids
            WHERE auction_id = $1
            `,
            [id]
        );

        const highestBid =
            Number(highestBidResult.rows[0].highest_bid);

        const minimumBid =
            highestBid === 0
                ? Number(auction.min_increment)
                : highestBid + Number(auction.min_increment);

        if (Number(bid_amount) < minimumBid) {
            return res.status(400).json({
                error: `Bid must be at least ${minimumBid}`
            });
        }

        const result = await pool.query(
            `
            INSERT INTO bids
            (auction_id, bidder_id, bid_amount)
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [id, bidder_id, bid_amount]
        );

        res.status(201).json({
            message: "Bid placed successfully",
            bid: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to place bid"
        });
    }
};


module.exports = {
    getAuction,
    placeBid
};