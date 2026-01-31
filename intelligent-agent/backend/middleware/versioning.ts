import { Request, Response, NextFunction, Router } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('APIVersioning');

// Supported API versions
export enum APIVersion {
  V1 = 'v1',
  V2 = 'v2'
}

// Version status
export enum VersionStatus {
  CURRENT = 'current',
  SUPPORTED = 'supported',
  DEPRECATED = 'deprecated',
  SUNSET = 'sunset'
}

// Version metadata
interface VersionInfo {
  version: APIVersion;
  status: VersionStatus;
  releaseDate: string;
  deprecationDate?: string;
  sunsetDate?: string;
  changes: string[];
  breakingChanges?: string[];
}

// API version registry
const versionRegistry: Map<APIVersion, VersionInfo> = new Map([
  [
    APIVersion.V1,
    {
      version: APIVersion.V1,
      status: VersionStatus.DEPRECATED,
      releaseDate: '2024-01-01',
      deprecationDate: '2025-01-01',
      sunsetDate: '2026-01-01',
      changes: [
        'Initial API release',
        'Basic CRUD operations',
        'JWT authentication'
      ]
    }
  ],
  [
    APIVersion.V2,
    {
      version: APIVersion.V2,
      status: VersionStatus.CURRENT,
      releaseDate: '2025-01-01',
      changes: [
        'GraphQL support',
        'WebSocket real-time updates',
        'Advanced filtering and pagination',
        'Improved error handling',
        'Rate limiting enhancements'
      ],
      breakingChanges: [
        'Changed response format for list endpoints',
        'Renamed `created_at` to `createdAt` (camelCase)',
        'Removed deprecated `/auth/token` endpoint'
      ]
    }
  ]
]);

// Default version
const DEFAULT_VERSION = APIVersion.V2;

/**
 * Extract API version from request
 */
