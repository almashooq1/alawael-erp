/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * FIXED ASSETS CONTROLLER - متحكم الأصول الثابتة
 * ===================================================================
 */

const FixedAsset = require('../models/FixedAsset');
const { escapeRegex, stripDangerousKeys } = require('../utils/sanitize');

// الحصول على جميع الأصول
exports.getAllAssets = async (req, res) => {
  const { category, status, department, search, page = 1, limit = 50 } = req.query;

  const filter = {};

  if (category) filter.category = category;
  if (status) filter.status = status;
  if (department) filter.department = department;
  if (search) {
    filter.$or = [
      { name: { $regex: escapeRegex(search), $options: 'i' } },
      { code: { $regex: escapeRegex(search), $options: 'i' } },
      { serialNumber: { $regex: escapeRegex(search), $options: 'i' } },
    ];
  }

  const assets = await FixedAsset.find(filter)
    .populate('department branch responsiblePerson')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort('-purchaseDate');

  const count = await FixedAsset.countDocuments(filter);

  res.json({
    success: true,
    data: assets,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    total: count,
  });
};

// إنشاء أصل جديد
exports.createAsset = async (req, res) => {
  const assetData = {
    ...stripDangerousKeys(req.body),
    createdBy: req.user._id,
  };

  const asset = await FixedAsset.create(assetData);

  res.status(201).json({
    success: true,
    data: asset,
    message: 'تم إضافة الأصل بنجاح',
  });
};

// تحديث أصل
exports.updateAsset = async (req, res) => {
  const asset = await FixedAsset.findById(req.params.id);

  if (!asset) {
    return res.status(404).json({
      success: false,
      message: 'الأصل غير موجود',
    });
  }

  Object.assign(asset, stripDangerousKeys(req.body));
  asset.updatedBy = req.user._id;
  await asset.save();

  res.json({
    success: true,
    data: asset,
    message: 'تم تحديث الأصل بنجاح',
  });
};

// تسجيل الإهلاك
exports.recordDepreciation = async (req, res) => {
  const asset = await FixedAsset.findById(req.params.id);

  if (!asset) {
    return res.status(404).json({
      success: false,
      message: 'الأصل غير موجود',
    });
  }

  const amount = req.body.amount || asset.calculateAnnualDepreciation();
  const journalEntry = await asset.recordDepreciation(amount, req.body.date);

  res.json({
    success: true,
    data: { asset, journalEntry },
    message: 'تم تسجيل الإهلاك بنجاح',
  });
};

// تسجيل صيانة
exports.recordMaintenance = async (req, res) => {
  const asset = await FixedAsset.findById(req.params.id);

  if (!asset) {
    return res.status(404).json({
      success: false,
      message: 'الأصل غير موجود',
    });
  }

  await asset.recordMaintenance(req.body);

  res.json({
    success: true,
    data: asset,
    message: 'تم تسجيل الصيانة بنجاح',
  });
};

// التخلص من أصل
exports.disposeAsset = async (req, res) => {
  const asset = await FixedAsset.findById(req.params.id);

  if (!asset) {
    return res.status(404).json({
      success: false,
      message: 'الأصل غير موجود',
    });
  }

  const result = await asset.dispose(req.body);

  res.json({
    success: true,
    data: result,
    message: 'تم التخلص من الأصل بنجاح',
  });
};

// تقرير الإهلاك الشهري
exports.getDepreciationReport = async (req, res) => {
  const { year, month } = req.query;

  const report = await FixedAsset.getMonthlyDepreciationReport(parseInt(year), parseInt(month));

  res.json({
    success: true,
    data: report,
  });
};

// الأصول المستحقة للصيانة
exports.getDueForMaintenance = async (req, res) => {
  const { daysAhead = 30 } = req.query;

  const assets = await FixedAsset.getDueForMaintenance(parseInt(daysAhead));

  res.json({
    success: true,
    data: assets,
    count: assets.length,
  });
};

// الحصول على أصل واحد
exports.getAssetById = async (req, res) => {
  const asset = await FixedAsset.findById(req.params.id).populate(
    'department branch responsiblePerson'
  );

  if (!asset) {
    return res.status(404).json({
      success: false,
      message: 'الأصل غير موجود',
    });
  }

  res.json({
    success: true,
    data: asset,
  });
};

// حذف أصل
exports.deleteAsset = async (req, res) => {
  const asset = await FixedAsset.findById(req.params.id);

  if (!asset) {
    return res.status(404).json({
      success: false,
      message: 'الأصل غير موجود',
    });
  }

  await asset.remove();

  res.json({
    success: true,
    message: 'تم حذف الأصل بنجاح',
  });
};

// إهلاك جماعي
exports.bulkDepreciation = async (req, res) => {
  const { assetIds, date } = req.body;

  const results = [];

  for (const assetId of assetIds) {
    const asset = await FixedAsset.findById(assetId);
    if (asset) {
      const amount = asset.calculateAnnualDepreciation();
      const journalEntry = await asset.recordDepreciation(amount, date);
      results.push({
        assetId,
        assetName: asset.name,
        amount,
        journalEntryId: journalEntry._id,
      });
    }
  }

  res.json({
    success: true,
    data: results,
    count: results.length,
    message: 'تم تسجيل الإهلاك بنجاح',
  });
};

// سجل الصيانة
exports.getMaintenanceHistory = async (req, res) => {
  const asset = await FixedAsset.findById(req.params.id);

  if (!asset) {
    return res.status(404).json({
      success: false,
      message: 'الأصل غير موجود',
    });
  }

  res.json({
    success: true,
    data: asset.maintenanceHistory,
  });
};

// الإحصائيات
exports.getStats = async (req, res) => {
  const totalAssets = await FixedAsset.countDocuments({ isActive: true });
  const activeAssets = await FixedAsset.countDocuments({ status: 'active' });

  const assetsByCategory = await FixedAsset.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 }, totalValue: { $sum: '$purchaseCost' } } },
  ]);

  const totalValue = await FixedAsset.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, total: { $sum: '$purchaseCost' } } },
  ]);

  res.json({
    success: true,
    data: {
      totalAssets,
      activeAssets,
      assetsByCategory,
      totalValue: totalValue[0]?.total || 0,
    },
  });
};

// حسب الفئة
exports.getByCategory = async (req, res) => {
  const { category } = req.query;

  const assets = await FixedAsset.getByCategory(category);

  res.json({
    success: true,
    data: assets,
    count: assets.length,
  });
};

// الضمانات المنتهية
exports.getExpiredWarranties = async (req, res) => {
  const assets = await FixedAsset.getExpiredWarranties();

  res.json({
    success: true,
    data: assets,
    count: assets.length,
  });
};

module.exports = exports;
