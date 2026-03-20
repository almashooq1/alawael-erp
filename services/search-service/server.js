/*  ═══════════════════════════════════════════════════════════════
 *  Al-Awael ERP — Search Service (خدمة البحث المتقدم)
 *  Port 3240 · Elasticsearch 8 Integration
 *  Provides: full-text search, autocomplete, faceted search,
 *  index lifecycle management, Arabic tokenization
 *  ═══════════════════════════════════════════════════════════════ */

require('dotenv').config();
const express = require('express');
const { Client } = require('@elastic/elasticsearch');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const winston = require('winston');

const app = express();
app.use(express.json({ limit: '2mb' }));

/* ── Logger ──────────────────────────────────────────────────── */
const log = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/* ── Connections ─────────────────────────────────────────────── */
const es = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200' });
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/5');

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael', {
    maxPoolSize: 5,
  })
  .then(() => log.info('MongoDB connected'))
  .catch(e => log.error('MongoDB error', e));

/* ── Index Definitions ───────────────────────────────────────── */
const INDEX_SCHEMAS = {
  employees: {
    settings: {
      analysis: {
        analyzer: {
          arabic_custom: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'arabic_normalization', 'arabic_stemmer'],
          },
        },
        filter: { arabic_stemmer: { type: 'stemmer', language: 'arabic' } },
      },
      number_of_shards: 1,
      number_of_replicas: 0,
    },
    mappings: {
      properties: {
        name: { type: 'text', analyzer: 'arabic_custom', fields: { keyword: { type: 'keyword' } } },
        nameEn: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        employeeId: { type: 'keyword' },
        department: { type: 'keyword' },
        position: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        email: { type: 'keyword' },
        phone: { type: 'keyword' },
        status: { type: 'keyword' },
        hireDate: { type: 'date' },
        salary: { type: 'float' },
        skills: { type: 'keyword' },
        organizationId: { type: 'keyword' },
        updatedAt: { type: 'date' },
      },
    },
  },
  children: {
    settings: {
      analysis: {
        analyzer: {
          arabic_custom: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'arabic_normalization', 'arabic_stemmer'],
          },
        },
        filter: { arabic_stemmer: { type: 'stemmer', language: 'arabic' } },
      },
    },
    mappings: {
      properties: {
        name: { type: 'text', analyzer: 'arabic_custom', fields: { keyword: { type: 'keyword' } } },
        parentName: { type: 'text', analyzer: 'arabic_custom' },
        classGroup: { type: 'keyword' },
        age: { type: 'integer' },
        status: { type: 'keyword' },
        enrollmentDate: { type: 'date' },
        organizationId: { type: 'keyword' },
      },
    },
  },
  documents: {
    mappings: {
      properties: {
        title: { type: 'text', analyzer: 'arabic_custom', fields: { keyword: { type: 'keyword' } } },
        content: { type: 'text', analyzer: 'arabic_custom' },
        type: { type: 'keyword' },
        tags: { type: 'keyword' },
        createdBy: { type: 'keyword' },
        organizationId: { type: 'keyword' },
        createdAt: { type: 'date' },
      },
    },
  },
  inventory: {
    mappings: {
      properties: {
        itemName: { type: 'text', analyzer: 'arabic_custom', fields: { keyword: { type: 'keyword' } } },
        sku: { type: 'keyword' },
        category: { type: 'keyword' },
        quantity: { type: 'integer' },
        price: { type: 'float' },
        warehouse: { type: 'keyword' },
        organizationId: { type: 'keyword' },
      },
    },
  },
};

/* ── Ensure Indices ──────────────────────────────────────────── */
async function ensureIndices() {
  for (const [name, schema] of Object.entries(INDEX_SCHEMAS)) {
    const idx = `alawael_${name}`;
    const exists = await es.indices.exists({ index: idx });
    if (!exists) {
      await es.indices.create({ index: idx, body: schema });
      log.info(`Index ${idx} created`);
    }
  }
}

