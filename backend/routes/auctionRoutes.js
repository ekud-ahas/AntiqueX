const express = require("express");
const router = express.Router();

const {
    placeBid,
    getAuction
} = require("../controllers/auctionController");
const { authenticateToken } = require("../middleware/authMiddleware");

router.get("/test", (req, res) => {
    res.json({
        message: "Auction route is working!"
    });
});

// Public: View auction & bid history
router.get("/:id", getAuction);

// Protected: Place bid requires authentication
router.post("/:id/bids", authenticateToken, placeBid);

module.exports = router;