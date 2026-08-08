const express = require("express");

const router = express.Router();

const {
    getUserWatchlist,
    addToWatchlist,
    removeFromWatchlist
} = require("../controllers/watchlistController");

router.get("/:userId", getUserWatchlist);
router.post("/", addToWatchlist);
router.delete("/", removeFromWatchlist);

module.exports = router;
