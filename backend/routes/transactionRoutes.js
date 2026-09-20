const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

// Protected Transaction APIs
router.get("/:id", authenticateToken, transactionController.getTransactionById);
router.get("/user/:userId", authenticateToken, transactionController.getUserTransactions);
router.post("/:id/pay", authenticateToken, requireRole("customer"), transactionController.payTransaction);

// Admin-only: closing an auction is a privileged operation.
// Moderators can view/moderate auctions via adminRoutes, but only an admin
// can formally close an auction and record the winner + transaction.
router.post(
    "/auction/:auctionId/close",
    authenticateToken,
    requireRole("admin"),
    transactionController.closeAuctionEndpoint
);

module.exports = router;
