"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauth2Middleware = oauth2Middleware;
function oauth2Middleware(req, res, next) {
    // مثال: تحقق من وجود توكن Bearer
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // في نظام حقيقي: تحقق من صحة التوكن مع مزود الهوية
    // هنا نقبل أي توكن تجريبي
    next();
}
