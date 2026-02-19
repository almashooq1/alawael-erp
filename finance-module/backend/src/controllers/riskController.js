/**
 * Risk Controller
 * Manages financial risk assessment
 */

const { RiskItem, RiskMatrix, RiskTrend } = require('../models/Risk');

// Get risk matrix
exports.getRiskMatrix = async (req, res) => {
  try {
    const matrix = await RiskMatrix.findOne({ status: { $in: ['active', 'approved'] } })
      .populate('riskItems.owner', ['name', 'email'])
      .populate('riskItems.mitigationStrategies.owner', ['name', 'email'])
      .populate('approvals.approvedBy', ['name', 'email'])
      .sort({ createdAt: -1 });

    if (!matrix) {
      return res.status(404).json({ success: false, message: 'Risk matrix not found' });
    }

    res.json({ success: true, data: matrix });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get risk items
exports.getRiskItems = async (req, res) => {
  try {
    const { category, status, priority } = req.query;

    let query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const risks = await RiskItem.find(query)
      .populate('owner', ['name', 'email'])
      .populate('relatedRisks', ['riskId', 'title', 'severity.riskScore'])
      .sort({ 'severity.riskScore': -1 });

    res.json({ success: true, data: risks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single risk item
exports.getRiskItem = async (req, res) => {
  try {
    const { id } = req.params;

    const risk = await RiskItem.findById(id)
      .populate('owner', ['name', 'email'])
      .populate('mitigationStrategies.owner', ['name', 'email'])
      .populate('relatedRisks', ['riskId', 'title', 'severity.riskScore']);

    if (!risk) {
      return res.status(404).json({ success: false, message: 'Risk not found' });
    }

    res.json({ success: true, data: risk });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create risk item
exports.createRiskItem = async (req, res) => {
  try {
    const {
      riskId,
      title,
      description,
      category,
      probability,
      impact
    } = req.body;

    const riskScore = probability.value * impact.value;
    let zone = 'green';
    if (riskScore >= 70) zone = 'red';
    else if (riskScore >= 40) zone = 'orange';
    else if (riskScore >= 20) zone = 'yellow';

    const risk = new RiskItem({
      riskId,
      title,
      description,
      category,
      probability,
      impact,
      owner: req.user._id,
      severity: {
        probabilityScore: probability.value,
        impactScore: impact.value,
        riskScore,
        zone
      }
    });

    await risk.save();
    res.json({ success: true, data: risk });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update risk item
exports.updateRiskItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { probability, impact, status, mitigationStrategies } = req.body;

    const risk = await RiskItem.findById(id);
    if (!risk) {
      return res.status(404).json({ success: false, message: 'Risk not found' });
    }

    if (probability) risk.probability = probability;
    if (impact) risk.impact = impact;

    if (probability || impact) {
      const riskScore = (probability?.value || risk.probability.value) * (impact?.value || risk.impact.value);
      let zone = 'green';
      if (riskScore >= 70) zone = 'red';
      else if (riskScore >= 40) zone = 'orange';
      else if (riskScore >= 20) zone = 'yellow';

      risk.severity = {
        probabilityScore: probability?.value || risk.probability.value,
        impactScore: impact?.value || risk.impact.value,
        riskScore,
        zone
      };
    }

    if (status) risk.status = status;
    if (mitigationStrategies) risk.mitigationStrategies = mitigationStrategies;

    // Add to history
    risk.history.push({
      action: 'updated',
      performedBy: req.user._id
    });

    await risk.save();
    res.json({ success: true, data: risk });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create risk matrix
exports.createRiskMatrix = async (req, res) => {
  try {
    const { startDate, endDate, riskItemIds } = req.body;

    const riskItems = await RiskItem.find({ _id: { $in: riskItemIds } });

    // Calculate statistics
    const stats = {
      totalIdentifiedRisks: riskItems.length,
      risksByZone: {
        green: riskItems.filter(r => r.severity.zone === 'green').length,
        yellow: riskItems.filter(r => r.severity.zone === 'yellow').length,
        orange: riskItems.filter(r => r.severity.zone === 'orange').length,
        red: riskItems.filter(r => r.severity.zone === 'red').length
      }
    };

    // Create heatmap data
    const heatmapMap = new Map();
    riskItems.forEach(risk => {
      const key = `${risk.severity.probabilityScore}-${risk.severity.impactScore}`;
      if (!heatmapMap.has(key)) {
        heatmapMap.set(key, {
          probability: risk.severity.probabilityScore,
          impact: risk.severity.impactScore,
          count: 0,
          risks: []
        });
      }
      const entry = heatmapMap.get(key);
      entry.count++;
      entry.risks.push(risk._id);
    });

    const heatmapData = Array.from(heatmapMap.values());

    // Get top risks
    const topRisks = riskItems
      .sort((a, b) => b.severity.riskScore - a.severity.riskScore)
      .slice(0, 10)
      .map(r => ({
        riskId: r._id,
        riskScore: r.severity.riskScore,
        priority: r.priority,
        mitigationProgress: 0
      }));

    const matrix = new RiskMatrix({
      assessmentPeriod: {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      },
      riskItems,
      matrixStats: stats,
      heatmapData,
      topRisks,
      status: 'draft'
    });

    await matrix.save();
    res.json({ success: true, data: matrix });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get heatmap data
exports.getHeatmapData = async (req, res) => {
  try {
    const matrix = await RiskMatrix.findOne({ status: { $in: ['active', 'approved'] } });

    if (!matrix) {
      // Return empty heatmap
      return res.json({
        success: true,
        data: Array.from({ length: 10 }, (_, i) =>
          Array.from({ length: 10 }, (_, j) => ({
            probability: i + 1,
            impact: j + 1,
            count: 0,
            risks: []
          }))
        )
      });
    }

    // Build 10x10 grid
    const grid = Array.from({ length: 10 }, (_, i) =>
      Array.from({ length: 10 }, (_, j) => ({
        probability: i + 1,
        impact: j + 1,
        count: 0,
        risks: []
      }))
    );

    matrix.heatmapData?.forEach(entry => {
      if (entry.probability >= 1 && entry.probability <= 10 &&
          entry.impact >= 1 && entry.impact <= 10) {
        grid[entry.probability - 1][entry.impact - 1] = {
          probability: entry.probability,
          impact: entry.impact,
          count: entry.count,
          risks: entry.risks
        };
      }
    });

    res.json({ success: true, data: grid });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get risk trends
exports.getRiskTrends = async (req, res) => {
  try {
    const trends = await RiskTrend.find()
      .sort({ analysisDate: -1 })
      .limit(12);

    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add mitigation strategy
exports.addMitigationStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    const { strategy, description, targetDate, expectedImpactReduction } = req.body;

    const risk = await RiskItem.findByIdAndUpdate(
      id,
      {
        $push: {
          mitigationStrategies: {
            strategy,
            description,
            owner: req.user._id,
            targetDate: new Date(targetDate),
            status: 'planned',
            expectedImpactReduction
          }
        }
      },
      { new: true }
    );

    res.json({ success: true, data: risk });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
