import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';
import { cacheService } from '../services/cache';

const logger = createLogger('MultiTenant');

// ==================== TENANT MODEL ====================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'suspended' | 'trial' | 'canceled';
  settings: TenantSettings;
  limits: TenantLimits;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  branding: {
    logo?: string;
    primaryColor?: string;
    favicon?: string;
  };
  features: {
    graphql: boolean;
    websockets: boolean;
    advancedAnalytics: boolean;
    customDomain: boolean;
    sso: boolean;
    apiAccess: boolean;
  };
  security: {
    mfaRequired: boolean;
    ipWhitelist?: string[];
    sessionTimeout: number;
  };
  notifications: {
    email: boolean;
    slack?: string;
    webhook?: string;
  };
}

export interface TenantLimits {
  users: number;
  projects: number;
  storage: number; // GB
  apiCalls: number; // per month
  models: number;
  predictions: number; // per month
}

// Plan-based limits
const planLimits: Record<string, TenantLimits> = {
  free: {
    users: 3,
    projects: 5,
    storage: 1,
    apiCalls: 1000,
    models: 5,
    predictions: 1000
  },
  basic: {
    users: 10,
    projects: 20,
    storage: 10,
    apiCalls: 10000,
    models: 25,
    predictions: 10000
  },
  premium: {
    users: 50,
    projects: 100,
    storage: 100,
    apiCalls: 100000,
    models: 100,
    predictions: 100000
  },
  enterprise: {
    users: -1, // unlimited
    projects: -1,
    storage: -1,
    apiCalls: -1,
    models: -1,
    predictions: -1
  }
};

// ==================== TENANT CONTEXT ====================

/**
 * Extract tenant from request
 */
export function extractTenant(req: Request): string | null {
  // Method 1: Subdomain (tenant.example.com)
  const host = req.hostname;
  const subdomainMatch = host.match(/^([^.]+)\./);
  if (subdomainMatch && !['www', 'api', 'app'].includes(subdomainMatch[1])) {
    return subdomainMatch[1];
  }

  // Method 2: Custom domain
  // Check if domain is mapped to a tenant

  // Method 3: Header (X-Tenant-ID)
  const headerTenant = req.headers['x-tenant-id'] as string;
  if (headerTenant) {
    return headerTenant;
  }

  // Method 4: Path prefix (/tenant/xyz/api)
  const pathMatch = req.path.match(/^\/tenant\/([^\/]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  // Method 5: User's primary tenant (from auth)
  const user = (req as any).user;
  if (user?.tenantId) {
    return user.tenantId;
  }

  return null;
}

/**
 * Tenant middleware
 */
export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = extractTenant(req);

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant not specified',
        message: 'Please specify tenant via subdomain, header, or path'
      });
    }

    // Get tenant from cache or database
    let tenant = await cacheService.get<Tenant>(`tenant:${tenantId}`);

    if (!tenant) {
      // Fetch from database
      tenant = await fetchTenantFromDB(tenantId);

      if (!tenant) {
        return res.status(404).json({
          error: 'Tenant not found',
          tenantId
        });
      }

      // Cache tenant data
      await cacheService.set(`tenant:${tenantId}`, tenant, 300);
    }

    // Check tenant status
    if (tenant.status === 'suspended') {
      return res.status(403).json({
        error: 'Tenant suspended',
        message: 'This tenant account has been suspended. Please contact support.',
        tenantId
      });
    }

    if (tenant.status === 'canceled') {
      return res.status(403).json({
        error: 'Tenant canceled',
        message: 'This tenant account has been canceled.',
        tenantId
      });
    }

    // Attach tenant to request
    (req as any).tenant = tenant;
    (req as any).tenantId = tenantId;

    // Set tenant header in response
    res.setHeader('X-Tenant-ID', tenantId);
    res.setHeader('X-Tenant-Plan', tenant.plan);

    logger.debug('Tenant context set', { tenantId, plan: tenant.plan });
    next();
  } catch (error: any) {
    logger.error('Tenant middleware error', { error: error.message });
    res.status(500).json({ error: 'Failed to process tenant context' });
  }
}

/**
 * Check if tenant has access to feature
 */
