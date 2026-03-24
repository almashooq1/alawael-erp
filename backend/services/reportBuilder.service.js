/**
 * Report Builder Service — خدمة منشئ التقارير المخصصة
 *
 * Drag-and-drop custom report builder without programming:
 *   - Report templates (create, clone, share)
 *   - Data sources (modules, fields, relationships)
 *   - Field catalog (drag-and-drop building blocks)
 *   - Filters & conditions (dynamic query builder)
 *   - Grouping & aggregation (sum, avg, count, min, max)
 *   - Sorting & pagination
 *   - Calculated fields (formulas)
 *   - Chart configuration (bar, line, pie, doughnut, area)
 *   - Report scheduling (daily, weekly, monthly)
 *   - Export (PDF, Excel, CSV)
 *   - Report sharing & permissions
 *   - Version history
 *   - Dashboard widgets from reports
 *   - Favorites & recent reports
 */

const logger = require('../utils/logger');

class ReportBuilderService {
  constructor() {
    // ── Data stores ──
    this.reports = new Map();
    this.templates = new Map();
    this.dataSources = new Map();
    this.schedules = new Map();
    this.executions = new Map();
    this.favorites = new Map(); // userId → Set<reportId>
    this.shares = [];
    this.versions = [];

    this._nextReportId = 1000;
    this._nextTemplateId = 2000;
    this._nextSourceId = 3000;
    this._nextScheduleId = 4000;
    this._nextExecutionId = 5000;
    this._nextVersionId = 6000;

    this._seed();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA SOURCES — مصادر البيانات
  // ═══════════════════════════════════════════════════════════════════════════

  getDataSources() {
    return Array.from(this.dataSources.values());
  }

  getDataSourceById(id) {
    const ds = this.dataSources.get(String(id));
    if (!ds) throw new Error('مصدر البيانات غير موجود');
    return ds;
  }

  getFieldsForSource(sourceId) {
    const ds = this.getDataSourceById(sourceId);
    return ds.fields;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORT CRUD — إدارة التقارير
  // ═══════════════════════════════════════════════════════════════════════════

  createReport(data) {
    if (!data.name) throw new Error('اسم التقرير مطلوب');
    if (!data.dataSourceId) throw new Error('مصدر البيانات مطلوب');

    // Validate data source exists
    this.getDataSourceById(data.dataSourceId);

    const report = {
      id: String(this._nextReportId++),
      name: data.name,
      nameAr: data.nameAr || data.name,
      description: data.description || '',
      dataSourceId: data.dataSourceId,
      createdBy: data.createdBy || 'system',
      status: 'draft',
      isPublic: data.isPublic || false,
      category: data.category || 'general',

      // ── Layout configuration ──
      columns: data.columns || [], // [{ fieldId, label, width, visible, order }]
      filters: data.filters || [], // [{ fieldId, operator, value, logic }]
      sorting: data.sorting || [], // [{ fieldId, direction }]
      groupBy: data.groupBy || [], // [{ fieldId, aggregation }]
      calculatedFields: data.calculatedFields || [], // [{ id, name, formula, type }]

      // ── Visualization ──
      chartConfig: data.chartConfig || null, // { type, xAxis, yAxis, series, colors }
      summaryRow: data.summaryRow || false,
      showRowNumbers: data.showRowNumbers !== false,
      pageSize: data.pageSize || 25,

      // ── Metadata ──
      tags: data.tags || [],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRunAt: null,
      runCount: 0,
    };

    this.reports.set(report.id, report);
    this._createVersion(report.id, report.createdBy, 'تم إنشاء التقرير');
    logger.info(`Report created: ${report.id} - ${report.name}`);
    return report;
  }

  getReportById(id) {
    const report = this.reports.get(String(id));
    if (!report) throw new Error('التقرير غير موجود');
    return { ...report };
  }

  getAllReports(query = {}) {
    let reports = Array.from(this.reports.values());

    if (query.status) {
      reports = reports.filter(r => r.status === query.status);
    }
    if (query.category) {
      reports = reports.filter(r => r.category === query.category);
    }
    if (query.dataSourceId) {
      reports = reports.filter(r => r.dataSourceId === query.dataSourceId);
    }
    if (query.createdBy) {
      reports = reports.filter(r => r.createdBy === query.createdBy);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      reports = reports.filter(
        r =>
          r.name.toLowerCase().includes(s) ||
          r.nameAr.includes(s) ||
          r.description.toLowerCase().includes(s)
      );
    }
    if (query.isPublic !== undefined) {
      const pub = query.isPublic === 'true' || query.isPublic === true;
      reports = reports.filter(r => r.isPublic === pub);
    }

    return reports;
  }

  updateReport(id, data) {
    const report = this.reports.get(String(id));
    if (!report) throw new Error('التقرير غير موجود');

    const updatable = [
      'name',
      'nameAr',
      'description',
      'category',
      'isPublic',
      'status',
      'columns',
      'filters',
      'sorting',
      'groupBy',
      'calculatedFields',
      'chartConfig',
      'summaryRow',
      'showRowNumbers',
      'pageSize',
      'tags',
    ];

    updatable.forEach(field => {
      if (data[field] !== undefined) report[field] = data[field];
    });

    report.version += 1;
    report.updatedAt = new Date().toISOString();
    this._createVersion(
      report.id,
      data.updatedBy || 'system',
      data.changeNote || 'تم تحديث التقرير'
    );

    return report;
  }

  deleteReport(id) {
    const report = this.reports.get(String(id));
    if (!report) throw new Error('التقرير غير موجود');
    this.reports.delete(String(id));
    // Remove related schedules
    for (const [sid, sch] of this.schedules) {
      if (sch.reportId === String(id)) this.schedules.delete(sid);
    }
    logger.info(`Report deleted: ${id}`);
    return { deleted: true };
  }

  duplicateReport(id, userId) {
    const original = this.getReportById(id);
    const clone = this.createReport({
      ...original,
      name: `${original.name} (نسخة)`,
      nameAr: `${original.nameAr} (نسخة)`,
      createdBy: userId || 'system',
      id: undefined,
    });
    clone.status = 'draft';
    return clone;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORT DESIGNER — مصمم التقرير (Drag & Drop)
  // ═══════════════════════════════════════════════════════════════════════════

  addColumn(reportId, column) {
    const report = this.reports.get(String(reportId));
    if (!report) throw new Error('التقرير غير موجود');
    if (!column.fieldId) throw new Error('معرف الحقل مطلوب');

    // Validate field belongs to data source
    const ds = this.getDataSourceById(report.dataSourceId);
    const field = ds.fields.find(f => f.id === column.fieldId);
    if (!field) throw new Error('الحقل غير موجود في مصدر البيانات');

    const col = {
      fieldId: column.fieldId,
      label: column.label || field.label,
      labelAr: column.labelAr || field.labelAr,
      width: column.width || 'auto',
      visible: column.visible !== false,
      order: column.order ?? report.columns.length,
      format: column.format || null,
      aggregation: column.aggregation || null,
    };

    report.columns.push(col);
    report.columns.sort((a, b) => a.order - b.order);
    report.updatedAt = new Date().toISOString();
    return report;
  }

  removeColumn(reportId, fieldId) {
    const report = this.reports.get(String(reportId));
    if (!report) throw new Error('التقرير غير موجود');

    const beforeLen = report.columns.length;
    report.columns = report.columns.filter(c => c.fieldId !== fieldId);
    if (report.columns.length === beforeLen) throw new Error('العمود غير موجود');

    // Re-order
    report.columns.forEach((c, i) => {
      c.order = i;
    });
    report.updatedAt = new Date().toISOString();
    return report;
  }

  reorderColumns(reportId, orderedFieldIds) {
    const report = this.reports.get(String(reportId));
    if (!report) throw new Error('التقرير غير موجود');

    const ordered = [];
    orderedFieldIds.forEach((fid, idx) => {
      const col = report.columns.find(c => c.fieldId === fid);
      if (col) {
        col.order = idx;
        ordered.push(col);
      }
    });
    report.columns = ordered;
    report.updatedAt = new Date().toISOString();
    return report;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTERS — الفلاتر والشروط
  // ═══════════════════════════════════════════════════════════════════════════

  addFilter(reportId, filter) {
    const report = this.reports.get(String(reportId));
    if (!report) throw new Error('التقرير غير موجود');
    if (!filter.fieldId || !filter.operator) throw new Error('الحقل والعامل مطلوبان');

    const f = {
      id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      fieldId: filter.fieldId,
      operator: filter.operator, // eq, ne, gt, lt, gte, lte, contains, startsWith, endsWith, in, between, isNull, isNotNull
      value: filter.value ?? null,
      value2: filter.value2 ?? null, // for 'between'
      logic: filter.logic || 'AND', // AND / OR
    };

    report.filters.push(f);
    report.updatedAt = new Date().toISOString();
    return report;
  }

  removeFilter(reportId, filterId) {
    const report = this.reports.get(String(reportId));
    if (!report) throw new Error('التقرير غير موجود');

    const before = report.filters.length;
    report.filters = report.filters.filter(f => f.id !== filterId);
    if (report.filters.length === before) throw new Error('الفلتر غير موجود');

    report.updatedAt = new Date().toISOString();
    return report;
  }

  updateFilter(reportId, filterId, data) {
    const report = this.reports.get(String(reportId));
    if (!report) throw new Error('التقرير غير موجود');

    const filter = report.filters.find(f => f.id === filterId);
    if (!filter) throw new Error('الفلتر غير موجود');

    ['operator', 'value', 'value2', 'logic'].forEach(k => {
      if (data[k] !== undefined) filter[k] = data[k];
    });

    report.updatedAt = new Date().toISOString();
    return report;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SORTING — الترتيب
  // ═══════════════════════════════════════════════════════════════════════════

  setSorting(reportId, sorting) {
    const report = this.reports.get(String(reportId));
    if (!report) throw new Error('التقرير غير موجود');
    report.sorting = (sorting || []).map(s => ({
      fieldId: s.fieldId,
      direction: s.direction || 'asc',
    }));
    report.updatedAt = new Date().toISOString();
    return report;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUPING — التجميع
  // ═══════════════════════════════════════════════════════════════════════════

  setGroupBy(reportId, groupBy) {
    const report = this.reports.get(String(reportId));
    if (!report) throw new Error('التقرير غير موجود');
    report.groupBy = (groupBy || []).map(g => ({
      fieldId: g.fieldId,
      aggregation: g.aggregation || 'count', // count, sum, avg, min, max
    }));
    report.updatedAt = new Date().toISOString();
    return report;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATED FIELDS — الحقول المحسوبة
  // ═══════════════════════════════════════════════════════════════════════════

  addCalculatedField(reportId, field) {
    const report = this.reports.get(String(reportId));
    if (!report) throw new Error('التقرير غير موجود');
    if (!field.name || !field.formula) throw new Error('الاسم والصيغة مطلوبان');

    const calc = {
      id: `calc_${Date.now()}`,
      name: field.name,
      nameAr: field.nameAr || field.name,
      formula: field.formula, // e.g. "{amount} * {quantity}"
      type: field.type || 'number', // number, string, date, boolean
      format: field.format || null,
    };

    report.calculatedFields.push(calc);
    report.updatedAt = new Date().toISOString();
    return report;
  }

  removeCalculatedField(reportId, fieldId) {
    const report = this.reports.get(String(reportId));
    if (!report) throw new Error('التقرير غير موجود');

    const before = report.calculatedFields.length;
    report.calculatedFields = report.calculatedFields.filter(f => f.id !== fieldId);
    if (report.calculatedFields.length === before) throw new Error('الحقل المحسوب غير موجود');

    report.updatedAt = new Date().toISOString();
    return report;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHART CONFIGURATION — إعداد الرسوم البيانية
  // ═══════════════════════════════════════════════════════════════════════════

  setChartConfig(reportId, config) {
    const report = this.reports.get(String(reportId));
    if (!report) throw new Error('التقرير غير موجود');

    if (config) {
      if (!config.type) throw new Error('نوع الرسم البياني مطلوب');
      const validTypes = ['bar', 'line', 'pie', 'doughnut', 'area', 'scatter', 'table', 'kpi'];
      if (!validTypes.includes(config.type)) {
        throw new Error(`نوع غير مدعوم: ${config.type}`);
      }
      report.chartConfig = {
        type: config.type,
        xAxis: config.xAxis || null,
        yAxis: config.yAxis || null,
        series: config.series || [],
        colors: config.colors || ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2'],
        title: config.title || '',
        showLegend: config.showLegend !== false,
        showGrid: config.showGrid !== false,
        stacked: config.stacked || false,
      };
    } else {
      report.chartConfig = null;
    }

    report.updatedAt = new Date().toISOString();
    return report;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORT EXECUTION — تنفيذ التقرير
  // ═══════════════════════════════════════════════════════════════════════════

  executeReport(reportId, params = {}) {
    const report = this.reports.get(String(reportId));
    if (!report) throw new Error('التقرير غير موجود');

    const ds = this.getDataSourceById(report.dataSourceId);

    // Generate mock data based on data source fields and report config
    const rows = this._generateReportData(report, ds, params);

    // Apply filters
    let filtered = this._applyFilters(rows, report.filters);

    // Apply sorting
    filtered = this._applySorting(filtered, report.sorting);

    // Apply grouping
    let grouped = null;
    if (report.groupBy.length > 0) {
      grouped = this._applyGrouping(filtered, report.groupBy);
    }

    // Pagination
    const page = parseInt(params.page) || 1;
    const pageSize = parseInt(params.pageSize) || report.pageSize;
    const totalRows = filtered.length;
    const totalPages = Math.ceil(totalRows / pageSize);
    const startIdx = (page - 1) * pageSize;
    const pagedRows = filtered.slice(startIdx, startIdx + pageSize);

    // Calculate summary row
    let summary = null;
    if (report.summaryRow) {
      summary = this._calculateSummary(filtered, report.columns, ds);
    }

    // Update run count
    report.lastRunAt = new Date().toISOString();
    report.runCount += 1;

    // Log execution
    const execution = {
      id: String(this._nextExecutionId++),
      reportId: String(reportId),
      executedBy: params.userId || 'system',
      executedAt: new Date().toISOString(),
      rowCount: totalRows,
      duration: Math.floor(Math.random() * 800) + 200, // ms
      params: { page, pageSize },
      status: 'completed',
    };
    this.executions.set(execution.id, execution);

    return {
      report: {
        id: report.id,
        name: report.name,
        nameAr: report.nameAr,
      },
      columns: report.columns.filter(c => c.visible),
      rows: pagedRows,
      grouped,
      summary,
      pagination: {
        page,
        pageSize,
        totalRows,
        totalPages,
      },
      chartConfig: report.chartConfig,
      executionId: execution.id,
      duration: execution.duration,
    };
  }

  getExecutionHistory(reportId, query = {}) {
    let execs = Array.from(this.executions.values());
    if (reportId) {
      execs = execs.filter(e => e.reportId === String(reportId));
    }
    const limit = parseInt(query.limit) || 20;
    return execs.slice(-limit).reverse();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATES — القوالب
  // ═══════════════════════════════════════════════════════════════════════════

  getTemplates(query = {}) {
    let templates = Array.from(this.templates.values());
    if (query.category) {
      templates = templates.filter(t => t.category === query.category);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      templates = templates.filter(t => t.name.toLowerCase().includes(s) || t.nameAr.includes(s));
    }
    return templates;
  }

  getTemplateById(id) {
    const tmpl = this.templates.get(String(id));
    if (!tmpl) throw new Error('القالب غير موجود');
    return tmpl;
  }

  createReportFromTemplate(templateId, userId) {
    const tmpl = this.getTemplateById(templateId);
    const report = this.createReport({
      name: tmpl.name,
      nameAr: tmpl.nameAr,
      description: tmpl.description,
      dataSourceId: tmpl.dataSourceId,
      category: tmpl.category,
      columns: JSON.parse(JSON.stringify(tmpl.columns)),
      filters: JSON.parse(JSON.stringify(tmpl.filters)),
      sorting: JSON.parse(JSON.stringify(tmpl.sorting)),
      groupBy: JSON.parse(JSON.stringify(tmpl.groupBy)),
      chartConfig: tmpl.chartConfig ? JSON.parse(JSON.stringify(tmpl.chartConfig)) : null,
      summaryRow: tmpl.summaryRow,
      pageSize: tmpl.pageSize,
      createdBy: userId || 'system',
    });
    return report;
  }

  saveAsTemplate(reportId, data = {}) {
    const report = this.getReportById(reportId);
    const tmpl = {
      id: String(this._nextTemplateId++),
      name: data.name || report.name,
      nameAr: data.nameAr || report.nameAr,
      description: data.description || report.description,
      dataSourceId: report.dataSourceId,
      category: report.category,
      columns: JSON.parse(JSON.stringify(report.columns)),
      filters: JSON.parse(JSON.stringify(report.filters)),
      sorting: JSON.parse(JSON.stringify(report.sorting)),
      groupBy: JSON.parse(JSON.stringify(report.groupBy)),
      chartConfig: report.chartConfig ? JSON.parse(JSON.stringify(report.chartConfig)) : null,
      summaryRow: report.summaryRow,
      pageSize: report.pageSize,
      createdBy: data.createdBy || 'system',
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };
    this.templates.set(tmpl.id, tmpl);
    logger.info(`Template created from report ${reportId}: ${tmpl.id}`);
    return tmpl;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULING — جدولة التقارير
  // ═══════════════════════════════════════════════════════════════════════════

  createSchedule(data) {
    if (!data.reportId) throw new Error('معرف التقرير مطلوب');
    if (!data.frequency) throw new Error('التكرار مطلوب');
    this.getReportById(data.reportId); // validate

    const validFreqs = ['daily', 'weekly', 'monthly', 'quarterly'];
    if (!validFreqs.includes(data.frequency)) {
      throw new Error('التكرار غير مدعوم');
    }

    const schedule = {
      id: String(this._nextScheduleId++),
      reportId: String(data.reportId),
      frequency: data.frequency,
      time: data.time || '08:00',
      dayOfWeek: data.dayOfWeek || null, // for weekly
      dayOfMonth: data.dayOfMonth || null, // for monthly
      recipients: data.recipients || [], // email addresses
      format: data.format || 'pdf',
      enabled: true,
      createdBy: data.createdBy || 'system',
      createdAt: new Date().toISOString(),
      lastRunAt: null,
      nextRunAt: this._calculateNextRun(data.frequency, data.time || '08:00'),
    };

    this.schedules.set(schedule.id, schedule);
    logger.info(`Schedule created: ${schedule.id} for report ${data.reportId}`);
    return schedule;
  }

  getSchedules(reportId) {
    let scheds = Array.from(this.schedules.values());
    if (reportId) {
      scheds = scheds.filter(s => s.reportId === String(reportId));
    }
    return scheds;
  }

  getScheduleById(id) {
    const sch = this.schedules.get(String(id));
    if (!sch) throw new Error('الجدولة غير موجودة');
    return sch;
  }

  updateSchedule(id, data) {
    const sch = this.schedules.get(String(id));
    if (!sch) throw new Error('الجدولة غير موجودة');

    ['frequency', 'time', 'dayOfWeek', 'dayOfMonth', 'recipients', 'format', 'enabled'].forEach(
      k => {
        if (data[k] !== undefined) sch[k] = data[k];
      }
    );

    if (data.frequency || data.time) {
      sch.nextRunAt = this._calculateNextRun(sch.frequency, sch.time);
    }

    return sch;
  }

  deleteSchedule(id) {
    if (!this.schedules.has(String(id))) throw new Error('الجدولة غير موجودة');
    this.schedules.delete(String(id));
    return { deleted: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT — تصدير التقارير
  // ═══════════════════════════════════════════════════════════════════════════

  exportReport(reportId, format, params = {}) {
    const validFormats = ['pdf', 'excel', 'csv', 'json'];
    if (!validFormats.includes(format)) throw new Error('صيغة التصدير غير مدعومة');

    const result = this.executeReport(reportId, params);

    return {
      reportId: String(reportId),
      format,
      fileName: `${result.report.name}_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : format}`,
      rows: result.rows.length,
      totalRows: result.pagination.totalRows,
      generatedAt: new Date().toISOString(),
      downloadUrl: `/api/report-builder/exports/${reportId}/${format}`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARING & PERMISSIONS — المشاركة والصلاحيات
  // ═══════════════════════════════════════════════════════════════════════════

  shareReport(reportId, data) {
    this.getReportById(reportId); // validate
    if (!data.userId && !data.role) throw new Error('المستخدم أو الدور مطلوب');

    const share = {
      reportId: String(reportId),
      userId: data.userId || null,
      role: data.role || null,
      permission: data.permission || 'view', // view, edit, admin
      sharedBy: data.sharedBy || 'system',
      sharedAt: new Date().toISOString(),
    };

    this.shares.push(share);
    return share;
  }

  getReportShares(reportId) {
    return this.shares.filter(s => s.reportId === String(reportId));
  }

  removeShare(reportId, userId) {
    const before = this.shares.length;
    this.shares = this.shares.filter(
      s => !(s.reportId === String(reportId) && s.userId === userId)
    );
    if (this.shares.length === before) throw new Error('المشاركة غير موجودة');
    return { removed: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FAVORITES — المفضلة
  // ═══════════════════════════════════════════════════════════════════════════

  toggleFavorite(userId, reportId) {
    this.getReportById(reportId); // validate
    if (!this.favorites.has(userId)) {
      this.favorites.set(userId, new Set());
    }
    const userFavs = this.favorites.get(userId);
    const isFav = userFavs.has(String(reportId));
    if (isFav) {
      userFavs.delete(String(reportId));
    } else {
      userFavs.add(String(reportId));
    }
    return { reportId: String(reportId), isFavorite: !isFav };
  }

  getUserFavorites(userId) {
    const favIds = this.favorites.get(userId);
    if (!favIds || favIds.size === 0) return [];
    return Array.from(favIds)
      .map(id => this.reports.get(id))
      .filter(Boolean);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSION HISTORY — سجل الإصدارات
  // ═══════════════════════════════════════════════════════════════════════════

  _createVersion(reportId, userId, note) {
    const ver = {
      id: String(this._nextVersionId++),
      reportId: String(reportId),
      userId: userId || 'system',
      note,
      createdAt: new Date().toISOString(),
    };
    this.versions.push(ver);
    return ver;
  }

  getReportVersions(reportId) {
    return this.versions.filter(v => v.reportId === String(reportId)).reverse();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD — لوحة التحكم
  // ═══════════════════════════════════════════════════════════════════════════

  getDashboard(userId) {
    const allReports = Array.from(this.reports.values());
    const allSchedules = Array.from(this.schedules.values());
    const allTemplates = Array.from(this.templates.values());
    const allExecs = Array.from(this.executions.values());

    // Recent reports
    const recentReports = [...allReports]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5);

    // My favorites
    const favorites = userId ? this.getUserFavorites(userId) : [];

    // Stats
    const kpi = {
      totalReports: allReports.length,
      publishedReports: allReports.filter(r => r.status === 'published').length,
      draftReports: allReports.filter(r => r.status === 'draft').length,
      totalTemplates: allTemplates.length,
      totalSchedules: allSchedules.filter(s => s.enabled).length,
      totalExecutions: allExecs.length,
      categoryCounts: {},
      sourceUsage: {},
    };

    // Category breakdown
    allReports.forEach(r => {
      kpi.categoryCounts[r.category] = (kpi.categoryCounts[r.category] || 0) + 1;
    });

    // Source usage
    allReports.forEach(r => {
      const ds = this.dataSources.get(r.dataSourceId);
      const name = ds ? ds.nameAr : r.dataSourceId;
      kpi.sourceUsage[name] = (kpi.sourceUsage[name] || 0) + 1;
    });

    // Recent executions
    const recentExecutions = [...allExecs]
      .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt))
      .slice(0, 10);

    return {
      kpi,
      recentReports,
      favorites,
      recentExecutions,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE — تنفيذ داخلي
  // ═══════════════════════════════════════════════════════════════════════════

  _generateReportData(report, ds, params) {
    const rows = [];
    const count = parseInt(params.totalRows) || 50;

    for (let i = 0; i < count; i++) {
      const row = {};
      ds.fields.forEach(field => {
        row[field.id] = this._generateFieldValue(field, i);
      });
      // Calculated fields
      report.calculatedFields.forEach(calc => {
        row[calc.id] = this._evaluateFormula(calc.formula, row);
      });
      rows.push(row);
    }
    return rows;
  }

  _generateFieldValue(field, index) {
    switch (field.type) {
      case 'number':
        return Math.floor(Math.random() * 10000) + 1;
      case 'currency':
        return parseFloat((Math.random() * 50000 + 500).toFixed(2));
      case 'date':
        return new Date(Date.now() - Math.random() * 180 * 86400000).toISOString().slice(0, 10);
      case 'boolean':
        return index % 3 === 0;
      case 'percentage':
        return parseFloat((Math.random() * 100).toFixed(1));
      case 'status':
        return ['مكتمل', 'قيد التنفيذ', 'معلق', 'ملغي'][index % 4];
      case 'select':
        return (field.options || ['خيار 1', 'خيار 2', 'خيار 3'])[
          index % (field.options || [1, 2, 3]).length
        ];
      default:
        return (field.sampleValues || [`${field.labelAr || field.label} ${index + 1}`])[
          index % (field.sampleValues || [1]).length
        ];
    }
  }

  _evaluateFormula(formula, row) {
    try {
      let expr = formula;
      Object.keys(row).forEach(key => {
        expr = expr.replace(new RegExp(`\\{${key}\\}`, 'g'), Number(row[key]) || 0);
      });
      // Only allow numbers and basic math operators
      if (/^[\d\s+\-*/().]+$/.test(expr)) {
        return parseFloat(this._safeMathEval(expr).toFixed(2));
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Safe math expression evaluator (replaces eval)
   * Supports: +, -, *, /, (), decimals, unary minus
   */
  _safeMathEval(expr) {
    const tokens = expr.match(/(\d+\.?\d*|[+\-*/()])/g);
    if (!tokens) return 0;
    let pos = 0;

    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    const parseExpr = () => {
      let left = parseTerm();
      while (peek() === '+' || peek() === '-') {
        const op = consume();
        const right = parseTerm();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    };

    const parseTerm = () => {
      let left = parseFactor();
      while (peek() === '*' || peek() === '/') {
        const op = consume();
        const right = parseFactor();
        left = op === '*' ? left * right : right !== 0 ? left / right : 0;
      }
      return left;
    };

    const parseFactor = () => {
      if (peek() === '(') {
        consume();
        const val = parseExpr();
        if (peek() === ')') consume();
        return val;
      }
      if (peek() === '-') {
        consume();
        return -parseFactor();
      }
      return parseFloat(consume()) || 0;
    };

    return parseExpr();
  }

  _applyFilters(rows, filters) {
    if (!filters || filters.length === 0) return rows;

    return rows.filter(row => {
      return filters.every(f => {
        const val = row[f.fieldId];
        const target = f.value;

        switch (f.operator) {
          case 'eq':
            return val === target;
          case 'ne':
            return val !== target;
          case 'gt':
            return val > target;
          case 'lt':
            return val < target;
          case 'gte':
            return val >= target;
          case 'lte':
            return val <= target;
          case 'contains':
            return String(val).includes(String(target));
          case 'startsWith':
            return String(val).startsWith(String(target));
          case 'endsWith':
            return String(val).endsWith(String(target));
          case 'isNull':
            return val == null;
          case 'isNotNull':
            return val != null;
          case 'between':
            return val >= target && val <= f.value2;
          default:
            return true;
        }
      });
    });
  }

  _applySorting(rows, sorting) {
    if (!sorting || sorting.length === 0) return rows;

    return [...rows].sort((a, b) => {
      for (const s of sorting) {
        const aVal = a[s.fieldId];
        const bVal = b[s.fieldId];
        const dir = s.direction === 'desc' ? -1 : 1;
        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
      }
      return 0;
    });
  }

  _applyGrouping(rows, groupBy) {
    const groups = {};
    const groupField = groupBy[0]; // primary group

    rows.forEach(row => {
      const key = String(row[groupField.fieldId]);
      if (!groups[key]) {
        groups[key] = { key, label: key, rows: [], aggregates: {} };
      }
      groups[key].rows.push(row);
    });

    // Calculate aggregates for each group
    Object.values(groups).forEach(group => {
      groupBy.forEach(g => {
        const values = group.rows.map(r => Number(r[g.fieldId]) || 0);
        switch (g.aggregation) {
          case 'count':
            group.aggregates[g.fieldId] = group.rows.length;
            break;
          case 'sum':
            group.aggregates[g.fieldId] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            group.aggregates[g.fieldId] = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case 'min':
            group.aggregates[g.fieldId] = Math.min(...values);
            break;
          case 'max':
            group.aggregates[g.fieldId] = Math.max(...values);
            break;
          default:
            group.aggregates[g.fieldId] = group.rows.length;
        }
      });
    });

    return Object.values(groups);
  }

  _calculateSummary(rows, columns, ds) {
    const summary = {};
    columns.forEach(col => {
      const field = ds.fields.find(f => f.id === col.fieldId);
      if (
        field &&
        (field.type === 'number' || field.type === 'currency' || field.type === 'percentage')
      ) {
        const values = rows.map(r => Number(r[col.fieldId]) || 0);
        summary[col.fieldId] = {
          sum: values.reduce((a, b) => a + b, 0),
          avg: values.reduce((a, b) => a + b, 0) / (values.length || 1),
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
        };
      }
    });
    return summary;
  }

  _calculateNextRun(frequency, time) {
    const now = new Date();
    const [hours, minutes] = (time || '08:00').split(':').map(Number);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case 'daily':
        if (next <= now) next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + ((7 - next.getDay()) % 7) || 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1, 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3, 1);
        break;
    }
    return next.toISOString();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEED DATA — بيانات تجريبية
  // ═══════════════════════════════════════════════════════════════════════════

  _seed() {
    // ── Data Sources (ERP Modules) ──
    const sources = [
      {
        id: '3000',
        name: 'Beneficiaries',
        nameAr: 'المستفيدين',
        icon: 'people',
        category: 'core',
        fields: [
          { id: 'b_id', label: 'ID', labelAr: 'المعرف', type: 'number' },
          {
            id: 'b_name',
            label: 'Name',
            labelAr: 'الاسم',
            type: 'string',
            sampleValues: ['أحمد محمد', 'سارة علي', 'فاطمة حسن', 'خالد إبراهيم', 'نورة سعد'],
          },
          { id: 'b_age', label: 'Age', labelAr: 'العمر', type: 'number' },
          {
            id: 'b_gender',
            label: 'Gender',
            labelAr: 'الجنس',
            type: 'select',
            options: ['ذكر', 'أنثى'],
          },
          { id: 'b_status', label: 'Status', labelAr: 'الحالة', type: 'status' },
          { id: 'b_admission', label: 'Admission Date', labelAr: 'تاريخ القبول', type: 'date' },
          {
            id: 'b_program',
            label: 'Program',
            labelAr: 'البرنامج',
            type: 'string',
            sampleValues: ['تأهيل شامل', 'رعاية نهارية', 'تدخل مبكر', 'تأهيل مهني'],
          },
          {
            id: 'b_disability',
            label: 'Disability Type',
            labelAr: 'نوع الإعاقة',
            type: 'string',
            sampleValues: ['حركية', 'ذهنية', 'سمعية', 'بصرية', 'متعددة'],
          },
          { id: 'b_active', label: 'Active', labelAr: 'نشط', type: 'boolean' },
        ],
      },
      {
        id: '3001',
        name: 'Employees',
        nameAr: 'الموظفين',
        icon: 'badge',
        category: 'hr',
        fields: [
          { id: 'e_id', label: 'Employee ID', labelAr: 'رقم الموظف', type: 'number' },
          {
            id: 'e_name',
            label: 'Name',
            labelAr: 'الاسم',
            type: 'string',
            sampleValues: ['محمد العتيبي', 'فهد القحطاني', 'عبدالله المالكي', 'سلمان الدوسري'],
          },
          {
            id: 'e_dept',
            label: 'Department',
            labelAr: 'القسم',
            type: 'string',
            sampleValues: ['التأهيل', 'الإدارة', 'المالية', 'تقنية المعلومات', 'الموارد البشرية'],
          },
          {
            id: 'e_position',
            label: 'Position',
            labelAr: 'المنصب',
            type: 'string',
            sampleValues: ['مدير', 'أخصائي', 'فني', 'موظف', 'مشرف'],
          },
          { id: 'e_salary', label: 'Salary', labelAr: 'الراتب', type: 'currency' },
          { id: 'e_joinDate', label: 'Join Date', labelAr: 'تاريخ الانضمام', type: 'date' },
          { id: 'e_status', label: 'Status', labelAr: 'الحالة', type: 'status' },
          { id: 'e_performance', label: 'Performance', labelAr: 'الأداء', type: 'percentage' },
        ],
      },
      {
        id: '3002',
        name: 'Finance',
        nameAr: 'المالية',
        icon: 'payments',
        category: 'finance',
        fields: [
          { id: 'f_id', label: 'Transaction ID', labelAr: 'رقم المعاملة', type: 'number' },
          { id: 'f_date', label: 'Date', labelAr: 'التاريخ', type: 'date' },
          {
            id: 'f_type',
            label: 'Type',
            labelAr: 'النوع',
            type: 'select',
            options: ['إيراد', 'مصروف', 'تحويل'],
          },
          {
            id: 'f_category',
            label: 'Category',
            labelAr: 'الفئة',
            type: 'string',
            sampleValues: ['رواتب', 'صيانة', 'مشتريات', 'تبرعات', 'دعم حكومي', 'إيجار'],
          },
          { id: 'f_amount', label: 'Amount', labelAr: 'المبلغ', type: 'currency' },
          {
            id: 'f_account',
            label: 'Account',
            labelAr: 'الحساب',
            type: 'string',
            sampleValues: ['الحساب الجاري', 'صندوق النثرية', 'حساب المشاريع'],
          },
          { id: 'f_status', label: 'Status', labelAr: 'الحالة', type: 'status' },
          { id: 'f_approved', label: 'Approved', labelAr: 'معتمد', type: 'boolean' },
        ],
      },
      {
        id: '3003',
        name: 'Attendance',
        nameAr: 'الحضور والانصراف',
        icon: 'schedule',
        category: 'hr',
        fields: [
          { id: 'a_id', label: 'Record ID', labelAr: 'رقم السجل', type: 'number' },
          {
            id: 'a_employee',
            label: 'Employee',
            labelAr: 'الموظف',
            type: 'string',
            sampleValues: ['محمد العتيبي', 'فهد القحطاني', 'عبدالله المالكي'],
          },
          { id: 'a_date', label: 'Date', labelAr: 'التاريخ', type: 'date' },
          {
            id: 'a_checkIn',
            label: 'Check In',
            labelAr: 'وقت الدخول',
            type: 'string',
            sampleValues: ['07:30', '08:00', '08:15', '07:45'],
          },
          {
            id: 'a_checkOut',
            label: 'Check Out',
            labelAr: 'وقت الخروج',
            type: 'string',
            sampleValues: ['15:30', '16:00', '15:45', '16:15'],
          },
          { id: 'a_hours', label: 'Hours', labelAr: 'الساعات', type: 'number' },
          {
            id: 'a_status',
            label: 'Status',
            labelAr: 'الحالة',
            type: 'select',
            options: ['حاضر', 'غائب', 'إجازة', 'مأذونية'],
          },
          { id: 'a_overtime', label: 'Overtime', labelAr: 'إضافي', type: 'boolean' },
        ],
      },
      {
        id: '3004',
        name: 'Medical Records',
        nameAr: 'السجلات الطبية',
        icon: 'medical_services',
        category: 'medical',
        fields: [
          { id: 'm_id', label: 'Record ID', labelAr: 'رقم السجل', type: 'number' },
          {
            id: 'm_patient',
            label: 'Patient',
            labelAr: 'المريض',
            type: 'string',
            sampleValues: ['أحمد محمد', 'سارة علي', 'فاطمة حسن'],
          },
          { id: 'm_date', label: 'Visit Date', labelAr: 'تاريخ الزيارة', type: 'date' },
          {
            id: 'm_doctor',
            label: 'Doctor',
            labelAr: 'الطبيب',
            type: 'string',
            sampleValues: ['د. عبدالرحمن', 'د. هند', 'د. سامي'],
          },
          {
            id: 'm_diagnosis',
            label: 'Diagnosis',
            labelAr: 'التشخيص',
            type: 'string',
            sampleValues: ['فحص دوري', 'علاج طبيعي', 'استشارة نفسية', 'متابعة'],
          },
          { id: 'm_cost', label: 'Cost', labelAr: 'التكلفة', type: 'currency' },
          { id: 'm_status', label: 'Status', labelAr: 'الحالة', type: 'status' },
          { id: 'm_followUp', label: 'Follow-up', labelAr: 'متابعة', type: 'boolean' },
        ],
      },
      {
        id: '3005',
        name: 'Procurement',
        nameAr: 'المشتريات',
        icon: 'shopping_cart',
        category: 'operations',
        fields: [
          { id: 'p_id', label: 'PO Number', labelAr: 'رقم الطلب', type: 'number' },
          {
            id: 'p_supplier',
            label: 'Supplier',
            labelAr: 'المورد',
            type: 'string',
            sampleValues: ['شركة التوريدات', 'مؤسسة الإمداد', 'شركة المعدات الطبية'],
          },
          {
            id: 'p_item',
            label: 'Item',
            labelAr: 'الصنف',
            type: 'string',
            sampleValues: ['أجهزة طبية', 'مستلزمات مكتبية', 'أثاث', 'مواد تنظيف', 'أغذية'],
          },
          { id: 'p_quantity', label: 'Quantity', labelAr: 'الكمية', type: 'number' },
          { id: 'p_unitPrice', label: 'Unit Price', labelAr: 'سعر الوحدة', type: 'currency' },
          { id: 'p_total', label: 'Total', labelAr: 'الإجمالي', type: 'currency' },
          { id: 'p_date', label: 'Order Date', labelAr: 'تاريخ الطلب', type: 'date' },
          { id: 'p_status', label: 'Status', labelAr: 'الحالة', type: 'status' },
        ],
      },
    ];

    sources.forEach(s => this.dataSources.set(s.id, s));

    // ── Report Templates ──
    const templates = [
      {
        id: '2000',
        name: 'Monthly Beneficiary Report',
        nameAr: 'تقرير المستفيدين الشهري',
        description: 'تقرير شامل عن حالة المستفيدين والبرامج',
        dataSourceId: '3000',
        category: 'beneficiaries',
        columns: [
          { fieldId: 'b_id', label: 'المعرف', visible: true, order: 0 },
          { fieldId: 'b_name', label: 'الاسم', visible: true, order: 1 },
          { fieldId: 'b_program', label: 'البرنامج', visible: true, order: 2 },
          { fieldId: 'b_status', label: 'الحالة', visible: true, order: 3 },
          { fieldId: 'b_disability', label: 'نوع الإعاقة', visible: true, order: 4 },
        ],
        filters: [],
        sorting: [{ fieldId: 'b_name', direction: 'asc' }],
        groupBy: [],
        chartConfig: {
          type: 'pie',
          xAxis: 'b_program',
          yAxis: null,
          series: [],
          colors: ['#1976d2', '#388e3c', '#f57c00', '#d32f2f'],
          title: 'توزيع المستفيدين حسب البرنامج',
          showLegend: true,
          showGrid: false,
          stacked: false,
        },
        summaryRow: false,
        pageSize: 25,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        usageCount: 15,
      },
      {
        id: '2001',
        name: 'Payroll Summary',
        nameAr: 'ملخص الرواتب',
        description: 'ملخص رواتب الموظفين حسب القسم',
        dataSourceId: '3001',
        category: 'hr',
        columns: [
          { fieldId: 'e_name', label: 'الاسم', visible: true, order: 0 },
          { fieldId: 'e_dept', label: 'القسم', visible: true, order: 1 },
          { fieldId: 'e_position', label: 'المنصب', visible: true, order: 2 },
          { fieldId: 'e_salary', label: 'الراتب', visible: true, order: 3 },
        ],
        filters: [],
        sorting: [{ fieldId: 'e_dept', direction: 'asc' }],
        groupBy: [{ fieldId: 'e_dept', aggregation: 'sum' }],
        chartConfig: {
          type: 'bar',
          xAxis: 'e_dept',
          yAxis: 'e_salary',
          series: [],
          colors: ['#1976d2'],
          title: 'الرواتب حسب القسم',
          showLegend: false,
          showGrid: true,
          stacked: false,
        },
        summaryRow: true,
        pageSize: 50,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        usageCount: 22,
      },
      {
        id: '2002',
        name: 'Financial Transactions',
        nameAr: 'المعاملات المالية',
        description: 'تقرير المعاملات المالية مع التصفية والتجميع',
        dataSourceId: '3002',
        category: 'finance',
        columns: [
          { fieldId: 'f_id', label: 'الرقم', visible: true, order: 0 },
          { fieldId: 'f_date', label: 'التاريخ', visible: true, order: 1 },
          { fieldId: 'f_type', label: 'النوع', visible: true, order: 2 },
          { fieldId: 'f_category', label: 'الفئة', visible: true, order: 3 },
          { fieldId: 'f_amount', label: 'المبلغ', visible: true, order: 4 },
          { fieldId: 'f_status', label: 'الحالة', visible: true, order: 5 },
        ],
        filters: [],
        sorting: [{ fieldId: 'f_date', direction: 'desc' }],
        groupBy: [{ fieldId: 'f_type', aggregation: 'sum' }],
        chartConfig: {
          type: 'doughnut',
          xAxis: 'f_type',
          yAxis: 'f_amount',
          series: [],
          colors: ['#388e3c', '#d32f2f', '#1976d2'],
          title: 'توزيع المعاملات حسب النوع',
          showLegend: true,
          showGrid: false,
          stacked: false,
        },
        summaryRow: true,
        pageSize: 25,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        usageCount: 30,
      },
      {
        id: '2003',
        name: 'Attendance Overview',
        nameAr: 'نظرة عامة على الحضور',
        description: 'تقرير الحضور والانصراف اليومي',
        dataSourceId: '3003',
        category: 'hr',
        columns: [
          { fieldId: 'a_employee', label: 'الموظف', visible: true, order: 0 },
          { fieldId: 'a_date', label: 'التاريخ', visible: true, order: 1 },
          { fieldId: 'a_checkIn', label: 'دخول', visible: true, order: 2 },
          { fieldId: 'a_checkOut', label: 'خروج', visible: true, order: 3 },
          { fieldId: 'a_hours', label: 'الساعات', visible: true, order: 4 },
          { fieldId: 'a_status', label: 'الحالة', visible: true, order: 5 },
        ],
        filters: [],
        sorting: [{ fieldId: 'a_date', direction: 'desc' }],
        groupBy: [],
        chartConfig: null,
        summaryRow: true,
        pageSize: 50,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        usageCount: 18,
      },
    ];

    templates.forEach(t => this.templates.set(t.id, t));

    // ── Seed Reports ──
    const seedReports = [
      {
        name: 'Beneficiary Services Q1',
        nameAr: 'خدمات المستفيدين - الربع الأول',
        description: 'تقرير ربع سنوي عن خدمات المستفيدين',
        dataSourceId: '3000',
        category: 'beneficiaries',
        status: 'published',
        isPublic: true,
        columns: [
          { fieldId: 'b_name', label: 'الاسم', visible: true, order: 0, width: '200px' },
          { fieldId: 'b_program', label: 'البرنامج', visible: true, order: 1, width: '150px' },
          { fieldId: 'b_status', label: 'الحالة', visible: true, order: 2, width: '100px' },
          {
            fieldId: 'b_disability',
            label: 'نوع الإعاقة',
            visible: true,
            order: 3,
            width: '120px',
          },
          {
            fieldId: 'b_admission',
            label: 'تاريخ القبول',
            visible: true,
            order: 4,
            width: '120px',
          },
        ],
        filters: [
          { id: 'f_seed1', fieldId: 'b_active', operator: 'eq', value: true, logic: 'AND' },
        ],
        sorting: [{ fieldId: 'b_admission', direction: 'desc' }],
        groupBy: [],
        chartConfig: {
          type: 'bar',
          xAxis: 'b_program',
          yAxis: null,
          series: [],
          colors: ['#1976d2', '#388e3c'],
          title: 'المستفيدين حسب البرنامج',
          showLegend: true,
          showGrid: true,
          stacked: false,
        },
        summaryRow: false,
        tags: ['ربع سنوي', 'مستفيدين'],
      },
      {
        name: 'Monthly Financial Report',
        nameAr: 'التقرير المالي الشهري',
        description: 'ملخص الإيرادات والمصروفات الشهرية',
        dataSourceId: '3002',
        category: 'finance',
        status: 'published',
        isPublic: true,
        columns: [
          { fieldId: 'f_date', label: 'التاريخ', visible: true, order: 0 },
          { fieldId: 'f_type', label: 'النوع', visible: true, order: 1 },
          { fieldId: 'f_category', label: 'الفئة', visible: true, order: 2 },
          { fieldId: 'f_amount', label: 'المبلغ', visible: true, order: 3 },
          { fieldId: 'f_status', label: 'الحالة', visible: true, order: 4 },
        ],
        filters: [],
        sorting: [{ fieldId: 'f_date', direction: 'desc' }],
        groupBy: [{ fieldId: 'f_type', aggregation: 'sum' }],
        chartConfig: {
          type: 'line',
          xAxis: 'f_date',
          yAxis: 'f_amount',
          series: [],
          colors: ['#388e3c', '#d32f2f'],
          title: 'حركة المعاملات المالية',
          showLegend: true,
          showGrid: true,
          stacked: false,
        },
        summaryRow: true,
        tags: ['شهري', 'مالية'],
      },
      {
        name: 'Employee Performance Dashboard',
        nameAr: 'لوحة أداء الموظفين',
        description: 'تقرير أداء الموظفين مع مؤشرات الأداء',
        dataSourceId: '3001',
        category: 'hr',
        status: 'draft',
        isPublic: false,
        columns: [
          { fieldId: 'e_name', label: 'الاسم', visible: true, order: 0 },
          { fieldId: 'e_dept', label: 'القسم', visible: true, order: 1 },
          { fieldId: 'e_performance', label: 'الأداء %', visible: true, order: 2 },
          { fieldId: 'e_salary', label: 'الراتب', visible: true, order: 3 },
        ],
        filters: [],
        sorting: [{ fieldId: 'e_performance', direction: 'desc' }],
        groupBy: [{ fieldId: 'e_dept', aggregation: 'avg' }],
        chartConfig: {
          type: 'bar',
          xAxis: 'e_dept',
          yAxis: 'e_performance',
          series: [],
          colors: ['#7b1fa2'],
          title: 'متوسط الأداء حسب القسم',
          showLegend: false,
          showGrid: true,
          stacked: false,
        },
        summaryRow: true,
        tags: ['أداء', 'موظفين'],
      },
    ];

    seedReports.forEach(r => {
      const report = {
        id: String(this._nextReportId++),
        ...r,
        createdBy: 'system',
        version: 1,
        createdAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        lastRunAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
        runCount: Math.floor(Math.random() * 20) + 5,
        pageSize: 25,
        showRowNumbers: true,
        calculatedFields: [],
      };
      this.reports.set(report.id, report);
    });

    // ── Seed Schedule ──
    this.schedules.set('4000', {
      id: '4000',
      reportId: '1000',
      frequency: 'weekly',
      time: '08:00',
      dayOfWeek: 0, // Sunday
      dayOfMonth: null,
      recipients: ['admin@alawael.org'],
      format: 'pdf',
      enabled: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      lastRunAt: null,
      nextRunAt: this._calculateNextRun('weekly', '08:00'),
    });

    logger.info(
      `ReportBuilder seeded: ${this.dataSources.size} sources, ${this.templates.size} templates, ${this.reports.size} reports`
    );
  }
}

module.exports = new ReportBuilderService();
