const validateParams = (req, res, next) => {
    // Check all route parameters (e.g. /:id, /:auctionId)
    for (const [key, value] of Object.entries(req.params)) {
        if (key.toLowerCase().includes('id')) {
            const num = Number(value);
            if (!Number.isInteger(num) || num <= 0) {
                return res.status(400).json({ error: `Invalid ${key}: must be a positive integer` });
            }
        }
    }
    next();
};

const validateBodyNumber = (value, min, max, allowEmpty = false) => {
    if (value === undefined || value === null || value === "") {
        return allowEmpty;
    }
    const num = Number(value);
    if (isNaN(num) || !isFinite(num) || num < min || num > max) {
        return false;
    }
    return true;
};

const validateBodyString = (value, allowEmpty = false) => {
    if (value === undefined || value === null) {
        return allowEmpty;
    }
    if (typeof value !== 'string') {
        return false;
    }
    if (!allowEmpty && value.trim() === "") {
        return false;
    }
    return true;
};

module.exports = {
    validateParams,
    validateBodyNumber,
    validateBodyString
};
