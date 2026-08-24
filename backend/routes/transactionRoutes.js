const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");

// Transactions API
router.get("/:id", transactionController.getTransactionById);
router.get("/user/:userId", transactionController.getUserTransactions);
router.post("/:id/pay", transactionController.payTransaction);
router.post("/auction/:auctionId/close", transactionController.closeAuctionEndpoint);

module.exports = router;
