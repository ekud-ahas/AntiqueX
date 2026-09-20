const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

// Wallets are private customer financial records.
router.get("/", authenticateToken, requireRole("customer"), (req, res, next) => {
    req.params.userId = req.user.userId;
    return walletController.getWallet(req, res, next);
});
router.get("/:userId", authenticateToken, requireRole("customer"), walletController.getWallet);

// Financial operations strictly require customer role
router.post("/deposit", authenticateToken, requireRole("customer"), walletController.depositFunds);
router.post("/withdraw", authenticateToken, requireRole("customer"), walletController.withdrawFunds);

module.exports = router;