export function extractVersion(req: Request): APIVersion {
  // Method 1: URL path (/api/v1/users)
  const urlMatch = req.path.match(/^\/api\/(v\d+)\//);
  if (urlMatch) {
    const version = urlMatch[1] as APIVersion;
    if (versionRegistry.has(version)) {
      return version;
    }
  }

  // Method 2: Custom header (X-API-Version)
  const headerVersion = req.headers['x-api-version'] as string;
  if (headerVersion && versionRegistry.has(headerVersion as APIVersion)) {
    return headerVersion as APIVersion;
  }

  // Method 3: Accept-Version header
  const acceptVersion = req.headers['accept-version'] as string;
  if (acceptVersion && versionRegistry.has(acceptVersion as APIVersion)) {
    return acceptVersion as APIVersion;
  }

  // Method 4: Query parameter (?api_version=v1)
  const queryVersion = req.query.api_version as string;
  if (queryVersion && versionRegistry.has(queryVersion as APIVersion)) {
    return queryVersion as APIVersion;
  }

  // Default version
  return DEFAULT_VERSION;
}

/**
 * API versioning middleware
 */
export function versionMiddleware(req: Request, res: Response, next: NextFunction) {
  const version = extractVersion(req);
  const versionInfo = versionRegistry.get(version);

  if (!versionInfo) {
    return res.status(400).json({
      error: 'Invalid API version',
      supportedVersions: Array.from(versionRegistry.keys())
    });
  }

  // Attach version info to request
  (req as any).apiVersion = version;
  (req as any).apiVersionInfo = versionInfo;

  // Add version headers to response
  res.setHeader('X-API-Version', version);
  res.setHeader('X-API-Version-Status', versionInfo.status);

  // Add deprecation warning if applicable
  if (versionInfo.status === VersionStatus.DEPRECATED && versionInfo.sunsetDate) {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', versionInfo.sunsetDate);
    res.setHeader('X-API-Deprecation-Info', `This API version will be sunset on ${versionInfo.sunsetDate}`);
    
    logger.warn('Deprecated API version used', {
      version,
      path: req.path,
      sunsetDate: versionInfo.sunsetDate
    });
  }

  // Block sunset versions
  if (versionInfo.status === VersionStatus.SUNSET) {
    return res.status(410).json({
      error: 'API version no longer supported',
      version,
      sunsetDate: versionInfo.sunsetDate,
      currentVersion: DEFAULT_VERSION,
      message: `Please upgrade to ${DEFAULT_VERSION}`
    });
  }

  next();
}

/**
 * Version-specific route wrapper
 */
export function versionedRoute(
  versions: APIVersion | APIVersion[],
  handler: (req: Request, res: Response, next: NextFunction) => void
) {
  const supportedVersions = Array.isArray(versions) ? versions : [versions];

  return (req: Request, res: Response, next: NextFunction) => {
    const requestVersion = (req as any).apiVersion;

    if (!supportedVersions.includes(requestVersion)) {
      return res.status(400).json({
        error: 'Endpoint not available in this API version',
        requestedVersion: requestVersion,
        supportedVersions,
        message: `This endpoint is only available in: ${supportedVersions.join(', ')}`
      });
    }

    handler(req, res, next);
  };
}

/**
 * Response transformer for backward compatibility
 */
export function transformResponse(data: any, version: APIVersion): any {
  if (version === APIVersion.V1) {
    // Transform v2 response to v1 format
    return transformToV1(data);
  }

  // V2 is the current format
  return data;
}

function transformToV1(data: any): any {
  if (Array.isArray(data)) {
    return data.map(transformToV1);
  }

  if (typeof data === 'object' && data !== null) {
    const transformed: any = {};

    for (const [key, value] of Object.entries(data)) {
      // Convert camelCase to snake_case for v1
      const v1Key = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      transformed[v1Key] = transformToV1(value);
    }

    return transformed;
  }

  return data;
}

/**
 * Get version info endpoint
 */
export function getVersionInfo(req: Request, res: Response) {
  const allVersions = Array.from(versionRegistry.values()).map(v => ({
    version: v.version,
    status: v.status,
    releaseDate: v.releaseDate,
    deprecationDate: v.deprecationDate,
    sunsetDate: v.sunsetDate,
    isDefault: v.version === DEFAULT_VERSION
  }));

  res.json({
    currentVersion: DEFAULT_VERSION,
    versions: allVersions
  });
}

/**
 * Get changelog endpoint
 */
export function getChangelog(req: Request, res: Response) {
  const version = req.params.version as APIVersion;
  const versionInfo = versionRegistry.get(version);

  if (!versionInfo) {
    return res.status(404).json({
      error: 'Version not found',
      availableVersions: Array.from(versionRegistry.keys())
    });
  }

  res.json({
    version: versionInfo.version,
    releaseDate: versionInfo.releaseDate,
    status: versionInfo.status,
    changes: versionInfo.changes,
    breakingChanges: versionInfo.breakingChanges || []
  });
}

/**
 * Setup versioning routes
 */
export function setupVersioningRoutes(app: any) {
  // Version info endpoint
  app.get('/api/versions', getVersionInfo);
  
  // Changelog endpoint
  app.get('/api/versions/:version/changelog', getChangelog);
  
  logger.info('API versioning routes configured');
}

// Example usage:
/*
import express from 'express';
import { 
  versionMiddleware, 
  versionedRoute, 
  APIVersion,
  setupVersioningRoutes,
  transformResponse
} from './middleware/versioning';

const app = express();

// Apply versioning middleware globally
app.use('/api', versionMiddleware);

// Setup versioning info routes
setupVersioningRoutes(app);

// V2 only endpoint
app.get('/api/v2/projects', 
  versionedRoute(APIVersion.V2, async (req, res) => {
    const projects = await getProjects();
    res.json(projects);
  })
);

// Multi-version endpoint with backward compatibility
app.get('/api/:version/users', async (req, res) => {
  const users = await getUsers();
  const version = (req as any).apiVersion;
  
  // Transform response based on version
  const response = transformResponse(users, version);
  res.json(response);
});

// URL-based versioning
app.get('/api/v1/users', (req, res) => {
  // V1 implementation
});

app.get('/api/v2/users', (req, res) => {
  // V2 implementation
});
*/
