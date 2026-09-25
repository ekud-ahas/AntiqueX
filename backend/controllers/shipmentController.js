const shipmentModel = require("../models/shipmentModel");

const getMyShipments = async (req, res) => {
    try {
        const { userId, role } = req.user;
        const shipments = await shipmentModel.getShipmentsByUser(userId, role);
        res.status(200).json(shipments);
    } catch (error) {
        console.error("Error fetching shipments:", error);
        res.status(500).json({ error: "Failed to fetch shipments" });
    }
};

const shipItem = async (req, res) => {
    try {
        const { userId } = req.user;
        const { shipmentId } = req.params;
        const { carrier, trackingNumber } = req.body;
        
        if (!carrier || !trackingNumber) {
            return res.status(400).json({ error: "Carrier and Tracking Number required" });
        }
        
        const result = await shipmentModel.shipItem(shipmentId, userId, carrier, trackingNumber);
        res.status(200).json({ message: "Item marked as shipped", shipment: result });
    } catch (error) {
        if (error.message.includes("Unauthorized")) return res.status(403).json({ error: error.message });
        if (error.message.includes("not found")) return res.status(404).json({ error: error.message });
        if (error.message.includes("wrong status")) return res.status(400).json({ error: error.message });
        
        console.error("Error shipping item:", error);
        res.status(500).json({ error: "Server error during shipping" });
    }
};

const markDelivered = async (req, res) => {
    try {
        const { userId } = req.user;
        const { shipmentId } = req.params;
        
        const result = await shipmentModel.markDelivered(shipmentId, userId);
        res.status(200).json({ message: "Delivery confirmed. Escrow released to seller.", shipment: result });
    } catch (error) {
        if (error.message.includes("Unauthorized")) return res.status(403).json({ error: error.message });
        if (error.message.includes("not found")) return res.status(404).json({ error: error.message });
        if (error.message.includes("must be 'shipped'")) return res.status(400).json({ error: error.message });
        
        console.error("Error marking delivered:", error);
        res.status(500).json({ error: "Server error confirming delivery" });
    }
};

const openDispute = async (req, res) => {
    try {
        const { userId } = req.user;
        const { shipmentId } = req.params;
        const { reason } = req.body;
        
        if (!reason || !reason.trim()) {
            return res.status(400).json({ error: "A reason is required to open a dispute" });
        }
        
        const result = await shipmentModel.openDispute(shipmentId, userId, reason.trim());
        res.status(201).json({ message: "Dispute opened successfully. Admins have been notified.", shipment: result });
    } catch (error) {
        if (error.message.includes("Unauthorized")) return res.status(403).json({ error: error.message });
        if (error.message.includes("not found")) return res.status(404).json({ error: error.message });
        
        console.error("Error opening dispute:", error);
        res.status(500).json({ error: "Server error opening dispute" });
    }
};

module.exports = {
    getMyShipments,
    shipItem,
    markDelivered,
    openDispute
};