/* ── Health ───────────────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  try {
    const info = await es.cluster.health();
    res.json({ status: 'ok', elasticsearch: info.status, indices: info.active_shards });
  } catch (e) {
    res.status(503).json({ status: 'error', message: e.message });
  }
});

/* ── Global Search (across multiple indices) ─────────────────── */
app.get('/api/search', async (req, res) => {
  try {
    const { q, indices, from = 0, size = 20, org } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

    const targetIndices = indices
      ? indices.split(',').map(i => `alawael_${i.trim()}`)
      : Object.keys(INDEX_SCHEMAS).map(i => `alawael_${i}`);

    // Check cache
    const cacheKey = `search:${targetIndices.join(',')}:${q}:${from}:${size}:${org || ''}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const must = [
      {
        multi_match: {
          query: q,
          fields: ['name^3', 'nameEn^3', 'title^2', 'content', 'itemName^2', 'parentName', 'email', 'phone', 'sku'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      },
    ];
    if (org) must.push({ term: { organizationId: org } });

    const result = await es.search({
      index: targetIndices.join(','),
      body: {
        from: parseInt(from),
        size: Math.min(parseInt(size), 100),
        query: { bool: { must } },
        highlight: {
          fields: { '*': {} },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
        },
        _source: true,
      },
    });

    const response = {
      total: result.hits.total.value,
      hits: result.hits.hits.map(h => ({
        id: h._id,
        index: h._index.replace('alawael_', ''),
        score: h._score,
        source: h._source,
        highlights: h.highlight || {},
      })),
    };

    await redis.setex(cacheKey, 60, JSON.stringify(response));
    res.json(response);
  } catch (e) {
    log.error('Search error', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

/* ── Autocomplete / Suggest ──────────────────────────────────── */
app.get('/api/search/suggest', async (req, res) => {
  try {
    const { q, index = 'employees', field = 'name', size = 10 } = req.query;
    if (!q) return res.status(400).json({ error: 'q required' });

    const result = await es.search({
      index: `alawael_${index}`,
      body: {
        size: parseInt(size),
        query: {
          bool: {
            should: [{ match_phrase_prefix: { [field]: { query: q, boost: 2 } } }, { fuzzy: { [field]: { value: q, fuzziness: 'AUTO' } } }],
          },
        },
        _source: [field, 'employeeId', 'status'],
      },
    });

    res.json({
      suggestions: result.hits.hits.map(h => ({
        id: h._id,
        text: h._source[field],
        score: h._score,
        meta: h._source,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Faceted Search ──────────────────────────────────────────── */
app.post('/api/search/faceted', async (req, res) => {
  try {
    const { index, query, filters = {}, facets = [], from = 0, size = 20, sort } = req.body;
    if (!index) return res.status(400).json({ error: 'index required' });

    const must = [];
    if (query) {
      must.push({
        multi_match: { query, fields: ['*'], type: 'best_fields', fuzziness: 'AUTO' },
      });
    }
    const filterClauses = Object.entries(filters).map(([field, value]) =>
      Array.isArray(value) ? { terms: { [field]: value } } : { term: { [field]: value } },
    );

    const aggs = {};
    for (const facet of facets) {
      aggs[facet] = { terms: { field: facet, size: 50 } };
    }

    const body = {
      from: parseInt(from),
      size: Math.min(parseInt(size), 100),
      query: { bool: { must, filter: filterClauses } },
      aggs,
      highlight: { fields: { '*': {} }, pre_tags: ['<mark>'], post_tags: ['</mark>'] },
    };
    if (sort) body.sort = sort;

    const result = await es.search({ index: `alawael_${index}`, body });

    res.json({
      total: result.hits.total.value,
      hits: result.hits.hits.map(h => ({
        id: h._id,
        score: h._score,
        source: h._source,
        highlights: h.highlight || {},
      })),
      facets: Object.fromEntries(
        Object.entries(result.aggregations || {}).map(([k, v]) => [k, v.buckets.map(b => ({ key: b.key, count: b.doc_count }))]),
      ),
    });
  } catch (e) {
    log.error('Faceted search error', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

/* ── Index Document ──────────────────────────────────────────── */
app.post('/api/search/index/:indexName', async (req, res) => {
  try {
    const idx = `alawael_${req.params.indexName}`;
    const { id, ...doc } = req.body;
    doc.updatedAt = new Date();

    const result = id
      ? await es.index({ index: idx, id, body: doc, refresh: true })
      : await es.index({ index: idx, body: doc, refresh: true });

    // Invalidate cache
    const keys = await redis.keys(`search:*${req.params.indexName}*`);
    if (keys.length) await redis.del(...keys);

    log.info('Document indexed', { index: idx, id: result._id });
    res.json({ id: result._id, result: result.result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Bulk Index ───────────────────────────────────────────────── */
app.post('/api/search/bulk/:indexName', async (req, res) => {
  try {
    const idx = `alawael_${req.params.indexName}`;
    const { documents } = req.body;
    if (!documents?.length) return res.status(400).json({ error: 'documents array required' });

    const body = documents.flatMap(doc => {
      const { id, ...rest } = doc;
      rest.updatedAt = new Date();
      return id ? [{ index: { _index: idx, _id: id } }, rest] : [{ index: { _index: idx } }, rest];
    });

    const result = await es.bulk({ body, refresh: true });
    log.info('Bulk indexed', { index: idx, count: documents.length, errors: result.errors });

    res.json({
      indexed: documents.length,
      errors: result.errors,
      items: result.errors ? result.items.filter(i => i.index.error).map(i => i.index.error) : [],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Delete Document ─────────────────────────────────────────── */
app.delete('/api/search/index/:indexName/:docId', async (req, res) => {
  try {
    const idx = `alawael_${req.params.indexName}`;
    await es.delete({ index: idx, id: req.params.docId, refresh: true });
    res.json({ deleted: true });
  } catch (e) {
    if (e.meta?.statusCode === 404) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: e.message });
  }
});

/* ── Reindex from MongoDB ────────────────────────────────────── */
app.post('/api/search/reindex/:indexName', async (req, res) => {
  try {
    const indexName = req.params.indexName;
    const idx = `alawael_${indexName}`;

    // Delete and recreate
    const exists = await es.indices.exists({ index: idx });
    if (exists) await es.indices.delete({ index: idx });
    if (INDEX_SCHEMAS[indexName]) {
      await es.indices.create({ index: idx, body: INDEX_SCHEMAS[indexName] });
    }

    // Stream from MongoDB collection
    const collection = mongoose.connection.collection(indexName);
    const cursor = collection.find({});
    let count = 0;
    const batchSize = 500;
    let batch = [];

    for await (const doc of cursor) {
      batch.push({ index: { _index: idx, _id: doc._id.toString() } }, { ...doc, _id: undefined, updatedAt: new Date() });
      if (batch.length >= batchSize * 2) {
        await es.bulk({ body: batch, refresh: false });
        count += batch.length / 2;
        batch = [];
      }
    }
    if (batch.length) {
      await es.bulk({ body: batch, refresh: true });
      count += batch.length / 2;
    }

    log.info('Reindex complete', { index: idx, documents: count });
    res.json({ index: idx, documentsIndexed: count });
  } catch (e) {
    log.error('Reindex error', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

/* ── Index Stats ─────────────────────────────────────────────── */
app.get('/api/search/stats', async (_req, res) => {
  try {
    const indices = Object.keys(INDEX_SCHEMAS).map(i => `alawael_${i}`);
    const stats = await es.indices.stats({ index: indices.join(',') });
    const result = {};
    for (const [name, data] of Object.entries(stats.indices || {})) {
      result[name.replace('alawael_', '')] = {
        docs: data.primaries.docs.count,
        sizeBytes: data.primaries.store.size_in_bytes,
        searchQueries: data.primaries.search.query_total,
      };
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Start ────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 3240;
app.listen(PORT, async () => {
  log.info(`Search Service running on port ${PORT}`);
  try {
    await ensureIndices();
    log.info('All indices ensured');
  } catch (e) {
    log.warn('Index initialization deferred — ES may not be ready yet', { error: e.message });
  }
});
