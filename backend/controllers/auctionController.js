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

        if (!bid_amount || isNaN(Number(bid_amount)) || Number(bid_amount) <= 0 || Number(bid_amount) > 999999999) {
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


// End auction early (Protected, Seller only)
const endAuctionEarly = async (req, res) => {
    const client = await require('../config/db').connect();
    try {
        const { id } = req.params;
        const seller_id = req.user.userId;

        await client.query("BEGIN");

        // Lock auction for update
        const auctionRes = await client.query(
            `SELECT a.auction_id, a.status, i.seller_id 
             FROM auctions a 
             JOIN items i ON a.item_id = i.item_id 
             WHERE a.auction_id = $1 
             FOR UPDATE`, 
            [id]
        );

        if (auctionRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Auction not found" });
        }

        const auction = auctionRes.rows[0];

        if (Number(auction.seller_id) !== Number(seller_id)) {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "Forbidden: You do not own this auction" });
        }

        if (auction.status !== 'active') {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Cannot end early: Auction is not active" });
        }

        // Check if there are bids
        const bidsRes = await client.query(
            `SELECT COUNT(*) as count FROM bids WHERE auction_id = $1`,
            [auction.auction_id]
        );
        const hasBids = Number(bidsRes.rows[0].count) > 0;

        if (!hasBids) {
            // Cancel auction
            await client.query(
                `UPDATE auctions SET status = 'cancelled', end_time = NOW() WHERE auction_id = $1`,
                [auction.auction_id]
            );
            await client.query("COMMIT");
            return res.json({ message: "Auction ended early. No bids were placed, so the auction was cancelled.", status: "cancelled" });
        } else {
            // Close auction naturally with custom notification
            await client.query(
                `UPDATE auctions SET end_time = NOW() WHERE auction_id = $1`,
                [auction.auction_id]
            );
            await client.query("COMMIT");

            // Handle transaction creation outside the manual transaction block (because closeAuctionAndRecordWinner uses its own transaction logic if not passed customClient)
            const customMessage = "The seller ended the auction early and you are the winner! Your held bid has been finalized. Shipment is now pending seller dispatch.";
            await transactionModel.closeAuctionAndRecordWinner(auction.auction_id, null, customMessage);

            return res.json({ message: "Auction ended early. The topmost bidder has been declared the winner.", status: "ended" });
        }

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("END AUCTION EARLY ERROR:", error);
        res.status(500).json({ error: "Failed to end auction early" });
    } finally {
        client.release();
    }
};

module.exports = {

    getAuction,
    placeBid,
    endAuctionEarly
};