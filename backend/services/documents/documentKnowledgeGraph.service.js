/**
 * Document Knowledge Graph Service — خدمة الرسم البياني المعرفي
 * ──────────────────────────────────────────────────────────────
 * بناء شبكة علاقات ذكية بين المستندات، اكتشاف الروابط التلقائي،
 * مسارات المعرفة، تحليل التأثير، توصيات السياق
 *
 * @module documentKnowledgeGraph.service
 */

const mongoose = require('mongoose');

/* ─── Graph Node Model ───────────────────────────────────────── */
const graphNodeSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', unique: true },
    label: String,
    type: {
      type: String,
      enum: [
        'document',
        'contract',
        'invoice',
        'report',
        'letter',
        'memo',
        'policy',
        'form',
        'other',
      ],
      default: 'document',
    },
    properties: {
      category: String,
      department: String,
      status: String,
      importance: { type: Number, default: 0, min: 0, max: 10 },
      keywords: [String],
    },
    metrics: {
      degree: { type: Number, default: 0 },
      inDegree: { type: Number, default: 0 },
      outDegree: { type: Number, default: 0 },
      pageRank: { type: Number, default: 0 },
      betweenness: { type: Number, default: 0 },
      cluster: String,
    },
    embedding: [Number],
    isActive: { type: Boolean, default: true },
    lastAnalyzed: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'graph_nodes' }
);

graphNodeSchema.index({ documentId: 1 });
graphNodeSchema.index({ 'properties.category': 1, 'properties.department': 1 });
graphNodeSchema.index({ 'metrics.pageRank': -1 });

const GraphNode = mongoose.models.GraphNode || mongoose.model('GraphNode', graphNodeSchema);

/* ─── Graph Edge Model ───────────────────────────────────────── */
const graphEdgeSchema = new mongoose.Schema(
  {
    source: { type: mongoose.Schema.Types.ObjectId, ref: 'GraphNode', required: true },
    target: { type: mongoose.Schema.Types.ObjectId, ref: 'GraphNode', required: true },
    sourceDocId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    targetDocId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    relationship: {
      type: String,
      enum: [
        'references',
        'referenced_by',
        'supersedes',
        'superseded_by',
        'parent',
        'child',
        'related',
        'depends_on',
        'dependency_of',
        'amendment',
        'attachment',
        'response',
        'similar',
        'derived',
        'approves',
        'approved_by',
        'reviews',
        'reviewed_by',
      ],
      required: true,
    },
    relationshipAr: String,
    weight: { type: Number, default: 1, min: 0, max: 10 },
    confidence: { type: Number, default: 1, min: 0, max: 1 },
    discoveryMethod: {
      type: String,
      enum: [
        'manual',
        'auto_content',
        'auto_reference',
        'auto_similarity',
        'auto_workflow',
        'import',
      ],
      default: 'manual',
    },
    metadata: mongoose.Schema.Types.Mixed,
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'graph_edges' }
);

graphEdgeSchema.index({ source: 1, target: 1 });
graphEdgeSchema.index({ sourceDocId: 1 });
graphEdgeSchema.index({ targetDocId: 1 });
graphEdgeSchema.index({ relationship: 1 });

const GraphEdge = mongoose.models.GraphEdge || mongoose.model('GraphEdge', graphEdgeSchema);

/* ─── Relationship Arabic Labels ─────────────────────────────── */
const REL_AR = {
  references: 'يشير إلى',
  referenced_by: 'مُشار إليه من',
  supersedes: 'يحل محل',
  superseded_by: 'حلّ محله',
  parent: 'أصل',
  child: 'فرعي',
  related: 'مرتبط',
  depends_on: 'يعتمد على',
  dependency_of: 'مُعتمد عليه من',
  amendment: 'تعديل',
  attachment: 'مرفق',
  response: 'رد',
  similar: 'مشابه',
  derived: 'مشتق',
  approves: 'يعتمد',
  approved_by: 'معتمد من',
  reviews: 'يراجع',
  reviewed_by: 'مُراجع من',
};

