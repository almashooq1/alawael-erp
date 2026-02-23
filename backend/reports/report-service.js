/**
 * Report Service - خدمة التقارير المتقدمة
 * Enterprise Reporting for Alawael ERP
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

/**
 * Report Configuration
 */
const reportConfig = {
  // Storage
  storage: {
    path: process.env.REPORT_STORAGE_PATH || './storage/reports',
    retention: parseInt(process.env.REPORT_RETENTION_DAYS) || 30,
  },
  
  // Formats
  formats: ['json', 'csv', 'pdf', 'excel'],
  
  // Limits
  maxRows: 100000,
  defaultRows: 10000,
  
  // Cache
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
  },
};

/**
 * Report Definition Schema
 */
const ReportDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  category: { type: String, default: 'general' },
  
  // Data source
  source: {
    type: { type: String, enum: ['query', 'aggregation', 'function'], required: true },
    query: String,
    aggregation: mongoose.Schema.Types.Mixed,
    functionName: String,
  },
  
  // Parameters
  parameters: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['string', 'number', 'date', 'select', 'multi'], required: true },
    required: { type: Boolean, default: false },
    defaultValue: mongoose.Schema.Types.Mixed,
    options: [String], // For select/multi types
    label: String,
  }],
  
  // Columns
  columns: [{
    field: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, default: 'text' }, // text, number, date, currency, percent
    format: String,
    width: Number,
    align: { type: String, default: 'left' },
    sortable: { type: Boolean, default: true },
    aggregatable: { type: Boolean, default: false },
    aggregationType: { type: String, enum: ['sum', 'avg', 'min', 'max', 'count'] },
  }],
  
  // Output settings
  output: {
    defaultFormat: { type: String, default: 'json' },
    availableFormats: [{ type: String, enum: ['json', 'csv', 'pdf', 'excel'] }],
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'landscape' },
    pageSize: { type: String, default: 'A4' },
  },
  
  // Metadata
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false },
  roles: [String],
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'report_definitions',
});

/**
 * Report Execution Schema
 */
const ReportExecutionSchema = new mongoose.Schema({
  // Reference
  definitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportDefinition' },
  reportName: String,
  
  // Execution details
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
  
  // Parameters used
  parameters: mongoose.Schema.Types.Mixed,
  
  // Results
  rowCount: Number,
  fileSize: Number,
  filePath: String,
  format: String,
  
  // Timing
  startedAt: Date,
  completedAt: Date,
  duration: Number,
  
  // User info
  executedBy: String,
  tenantId: String,
  
  // Error
  error: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'report_executions',
});

// Indexes
ReportExecutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: reportConfig.storage.retention * 86400 });
ReportExecutionSchema.index({ definitionId: 1, createdAt: -1 });

/**
 * Report Service Class
 */
class ReportService {
  constructor() {
    this.ReportDefinition = null;
    this.ReportExecution = null;
    this.customFunctions = new Map();
    this.cache = new Map();
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.ReportDefinition = connection.model('ReportDefinition', ReportDefinitionSchema);
    this.ReportExecution = connection.model('ReportExecution', ReportExecutionSchema);
    
    // Ensure storage directory exists
    await fs.mkdir(reportConfig.storage.path, { recursive: true });
    
    // Register default reports
    await this.registerDefaultReports();
    
    console.log('✅ Report Service initialized');
  }
  
