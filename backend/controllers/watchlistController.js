const pool = require("../config/db");

// GET /api/watchlist/:userId
// Get everything a user is watching, with current auction/bid info
const getUserWatchlist = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            `
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
            `,
            [userId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to retrieve watchlist"
        });
    }
};

// POST /api/watchlist
// body: { user_id, item_id }
const addToWatchlist = async (req, res) => {
    try {
        const { user_id, item_id } = req.body;

        if (!user_id || !item_id) {
            return res.status(400).json({
                error: "user_id and item_id are required"
            });
        }

        const itemCheck = await pool.query(
            "SELECT item_id FROM items WHERE item_id = $1",
            [item_id]
        );

        if (itemCheck.rows.length === 0) {
            return res.status(404).json({
                error: "Item not found"
            });
        }

        const existing = await pool.query(
            `
            SELECT watchlist_id FROM watchlist
            WHERE user_id = $1 AND item_id = $2
            `,
            [user_id, item_id]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                error: "Item is already on your watchlist"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO watchlist (user_id, item_id)
            VALUES ($1, $2)
            RETURNING *
            `,
            [user_id, item_id]
        );

        res.status(201).json({
            message: "Added to watchlist",
            watchlist: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to add to watchlist"
        });
    }
};

// DELETE /api/watchlist
// body: { user_id, item_id }
// (kept as a body-based delete since watchlist entries are identified by the user+item pair from the UI)
const removeFromWatchlist = async (req, res) => {
    try {
        const { user_id, item_id } = req.body;

        if (!user_id || !item_id) {
            return res.status(400).json({
                error: "user_id and item_id are required"
            });
        }

        const result = await pool.query(
            `
            DELETE FROM watchlist
            WHERE user_id = $1 AND item_id = $2
            RETURNING *
            `,
            [user_id, item_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Watchlist entry not found"
            });
        }

        res.json({
            message: "Removed from watchlist"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to remove from watchlist"
        });
    }
};

module.exports = {
    getUserWatchlist,
    addToWatchlist,
    removeFromWatchlist
};
