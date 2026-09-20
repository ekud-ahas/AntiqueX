const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

// Payment methods routes
router.get("/methods/:userId", authenticateToken, requireRole("customer"), paymentController.getUserPaymentMethods);
router.post("/methods", authenticateToken, requireRole("customer"), paymentController.addPaymentMethod);
router.delete("/methods/:id", authenticateToken, requireRole("customer"), paymentController.deletePaymentMethod);

module.exports = router;