  /**
   * Register default reports
   */
  async registerDefaultReports() {
    const defaultReports = [
      // Sales Report
      {
        name: 'sales_summary',
        title: 'ملخص المبيعات',
        description: 'تقرير ملخص المبيعات حسب الفترة',
        category: 'sales',
        source: {
          type: 'aggregation',
          aggregation: [
            { $match: { createdAt: { $gte: '$$startDate', $lte: '$$endDate' } } },
            { $group: { _id: '$productId', totalSales: { $sum: '$total' }, count: { $sum: 1 } } },
          ],
        },
        parameters: [
          { name: 'startDate', type: 'date', required: true, label: 'من تاريخ' },
          { name: 'endDate', type: 'date', required: true, label: 'إلى تاريخ' },
        ],
        columns: [
          { field: '_id', label: 'المنتج', type: 'text' },
          { field: 'totalSales', label: 'إجمالي المبيعات', type: 'currency', aggregatable: true, aggregationType: 'sum' },
          { field: 'count', label: 'عدد العمليات', type: 'number', aggregatable: true, aggregationType: 'sum' },
        ],
      },
      
      // Inventory Report
      {
        name: 'inventory_status',
        title: 'حالة المخزون',
        description: 'تقرير حالة المخزون الحالية',
        category: 'inventory',
        source: {
          type: 'query',
          query: 'inventory',
        },
        parameters: [
          { name: 'category', type: 'select', label: 'التصنيف', options: ['الكل', 'إلكترونيات', 'ملابس', 'أغذية'] },
          { name: 'lowStock', type: 'select', label: 'المخزون', options: ['الكل', 'منخفض', 'متوسط', 'مرتفع'] },
        ],
        columns: [
          { field: 'name', label: 'اسم المنتج', type: 'text' },
          { field: 'sku', label: 'رمز المنتج', type: 'text' },
          { field: 'quantity', label: 'الكمية', type: 'number' },
          { field: 'value', label: 'القيمة', type: 'currency' },
          { field: 'status', label: 'الحالة', type: 'text' },
        ],
      },
      
      // Employee Report
      {
        name: 'employee_attendance',
        title: 'تقرير الحضور',
        description: 'تقرير حضور الموظفين',
        category: 'hr',
        source: {
          type: 'function',
          functionName: 'getEmployeeAttendance',
        },
        parameters: [
          { name: 'month', type: 'select', required: true, label: 'الشهر' },
          { name: 'year', type: 'select', required: true, label: 'السنة' },
          { name: 'department', type: 'select', label: 'القسم' },
        ],
        columns: [
          { field: 'employeeId', label: 'الرقم الوظيفي', type: 'text' },
          { field: 'name', label: 'اسم الموظف', type: 'text' },
          { field: 'presentDays', label: 'أيام الحضور', type: 'number' },
          { field: 'absentDays', label: 'أيام الغياب', type: 'number' },
          { field: 'lateMinutes', label: 'دقائق التأخير', type: 'number' },
        ],
      },
      
      // Financial Report
      {
        name: 'financial_summary',
        title: 'الملخص المالي',
        description: 'تقرير الملخص المالي الشهري',
        category: 'finance',
        source: {
          type: 'function',
          functionName: 'getFinancialSummary',
        },
        parameters: [
          { name: 'year', type: 'select', required: true, label: 'السنة' },
          { name: 'month', type: 'select', required: true, label: 'الشهر' },
        ],
        columns: [
          { field: 'category', label: 'البند', type: 'text' },
          { field: 'budget', label: 'الميزانية', type: 'currency' },
          { field: 'actual', label: 'الفعلي', type: 'currency' },
          { field: 'variance', label: 'الفرق', type: 'currency' },
          { field: 'percentage', label: 'النسبة', type: 'percent' },
        ],
      },
    ];
    
    for (const report of defaultReports) {
      const existing = await this.ReportDefinition.findOne({ name: report.name });
      if (!existing) {
        await this.ReportDefinition.create(report);
      }
    }
  }
  
  /**
   * Register custom function
   */
  registerFunction(name, handler) {
    this.customFunctions.set(name, handler);
  }
  
  /**
   * Get report definition
   */
  async getDefinition(name) {
    return this.ReportDefinition.findOne({ name, isActive: true });
  }
  
  /**
   * List report definitions
   */
  async listDefinitions(category = null) {
    const filter = { isActive: true };
    if (category) filter.category = category;
    return this.ReportDefinition.find(filter).sort({ category: 1, title: 1 });
  }
  
  /**
   * Create report definition
   */
  async createDefinition(definition) {
    return this.ReportDefinition.create(definition);
  }
  
  /**
   * Execute report
   */
  async execute(reportName, parameters = {}, options = {}) {
    const definition = await this.getDefinition(reportName);
    if (!definition) {
      throw new Error(`Report '${reportName}' not found`);
    }
    
    // Create execution record
    const execution = await this.ReportExecution.create({
      definitionId: definition._id,
      reportName: definition.name,
      parameters,
      status: 'pending',
      format: options.format || definition.output.defaultFormat,
      executedBy: options.executedBy,
      tenantId: options.tenantId,
    });
    
    try {
      // Update status
      execution.status = 'running';
      execution.startedAt = new Date();
      await execution.save();
      
      // Get data
      const data = await this.fetchData(definition, parameters);
      
      // Format output
      const result = await this.formatOutput(data, definition, options.format);
      
      // Update execution
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt - execution.startedAt;
      execution.rowCount = data.length;
      execution.fileSize = result.size;
      execution.filePath = result.filePath;
      await execution.save();
      
      return {
        success: true,
        data,
        rowCount: data.length,
        format: execution.format,
        filePath: result.filePath,
        downloadUrl: result.downloadUrl,
      };
      
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();
      await execution.save();
      throw error;
    }
  }
  
