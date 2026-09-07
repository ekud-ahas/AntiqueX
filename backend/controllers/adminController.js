const adminStatsModel = require("../models/adminStatsModel");

// GET /api/admin/stats
// Returns platform-wide statistics — Admin / Moderator only
const getPlatformStats = async (req, res) => {
    try {
        // Run all aggregation queries in parallel for speed
        const [
            totalUsers,
            activeAuctions,
            salesStats,
            totalItems,
            recentBids
        ] = await Promise.all([
            adminStatsModel.getTotalUsers(),
            adminStatsModel.getActiveAuctions(),
            adminStatsModel.getSalesStats(),
            adminStatsModel.getTotalItems(),
            adminStatsModel.getRecentBids()
        ]);

        res.json({
            totalUsers,
            activeAuctions,
            totalTransactions: salesStats.totalTransactions,
            totalSalesVolume: salesStats.totalSalesVolume,
            totalItems,
            recentBids
        });
    } catch (error) {
        console.error("GET ADMIN STATS ERROR:", error);
        res.status(500).json({ error: "Failed to retrieve platform statistics" });
    }
};

// GET /api/admin/users
const getAdminUsers = async (req, res) => {
    try {
        const users = await adminStatsModel.getAllUsersDetailed();
        res.json(users);
    } catch (error) {
        console.error("GET ADMIN USERS ERROR:", error);
        res.status(500).json({ error: "Failed to retrieve user directory" });
    }
};

// PATCH /api/admin/users/:id/status
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["active", "suspended"].includes(status)) {
            return res.status(400).json({ error: "Status must be 'active' or 'suspended'" });
        }

        const updatedUser = await adminStatsModel.updateUserStatus(id, status);
        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            message: `User status updated to ${status}`,
            user: updatedUser
        });
    } catch (error) {
        console.error("TOGGLE USER STATUS ERROR:", error);
        res.status(500).json({ error: "Failed to update user status" });
    }
};

// GET /api/admin/items
const getAdminItems = async (req, res) => {
    try {
        const items = await adminStatsModel.getAllItemsDetailed();
        res.json(items);
    } catch (error) {
        console.error("GET ADMIN ITEMS ERROR:", error);
        res.status(500).json({ error: "Failed to retrieve items for moderation" });
    }
};

// PATCH /api/admin/auctions/:id/status
const toggleAuctionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["scheduled", "active", "ended", "cancelled"].includes(status)) {
            return res.status(400).json({ error: "Invalid auction status" });
        }

        const updatedAuction = await adminStatsModel.updateAuctionStatus(id, status);
        if (!updatedAuction) {
            return res.status(404).json({ error: "Auction not found" });
        }

        res.json({
            message: `Auction status set to ${status}`,
            auction: updatedAuction
        });
    } catch (error) {
        console.error("TOGGLE AUCTION STATUS ERROR:", error);
        res.status(500).json({ error: "Failed to update auction status" });
    }
};

// DELETE /api/admin/categories/:id
const deleteAdminCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await adminStatsModel.deleteCategory(id);
        if (!deleted) {
            return res.status(404).json({ error: "Category not found" });
        }
        res.json({
            message: `Category '${deleted.category_name}' deleted successfully`,
            deleted
        });
    } catch (error) {
        console.error("DELETE CATEGORY ERROR:", error);
        res.status(400).json({ error: error.message || "Failed to delete category" });
    }
};

module.exports = {
    getPlatformStats,
    getAdminUsers,
    toggleUserStatus,
    getAdminItems,
    toggleAuctionStatus,
    deleteAdminCategory
};
