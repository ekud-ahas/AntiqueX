const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");
const { authenticateToken } = require("../middleware/authMiddleware");

// All wallet actions require valid user authentication
router.get("/:userId", authenticateToken, walletController.getWallet);
router.post("/deposit", authenticateToken, walletController.depositFunds);
router.post("/withdraw", authenticateToken, walletController.withdrawFunds);

module.exports = router;