/* ─── Service ────────────────────────────────────────────────── */
class DocumentKnowledgeGraphService {
  /* ─── Add Node ────────────────────────────────────────────── */
  async addNode(options = {}) {
    const { documentId, label, type, properties, userId } = options;
    if (!documentId) return { success: false, error: 'معرف المستند مطلوب' };

    const existing = await GraphNode.findOne({ documentId });
    if (existing) {
      const updated = await GraphNode.findByIdAndUpdate(
        existing._id,
        { $set: { label, type, properties, lastAnalyzed: new Date() } },
        { new: true }
      ).lean();
      return { success: true, node: updated, updated: true };
    }

    const node = new GraphNode({
      documentId,
      label: label || 'مستند',
      type: type || 'document',
      properties,
      createdBy: userId,
    });
    await node.save();
    return { success: true, node, created: true };
  }

  /* ─── Add Edge ────────────────────────────────────────────── */
  async addEdge(options = {}) {
    const { sourceDocId, targetDocId, relationship, weight, userId } = options;
    if (!sourceDocId || !targetDocId) return { success: false, error: 'معرفات المستندات مطلوبة' };
    if (sourceDocId === targetDocId) return { success: false, error: 'لا يمكن ربط المستند بنفسه' };

    // Ensure nodes exist
    let sourceNode = await GraphNode.findOne({ documentId: sourceDocId });
    if (!sourceNode) {
      const r = await this.addNode({ documentId: sourceDocId, userId });
      sourceNode = r.node;
    }
    let targetNode = await GraphNode.findOne({ documentId: targetDocId });
    if (!targetNode) {
      const r = await this.addNode({ documentId: targetDocId, userId });
      targetNode = r.node;
    }

    // Check existing
    const existing = await GraphEdge.findOne({
      sourceDocId,
      targetDocId,
      relationship,
    });
    if (existing) return { success: true, edge: existing, exists: true };

    const edge = new GraphEdge({
      source: sourceNode._id,
      target: targetNode._id,
      sourceDocId,
      targetDocId,
      relationship,
      relationshipAr: REL_AR[relationship] || relationship,
      weight: weight || 1,
      discoveryMethod: 'manual',
      createdBy: userId,
    });
    await edge.save();

    // Update degrees
    await GraphNode.findByIdAndUpdate(sourceNode._id, {
      $inc: { 'metrics.outDegree': 1, 'metrics.degree': 1 },
    });
    await GraphNode.findByIdAndUpdate(targetNode._id, {
      $inc: { 'metrics.inDegree': 1, 'metrics.degree': 1 },
    });

    return { success: true, edge };
  }

  /* ─── Remove Edge ─────────────────────────────────────────── */
  async removeEdge(edgeId) {
    const edge = await GraphEdge.findById(edgeId);
    if (!edge) return { success: false, error: 'الرابط غير موجود' };

    await GraphNode.findOneAndUpdate(
      { documentId: edge.sourceDocId },
      { $inc: { 'metrics.outDegree': -1, 'metrics.degree': -1 } }
    );
    await GraphNode.findOneAndUpdate(
      { documentId: edge.targetDocId },
      { $inc: { 'metrics.inDegree': -1, 'metrics.degree': -1 } }
    );
    await edge.deleteOne();
    return { success: true };
  }

  /* ─── Get Document Graph ──────────────────────────────────── */
  async getDocumentGraph(documentId, options = {}) {
    const { depth = 2, limit = 50 } = options;
    const visited = new Set();
    const nodes = [];
    const edges = [];

    const traverse = async (docId, currentDepth) => {
      if (currentDepth > depth || visited.has(docId.toString()) || nodes.length >= limit) return;
      visited.add(docId.toString());

      const node = await GraphNode.findOne({ documentId: docId })
        .populate('documentId', 'title name category status')
        .lean();
      if (!node) return;
      nodes.push(node);

      const outEdges = await GraphEdge.find({ sourceDocId: docId, isActive: true }).lean();
      const inEdges = await GraphEdge.find({ targetDocId: docId, isActive: true }).lean();

      for (const e of [...outEdges, ...inEdges]) {
        edges.push(e);
        const nextDocId =
          e.sourceDocId.toString() === docId.toString() ? e.targetDocId : e.sourceDocId;
        await traverse(nextDocId, currentDepth + 1);
      }
    };

    await traverse(documentId, 0);

    // Deduplicate edges
    const uniqueEdges = [];
    const edgeSet = new Set();
    for (const e of edges) {
      const key = e._id.toString();
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        uniqueEdges.push(e);
      }
    }

