const pool = require("../config/db");
const getItems = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                i.item_id,
                i.title,
                i.description,
                i.year_of_origin,
                i.condition,
                i.starting_price,

                c.category_name,

                u.username AS seller,

                (
                    SELECT img_url
                    FROM item_images
                    WHERE item_images.item_id = i.item_id
                    ORDER BY img_id
                    LIMIT 1
                ) AS thumbnail_url

            FROM items i

            JOIN categories c
                ON i.category_id = c.category_id

            JOIN users u
                ON i.seller_id = u.user_id

            ORDER BY i.item_id;
        `);

        res.json(result.rows);

    } catch (error) {

        console.error("GET ITEMS ERROR:", error);

        res.status(500).json({
            error: "Failed to retrieve items"
        });
    }
};

const getItemById = async (req, res) => {

    try {

        const { id } = req.params;

        const itemResult = await pool.query(
            `
            SELECT
                i.item_id,
                i.title,
                i.description,
                i.year_of_origin,
                i.condition,
                i.starting_price,

                i.seller_id,

                c.category_id,
                c.category_name,

                u.username AS seller

            FROM items i

            JOIN categories c
                ON i.category_id = c.category_id

            JOIN users u
                ON i.seller_id = u.user_id

            WHERE i.item_id = $1
            `,
            [id]
        );


        if (itemResult.rows.length === 0) {

            return res.status(404).json({
                error: "Item not found"
            });
        }


        const imagesResult = await pool.query(
            `
            SELECT
                img_id,
                img_url

            FROM item_images

            WHERE item_id = $1

            ORDER BY img_id
            `,
            [id]
        );


        res.json({
            ...itemResult.rows[0],
            images: imagesResult.rows
        });


    } catch (error) {

        console.error("GET ITEM ERROR:", error);

        res.status(500).json({
            error: "Failed to retrieve item"
        });
    }
};

const createItem = async (req, res) => {

    console.log("CREATE ITEM REQUEST");
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);


    const client = await pool.connect();


    try {

        const {
            seller_id,
            category_id,
            title,
            description,
            year_of_origin,
            condition,
            starting_price,
            image_urls
        } = req.body;


        if (
            !seller_id ||
            !category_id ||
            !title ||
            !starting_price
        ) {

            return res.status(400).json({
                error: "Required fields are missing"
            });
        }

        await client.query("BEGIN");

        const itemResult = await client.query(
            `
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

            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7
            )

            RETURNING *
            `,
            [
                seller_id,
                category_id,
                title,
                description,
                year_of_origin,
                condition,
                starting_price
            ]
        );


        const newItem = itemResult.rows[0];

        let images = [];

        let parsedImageUrls = [];


        if (image_urls) {

            try {

                parsedImageUrls =
                    Array.isArray(image_urls)
                        ? image_urls
                        : JSON.parse(image_urls);

            } catch (error) {

                console.log(
                    "Could not parse image_urls:",
                    error
                );

                parsedImageUrls = [];
            }
        }


        if (
            Array.isArray(parsedImageUrls) &&
            parsedImageUrls.length > 0
        ) {

            const insertedImages =
                await client.query(
                    `
                    INSERT INTO item_images
                    (
                        item_id,
                        img_url
                    )

                    SELECT
                        $1,
                        url

                    FROM UNNEST($2::text[]) AS url

                    RETURNING
                        img_id,
                        img_url
                    `,
                    [
                        newItem.item_id,
                        parsedImageUrls
                    ]
                );


            images =
                images.concat(
                    insertedImages.rows
                );
        }

        if (req.file) {

            const imageUrl =
                `/uploads/${req.file.filename}`;


            const insertedImage =
                await client.query(
                    `
                    INSERT INTO item_images
                    (
                        item_id,
                        img_url
                    )

                    VALUES
                    (
                        $1,
                        $2
                    )

                    RETURNING
                        img_id,
                        img_url
                    `,
                    [
                        newItem.item_id,
                        imageUrl
                    ]
                );


            images.push(
                insertedImage.rows[0]
            );
        }

        await client.query("COMMIT");


        res.status(201).json({

            message:
                "Item created successfully",

            item: {
                ...newItem,
                images
            }
        });


    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "CREATE ITEM ERROR:",
            error
        );


        res.status(500).json({
            error: "Failed to create item"
        });


    } finally {

        client.release();
    }
};


const updateItem = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            seller_id,
            category_id,
            title,
            description,
            year_of_origin,
            condition,
            starting_price
        } = req.body;


        if (!seller_id) {

            return res.status(400).json({
                error: "seller_id is required"
            });
        }

        const ownerCheck = await pool.query(
            `
            SELECT seller_id
            FROM items
            WHERE item_id = $1
            `,
            [id]
        );


        if (ownerCheck.rows.length === 0) {

            return res.status(404).json({
                error: "Item not found"
            });
        }


        if (
            ownerCheck.rows[0].seller_id !==
            Number(seller_id)
        ) {

            return res.status(403).json({
                error:
                    "You do not have permission to edit this item"
            });
        }


        const result = await pool.query(
            `
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
            `,
            [
                category_id,
                title,
                description,
                year_of_origin,
                condition,
                starting_price,
                id
            ]
        );


        res.json({

            message:
                "Item updated successfully",

            item:
                result.rows[0]
        });


    } catch (error) {

        console.error(
            "UPDATE ITEM ERROR:",
            error
        );


        res.status(500).json({
            error: "Failed to update item"
        });
    }
};


const deleteItem = async (req, res) => {

    try {

        const { id } = req.params;

        const { seller_id } = req.body;


        if (!seller_id) {

            return res.status(400).json({
                error: "seller_id is required"
            });
        }


        const ownerCheck = await pool.query(
            `
            SELECT seller_id
            FROM items
            WHERE item_id = $1
            `,
            [id]
        );


        if (ownerCheck.rows.length === 0) {

            return res.status(404).json({
                error: "Item not found"
            });
        }


        if (
            ownerCheck.rows[0].seller_id !==
            Number(seller_id)
        ) {

            return res.status(403).json({
                error:
                    "You do not have permission to delete this item"
            });
        }


        const result = await pool.query(
            `
            DELETE FROM items

            WHERE item_id = $1

            RETURNING *
            `,
            [id]
        );


        res.json({

            message:
                "Item deleted successfully",

            item:
                result.rows[0]
        });


    } catch (error) {

        console.error(
            "DELETE ITEM ERROR:",
            error
        );


        res.status(500).json({
            error: "Failed to delete item"
        });
    }
};


const addItemImage = async (req, res) => {

    try {

        const { id } = req.params;

        const { img_url } = req.body;


        if (!img_url) {

            return res.status(400).json({
                error: "img_url is required"
            });
        }


        const itemCheck = await pool.query(
            `
            SELECT item_id
            FROM items
            WHERE item_id = $1
            `,
            [id]
        );


        if (itemCheck.rows.length === 0) {

            return res.status(404).json({
                error: "Item not found"
            });
        }


        const result = await pool.query(
            `
            INSERT INTO item_images
            (
                item_id,
                img_url
            )

            VALUES
            (
                $1,
                $2
            )

            RETURNING *
            `,
            [
                id,
                img_url
            ]
        );


        res.status(201).json({

            message:
                "Image added",

            image:
                result.rows[0]
        });


    } catch (error) {

        console.error(
            "ADD IMAGE ERROR:",
            error
        );


        res.status(500).json({
            error: "Failed to add image"
        });
    }
};


const getItemImages = async (req, res) => {

    try {

        const { id } = req.params;


        const result = await pool.query(
            `
            SELECT
                img_id,
                img_url

            FROM item_images

            WHERE item_id = $1

            ORDER BY img_id
            `,
            [id]
        );


        res.json(result.rows);


    } catch (error) {

        console.error(
            "GET IMAGES ERROR:",
            error
        );


        res.status(500).json({
            error: "Failed to retrieve images"
        });
    }
};


const deleteItemImage = async (req, res) => {

    try {

        const {
            id,
            imgId
        } = req.params;


        const result = await pool.query(
            `
            DELETE FROM item_images

            WHERE
                img_id = $1
                AND item_id = $2

            RETURNING *
            `,
            [
                imgId,
                id
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                error: "Image not found"
            });
        }


        res.json({
            message: "Image deleted"
        });


    } catch (error) {

        console.error(
            "DELETE IMAGE ERROR:",
            error
        );


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