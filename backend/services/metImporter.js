const axios = require("axios");
const pool = require("../config/db");

const MET_API =
    "https://collectionapi.metmuseum.org/public/collection/v1";

async function importMetItems(limit = 5, keyword = "") {
    try {
        // 1. Search The Met
        let objectIDs;

        if (keyword.trim()) {
            const searchResponse = await axios.get(
                `${MET_API}/search`,
                {
                    params: {
                        q: keyword,
                        hasImages: true,
                        isPublicDomain: true
                    }
                }
            );

            objectIDs = searchResponse.data.objectIDs || [];
        } else {
            const objectsResponse = await axios.get(
                `${MET_API}/objects`
            );

            objectIDs = objectsResponse.data.objectIDs || [];
        }

        // Only process the requested number
        objectIDs = objectIDs.slice(0, limit);

        let imported = 0;
        let skipped = 0;

        // 2. Find a user to associate imported items with
        const userResult = await pool.query(`
            SELECT user_id
            FROM users
            ORDER BY user_id
            LIMIT 1
        `);

        if (userResult.rows.length === 0) {
            throw new Error(
                "No users exist. Create a user first."
            );
        }

        const sellerId = userResult.rows[0].user_id;

        // 3. Find a category
        const categoryResult = await pool.query(`
            SELECT category_id
            FROM categories
            ORDER BY category_id
            LIMIT 1
        `);

        if (categoryResult.rows.length === 0) {
            throw new Error(
                "No categories exist. Create a category first."
            );
        }

        const categoryId =
            categoryResult.rows[0].category_id;

        // 4. Get individual objects
        for (const objectID of objectIDs) {
            try {
                const response = await axios.get(
                    `${MET_API}/objects/${objectID}`
                );

                const object = response.data;

                // We only want public-domain objects
                // that have an image.
                if (
                    !object.isPublicDomain ||
                    !object.primaryImage
                ) {
                    skipped++;
                    continue;
                }

                const title =
                    object.title?.trim() ||
                    "Untitled Antique";

                // Build a useful description
                const description = [
                    object.artistDisplayName
                        ? `Artist: ${object.artistDisplayName}`
                        : null,

                    object.date
                        ? `Date: ${object.date}`
                        : null,

                    object.medium
                        ? `Medium: ${object.medium}`
                        : null,

                    object.culture
                        ? `Culture: ${object.culture}`
                        : null,

                    object.department
                        ? `Department: ${object.department}`
                        : null,

                    `Source: The Metropolitan Museum of Art`,
                    `Met Object ID: ${object.objectID}`
                ]
                    .filter(Boolean)
                    .join(" | ");

                // 5. Check whether we already imported
                // this Met object.
                const duplicate = await pool.query(
                    `
                    SELECT item_id
                    FROM items
                    WHERE description LIKE $1
                    LIMIT 1
                    `,
                    [`%Met Object ID: ${object.objectID}%`]
                );

                if (duplicate.rows.length > 0) {
                    skipped++;
                    continue;
                }

                // 6. Insert the item
                const itemResult = await pool.query(
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
                    ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING item_id
                    `,
                    [
                        sellerId,
                        categoryId,
                        title,
                        description,

                        // The Met date is often text such as
                        // "ca. 1850", so don't force it into INT.
                        null,

                        "Excellent",

                        // Temporary catalogue price.
                        // We will NOT create an auction yet.
                        1000
                    ]
                );

                const itemId =
                    itemResult.rows[0].item_id;

                // 7. Save primary image
                await pool.query(
                    `
                    INSERT INTO item_images
                    (item_id, img_url)
                    VALUES ($1, $2)
                    `,
                    [
                        itemId,
                        object.primaryImage
                    ]
                );

                // 8. Save additional images
                if (
                    Array.isArray(object.additionalImages)
                ) {
                    for (
                        const imageUrl
                        of object.additionalImages
                    ) {
                        if (!imageUrl) continue;

                        await pool.query(
                            `
                            INSERT INTO item_images
                            (item_id, img_url)
                            VALUES ($1, $2)
                            `,
                            [itemId, imageUrl]
                        );
                    }
                }

                imported++;

                console.log(
                    `Imported: ${title} | Met ID: ${object.objectID}`
                );

            } catch (error) {
                console.error(
                    `Failed Met object ${objectID}:`,
                    error.message
                );

                skipped++;
            }
        }

        return {
            requested: objectIDs.length,
            imported,
            skipped
        };

    } catch (error) {
        console.error(
            "Met importer error:",
            error.message
        );

        throw error;
    }
}

module.exports = {
    importMetItems
};