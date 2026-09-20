/**
 * Mock / Dummy Payment Gateway Service
 * Simulates real-world payment processors (bKash, Nagad, Visa, Mastercard, AMEX)
 * Generates realistic gateway references, validation checks, and transaction IDs.
 */

const crypto = require("crypto");

/**
 * Process a simulated payment request
 * @param {Object} paymentData
 * @param {number} paymentData.amount - Amount in BDT
 * @param {string} paymentData.method - Payment method ('bkash', 'nagad', 'card', 'bank')
 * @param {string} [paymentData.accountNumber] - Mock phone number or card number
 * @param {string} [paymentData.pin] - Mock PIN or CVV
 * @param {number} paymentData.userId - User initiating the transaction
 * @returns {Promise<Object>} Gateway response object
 */
const processMockGatewayTransaction = async ({
    amount,
    method = "bkash",
    accountNumber = "01700000000",
    pin = "1234",
    userId
}) => {
    // Artificial slight latency (100ms) to simulate external API round-trip
    await new Promise(resolve => setTimeout(resolve, 100));

    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
        return {
            success: false,
            statusCode: 400,
            status: "REJECTED",
            error: "Invalid transaction amount. Must be greater than 0."
        };
    }

    // Maximum simulated transaction limit (e.g. 1,000,000 BDT)
    if (numericAmount > 1000000) {
        return {
            success: false,
            statusCode: 400,
            status: "LIMIT_EXCEEDED",
            error: "Amount exceeds single transaction limit of ৳1,000,000"
        };
    }

    // Generate simulated gateway transaction identifier (e.g. GW_BKASH_9F3A18...)
    const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    const gatewayPrefix = (method || "GATEWAY").toUpperCase().slice(0, 6);
    const gatewayTxnId = `GW_${gatewayPrefix}_${Date.now().toString().slice(-6)}${randomHex}`;

    return {
        success: true,
        statusCode: 200,
        status: "APPROVED",
        gatewayTxnId,
        provider: method.toLowerCase(),
        amount: numericAmount,
        currency: "BDT",
        timestamp: new Date().toISOString(),
        authCode: `AUTH_${crypto.randomInt(100000, 999999)}`,
        message: `Payment of ৳${numericAmount.toLocaleString()} successfully authorized via ${method.toUpperCase()} Gateway.`
    };
};

module.exports = {
    processMockGatewayTransaction
};
