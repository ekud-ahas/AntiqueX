const pool = require("../config/db");

/**
 * Get all items with seller, category, and thumbnail
 */
const getAllItems = async () => {
    const query = `
        SELECT
            i.item_id,
            i.item_uuid,
            i.title,
            i.description,
            i.year_of_origin,
            i.condition,
            i.starting_price,
            c.category_id,
            c.category_name,
            u.username AS seller,
            a.auction_id,
            COALESCE(a.status, 'unlisted') AS auction_status,
            a.start_time,
            a.end_time,
            COALESCE(
                (SELECT MAX(bid_amount) FROM bids WHERE bids.auction_id = a.auction_id),
                i.starting_price
            ) AS current_price,
            (SELECT COUNT(*) FROM bids WHERE bids.auction_id = a.auction_id) AS total_bids,
            (
                SELECT img_url
                FROM item_images
                WHERE item_images.item_id = i.item_id
                ORDER BY img_id
                LIMIT 1
            ) AS thumbnail_url
        FROM items i
        JOIN categories c ON i.category_id = c.category_id
        JOIN users u ON i.seller_id = u.user_id
        LEFT JOIN auctions a ON a.item_id = i.item_id
        ORDER BY i.item_id DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
};

/**
 * Get item by ID or UUID with full details, auction status, total bids, and image list
 */
const getItemByIdWithDetails = async (itemId) => {
    const isUUID = typeof itemId === "string" && itemId.includes("-");
    const itemQuery = `
        SELECT
            i.item_id,
            i.item_uuid,
            i.title,
            i.description,
            i.year_of_origin,
            i.condition,
            i.starting_price,
            i.seller_id,

            c.category_id,
            c.category_name,

            u.username AS seller,

            a.auction_id,
            a.start_time,
            a.end_time,
            a.min_increment,
            a.status AS auction_status,

            COALESCE((SELECT COUNT(*)::int FROM bids WHERE bids.auction_id = a.auction_id), 0) AS total_bids

        FROM items i

        JOIN categories c
            ON i.category_id = c.category_id

        JOIN users u
            ON i.seller_id = u.user_id

        LEFT JOIN auctions a
            ON a.item_id = i.item_id

        WHERE ${isUUID ? "i.item_uuid = $1" : "i.item_id = $1"}
    `;
    const itemResult = await pool.query(itemQuery, [itemId]);

    if (itemResult.rows.length === 0) {
        return null;
    }

    const realItemId = itemResult.rows[0].item_id;
    const imagesQuery = `
        SELECT
            img_id,
            img_url
        FROM item_images
        WHERE item_id = $1
        ORDER BY img_id
    `;
    const imagesResult = await pool.query(imagesQuery, [realItemId]);

    return {
        ...itemResult.rows[0],
        images: imagesResult.rows
    };
};

/**
 * Create an item along with its images and initial active auction (handled in an ACID transaction)
 */
const createItemWithAuction = async ({
    seller_id,
    category_id,
    title,
    description,
    year_of_origin,
    condition,
    starting_price,
    imageUrls = [],
    uploadedFileUrl = null,
    min_increment = null,
    auction_duration = 7
}) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const insertItemQuery = `
            INSERT INTO items
            (
                seller_id,
                category_id,
                title,
                description,
                year_of_origin,
                condition,
                starting_price
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const itemResult = await client.query(insertItemQuery, [
            seller_id,
            category_id,
            title,
            description,
            year_of_origin,
            condition,
            starting_price
        ]);
        const newItem = itemResult.rows[0];

        let images = [];

        // Insert URL images via UNNEST
        if (Array.isArray(imageUrls) && imageUrls.length > 0) {
            const insertImagesQuery = `
                INSERT INTO item_images (item_id, img_url)
                SELECT $1, url
                FROM UNNEST($2::text[]) AS url
                RETURNING img_id, img_url
            `;
            const insertedImages = await client.query(insertImagesQuery, [
                newItem.item_id,
                imageUrls
            ]);
            images = images.concat(insertedImages.rows);
        }

        // Insert single uploaded image
        if (uploadedFileUrl) {
            const insertSingleImageQuery = `
                INSERT INTO item_images (item_id, img_url)
                VALUES ($1, $2)
                RETURNING img_id, img_url
            `;
            const insertedImage = await client.query(insertSingleImageQuery, [
                newItem.item_id,
                uploadedFileUrl
            ]);
            images.push(insertedImage.rows[0]);
        }

        // Calculate minimum increment & duration
        const calculatedMinInc = Math.max(100, Math.round((Number(starting_price) * 0.05) / 100) * 100);
        const effectiveMinInc = min_increment ? Number(min_increment) : calculatedMinInc;
        const effectiveDuration = auction_duration ? Number(auction_duration) : 7;

        const insertAuctionQuery = `
            INSERT INTO auctions
            (
                item_id,
                start_time,
                end_time,
                min_increment,
                status
            )
            VALUES
            (
                $1,
                NOW(),
                NOW() + ($3 || ' days')::INTERVAL,
                $2,
                'active'
            )
            RETURNING *
        `;
        const auctionResult = await client.query(insertAuctionQuery, [
            newItem.item_id,
            effectiveMinInc,
            String(effectiveDuration)
        ]);

        await client.query("COMMIT");

        return {
            ...newItem,
            auction: auctionResult.rows[0],
            images
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Get seller_id of an item to verify ownership
 */
const getItemSellerId = async (itemId) => {
    const query = `
        SELECT seller_id
        FROM items
        WHERE item_id = $1
    `;
    const result = await pool.query(query, [itemId]);
    return result.rows[0] ? result.rows[0].seller_id : null;
};

/**
 * Update item details and optional auction settings
 */
const updateItem = async (itemId, {
    category_id,
    title,
    description,
    year_of_origin,
    condition,
    starting_price,
    min_increment,
    auction_duration
}) => {
    const query = `
        UPDATE items
        SET
            category_id = $1,
            title = $2,
            description = $3,
            year_of_origin = $4,
            condition = $5,
            starting_price = $6
        WHERE item_id = $7
        RETURNING *
    `;
    const result = await pool.query(query, [
        category_id,
        title,
        description,
        year_of_origin,
        condition,
        starting_price,
        itemId
    ]);

    // Optional auction settings update
    if (min_increment && Number(min_increment) > 0) {
        await pool.query(
            `
            UPDATE auctions
            SET min_increment = $1
            WHERE item_id = $2
            `,
            [Number(min_increment), itemId]
        );
    }

    if (auction_duration && Number(auction_duration) > 0) {
        await pool.query(
            `
            UPDATE auctions
            SET end_time = NOW() + ($1 || ' days')::INTERVAL,
                status = 'active'
            WHERE item_id = $2
            `,
            [String(auction_duration), itemId]
        );
    }

    return result.rows[0];
};

/**
 * Delete an item
 */
const deleteItem = async (itemId) => {
    const query = `
        DELETE FROM items
        WHERE item_id = $1
        RETURNING *
    `;
    const result = await pool.query(query, [itemId]);
    return result.rows[0];
};

/**
 * Add an image to an item
 */
const addItemImage = async (itemId, imgUrl) => {
    const query = `
        INSERT INTO item_images (item_id, img_url)
        VALUES ($1, $2)
        RETURNING *
    `;
    const result = await pool.query(query, [itemId, imgUrl]);
    return result.rows[0];
};

/**
 * Get all images for an item
 */
const getItemImages = async (itemId) => {
    const query = `
        SELECT img_id, img_url
        FROM item_images
        WHERE item_id = $1
        ORDER BY img_id
    `;
    const result = await pool.query(query, [itemId]);
    return result.rows;
};

/**
 * Delete an image by image ID and item ID
 */
const deleteItemImage = async (itemId, imgId) => {
    const query = `
        DELETE FROM item_images
        WHERE img_id = $1 AND item_id = $2
        RETURNING *
    `;
    const result = await pool.query(query, [imgId, itemId]);
    return result.rows[0] || null;
};

module.exports = {
    getAllItems,
    getItemByIdWithDetails,
    createItemWithAuction,
    getItemSellerId,
    updateItem,
    deleteItem,
    addItemImage,
    getItemImages,
    deleteItemImage
};
