const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

// Payment methods
router.get("/methods/:userId", paymentController.getUserPaymentMethods);
router.post("/methods", paymentController.addPaymentMethod);
router.delete("/methods/:id", paymentController.deletePaymentMethod);

module.exports = router;
