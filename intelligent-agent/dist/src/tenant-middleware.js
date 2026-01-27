"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = tenantMiddleware;
function tenantMiddleware(req, res, next) {
    // مثال: استخراج tenantId من الهيدر أو الكويري أو التوكن
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
    if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenantId' });
    }
    // يمكن ربط tenantId مع قاعدة بيانات أو config خاص
    req.tenantId = tenantId;
    next();
}
