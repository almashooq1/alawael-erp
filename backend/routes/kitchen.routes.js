/**
 * Kitchen / Meals Routes — مسارات المطبخ والوجبات
 *
 * Endpoints:
 *   /api/kitchen/menu-items      — CRUD for menu items
 *   /api/kitchen/daily-menus     — Daily menu planning
 *   /api/kitchen/meal-service    — Meal service records
 *   /api/kitchen/inventory       — Kitchen inventory
 *   /api/kitchen/dashboard       — Kitchen dashboard stats
 */

const express = require('express');
const router = express.Router();
const { MenuItem, DailyMenu, MealService, KitchenInventory } = require('../models/kitchen.model');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');
const { authenticate } = require('../middleware/auth');

// All kitchen routes require authentication
router.use(authenticate);

// ── Field whitelists ────────────────────────────────────────────────────────
const pick = (obj, keys) => Object.fromEntries(keys.filter(k => k in obj).map(k => [k, obj[k]]));

const MENU_ITEM_FIELDS = [
  'name',
  'category',
  'description',
  'ingredients',
  'nutritionalInfo',
  'allergens',
  'dietaryTags',
  'preparationTime',
  'servingSize',
  'isActive',
  'price',
];
const DAILY_MENU_FIELDS = [
  'date',
  'meals',
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
  'notes',
  'isPublished',
];
const MEAL_SERVICE_FIELDS = [
  'date',
  'mealType',
  'menu',
  'beneficiaries',
  'servedCount',
  'notes',
  'feedback',
  'servedBy',
];
const INVENTORY_FIELDS = [
  'item',
  'name',
  'category',
  'quantity',
  'unit',
  'minimumStock',
  'supplier',
  'unitPrice',
  'expiryDate',
  'notes',
];

// ═══════════════════════════════════════════════════════════════════════════
// MENU ITEMS — عناصر القائمة
// ═══════════════════════════════════════════════════════════════════════════

