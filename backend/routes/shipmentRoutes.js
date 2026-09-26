const express = require("express");
const shipmentController = require("../controllers/shipmentController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken); // All routes require auth

router.get("/", shipmentController.getMyShipments);

// Only sellers can ship
router.post("/:shipmentId/ship", requireRole("customer", "admin"), shipmentController.shipItem);

// Only customers can confirm receipt or dispute
router.post("/:shipmentId/deliver", requireRole("customer", "admin"), shipmentController.markDelivered);
router.post("/:shipmentId/dispute", requireRole("customer", "admin"), shipmentController.openDispute);

module.exports = router;
