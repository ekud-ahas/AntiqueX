const express = require("express");
const shipmentController = require("../controllers/shipmentController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken); // All routes require auth

router.get("/", shipmentController.getMyShipments);

// Only sellers can ship
router.post("/:shipmentId/ship", requireRole("Seller", "Admin"), shipmentController.shipItem);

// Only customers can confirm receipt or dispute
router.post("/:shipmentId/deliver", requireRole("Customer"), shipmentController.markDelivered);
router.post("/:shipmentId/dispute", requireRole("Customer"), shipmentController.openDispute);

module.exports = router;
