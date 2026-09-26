const express = require("express");
const router = express.Router();

const {
    placeBid,
    endAuctionEarly,
    getAuction
} = require("../controllers/auctionController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

router.get("/test", (req, res) => {
    res.json({
        message: "Auction route is working!"
    });
});

// Public: View auction & bid history
router.get("/:id", getAuction);

// Protected: Place bid requires customer role (admins/moderators cannot bid)
router.post("/:id/bids", authenticateToken, requireRole("customer"), placeBid);

// Protected: End auction early (Seller only)
router.post("/:id/end-early", authenticateToken, endAuctionEarly);

module.exports = router;