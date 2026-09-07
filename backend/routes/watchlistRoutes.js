const express = require("express");
const router = express.Router();

const {
    getUserWatchlist,
    addToWatchlist,
    removeFromWatchlist
} = require("../controllers/watchlistController");
const { authenticateToken } = require("../middleware/authMiddleware");

// All watchlist routes require authentication
router.get("/:userId", authenticateToken, getUserWatchlist);
router.post("/", authenticateToken, addToWatchlist);
router.delete("/", authenticateToken, removeFromWatchlist);

module.exports = router;
