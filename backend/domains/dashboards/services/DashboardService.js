/**
 * DashboardService — خدمة لوحات المعلومات
 *
 * إدارة تكوينات لوحات المعلومات، مؤشرات الأداء الرئيسية،
 * التنبيهات، الملخصات التنفيذية، والبيانات المجمعة عبر المجالات
 */

const mongoose = require('mongoose');
const { BaseService } = require('../../_base/BaseService');

class DashboardService extends BaseService {
  constructor() {
    super({ serviceName: 'DashboardService', cachePrefix: 'dashboards' });
  }

  /* ═══════════════════════ DASHBOARD CONFIGS ═══════════════════════ */

  async createDashboard(data) {
    const DashboardConfig = mongoose.model('DashboardConfig');
    return DashboardConfig.create(data);
  }

  async listDashboards({ userId, role, type, category, page = 1, limit = 20 } = {}) {
    const DashboardConfig = mongoose.model('DashboardConfig');
    const q = { isDeleted: { $ne: true } };
    if (userId) q.$or = [{ userId }, { isShared: true }, { type: 'role_default' }];
    if (role) q.role = role;
    if (type) q.type = type;
    if (category) q.category = category;
    const total = await DashboardConfig.countDocuments(q);
    const data = await DashboardConfig.find(q)
      .sort({ isPinned: -1, lastViewedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { data, total, page: +page, pages: Math.ceil(total / limit) };
  }

  async getDashboard(id) {
    const DashboardConfig = mongoose.model('DashboardConfig');
    await DashboardConfig.findByIdAndUpdate(id, {
      lastViewedAt: new Date(),
      $inc: { viewCount: 1 },
    });
    return DashboardConfig.findById(id).lean();
  }

  async updateDashboard(id, data) {
    const DashboardConfig = mongoose.model('DashboardConfig');
    return DashboardConfig.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteDashboard(id) {
    const DashboardConfig = mongoose.model('DashboardConfig');
    return DashboardConfig.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  }

  async addWidget(dashboardId, widget) {
    const DashboardConfig = mongoose.model('DashboardConfig');
    widget.widgetId = widget.widgetId || new mongoose.Types.ObjectId().toString();
    return DashboardConfig.findByIdAndUpdate(
      dashboardId,
      { $push: { widgets: widget } },
      { new: true }
    );
  }

  async removeWidget(dashboardId, widgetId) {
    const DashboardConfig = mongoose.model('DashboardConfig');
    return DashboardConfig.findByIdAndUpdate(
      dashboardId,
      { $pull: { widgets: { widgetId } } },
      { new: true }
    );
  }

  async updateWidgetLayout(dashboardId, widgetLayouts) {
    const DashboardConfig = mongoose.model('DashboardConfig');
    const dashboard = await DashboardConfig.findById(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');
    for (const wl of widgetLayouts) {
      const widget = dashboard.widgets.find(w => w.widgetId === wl.widgetId);
      if (widget) Object.assign(widget.layout, wl.layout);
    }
    await dashboard.save();
    return dashboard;
  }

  /* ═══════════════════════ KPI DEFINITIONS ═══════════════════════ */

  async createKPI(data) {
    const KPIDefinition = mongoose.model('KPIDefinition');
    return KPIDefinition.create(data);
  }

  async listKPIs({ category, domain, status = 'active', page = 1, limit = 50 } = {}) {
    const KPIDefinition = mongoose.model('KPIDefinition');
    const q = { isDeleted: { $ne: true } };
    if (status) q.status = status;
    if (category) q.category = category;
    if (domain) q.domain = domain;
    const total = await KPIDefinition.countDocuments(q);
    const data = await KPIDefinition.find(q)
      .sort({ category: 1, code: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { data, total, page: +page, pages: Math.ceil(total / limit) };
  }

  async getKPI(id) {
    const KPIDefinition = mongoose.model('KPIDefinition');
    return KPIDefinition.findById(id).lean();
  }

  async updateKPI(id, data) {
    const KPIDefinition = mongoose.model('KPIDefinition');
    return KPIDefinition.findByIdAndUpdate(id, data, { new: true });
  }

  /* ═══════════════════════ KPI SNAPSHOTS ═══════════════════════ */

  async recordSnapshot(data) {
    const KPISnapshot = mongoose.model('KPISnapshot');
    const KPIDefinition = mongoose.model('KPIDefinition');

    // Calculate status
    const kpi = await KPIDefinition.findById(data.kpiId).lean();
    if (kpi?.target) {
      const val = data.value;
      const target = kpi.target.value;
      data.target = target;
      data.variance = val - target;
      data.variancePercentage = target !== 0 ? ((val - target) / target) * 100 : 0;

      if (kpi.direction === 'higher_is_better') {
        if (val >= target)
          data.status = val >= (kpi.target.stretch || target) ? 'exceeds_target' : 'on_target';
        else if (kpi.target.criticalThreshold && val <= kpi.target.criticalThreshold)
          data.status = 'critical';
        else if (kpi.target.warningThreshold && val <= kpi.target.warningThreshold)
          data.status = 'warning';
        else data.status = 'warning';
      } else if (kpi.direction === 'lower_is_better') {
        if (val <= target) data.status = 'on_target';
        else if (kpi.target.criticalThreshold && val >= kpi.target.criticalThreshold)
          data.status = 'critical';
        else if (kpi.target.warningThreshold && val >= kpi.target.warningThreshold)
          data.status = 'warning';
        else data.status = 'warning';
      }
    }

    // Calculate trend from previous snapshot
    const previous = await KPISnapshot.findOne({
      kpiId: data.kpiId,
      'period.type': data.period?.type,
      _id: { $ne: data._id },
    })
      .sort({ 'period.startDate': -1 })
      .lean();

    if (previous) {
      data.previousValue = previous.value;
      data.changeFromPrevious = data.value - previous.value;
      data.changePercentage =
        previous.value !== 0 ? ((data.value - previous.value) / previous.value) * 100 : 0;

      const kpiDir = kpi?.direction || 'higher_is_better';
      const improvingUp = kpiDir === 'higher_is_better';
      if (Math.abs(data.changePercentage) < 2) data.trend = 'stable';
      else if (
        (data.changeFromPrevious > 0 && improvingUp) ||
        (data.changeFromPrevious < 0 && !improvingUp)
      )
        data.trend = 'improving';
      else data.trend = 'declining';
    }

    return KPISnapshot.create(data);
  }

  async getKPITrend(kpiId, periodType = 'monthly', limit = 12) {
    const KPISnapshot = mongoose.model('KPISnapshot');
    return KPISnapshot.find({ kpiId, 'period.type': periodType })
      .sort({ 'period.startDate': -1 })
      .limit(limit)
      .lean();
  }

  async getLatestSnapshots(branchId) {
    const KPIDefinition = mongoose.model('KPIDefinition');
    const KPISnapshot = mongoose.model('KPISnapshot');

    const kpis = await KPIDefinition.find({ status: 'active', isDeleted: { $ne: true } }).lean();
    const results = [];
    for (const kpi of kpis) {
      const latest = await KPISnapshot.findOne({
        kpiId: kpi._id,
        ...(branchId ? { branchId } : {}),
      })
        .sort({ 'period.startDate': -1 })
        .lean();
      results.push({ kpi, latestSnapshot: latest });
    }
    return results;
  }

  /* ═══════════════════════ ALERTS ═══════════════════════ */

  async createAlert(data) {
    const DecisionAlert = mongoose.model('DecisionAlert');
    const alert = await DecisionAlert.create(data);
    this.emit('dashboard:alert:created', {
      alertId: alert._id,
      severity: data.severity,
      category: data.category,
    });
    return alert;
  }

  async listAlerts({
    status,
    severity,
    category,
    assignedTo,
    beneficiaryId,
    branchId,
    page = 1,
    limit = 20,
  } = {}) {
    const DecisionAlert = mongoose.model('DecisionAlert');
    const q = { isDeleted: { $ne: true } };
    if (status) q.status = Array.isArray(status) ? { $in: status } : status;
    if (severity) q.severity = severity;
    if (category) q.category = category;
    if (assignedTo) q.assignedTo = assignedTo;
    if (beneficiaryId) q.beneficiaryId = beneficiaryId;
    if (branchId) q.branchId = branchId;
    const total = await DecisionAlert.countDocuments(q);
    const data = await DecisionAlert.find(q)
      .sort({ severity: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('beneficiaryId', 'firstName lastName fileNumber')
      .populate('assignedTo', 'name email')
      .lean();
    return { data, total, page: +page, pages: Math.ceil(total / limit) };
  }

  async getAlert(id) {
    const DecisionAlert = mongoose.model('DecisionAlert');
    return DecisionAlert.findById(id)
      .populate('beneficiaryId', 'firstName lastName fileNumber')
      .populate('assignedTo', 'name email')
      .populate('escalatedTo', 'name email')
      .populate('actionsTaken.takenBy', 'name')
      .lean();
  }

  async acknowledgeAlert(id, userId) {
    const DecisionAlert = mongoose.model('DecisionAlert');
    const alert = await DecisionAlert.findByIdAndUpdate(
      id,
      {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
        responseTimeMinutes: undefined,
      },
      { new: true }
    );
    if (alert) {
      alert.responseTimeMinutes = Math.round((alert.acknowledgedAt - alert.createdAt) / 60000);
      await alert.save();
    }
    return alert;
  }

  async resolveAlert(id, userId, notes) {
    const DecisionAlert = mongoose.model('DecisionAlert');
    const now = new Date();
    const alert = await DecisionAlert.findByIdAndUpdate(
      id,
      {
        status: 'resolved',
        resolvedAt: now,
        resolvedBy: userId,
        resolutionNotes: notes,
      },
      { new: true }
    );
    if (alert) {
      alert.resolutionTimeMinutes = Math.round((now - alert.createdAt) / 60000);
      await alert.save();
    }
    return alert;
  }

  async dismissAlert(id, userId, reason) {
    const DecisionAlert = mongoose.model('DecisionAlert');
    return DecisionAlert.findByIdAndUpdate(
      id,
      {
        status: 'dismissed',
        $push: {
          actionsTaken: { action: `Dismissed: ${reason}`, takenBy: userId, takenAt: new Date() },
        },
      },
      { new: true }
    );
  }

  async escalateAlert(id, escalateTo) {
    const DecisionAlert = mongoose.model('DecisionAlert');
    return DecisionAlert.findByIdAndUpdate(
      id,
      { status: 'escalated', escalatedTo, escalatedAt: new Date() },
      { new: true }
    );
  }

  async assignAlert(id, assignedTo) {
    const DecisionAlert = mongoose.model('DecisionAlert');
    return DecisionAlert.findByIdAndUpdate(
      id,
      { status: 'in_progress', assignedTo },
      { new: true }
    );
  }

  /* ═══════════════════════ EXECUTIVE SUMMARY ═══════════════════════ */

  async getExecutiveSummary(branchId) {
    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

    const [beneficiaryCount, activeEpisodes, sessionsThisMonth, alertSummary, kpiSummary] =
      await Promise.all([
        mongoose.model('Beneficiary').countDocuments({ ...match, status: 'active' }),
        mongoose.model('EpisodeOfCare').countDocuments({ ...match, status: 'active' }),
        mongoose.model('ClinicalSession').countDocuments({
          ...match,
          sessionDate: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        }),
        mongoose
          .model('DecisionAlert')
          .aggregate([
            { $match: { ...match, status: { $in: ['new', 'acknowledged', 'in_progress'] } } },
            { $group: { _id: '$severity', count: { $sum: 1 } } },
          ]),
        mongoose
          .model('KPISnapshot')
          .aggregate([
            { $sort: { 'period.startDate': -1 } },
            {
              $group: {
                _id: '$kpiCode',
                latestStatus: { $first: '$status' },
                latestValue: { $first: '$value' },
                trend: { $first: '$trend' },
              },
            },
            { $group: { _id: '$latestStatus', count: { $sum: 1 } } },
          ]),
      ]);

    return {
      activeBeneficiaries: beneficiaryCount,
      activeEpisodes,
      sessionsThisMonth,
      alerts: {
        total: alertSummary.reduce((s, a) => s + a.count, 0),
        bySeverity: Object.fromEntries(alertSummary.map(a => [a._id, a.count])),
      },
      kpis: {
        byStatus: Object.fromEntries(kpiSummary.map(k => [k._id, k.count])),
      },
    };
  }

  /* ═══════════════════════ ALERT ANALYTICS ═══════════════════════ */

  async getAlertAnalytics(branchId, days = 30) {
    const DecisionAlert = mongoose.model('DecisionAlert');
    const since = new Date(Date.now() - days * 86400000);
    const match = { createdAt: { $gte: since }, isDeleted: { $ne: true } };
    if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

    const [byCat, bySev, avgResponse, dailyTrend] = await Promise.all([
      DecisionAlert.aggregate([
        { $match: match },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      DecisionAlert.aggregate([
        { $match: match },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      DecisionAlert.aggregate([
        { $match: { ...match, responseTimeMinutes: { $exists: true } } },
        {
          $group: {
            _id: null,
            avgResponse: { $avg: '$responseTimeMinutes' },
            avgResolution: { $avg: '$resolutionTimeMinutes' },
          },
        },
      ]),
      DecisionAlert.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      byCategory: byCat,
      bySeverity: Object.fromEntries(bySev.map(s => [s._id, s.count])),
      averageResponseMinutes: avgResponse[0]?.avgResponse || null,
      averageResolutionMinutes: avgResponse[0]?.avgResolution || null,
      dailyTrend,
      totalAlerts: bySev.reduce((s, r) => s + r.count, 0),
    };
  }
}

const dashboardService = new DashboardService();
module.exports = { dashboardService };