    return { success: true, nodes, edges: uniqueEdges };
  }

  /* ─── Get Full Graph ──────────────────────────────────────── */
  async getFullGraph(options = {}) {
    const { page = 1, limit = 100, category, department } = options;
    const nodeFilter = { isActive: true };
    if (category) nodeFilter['properties.category'] = category;
    if (department) nodeFilter['properties.department'] = department;

    const nodes = await GraphNode.find(nodeFilter)
      .sort({ 'metrics.pageRank': -1 })
      .limit(limit)
      .populate('documentId', 'title name category status')
      .lean();

    const nodeIds = nodes.map(n => n._id);
    const edges = await GraphEdge.find({
      $or: [{ source: { $in: nodeIds } }, { target: { $in: nodeIds } }],
      isActive: true,
    }).lean();

    return { success: true, nodes, edges, totalNodes: nodes.length, totalEdges: edges.length };
  }

  /* ─── Auto-Discover Relationships ─────────────────────────── */
  async autoDiscover(options = {}) {
    const { documentId, userId } = options;
    const Document = mongoose.models.Document || mongoose.model('Document');
    const doc = await Document.findById(documentId).lean();
    if (!doc) return { success: false, error: 'المستند غير موجود' };

    const discovered = [];

    // 1. Find similar by title
    if (doc.title) {
      const titleWords = doc.title.split(/\s+/).filter(w => w.length > 2);
      if (titleWords.length > 0) {
        const regex = titleWords.join('|');
        const similar = await Document.find({
          _id: { $ne: doc._id },
          title: { $regex: regex, $options: 'i' },
        })
          .limit(10)
          .select('_id title')
          .lean();

        for (const s of similar) {
          const edge = await this.addEdge({
            sourceDocId: doc._id,
            targetDocId: s._id,
            relationship: 'similar',
            weight: 3,
            userId,
          });
          if (edge.success && !edge.exists) {
            discovered.push({ targetId: s._id, targetTitle: s.title, relationship: 'similar' });
          }
        }
      }
    }

    // 2. Find same category docs
    if (doc.category) {
      const sameCategory = await Document.find({
        _id: { $ne: doc._id },
        category: doc.category,
      })
        .limit(5)
        .select('_id title')
        .lean();

      for (const s of sameCategory) {
        const edge = await this.addEdge({
          sourceDocId: doc._id,
          targetDocId: s._id,
          relationship: 'related',
          weight: 2,
          userId,
        });
        if (edge.success && !edge.exists) {
          discovered.push({ targetId: s._id, targetTitle: s.title, relationship: 'related' });
        }
      }
    }

    // 3. Cross-reference by tags
    if (doc.tags?.length) {
      const tagMatch = await Document.find({
        _id: { $ne: doc._id },
        tags: { $in: doc.tags },
      })
        .limit(10)
        .select('_id title tags')
        .lean();

      for (const s of tagMatch) {
        const commonTags = doc.tags.filter(t => s.tags?.includes(t));
        const edge = await this.addEdge({
          sourceDocId: doc._id,
          targetDocId: s._id,
          relationship: 'related',
          weight: Math.min(commonTags.length, 5),
          userId,
        });
        if (edge.success && !edge.exists) {
          discovered.push({
            targetId: s._id,
            targetTitle: s.title,
            relationship: 'related',
            commonTags,
          });
        }
      }
    }

    // Ensure node exists
    await this.addNode({
      documentId: doc._id,
      label: doc.title,
      type: doc.documentType || 'document',
      properties: {
        category: doc.category,
        department: doc.department,
        status: doc.status,
        keywords: doc.tags,
      },
      userId,
    });

    return { success: true, discovered, count: discovered.length };
  }

  /* ─── Impact Analysis ─────────────────────────────────────── */
  async analyzeImpact(documentId, options = {}) {
    const { depth = 3 } = options;
    const graph = await this.getDocumentGraph(documentId, { depth, limit: 200 });

    const impactLevels = {};
    const queue = [{ docId: documentId.toString(), level: 0 }];
    const visited = new Set([documentId.toString()]);

    while (queue.length) {
      const { docId, level } = queue.shift();
      if (level > depth) continue;

      const deps = graph.edges.filter(
        e =>
          e.sourceDocId?.toString() === docId &&
          ['depends_on', 'references', 'parent', 'approves'].includes(e.relationship)
      );

      for (const dep of deps) {
        const targetId = dep.targetDocId.toString();
        if (!visited.has(targetId)) {
          visited.add(targetId);
          impactLevels[targetId] = {
            level: level + 1,
            relationship: dep.relationship,
            relationshipAr: dep.relationshipAr,
          };
          queue.push({ docId: targetId, level: level + 1 });
        }
      }
    }

    // Find affected nodes details
    const affectedIds = Object.keys(impactLevels);
    const affectedNodes = await GraphNode.find({
      documentId: { $in: affectedIds },
    })
      .populate('documentId', 'title name status')
      .lean();

    const impact = affectedNodes.map(n => ({
      documentId: n.documentId?._id,
      title: n.documentId?.title || n.label,
      status: n.documentId?.status,
      ...impactLevels[n.documentId?._id?.toString()],
    }));

    return {
      success: true,
      impact: impact.sort((a, b) => a.level - b.level),
      totalAffected: impact.length,
      maxDepth: Math.max(...impact.map(i => i.level), 0),
    };
  }

  /* ─── Recommendations ─────────────────────────────────────── */
  async getRecommendations(documentId, options = {}) {
    const { limit = 10 } = options;
    const node = await GraphNode.findOne({ documentId }).lean();
    if (!node) return { success: true, recommendations: [] };

    // Get neighbors of neighbors (2-hop)
    const directEdges = await GraphEdge.find({
      $or: [{ sourceDocId: documentId }, { targetDocId: documentId }],
      isActive: true,
    }).lean();

    const directNeighbors = new Set();
    for (const e of directEdges) {
      directNeighbors.add(e.sourceDocId.toString());
      directNeighbors.add(e.targetDocId.toString());
    }
    directNeighbors.delete(documentId.toString());

    const secondHopEdges = await GraphEdge.find({
      $or: [
        { sourceDocId: { $in: [...directNeighbors] } },
        { targetDocId: { $in: [...directNeighbors] } },
      ],
      isActive: true,
    }).lean();

    const candidates = {};
    for (const e of secondHopEdges) {
      for (const id of [e.sourceDocId.toString(), e.targetDocId.toString()]) {
        if (id !== documentId.toString() && !directNeighbors.has(id)) {
          candidates[id] = (candidates[id] || 0) + e.weight;
        }
      }
    }

    const sorted = Object.entries(candidates)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const recNodes = await GraphNode.find({
      documentId: { $in: sorted.map(([id]) => id) },
    })
      .populate('documentId', 'title name category status')
      .lean();

    const recommendations = sorted.map(([id, score]) => {
      const rNode = recNodes.find(n => n.documentId?._id?.toString() === id);
      return {
        documentId: id,
        title: rNode?.documentId?.title || rNode?.label || 'مستند',
        category: rNode?.properties?.category,
        relevanceScore: score,
        reason: 'مرتبط عبر مستندات مشتركة',
      };
    });

    return { success: true, recommendations };
  }

  /* ─── Stats ───────────────────────────────────────────────── */
  async getStats() {
    const [totalNodes, totalEdges, byRelationship, topNodes] = await Promise.all([
      GraphNode.countDocuments({ isActive: true }),
      GraphEdge.countDocuments({ isActive: true }),
      GraphEdge.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$relationship', count: { $sum: 1 } } },
      ]),
      GraphNode.find({ isActive: true })
        .sort({ 'metrics.degree': -1 })
        .limit(5)
        .populate('documentId', 'title')
        .lean(),
    ]);

    return {
      success: true,
      stats: {
        totalNodes,
        totalEdges,
        byRelationship: byRelationship.reduce((a, r) => ({ ...a, [r._id]: r.count }), {}),
        topConnected: topNodes.map(n => ({
          title: n.documentId?.title || n.label,
          connections: n.metrics?.degree || 0,
        })),
      },
    };
  }
}

module.exports = new DocumentKnowledgeGraphService();
