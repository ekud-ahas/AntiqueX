const auctionModel = require("../models/auctionModel");
const transactionModel = require("../models/transactionModel");

// Get one auction (looks up by auction_id OR item_id, and auto-creates auction if missing)
const getAuction = async (req, res) => {
    try {
        const { id } = req.params;

        // Auto-close expired active auctions and record winners & transactions
        const expiredAuctions = await auctionModel.getExpiredActiveAuctions();
        for (const row of expiredAuctions) {
            await transactionModel.closeAuctionAndRecordWinner(row.auction_id);
        }

        // First attempt: lookup auction
        let auctionRows = await auctionModel.getAuctionDetails(id);

        // If no auction row exists for this item yet, create one on-the-fly
        if (auctionRows.length === 0 || !auctionRows[0].auction_id) {
            const item = await auctionModel.getItemPriceInfo(id);

            if (!item) {
                return res.status(404).json({
                    error: "Auction / Item not found"
                });
            }

            const calculatedMinInc = Math.max(100, Math.round((Number(item.starting_price) * 0.05) / 100) * 100);
            await auctionModel.createDefaultAuction(item.item_id, calculatedMinInc);

            // Re-fetch after creation
            auctionRows = await auctionModel.getAuctionDetails(id);
        }

        if (auctionRows.length === 0) {
            return res.status(404).json({
                error: "Auction not found"
            });
        }

        const auctionData = auctionRows[0];

        // Fetch all bids for this auction (ordered highest to lowest)
        const bids = await auctionModel.getBidsByAuctionId(auctionData.auction_id);
        const totalBids = bids.length;
        const highestBid = totalBids > 0 ? Number(bids[0].bid_amount) : 0;
        const highestBidder = totalBids > 0 ? bids[0].bidder_username : null;
        const highestBidderId = totalBids > 0 ? bids[0].bidder_id : null;
        const winnerBidId = totalBids > 0 ? bids[0].bid_id : null;

        // Check if there is an existing transaction record
        const transaction = await auctionModel.getAuctionTransaction(auctionData.auction_id);

        res.json({
            ...auctionData,
            highest_bid: highestBid,
            highest_bidder: highestBidder,
            highest_bidder_id: highestBidderId,
            winner_bid_id: transaction ? transaction.winner_bid_id : winnerBidId,
            winner_id: transaction ? transaction.buyer_id : highestBidderId,
            winner_username: transaction ? transaction.buyer_username : highestBidder,
            total_bids: totalBids,
            bids,
            transaction
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
        const bidder_id = req.user ? req.user.userId : req.body.bidder_id;
        const { bid_amount } = req.body;

        if (!bidder_id || !bid_amount) {
            return res.status(400).json({
                error: "Bidder ID and bid amount are required"
            });
        }

        // Find auction by auction_id OR item_id
        let auction = await auctionModel.getAuctionForBidding(id);

        if (!auction) {
            const item = await auctionModel.getItemPriceInfo(id);

            if (!item) {
                return res.status(404).json({
                    error: "Auction not found"
                });
            }

            const calculatedMinInc = Math.max(100, Math.round((Number(item.starting_price) * 0.05) / 100) * 100);
            const newAuction = await auctionModel.upsertActiveAuction(item.item_id, calculatedMinInc);

            auction = {
                ...newAuction,
                starting_price: item.starting_price
            };
        }

        if (auction.status !== "active") {
            return res.status(400).json({
                error: `Auction is not active (current status: ${auction.status})`
            });
        }

        if (Number(auction.seller_id) === Number(bidder_id)) {
            return res.status(400).json({
                error: "Sellers are prohibited from bidding on their own listings."
            });
        }

        const highestBid = await auctionModel.getHighestBidAmount(auction.auction_id);
        const startingPrice = Number(auction.starting_price);
        const minIncrement = Number(auction.min_increment);

        const minimumBid = highestBid === 0
            ? startingPrice
            : highestBid + minIncrement;

        if (Number(bid_amount) < minimumBid) {
            return res.status(400).json({
                error: `Bid must be at least ৳${minimumBid.toLocaleString()}`
            });
        }

        const newBid = await auctionModel.insertBid(auction.auction_id, bidder_id, Number(bid_amount));

        res.status(201).json({
            message: "Bid placed successfully",
            bid: newBid
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