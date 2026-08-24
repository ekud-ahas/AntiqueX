const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");

router.get("/:userId", walletController.getWallet);
router.post("/deposit", walletController.depositFunds);
router.post("/withdraw", walletController.withdrawFunds);

module.exports = router;
