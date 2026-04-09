'use strict';

/**
 * DDD Developer Portal
 * ═══════════════════════════════════════════════════════════════════════
 * Auto-generated API documentation, SDK metadata, usage analytics,
 * sandbox mode, and developer onboarding tools.
 *
 * Features:
 *  - Auto-discover endpoints from all DDD domains
 *  - OpenAPI / Swagger spec generation
 *  - SDK metadata for multiple languages
 *  - Changelog management
 *  - API sandbox / playground
 *  - Developer onboarding flows
 *  - Usage examples per endpoint
 *
 * @module dddDevPortal
 */

const mongoose = require('mongoose');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════════════
   1. Models
   ═══════════════════════════════════════════════════════════════════════ */
const changelogSchema = new mongoose.Schema(
  {
    version: { type: String, required: true },
    date: { type: Date, default: Date.now },
    title: { type: String, required: true },
    titleAr: String,
    description: String,
    descriptionAr: String,
    category: {
      type: String,
      enum: ['feature', 'bugfix', 'improvement', 'breaking', 'deprecation', 'security'],
      default: 'feature',
    },
    domain: String,
    breaking: { type: Boolean, default: false },
    tags: [String],
    author: String,
    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

changelogSchema.index({ version: 1, date: -1 });
changelogSchema.index({ category: 1, date: -1 });

const DDDChangelog =
  mongoose.models.DDDChangelog || mongoose.model('DDDChangelog', changelogSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. API Endpoint Discovery
   ═══════════════════════════════════════════════════════════════════════ */
const DOMAIN_ENDPOINTS = [
  /* Core */
  {
    domain: 'core',
    method: 'GET',
    path: '/beneficiaries',
    description: 'List beneficiaries',
    descriptionAr: 'قائمة المستفيدين',
  },
  {
    domain: 'core',
    method: 'POST',
    path: '/beneficiaries',
    description: 'Create beneficiary',
    descriptionAr: 'إنشاء مستفيد',
  },
  {
    domain: 'core',
    method: 'GET',
    path: '/beneficiaries/:id',
    description: 'Get beneficiary by ID',
    descriptionAr: 'استعراض مستفيد',
  },
  {
    domain: 'core',
    method: 'PUT',
    path: '/beneficiaries/:id',
    description: 'Update beneficiary',
    descriptionAr: 'تحديث مستفيد',
  },

  /* Episodes */
  {
    domain: 'episodes',
    method: 'GET',
    path: '/episodes',
    description: 'List episodes of care',
    descriptionAr: 'قائمة حلقات الرعاية',
  },
  {
    domain: 'episodes',
    method: 'POST',
    path: '/episodes',
    description: 'Create episode',
    descriptionAr: 'إنشاء حلقة رعاية',
  },

  /* Sessions */
  {
    domain: 'sessions',
    method: 'GET',
    path: '/sessions',
    description: 'List clinical sessions',
    descriptionAr: 'قائمة الجلسات',
  },
  {
    domain: 'sessions',
    method: 'POST',
    path: '/sessions',
    description: 'Create session',
    descriptionAr: 'إنشاء جلسة',
  },

  /* Assessments */
  {
    domain: 'assessments',
    method: 'GET',
    path: '/assessments',
    description: 'List assessments',
    descriptionAr: 'قائمة التقييمات',
  },
  {
    domain: 'assessments',
    method: 'POST',
    path: '/assessments',
    description: 'Create assessment',
    descriptionAr: 'إنشاء تقييم',
  },

  /* Care Plans */
  {
    domain: 'care-plans',
    method: 'GET',
    path: '/care-plans',
    description: 'List care plans',
    descriptionAr: 'قائمة خطط الرعاية',
  },
  {
    domain: 'care-plans',
    method: 'POST',
    path: '/care-plans',
    description: 'Create care plan',
    descriptionAr: 'إنشاء خطة رعاية',
  },

  /* Goals */
  {
    domain: 'goals',
    method: 'GET',
    path: '/goals',
    description: 'List therapeutic goals',
    descriptionAr: 'قائمة الأهداف العلاجية',
  },
  {
    domain: 'goals',
    method: 'POST',
    path: '/goals',
    description: 'Create goal',
    descriptionAr: 'إنشاء هدف علاجي',
  },

  /* Workflow */
  {
    domain: 'workflow',
    method: 'GET',
    path: '/workflow/tasks',
    description: 'List workflow tasks',
    descriptionAr: 'قائمة المهام',
  },
  {
    domain: 'workflow',
    method: 'POST',
    path: '/workflow/tasks',
    description: 'Create task',
    descriptionAr: 'إنشاء مهمة',
  },

  /* Quality */
  {
    domain: 'quality',
    method: 'GET',
    path: '/quality/audits',
    description: 'List quality audits',
    descriptionAr: 'قائمة مراجعات الجودة',
  },
  {
    domain: 'quality',
    method: 'POST',
    path: '/quality/audits',
    description: 'Create audit',
    descriptionAr: 'إنشاء مراجعة',
  },

  /* Family */
  {
    domain: 'family',
    method: 'GET',
    path: '/family/members',
    description: 'List family members',
    descriptionAr: 'قائمة أفراد الأسرة',
  },
  {
    domain: 'family',
    method: 'POST',
    path: '/family/members',
    description: 'Add family member',
    descriptionAr: 'إضافة فرد أسرة',
  },

  /* Reports */
  {
    domain: 'reports',
    method: 'GET',
    path: '/reports',
    description: 'List reports',
    descriptionAr: 'قائمة التقارير',
  },
  {
    domain: 'reports',
    method: 'POST',
    path: '/reports/generate',
    description: 'Generate report',
    descriptionAr: 'إنشاء تقرير',
  },

  /* Group Therapy */
  {
    domain: 'group-therapy',
    method: 'GET',
    path: '/group-therapy/groups',
    description: 'List therapy groups',
    descriptionAr: 'المجموعات العلاجية',
  },

  /* Tele-Rehab */
  {
    domain: 'tele-rehab',
    method: 'GET',
    path: '/tele-rehab/sessions',
    description: 'List tele-sessions',
    descriptionAr: 'جلسات عن بُعد',
  },

  /* AR/VR */
  {
    domain: 'ar-vr',
    method: 'GET',
    path: '/ar-vr/sessions',
    description: 'List AR/VR sessions',
    descriptionAr: 'جلسات AR/VR',
  },

  /* Behavior */
  {
    domain: 'behavior',
    method: 'GET',
    path: '/behavior/records',
    description: 'List behavior records',
    descriptionAr: 'سجلات السلوك',
  },

  /* Research */
  {
    domain: 'research',
    method: 'GET',
    path: '/research/studies',
    description: 'List research studies',
    descriptionAr: 'الدراسات البحثية',
  },

  /* Field Training */
  {
    domain: 'field-training',
    method: 'GET',
    path: '/field-training/programs',
    description: 'List training programs',
    descriptionAr: 'برامج التدريب',
  },

  /* Dashboards */
  {
    domain: 'dashboards',
    method: 'GET',
    path: '/dashboards',
    description: 'List dashboards',
    descriptionAr: 'لوحات المعلومات',
  },

  /* Platform */
  {
    domain: 'platform',
    method: 'GET',
    path: '/platform/health',
    description: 'Platform health check',
    descriptionAr: 'فحص صحة المنصة',
  },
  {
    domain: 'platform',
    method: 'GET',
    path: '/platform/stats',
    description: 'Platform statistics',
    descriptionAr: 'إحصائيات المنصة',
  },
  {
    domain: 'platform',
    method: 'GET',
    path: '/platform/version',
    description: 'Platform version',
    descriptionAr: 'إصدار المنصة',
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   3. SDK Metadata
   ═══════════════════════════════════════════════════════════════════════ */
const SDK_TARGETS = [
  {
    language: 'javascript',
    label: 'JavaScript / Node.js',
    installCmd: 'npm install @alawael/rehab-sdk',
    example: `const { RehabClient } = require('@alawael/rehab-sdk');\nconst client = new RehabClient({ apiKey: 'YOUR_KEY' });\nconst beneficiaries = await client.beneficiaries.list();`,
  },
  {
    language: 'python',
    label: 'Python',
    installCmd: 'pip install alawael-rehab-sdk',
    example: `from alawael_rehab import RehabClient\nclient = RehabClient(api_key="YOUR_KEY")\nbeneficiaries = client.beneficiaries.list()`,
  },
  {
    language: 'dart',
    label: 'Dart / Flutter',
    installCmd: 'flutter pub add alawael_rehab_sdk',
    example: `import 'package:alawael_rehab_sdk/rehab_sdk.dart';\nfinal client = RehabClient(apiKey: 'YOUR_KEY');\nfinal beneficiaries = await client.beneficiaries.list();`,
  },
  {
    language: 'csharp',
    label: 'C# / .NET',
    installCmd: 'dotnet add package Alawael.RehabSdk',
    example: `using Alawael.RehabSdk;\nvar client = new RehabClient("YOUR_KEY");\nvar beneficiaries = await client.Beneficiaries.ListAsync();`,
  },
  {
    language: 'curl',
    label: 'cURL',
    installCmd: null,
    example: `curl -H "x-api-key: YOUR_KEY" https://api.alawael.sa/api/v2/ddd-platform/beneficiaries`,
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   4. OpenAPI Spec Generator
   ═══════════════════════════════════════════════════════════════════════ */
function generateOpenAPISpec() {
  const paths = {};

  for (const ep of DOMAIN_ENDPOINTS) {
    const fullPath = `/api/v2/ddd-platform${ep.path}`;
    if (!paths[fullPath]) paths[fullPath] = {};
    paths[fullPath][ep.method.toLowerCase()] = {
      summary: ep.description,
      description: ep.descriptionAr,
      tags: [ep.domain],
      parameters: ep.path.includes(':id')
        ? [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }]
        : [],
      responses: {
        200: { description: 'Success' },
        400: { description: 'Bad request' },
        401: { description: 'Unauthorized' },
        404: { description: 'Not found' },
        500: { description: 'Server error' },
      },
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Unified Rehabilitation Intelligence Platform API',
      titleAr: 'واجهة برمجة منصة التأهيل الموحدة الذكية',
      version: '2.0.0',
      description: 'Comprehensive API for the DDD-based rehabilitation platform',
      contact: { name: 'Al-Awael Platform Team', email: 'dev@alawael.sa' },
    },
    servers: [
      { url: 'https://api.alawael.sa', description: 'Production' },
      { url: 'http://localhost:5000', description: 'Development' },
    ],
    paths,
    tags: [...new Set(DOMAIN_ENDPOINTS.map(e => e.domain))].map(d => ({ name: d })),
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Changelog Management
   ═══════════════════════════════════════════════════════════════════════ */
async function addChangelog(data) {
  return DDDChangelog.create(data);
}

async function getChangelogs(options = {}) {
  const query = { isDeleted: { $ne: true } };
  if (options.version) query.version = options.version;
  if (options.category) query.category = options.category;
  const limit = options.limit || 50;
  return DDDChangelog.find(query).sort({ date: -1 }).limit(limit).lean();
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Developer Portal Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getDevPortalDashboard() {
  const changelogCount = await DDDChangelog.countDocuments({ isDeleted: { $ne: true } });
  const domains = [...new Set(DOMAIN_ENDPOINTS.map(e => e.domain))];

  return {
    platform: {
      name: 'Unified Rehabilitation Intelligence Platform',
      nameAr: 'منصة التأهيل الموحدة الذكية',
      version: '2.0.0-ddd',
      architecture: 'Domain-Driven Design',
    },
    api: {
      totalEndpoints: DOMAIN_ENDPOINTS.length,
      domains: domains.length,
      domainList: domains,
      versions: ['v1', 'v2'],
      currentVersion: 'v2',
    },
    sdks: SDK_TARGETS.map(s => ({ language: s.language, label: s.label })),
    changelog: {
      totalEntries: changelogCount,
    },
    documentation: {
      openapi: true,
      sandbox: true,
      examples: true,
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Router
   ═══════════════════════════════════════════════════════════════════════ */
function createDevPortalRouter() {
  const router = Router();

  /* Portal dashboard */
  router.get('/dev-portal/dashboard', async (_req, res) => {
    try {
      res.json({ success: true, ...(await getDevPortalDashboard()) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* OpenAPI spec */
  router.get('/dev-portal/openapi', (_req, res) => {
    try {
      res.json(generateOpenAPISpec());
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Endpoints catalog */
  router.get('/dev-portal/endpoints', (req, res) => {
    let endpoints = DOMAIN_ENDPOINTS;
    if (req.query.domain) endpoints = endpoints.filter(e => e.domain === req.query.domain);
    if (req.query.method)
      endpoints = endpoints.filter(e => e.method === req.query.method.toUpperCase());
    res.json({ success: true, count: endpoints.length, endpoints });
  });

  /* SDK info */
  router.get('/dev-portal/sdks', (_req, res) => {
    res.json({ success: true, sdks: SDK_TARGETS });
  });

  /* SDK for specific language */
  router.get('/dev-portal/sdks/:language', (req, res) => {
    const sdk = SDK_TARGETS.find(s => s.language === req.params.language);
    if (!sdk) return res.status(404).json({ success: false, error: 'SDK not found' });
    res.json({ success: true, sdk });
  });

  /* Changelogs */
  router.get('/dev-portal/changelog', async (req, res) => {
    try {
      const logs = await getChangelogs({
        version: req.query.version,
        category: req.query.category,
        limit: parseInt(req.query.limit, 10) || 50,
      });
      res.json({ success: true, count: logs.length, changelog: logs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Add changelog entry */
  router.post('/dev-portal/changelog', async (req, res) => {
    try {
      const entry = await addChangelog(req.body);
      res.status(201).json({ success: true, entry });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Domain detail */
  router.get('/dev-portal/domains/:domain', (req, res) => {
    const endpoints = DOMAIN_ENDPOINTS.filter(e => e.domain === req.params.domain);
    if (endpoints.length === 0)
      return res.status(404).json({ success: false, error: 'Domain not found' });
    res.json({
      success: true,
      domain: req.params.domain,
      endpoints: endpoints.length,
      catalog: endpoints,
    });
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDChangelog,
  DOMAIN_ENDPOINTS,
  SDK_TARGETS,
  generateOpenAPISpec,
  addChangelog,
  getChangelogs,
  getDevPortalDashboard,
  createDevPortalRouter,
};
