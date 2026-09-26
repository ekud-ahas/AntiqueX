const itemModel = require("../models/itemModel");

// GET /items
// List all items (Public)
const getItems = async (req, res) => {
    try {
        const items = await itemModel.getAllItems();
        res.json(items);
    } catch (error) {
        console.error("GET ITEMS ERROR:", error);
        res.status(500).json({
            error: "Failed to retrieve items"
        });
    }
};

// GET /items/:id
// Get single item with category, seller, auction status, and images (Public)
const getItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await itemModel.getItemByIdWithDetails(id);

        if (!item) {
            return res.status(404).json({
                error: "Item not found"
            });
        }

        res.json(item);
    } catch (error) {
        console.error("GET ITEM ERROR:", error);
        res.status(500).json({
            error: "Failed to retrieve item"
        });
    }
};

// POST /items
// Create new item, upload images, and launch active auction (Authenticated)
const createItem = async (req, res) => {
    try {
        const {
            category_id,
            title,
            description,
            year_of_origin,
            condition,
            starting_price,
            image_urls,
            min_increment,
            auction_duration
        } = req.body;

        // Securely resolve seller_id from authenticated token
        const seller_id = req.user.userId;

        if (!seller_id || !category_id || !title || starting_price === undefined || starting_price === null || Number(starting_price) < 0 || Number(starting_price) > 999999999) {
            return res.status(400).json({
                error: "Required fields are missing (category, title, starting_price)"
            });
        }

        let parsedImageUrls = [];
        if (image_urls) {
            try {
                parsedImageUrls = Array.isArray(image_urls)
                    ? image_urls
                    : JSON.parse(image_urls);
            } catch (err) {
                console.log("Could not parse image_urls:", err);
                parsedImageUrls = [];
            }
        }

        const uploadedFileUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const newItem = await itemModel.createItemWithAuction({
            seller_id,
            category_id,
            title,
            description,
            year_of_origin,
            condition,
            starting_price,
            imageUrls: parsedImageUrls,
            uploadedFileUrl,
            min_increment,
            auction_duration
        });

        res.status(201).json({
            message: "Item and auction created successfully",
            item: newItem
        });

    } catch (error) {
        console.error("CREATE ITEM ERROR:", error);
        res.status(error.statusCode || 500).json({
            error: error.message || "Failed to create item"
        });
    }
};

// PUT /items/:id
// Update an existing item (Authenticated, Ownership or Admin verified)
const updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            category_id,
            title,
            description,
            year_of_origin,
            condition,
            starting_price,
            min_increment,
            auction_duration
        } = req.body;

        const userId = req.user.userId;
        const isAdmin = req.user && (req.user.role === "admin" || req.user.role === "moderator");

        if (!userId) {
            return res.status(401).json({
                error: "Authentication required"
            });
        }

        const existingSellerId = await itemModel.getItemSellerId(id);

        if (existingSellerId === null) {
            return res.status(404).json({
                error: "Item not found"
            });
        }

        // Enforce object-level ownership check
        if (Number(existingSellerId) !== Number(userId) && !isAdmin) {
            return res.status(403).json({
                error: "Forbidden: You do not have permission to edit this item"
            });
        }

        const updatedItem = await itemModel.updateItem(id, {
            category_id,
            title,
            description,
            year_of_origin,
            condition,
            starting_price,
            min_increment,
            auction_duration
        });

        res.json({
            message: "Item updated successfully",
            item: updatedItem
        });

    } catch (error) {
        console.error("UPDATE ITEM ERROR:", error);
        res.status(error.statusCode || 500).json({
            error: error.message || "Failed to update item"
        });
    }
};

// DELETE /items/:id
// Delete an item (Authenticated, Ownership or Admin verified)
const deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const isAdmin = req.user && (req.user.role === "admin" || req.user.role === "moderator");

        if (!userId) {
            return res.status(401).json({
                error: "Authentication required"
            });
        }

        const existingSellerId = await itemModel.getItemSellerId(id);

        if (existingSellerId === null) {
            return res.status(404).json({
                error: "Item not found"
            });
        }

        // Enforce object-level ownership check
        if (Number(existingSellerId) !== Number(userId) && !isAdmin) {
            return res.status(403).json({
                error: "Forbidden: You do not have permission to delete this item"
            });
        }

        const deletedItem = await itemModel.deleteItem(id);

        res.json({
            message: "Item deleted successfully",
            item: deletedItem
        });

    } catch (error) {
        console.error("DELETE ITEM ERROR:", error);
        res.status(error.statusCode || 500).json({
            error: error.message || "Failed to delete item"
        });
    }
};

// POST /items/:id/images
// Add image to item (Authenticated, Ownership or Admin verified)
const addItemImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { img_url } = req.body;
        const userId = req.user.userId;
        const isAdmin = req.user && (req.user.role === "admin" || req.user.role === "moderator");

        if (!img_url) {
            return res.status(400).json({
                error: "img_url is required"
            });
        }

        const existingSellerId = await itemModel.getItemSellerId(id);
        if (existingSellerId === null) {
            return res.status(404).json({
                error: "Item not found"
            });
        }

        if (Number(existingSellerId) !== Number(userId) && !isAdmin) {
            return res.status(403).json({
                error: "Forbidden: You do not have permission to add images to this item"
            });
        }

        const image = await itemModel.addItemImage(id, img_url);

        res.status(201).json({
            message: "Image added",
            image
        });

    } catch (error) {
        console.error("ADD IMAGE ERROR:", error);
        res.status(500).json({
            error: "Failed to add image"
        });
    }
};

// GET /items/:id/images
// Get images for item (Public)
const getItemImages = async (req, res) => {
    try {
        const { id } = req.params;
        const images = await itemModel.getItemImages(id);
        res.json(images);
    } catch (error) {
        console.error("GET IMAGES ERROR:", error);
        res.status(500).json({
            error: "Failed to retrieve images"
        });
    }
};

// DELETE /items/:id/images/:imgId
// Delete item image (Authenticated, Ownership or Admin verified)
const deleteItemImage = async (req, res) => {
    try {
        const { id, imgId } = req.params;
        const userId = req.user ? req.user.userId : req.body.seller_id;
        const isAdmin = req.user && (req.user.role === "admin" || req.user.role === "moderator");

        const existingSellerId = await itemModel.getItemSellerId(id);
        if (existingSellerId === null) {
            return res.status(404).json({
                error: "Item not found"
            });
        }

        if (Number(existingSellerId) !== Number(userId) && !isAdmin) {
            return res.status(403).json({
                error: "Forbidden: You do not have permission to delete images for this item"
            });
        }

        const deleted = await itemModel.deleteItemImage(id, imgId);

        if (!deleted) {
            return res.status(404).json({
                error: "Image not found"
            });
        }

        res.json({
            message: "Image deleted"
        });

    } catch (error) {
        console.error("DELETE IMAGE ERROR:", error);
        res.status(500).json({
            error: "Failed to delete image"
        });
    }
};

module.exports = {
    getItems,
    getItemById,
    createItem,
    updateItem,
    deleteItem,
    addItemImage,
    getItemImages,
    deleteItemImage
};