  /**
   * Fetch data from source
   */
  async fetchData(definition, parameters) {
    const { source } = definition;
    
    switch (source.type) {
      case 'query':
        return this.executeQuery(source.query, parameters);
        
      case 'aggregation':
        return this.executeAggregation(source.aggregation, parameters);
        
      case 'function':
        return this.executeFunction(source.functionName, parameters);
        
      default:
        throw new Error(`Unknown source type: ${source.type}`);
    }
  }
  
  /**
   * Execute query
   */
  async executeQuery(query, parameters) {
    // This would be implemented based on your models
    const modelName = query.split('.')[0];
    const queryFn = query.split('.')[1] || 'find';
    
    // Placeholder - implement based on your needs
    return [];
  }
  
  /**
   * Execute aggregation
   */
  async executeAggregation(aggregation, parameters) {
    // Replace parameters in aggregation
    let pipeline = JSON.stringify(aggregation);
    for (const [key, value] of Object.entries(parameters)) {
      pipeline = pipeline.replace(new RegExp(`\\$\\$${key}`, 'g'), JSON.stringify(value));
    }
    pipeline = JSON.parse(pipeline);
    
    // Execute aggregation - placeholder
    return [];
  }
  
  /**
   * Execute custom function
   */
  async executeFunction(functionName, parameters) {
    const handler = this.customFunctions.get(functionName);
    if (!handler) {
      throw new Error(`Function '${functionName}' not found`);
    }
    return handler(parameters);
  }
  
  /**
   * Format output
   */
  async formatOutput(data, definition, format = 'json') {
    const timestamp = Date.now();
    const fileName = `${definition.name}_${timestamp}`;
    let filePath, size, downloadUrl;
    
    switch (format) {
      case 'json':
        filePath = path.join(reportConfig.storage.path, `${fileName}.json`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        break;
        
      case 'csv':
        filePath = path.join(reportConfig.storage.path, `${fileName}.csv`);
        const csv = this.convertToCSV(data, definition.columns);
        await fs.writeFile(filePath, csv, 'utf8');
        break;
        
      case 'pdf':
        // Would use PDF generator
        filePath = path.join(reportConfig.storage.path, `${fileName}.pdf`);
        await fs.writeFile(filePath, 'PDF placeholder');
        break;
        
      case 'excel':
        // Would use excel library
        filePath = path.join(reportConfig.storage.path, `${fileName}.xlsx`);
        await fs.writeFile(filePath, 'Excel placeholder');
        break;
    }
    
    const stats = await fs.stat(filePath);
    size = stats.size;
    downloadUrl = `/api/reports/download/${path.basename(filePath)}`;
    
    return { filePath, size, downloadUrl };
  }
  
  /**
   * Convert to CSV
   */
  convertToCSV(data, columns) {
    if (!data.length) return '';
    
    const headers = columns.map(c => c.label).join(',');
    const rows = data.map(row => 
      columns.map(col => {
        let value = row[col.field];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }
  
  /**
   * Get execution history
   */
  async getHistory(reportName = null, limit = 50) {
    const filter = reportName ? { reportName } : {};
    return this.ReportExecution.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);
  }
  
  /**
   * Get scheduled reports
   */
  async getScheduledReports() {
    // Would integrate with scheduler
    return [];
  }
  
  /**
   * Schedule report
   */
  async scheduleReport(reportName, schedule, parameters = {}) {
    // Would integrate with scheduler
    return { scheduled: true, reportName, schedule };
  }
  
  /**
   * Cleanup old reports
   */
  async cleanup() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - reportConfig.storage.retention);
    
    const oldExecutions = await this.ReportExecution.find({
      createdAt: { $lt: cutoff },
      filePath: { $exists: true },
    });
    
    for (const execution of oldExecutions) {
      try {
        await fs.unlink(execution.filePath);
      } catch (e) {}
    }
    
    await this.ReportExecution.deleteMany({
      createdAt: { $lt: cutoff },
    });
    
    console.log(`🧹 Cleaned up ${oldExecutions.length} old reports`);
  }
}

// Singleton instance
const reportService = new ReportService();

/**
 * Report Categories
 */
const reportCategories = {
  sales: { name: 'sales', label: 'المبيعات', icon: 'chart-line' },
  inventory: { name: 'inventory', label: 'المخزون', icon: 'boxes' },
  finance: { name: 'finance', label: 'المالية', icon: 'money-bill' },
  hr: { name: 'hr', label: 'الموارد البشرية', icon: 'users' },
  customers: { name: 'customers', label: 'العملاء', icon: 'user-friends' },
  operations: { name: 'operations', label: 'العمليات', icon: 'cogs' },
  compliance: { name: 'compliance', label: 'الامتثال', icon: 'shield-alt' },
};

module.exports = {
  ReportService,
  reportService,
  reportConfig,
  reportCategories,
};