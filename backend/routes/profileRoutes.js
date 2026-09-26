const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const { authenticateToken } = require("../middleware/authMiddleware");

// All profile routes require authentication
router.use(authenticateToken);

router.get("/", profileController.getProfile);
router.put("/", profileController.updateProfile);

router.get("/addresses", profileController.getAddresses);
router.post("/addresses", profileController.addAddress);
router.delete("/addresses/:id", profileController.deleteAddress);

module.exports = router;
