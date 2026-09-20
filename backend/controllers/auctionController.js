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

// Place a bid (Protected, Customer only)
const placeBid = async (req, res) => {
    try {
        const { id } = req.params;
        const bidder_id = req.user.userId;
        const { bid_amount } = req.body;

        if (!bid_amount || isNaN(Number(bid_amount)) || Number(bid_amount) <= 0) {
            return res.status(400).json({
                error: "A valid positive bid amount is required"
            });
        }

        const newBid = await auctionModel.placeBidWithLock({
            id,
            bidderId: bidder_id,
            bidAmount: Number(bid_amount)
        });

        res.status(201).json({
            message: "Bid placed successfully",
            bid: {
                bid_amount: newBid.bid_amount,
                bid_time: newBid.bid_time
            }
        });

    } catch (error) {
        console.error("PLACE BID ERROR:", error);
        res.status(error.statusCode || 500).json({
            error: error.message || "Failed to place bid"
        });
    }
};

module.exports = {
    getAuction,
    placeBid
};