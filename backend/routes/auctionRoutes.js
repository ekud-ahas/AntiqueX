const express = require("express");

const router = express.Router();

const {
    placeBid,
    getAuction
} = require("../controllers/auctionController");

router.get("/test", (req, res) => {
    res.json({
        message: "Auction route is working!"
    });
});

router.get("/:id", getAuction);

router.post("/:id/bids", placeBid);

module.exports = router;