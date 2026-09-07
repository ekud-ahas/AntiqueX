const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { authenticateToken } = require("../middleware/authMiddleware");

// All payment method routes require authentication
router.get("/methods/:userId", authenticateToken, paymentController.getUserPaymentMethods);
router.post("/methods", authenticateToken, paymentController.addPaymentMethod);
router.delete("/methods/:id", authenticateToken, paymentController.deletePaymentMethod);

module.exports = router;
