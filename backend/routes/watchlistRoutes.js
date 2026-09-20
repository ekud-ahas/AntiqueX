const express = require("express");
const router = express.Router();

const {
    getUserWatchlist,
    addToWatchlist,
    removeFromWatchlist
} = require("../controllers/watchlistController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

// All watchlist routes require authentication
router.get("/:userId", authenticateToken, getUserWatchlist);
router.post("/", authenticateToken, requireRole("customer"), addToWatchlist);
router.delete("/", authenticateToken, requireRole("customer"), removeFromWatchlist);
router.delete("/:itemId", authenticateToken, requireRole("customer"), removeFromWatchlist);

module.exports = router;
