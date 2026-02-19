/**
 * Test Resources Routes
 * Mock /api/resources endpoint for comprehensive API tests
 */

const express = require('express');
const router = express.Router();

// In-memory storage for testing
let resources = new Map();
let resourceId = 1;

// === SPECIFIC ROUTES FIRST (before :id catch-all) ===

// GET /api/resources - List resources
router.get('/', (req, res) => {
  try {
    const resourceArray = Array.from(resources.values());
    res.set('ETag', `"resources-list-etag"`);
    res.set('Last-Modified', new Date().toUTCString());
    res.set('Cache-Control', 'public, max-age=300');

    // Support both JSON and XML
    if (req.accepts('xml')) {
      res.type('application/xml');
      res.send(
        '<resources>' +
          resourceArray.map(r => `<resource>${JSON.stringify(r)}</resource>`).join('') +
          '</resources>'
      );
    } else {
      res.json({
        data: resourceArray,
        pagination: {
          total: resourceArray.length,
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 10,
        },
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/resources - Bulk delete (MUST come before /:id routes)
router.delete('/', (req, res) => {
  try {
    if (req.body && req.body.ids) {
      for (const id of req.body.ids) {
        resources.delete(id);
      }
    }
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/resources/upload - File upload (MUST come before /:id routes)
router.post('/upload', (req, res) => {
  res.json({ data: { uploadedFile: 'test.txt' } });
});

// POST /api/resources/bulk - Bulk operations (MUST come before /:id routes)
router.post('/bulk', (req, res) => {
  try {
    const results = [];
    let operations = req.body.operations;

    // Handle both array and object formats
    if (!Array.isArray(operations)) {
      // Convert object { 0: {...}, 1: {...} } to array
      operations = Object.values(operations || {});
    }

    if (operations && operations.length > 0) {
      for (const op of operations) {
        if (op.action === 'create') {
          const id = (resourceId++).toString();
          const resource = { id, ...op.data };
          resources.set(id, resource);
          results.push(resource);
        }
      }
    }
    res.status(201).json({ data: results });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/resources/slow-endpoint (MUST come before /:id routes)
router.get('/slow-endpoint', (req, res) => {
  setTimeout(() => res.json({ data: 'ok' }), 200);
});

// GET /api/resources/error-endpoint (MUST come before /:id routes)
router.get('/error-endpoint', (req, res) => {
  res.status(500).json({ error: 'Internal server error' });
});

// === GENERIC ROUTES (after specific routes)

// POST /api/resources - Create resource
router.post('/', (req, res) => {
  const id = (resourceId++).toString();
  const resource = {
    id,
    ...req.body,
    createdAt: new Date(),
  };
  resources.set(id, resource);
  res.status(201).json({ data: resource });
});

// GET /api/resources/:id - Get single resource
router.get('/:id', (req, res) => {
  const etag = `"${req.params.id}-etag"`;
  const lastModified = new Date().toUTCString();

  // Handle If-None-Match (ETag)
  if (req.headers['if-none-match'] === etag) {
    res.set('ETag', etag);
    return res.status(304).send();
  }

  // Handle If-Modified-Since
  if (req.headers['if-modified-since']) {
    res.set('Last-Modified', lastModified);
    return res.status(304).send();
  }

  const resource = resources.get(req.params.id);
  if (resource) {
    res.set('ETag', etag);
    res.set('Last-Modified', lastModified);
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ data: resource });
  } else {
    res.status(404).json({ error: 'Resource not found' });
  }
});

// PUT /api/resources/:id - Replace resource
router.put('/:id', (req, res) => {
  const resource = { id: req.params.id, ...req.body };
  resources.set(req.params.id, resource);
  res.json({ data: resource });
});

// PATCH /api/resources/:id - Partial update
router.patch('/:id', (req, res) => {
  const existing = resources.get(req.params.id);
  if (existing) {
    const updated = { ...existing, ...req.body };
    resources.set(req.params.id, updated);
    res.json({ data: updated });
  } else {
    res.status(404).json({ error: 'Resource not found' });
  }
});

// DELETE /api/resources/:id - Delete resource
router.delete('/:id', (req, res) => {
  if (req.params.id === 'protected-id') {
    res.status(403).json({ error: 'Cannot delete protected resource' });
  } else if (resources.has(req.params.id)) {
    resources.delete(req.params.id);
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Resource not found' });
  }
});

module.exports = router;
