const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Protected Transaction APIs
router.get("/:id", authenticateToken, transactionController.getTransactionById);
router.get("/user/:userId", authenticateToken, transactionController.getUserTransactions);
router.post("/:id/pay", authenticateToken, transactionController.payTransaction);
router.post("/auction/:auctionId/close", transactionController.closeAuctionEndpoint);

module.exports = router;
