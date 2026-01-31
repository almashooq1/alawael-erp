"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
// Example roles: admin, risk_manager, viewer
function requireRole(roles) {
    return (req, res, next) => {
        // Assume user role is set on req.user.role (to be integrated with auth system)
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        }
        next();
    };
}