router.get('/menu-items', async (req, res) => {
  try {
    const {
      category,
      dietaryTag,
      allergenFree,
      isActive,
      search,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (dietaryTag) filter.dietaryTags = dietaryTag;
    if (allergenFree) filter.allergens = { $nin: allergenFree.split(',') };
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { 'name.ar': { $regex: escapeRegex(search), $options: 'i' } },
        { 'name.en': { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [items, total] = await Promise.all([
      MenuItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
      MenuItem.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[Kitchen] Menu items list error:', error.message);
    res.status(500).json({ success: false });
  }
});

router.get('/menu-items/:id', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, error: 'عنصر القائمة غير موجود' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

router.post('/menu-items', async (req, res) => {
  try {
    const item = await MenuItem.create({
      ...pick(req.body, MENU_ITEM_FIELDS),
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false });
  }
});

router.put('/menu-items/:id', async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ success: false, error: 'عنصر القائمة غير موجود' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false });
  }
});

router.delete('/menu-items/:id', async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, error: 'عنصر القائمة غير موجود' });
    res.json({ success: true, message: 'تم إلغاء تفعيل عنصر القائمة' });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DAILY MENUS — قوائم الطعام اليومية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/daily-menus', async (req, res) => {
  try {
    const { startDate, endDate, status, center, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (status) filter.status = status;
    if (center) filter.center = center;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [menus, total] = await Promise.all([
      DailyMenu.find(filter)
        .populate('meals.breakfast.items meals.lunch.items meals.dinner.items')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      DailyMenu.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: menus,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[Kitchen] Daily menus list error:', error.message);
    res.status(500).json({ success: false });
  }
});

router.get('/daily-menus/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const menu = await DailyMenu.findOne({ date: { $gte: today, $lt: tomorrow } })
      .populate(
        'meals.breakfast.items meals.lunch.items meals.dinner.items meals.morningSnack.items meals.afternoonSnack.items'
      )
      .populate('specialDiets.beneficiary', 'name')
      .lean();

    if (!menu) return res.json({ success: true, data: null, message: 'لا توجد قائمة طعام لليوم' });
    res.json({ success: true, data: menu });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

router.post('/daily-menus', async (req, res) => {
  try {
    const menu = await DailyMenu.create({
      ...pick(req.body, DAILY_MENU_FIELDS),
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: menu });
  } catch (error) {
    res.status(400).json({ success: false });
  }
});

router.put('/daily-menus/:id', async (req, res) => {
  try {
    const menu = await DailyMenu.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!menu) return res.status(404).json({ success: false, error: 'القائمة اليومية غير موجودة' });
    res.json({ success: true, data: menu });
  } catch (error) {
    res.status(400).json({ success: false });
  }
});

router.patch('/daily-menus/:id/approve', async (req, res) => {
  try {
    const menu = await DailyMenu.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user?._id },
      { new: true }
    );
    if (!menu) return res.status(404).json({ success: false, error: 'القائمة اليومية غير موجودة' });
    res.json({ success: true, data: menu, message: 'تمت الموافقة على القائمة' });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MEAL SERVICE RECORDS — سجلات خدمة الوجبات
// ═══════════════════════════════════════════════════════════════════════════

router.get('/meal-service', async (req, res) => {
  try {
    const { date, mealType, center, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    }
    if (mealType) filter.mealType = mealType;
    if (center) filter.center = center;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [records, total] = await Promise.all([
      MealService.find(filter)
        .populate('dailyMenu')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      MealService.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

router.post('/meal-service', async (req, res) => {
  try {
    const record = await MealService.create(pick(req.body, MEAL_SERVICE_FIELDS));
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(400).json({ success: false });
  }
});

router.put('/meal-service/:id', async (req, res) => {
  try {
    const record = await MealService.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!record) return res.status(404).json({ success: false, error: 'سجل الخدمة غير موجود' });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(400).json({ success: false });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// KITCHEN INVENTORY — مخزون المطبخ
// ═══════════════════════════════════════════════════════════════════════════

router.get('/inventory', async (req, res) => {
  try {
    const { category, lowStock, expiringSoon, center, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (center) filter.center = center;
    if (lowStock === 'true') filter.$expr = { $lte: ['$quantity', '$minStock'] };
    if (expiringSoon === 'true') {
      const week = new Date();
      week.setDate(week.getDate() + 7);
      filter.expiryDate = { $lte: week, $gte: new Date() };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [items, total] = await Promise.all([
      KitchenInventory.find(filter)
        .sort({ category: 1, item: 1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      KitchenInventory.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

router.get('/inventory/alerts', async (req, res) => {
  try {
    const now = new Date();
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);

    const [lowStock, expiringSoon, expired] = await Promise.all([
      KitchenInventory.find({ $expr: { $lte: ['$quantity', '$minStock'] } }).lean(),
      KitchenInventory.find({ expiryDate: { $gte: now, $lte: weekLater } }).lean(),
      KitchenInventory.find({ expiryDate: { $lt: now } }).lean(),
    ]);

    res.json({
      success: true,
      data: {
        lowStock: { count: lowStock.length, items: lowStock },
        expiringSoon: { count: expiringSoon.length, items: expiringSoon },
        expired: { count: expired.length, items: expired },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

router.post('/inventory', async (req, res) => {
  try {
    const item = await KitchenInventory.create({
      ...pick(req.body, INVENTORY_FIELDS),
      restockedBy: req.user?._id,
      lastRestocked: new Date(),
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false });
  }
});

router.put('/inventory/:id', async (req, res) => {
  try {
    const item = await KitchenInventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ success: false, error: 'عنصر المخزون غير موجود' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false });
  }
});

router.patch('/inventory/:id/restock', async (req, res) => {
  try {
    const { quantity } = req.body;
    const item = await KitchenInventory.findByIdAndUpdate(
      req.params.id,
      { $inc: { quantity }, lastRestocked: new Date(), restockedBy: req.user?._id },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, error: 'عنصر المخزون غير موجود' });
    res.json({ success: true, data: item, message: 'تم إعادة التخزين بنجاح' });
  } catch (error) {
    res.status(400).json({ success: false });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة تحكم المطبخ
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayMenu, menuItems, lowStock, todayServices] = await Promise.all([
      DailyMenu.findOne({ date: { $gte: today, $lt: tomorrow } }).lean(),
      MenuItem.countDocuments({ isActive: true }),
      KitchenInventory.countDocuments({ $expr: { $lte: ['$quantity', '$minStock'] } }),
      MealService.find({ date: { $gte: today, $lt: tomorrow } }).lean(),
    ]);

    const totalServed = todayServices.reduce((sum, s) => sum + (s.servingsServed || 0), 0);
    const totalWasted = todayServices.reduce((sum, s) => sum + (s.servingsWasted || 0), 0);

    res.json({
      success: true,
      data: {
        todayMenu: todayMenu ? todayMenu.status : 'no-menu',
        activeMenuItems: menuItems,
        lowStockAlerts: lowStock,
        todayMeals: {
          total: todayServices.length,
          served: totalServed,
          wasted: totalWasted,
          wastePercentage: totalServed > 0 ? ((totalWasted / totalServed) * 100).toFixed(1) : 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