export function requireFeature(feature: keyof TenantSettings['features']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenant: Tenant = (req as any).tenant;

    if (!tenant) {
      return res.status(403).json({
        error: 'Tenant context required',
        message: 'This endpoint requires tenant context'
      });
    }

    if (!tenant.settings.features[feature]) {
      return res.status(403).json({
        error: 'Feature not available',
        message: `The feature '${feature}' is not available on your plan`,
        plan: tenant.plan,
        upgradeRequired: true
      });
    }

    next();
  };
}

/**
 * Check tenant resource limit
 */
export async function checkLimit(
  tenantId: string,
  resource: keyof TenantLimits,
  currentCount: number
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const tenant = await fetchTenantFromDB(tenantId);
  
  if (!tenant) {
    return { allowed: false, limit: 0, current: 0 };
  }

  const limit = tenant.limits[resource];

  // -1 means unlimited (enterprise)
  if (limit === -1) {
    return { allowed: true, limit: -1, current: currentCount };
  }

  const allowed = currentCount < limit;

  return { allowed, limit, current: currentCount };
}

/**
 * Middleware to check resource limit
 */
export function limitMiddleware(resource: keyof TenantLimits) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant: Tenant = (req as any).tenant;

      if (!tenant) {
        return res.status(403).json({ error: 'Tenant context required' });
      }

      // Get current resource count
      const currentCount = await getCurrentResourceCount(tenant.id, resource);

      const limitCheck = await checkLimit(tenant.id, resource, currentCount);

      if (!limitCheck.allowed) {
        logger.warn('Tenant limit exceeded', {
          tenantId: tenant.id,
          resource,
          limit: limitCheck.limit,
          current: limitCheck.current
        });

        return res.status(429).json({
          error: 'Resource limit exceeded',
          message: `You have reached your ${resource} limit for ${tenant.plan} plan`,
          limit: limitCheck.limit,
          current: limitCheck.current,
          resource,
          plan: tenant.plan,
          upgradeRequired: true
        });
      }

      // Set limit headers
      res.setHeader(`X-${resource}-Limit`, limitCheck.limit);
      res.setHeader(`X-${resource}-Current`, limitCheck.current);
      res.setHeader(`X-${resource}-Remaining`, limitCheck.limit - limitCheck.current);

      next();
    } catch (error: any) {
      logger.error('Limit middleware error', { error: error.message });
      next(); // Continue on error (fail open)
    }
  };
}

/**
 * Database query filter for tenant isolation
 */
export function tenantFilter(req: Request): { tenantId: string } {
  const tenantId = (req as any).tenantId;

  if (!tenantId) {
    throw new Error('Tenant context not found');
  }

  return { tenantId };
}

// ==================== HELPER FUNCTIONS ====================

async function fetchTenantFromDB(tenantId: string): Promise<Tenant | null> {
  // Mock implementation - replace with actual database query
  return {
    id: tenantId,
    name: 'Example Tenant',
    slug: tenantId,
    plan: 'premium',
    status: 'active',
    settings: {
      branding: {},
      features: {
        graphql: true,
        websockets: true,
        advancedAnalytics: true,
        customDomain: true,
        sso: false,
        apiAccess: true
      },
      security: {
        mfaRequired: false,
        sessionTimeout: 3600
      },
      notifications: {
        email: true
      }
    },
    limits: planLimits['premium'],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

async function getCurrentResourceCount(tenantId: string, resource: keyof TenantLimits): Promise<number> {
  // Mock implementation - replace with actual database query
  return 0;
}

// Example usage:
/*
import express from 'express';
import { tenantMiddleware, requireFeature, limitMiddleware, tenantFilter } from './middleware/multi-tenant';

const app = express();

// Apply tenant middleware globally
app.use('/api', tenantMiddleware);

// Require specific feature
app.get('/api/graphql', 
  requireFeature('graphql'),
  graphqlHandler
);

// Check resource limits
app.post('/api/projects',
  limitMiddleware('projects'),
  async (req, res) => {
    const filter = tenantFilter(req);
    const project = await createProject({ ...req.body, ...filter });
    res.json(project);
  }
);

// Tenant-specific queries
app.get('/api/projects', async (req, res) => {
  const filter = tenantFilter(req);
  const projects = await db.projects.find(filter);
  res.json(projects);
});
*/
