const pool = require("../config/db");

/**
 * Get all shipments for a specific user (either as buyer or seller)
 */
const getShipmentsByUser = async (userId, role) => {
    // If Admin, they can see all shipments, but usually we filter by disputed, etc.
    // For now, let's just return Buyer/Seller specific.
    
    let query = `
        SELECT 
            s.shipment_id,
            s.txn_id,
            s.carrier,
            s.tracking_number,
            s.shipping_date,
            s.deliver_date,
            s.status,
            t.amount AS payment_amount,
            i.title AS item_title,
            i.thumbnail_url,
            u_seller.username AS seller_name,
            u_buyer.username AS buyer_name,
            a.street,
            a.city
        FROM shipments s
        JOIN transactions t ON s.txn_id = t.txn_id
        JOIN auctions auc ON t.auction_id = auc.auction_id
        JOIN items i ON auc.item_id = i.item_id
        JOIN users u_seller ON i.seller_id = u_seller.user_id
        LEFT JOIN bids b ON t.winner_bid_id = b.bid_id
        JOIN users u_buyer ON b.bidder_id = u_buyer.user_id
        JOIN addresses a ON s.address_id = a.address_id
        WHERE `;
        
    const params = [userId];
    
    if (role === 'admin') {
        query = query.replace('WHERE ', 'ORDER BY s.shipment_id DESC');
        params.pop(); // remove userId
    } else {
        // Find where user is buyer or seller
        query += `b.bidder_id = $1 OR i.seller_id = $1 ORDER BY s.shipment_id DESC`;
    }

    const result = await pool.query(query, params);
    return result.rows;
};

/**
 * Seller ships the item
 */
const shipItem = async (shipmentId, sellerId, carrier, trackingNumber) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        // Check ownership
        const check = await client.query(
            `SELECT i.seller_id 
             FROM shipments s
             JOIN transactions t ON s.txn_id = t.txn_id
             JOIN auctions auc ON t.auction_id = auc.auction_id
             JOIN items i ON auc.item_id = i.item_id
             WHERE s.shipment_id = $1`,
            [shipmentId]
        );
        
        if (check.rows.length === 0) throw new Error("Shipment not found");
        if (check.rows[0].seller_id !== Number(sellerId)) throw new Error("Unauthorized: Not the seller");
        
        const update = await client.query(
            `UPDATE shipments
             SET status = 'shipped', carrier = $1, tracking_number = $2, shipping_date = NOW()
             WHERE shipment_id = $3 AND status = 'pending'
             RETURNING *`,
            [carrier, trackingNumber, shipmentId]
        );
        
        if (update.rows.length === 0) throw new Error("Shipment cannot be shipped (wrong status)");
        
        await client.query("COMMIT");
        return update.rows[0];
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Buyer confirms delivery & Releases Escrow
 */
const markDelivered = async (shipmentId, buyerId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        // 1. Check ownership & get txn details
        const check = await client.query(
            `SELECT b.bidder_id AS buyer_id, t.amount, i.seller_id, t.txn_id
             FROM shipments s
             JOIN transactions t ON s.txn_id = t.txn_id
             LEFT JOIN bids b ON t.winner_bid_id = b.bid_id
             JOIN auctions auc ON t.auction_id = auc.auction_id
             JOIN items i ON auc.item_id = i.item_id
             WHERE s.shipment_id = $1 FOR UPDATE`,
            [shipmentId]
        );
        
        if (check.rows.length === 0) throw new Error("Shipment not found");
        const data = check.rows[0];
        
        if (data.buyer_id !== Number(buyerId)) throw new Error("Unauthorized: Not the buyer");
        
        // 2. Update status
        const update = await client.query(
            `UPDATE shipments
             SET status = 'delivered', deliver_date = NOW()
             WHERE shipment_id = $1 AND status = 'shipped'
             RETURNING *`,
            [shipmentId]
        );
        
        if (update.rows.length === 0) throw new Error("Shipment cannot be delivered (must be 'shipped')");
        
        // 3. RELEASE ESCROW -> Pay Seller
        const paymentAmount = data.amount;
        
        // 3. RELEASE ESCROW -> Pay Seller (Using the Stored Procedure as per project requirements)
        await client.query(
            'CALL release_escrow($1, $2, $3)',
            [data.txn_id, data.seller_id, paymentAmount]
        );
        
        // 4. Notify Seller
        await client.query(
            `INSERT INTO notifications (user_id, type, message)
             VALUES ($1, 'escrow_released', $2)`,
            [data.seller_id, `The buyer has confirmed delivery! ৳${Number(paymentAmount).toLocaleString()} has been released from Escrow into your wallet.`]
        );
        
        await client.query("COMMIT");
        return update.rows[0];
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Buyer opens a dispute
 */
const openDispute = async (shipmentId, buyerId, reason) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        const check = await client.query(
            `SELECT b.bidder_id AS buyer_id
             FROM shipments s
             JOIN transactions t ON s.txn_id = t.txn_id
             LEFT JOIN bids b ON t.winner_bid_id = b.bid_id
             WHERE s.shipment_id = $1 FOR UPDATE`,
            [shipmentId]
        );
        
        if (check.rows.length === 0) throw new Error("Shipment not found");
        if (check.rows[0].buyer_id !== Number(buyerId)) throw new Error("Unauthorized");
        
        const update = await client.query(
            `UPDATE shipments
             SET status = 'disputed'
             WHERE shipment_id = $1 AND status = 'shipped'
             RETURNING *`,
            [shipmentId]
        );
        
        if (update.rows.length === 0) throw new Error("Only shipped items can be disputed");
        
        // Create dispute row
        await client.query(
            `INSERT INTO disputes (shipment_id, raised_by, reason, status)
             VALUES ($1, $2, $3, 'open')`,
            [shipmentId, buyerId, reason]
        );
        
        await client.query("COMMIT");
        return update.rows[0];
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

module.exports = {
    getShipmentsByUser,
    shipItem,
    markDelivered,
    openDispute
};
