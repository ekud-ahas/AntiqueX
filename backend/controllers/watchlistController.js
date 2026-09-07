const watchlistModel = require("../models/watchlistModel");

// GET /api/watchlist/:userId
// Get everything a user is watching, with current auction/bid info (Protected)
const getUserWatchlist = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.userId;
        const isAdmin = req.user.role === "admin" || req.user.role === "super_admin" || req.user.role === "moderator";

        // Object ownership check
        if (Number(currentUserId) !== Number(userId) && !isAdmin) {
            return res.status(403).json({
                error: "Forbidden: You cannot view another user's watchlist."
            });
        }

        const watchlist = await watchlistModel.getWatchlistByUserId(userId);
        res.json(watchlist);
    } catch (error) {
        console.error("GET WATCHLIST ERROR:", error);
        res.status(500).json({
            error: "Failed to retrieve watchlist"
        });
    }
};

// POST /api/watchlist
// body: { item_id } (Protected)
const addToWatchlist = async (req, res) => {
    try {
        const user_id = req.user ? req.user.userId : req.body.user_id;
        const { item_id } = req.body;

        if (!user_id || !item_id) {
            return res.status(400).json({
                error: "user_id and item_id are required"
            });
        }

        const itemExists = await watchlistModel.checkItemExists(item_id);
        if (!itemExists) {
            return res.status(404).json({
                error: "Item not found"
            });
        }

        const existing = await watchlistModel.findWatchlistEntry(user_id, item_id);
        if (existing) {
            return res.status(409).json({
                error: "Item is already on your watchlist"
            });
        }

        const newEntry = await watchlistModel.addToWatchlist(user_id, item_id);

        res.status(201).json({
            message: "Added to watchlist",
            watchlist: newEntry
        });
    } catch (error) {
        console.error("ADD TO WATCHLIST ERROR:", error);
        res.status(500).json({
            error: "Failed to add to watchlist"
        });
    }
};

// DELETE /api/watchlist
// body: { item_id } (Protected)
const removeFromWatchlist = async (req, res) => {
    try {
        const user_id = req.user ? req.user.userId : req.body.user_id;
        const { item_id } = req.body;

        if (!user_id || !item_id) {
            return res.status(400).json({
                error: "user_id and item_id are required"
            });
        }

        const deletedEntry = await watchlistModel.removeFromWatchlist(user_id, item_id);

        if (!deletedEntry) {
            return res.status(404).json({
                error: "Watchlist entry not found"
            });
        }

        res.json({
            message: "Removed from watchlist"
        });
    } catch (error) {
        console.error("REMOVE FROM WATCHLIST ERROR:", error);
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
