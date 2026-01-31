// Simple RBAC middleware for risk management
import { Request, Response, NextFunction } from 'express';

// Example roles: admin, risk_manager, viewer
export function requireRole(roles: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    // Assume user role is set on req.user.role (to be integrated with auth system)
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}
