/**
 * Fleet Inspection Service - خدمة فحص المركبات
 */

const { FleetInspection, FleetInspectionTemplate } = require('../models/FleetInspection');
const _logger = require('../utils/logger');

class FleetInspectionService {
  // ─── Inspections ──────────────────────────────────────────────────

  static async create(data) {
    if (data.template) {
      const tmpl = await FleetInspectionTemplate.findById(data.template);
      if (tmpl && (!data.items || data.items.length === 0)) {
        data.items = tmpl.items.map(i => ({
          category: i.category,
          name: i.name,
          nameAr: i.nameAr,
          status: 'not_inspected',
        }));
      }
    }
    return FleetInspection.create(data);
  }

  static async getAll(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.vehicle) query.vehicle = filter.vehicle;
    if (filter.driver) query.driver = filter.driver;
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;
    if (filter.overallResult) query.overallResult = filter.overallResult;

    const [inspections, total] = await Promise.all([
      FleetInspection.find(query)
        .populate('vehicle', 'plateNumber make model')
        .populate('driver', 'name licenseNumber')
        .populate('inspector', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      FleetInspection.countDocuments(query),
    ]);
    return { inspections, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return FleetInspection.findById(id)
      .populate('vehicle', 'plateNumber make model year')
      .populate('driver', 'name licenseNumber phone')
      .populate('inspector', 'name email');
  }

  static async update(id, data) {
    return FleetInspection.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async startInspection(id, inspectorId) {
    return FleetInspection.findByIdAndUpdate(
      id,
      {
        status: 'in_progress',
        startedAt: new Date(),
        inspector: inspectorId,
      },
      { new: true }
    );
  }

  static async updateItem(inspectionId, itemId, itemData) {
    const inspection = await FleetInspection.findById(inspectionId);
    if (!inspection) return null;
    const item = inspection.items.id(itemId);
    if (!item) return null;
    Object.assign(item, itemData);
    if (itemData.status === 'fail' && !item.defectReported) {
      item.defectReported = true;
      inspection.defects.push({
        item: itemId,
        description: itemData.notes || `فشل: ${item.name}`,
        severity: itemData.severity || 'medium',
      });
    }
    await inspection.save();
    return inspection;
  }

  static async completeInspection(id) {
    const inspection = await FleetInspection.findById(id);
    if (!inspection) return null;
    inspection.status = 'completed';
    inspection.completedAt = new Date();
    const hasFailures = inspection.items.some(i => i.status === 'fail');
    const hasCritical = inspection.items.some(
      i => i.status === 'fail' && i.severity === 'critical'
    );
    if (hasCritical) inspection.overallResult = 'fail';
    else if (hasFailures) inspection.overallResult = 'conditional_pass';
    else inspection.overallResult = 'pass';
    await inspection.save();
    return inspection;
  }

  static async resolveDefect(inspectionId, defectId, resolution, resolvedBy) {
    const inspection = await FleetInspection.findById(inspectionId);
    if (!inspection) return null;
    const defect = inspection.defects.id(defectId);
    if (!defect) return null;
    defect.resolution = resolution;
    defect.resolvedAt = new Date();
    defect.resolvedBy = resolvedBy;
    await inspection.save();
    return inspection;
  }

  static async getVehicleHistory(vehicleId, limit = 20) {
    return FleetInspection.find({ vehicle: vehicleId, isActive: true })
      .populate('inspector', 'name')
      .sort({ completedAt: -1 })
      .limit(limit);
  }

  static async getStatistics(organization) {
    const match = { isActive: true };
    if (organization) match.organization = new (require('mongoose').Types.ObjectId)(organization);

    const stats = await FleetInspection.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          passed: { $sum: { $cond: [{ $eq: ['$overallResult', 'pass'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$overallResult', 'fail'] }, 1, 0] } },
          conditionalPass: {
            $sum: { $cond: [{ $eq: ['$overallResult', 'conditional_pass'] }, 1, 0] },
          },
          avgPassRate: { $avg: '$passRate' },
          totalDefects: { $sum: { $size: '$defects' } },
        },
      },
    ]);

    const byType = await FleetInspection.aggregate([
      { $match: match },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    return { summary: stats[0] || {}, byType };
  }

  // ─── Templates ────────────────────────────────────────────────────

  static async createTemplate(data) {
    return FleetInspectionTemplate.create(data);
  }

  static async getTemplates(organization) {
    const query = { isActive: true };
    if (organization) query.$or = [{ organization }, { isDefault: true }];
    return FleetInspectionTemplate.find(query).sort({ isDefault: -1, name: 1 });
  }

  static async getTemplateById(id) {
    return FleetInspectionTemplate.findById(id);
  }

  static async updateTemplate(id, data) {
    return FleetInspectionTemplate.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async deleteTemplate(id) {
    return FleetInspectionTemplate.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }
}

module.exports = FleetInspectionService;
