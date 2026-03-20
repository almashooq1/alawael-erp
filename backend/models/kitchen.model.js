/**
 * Kitchen / Meals Model — نموذج المطبخ والوجبات
 *
 * Manages:
 *  - Menu planning (تخطيط القوائم)
 *  - Meal preparation tracking (تتبع تحضير الوجبات)
 *  - Dietary requirements (المتطلبات الغذائية)
 *  - Kitchen inventory (مخزون المطبخ)
 *  - Nutrition tracking (تتبع التغذية)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Menu Item ───────────────────────────────────────────────────────────────

const menuItemSchema = new Schema(
  {
    name: { ar: { type: String, required: true }, en: String },
    description: { ar: String, en: String },
    category: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack', 'drink', 'dessert', 'special'],
      required: true,
    },
    ingredients: [
      {
        name: { type: String, required: true },
        quantity: Number,
        unit: String,
        allergen: { type: Boolean, default: false },
      },
    ],
    allergens: [
      {
        type: String,
        enum: ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'fish', 'shellfish', 'sesame', 'other'],
      },
    ],
    dietaryTags: [
      {
        type: String,
        enum: [
          'halal',
          'vegetarian',
          'vegan',
          'gluten-free',
          'dairy-free',
          'nut-free',
          'sugar-free',
          'low-sodium',
          'high-protein',
          'soft-texture',
          'pureed',
        ],
      },
    ],
    nutritionInfo: {
      calories: Number,
      protein: Number, // grams
      carbs: Number,
      fat: Number,
      fiber: Number,
      sugar: Number,
    },
    preparationTime: Number, // minutes
    servingSize: String,
    image: String,
    isActive: { type: Boolean, default: true },
    cost: { type: Number, default: 0 }, // cost per serving (SAR)
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ─── Daily Menu Plan ─────────────────────────────────────────────────────────

const dailyMenuSchema = new Schema(
  {
    date: { type: Date, required: true },
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    meals: {
      breakfast: {
        items: [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }],
        servingTime: String, // e.g. "07:30"
        notes: String,
      },
      morningSnack: {
        items: [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }],
        servingTime: String,
        notes: String,
      },
      lunch: {
        items: [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }],
        servingTime: String,
        notes: String,
      },
      afternoonSnack: {
        items: [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }],
        servingTime: String,
        notes: String,
      },
      dinner: {
        items: [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }],
        servingTime: String,
        notes: String,
      },
    },
    specialDiets: [
      {
        beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
        dietType: String,
        substitutions: [{ original: String, replacement: String }],
        notes: String,
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'approved', 'in-preparation', 'served', 'cancelled'],
      default: 'draft',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

dailyMenuSchema.index({ date: 1, center: 1 }, { unique: true });
dailyMenuSchema.index({ status: 1, date: 1 });

// ─── Meal Service Record ─────────────────────────────────────────────────────

const mealServiceSchema = new Schema(
  {
    dailyMenu: { type: Schema.Types.ObjectId, ref: 'DailyMenu', required: true },
    mealType: {
      type: String,
      enum: ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'],
      required: true,
    },
    date: { type: Date, required: true },
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    servingsPlanned: { type: Number, default: 0 },
    servingsServed: { type: Number, default: 0 },
    servingsWasted: { type: Number, default: 0 },
    attendees: [
      {
        beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
        served: { type: Boolean, default: false },
        specialMeal: { type: Boolean, default: false },
        notes: String,
      },
    ],
    temperature: {
      hot: Number, // °C at time of serving
      cold: Number,
      checkedAt: Date,
      checkedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    qualityCheck: {
      passed: { type: Boolean, default: true },
      checkedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      notes: String,
    },
    preparedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    servedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    notes: String,
  },
  { timestamps: true }
);

mealServiceSchema.index({ date: 1, mealType: 1, center: 1 });

// ─── Kitchen Inventory ───────────────────────────────────────────────────────

const kitchenInventorySchema = new Schema(
  {
    item: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'meat',
        'poultry',
        'fish',
        'dairy',
        'grains',
        'vegetables',
        'fruits',
        'spices',
        'oils',
        'beverages',
        'frozen',
        'canned',
        'dry-goods',
        'cleaning',
        'equipment',
        'other',
      ],
    },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true }, // kg, liters, pieces, boxes
    minStock: { type: Number, default: 0 },
    expiryDate: Date,
    supplier: String,
    cost: Number, // per unit (SAR)
    storageLocation: String,
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    lastRestocked: Date,
    restockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

kitchenInventorySchema.index({ center: 1, item: 1 });
kitchenInventorySchema.index({ expiryDate: 1 });
kitchenInventorySchema.index({ quantity: 1, minStock: 1 }); // low-stock alerts

// ─── Exports ─────────────────────────────────────────────────────────────────

const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema);
const DailyMenu = mongoose.models.DailyMenu || mongoose.model('DailyMenu', dailyMenuSchema);
const MealService = mongoose.models.MealService || mongoose.model('MealService', mealServiceSchema);
const KitchenInventory =
  mongoose.models.KitchenInventory || mongoose.model('KitchenInventory', kitchenInventorySchema);

module.exports = { MenuItem, DailyMenu, MealService, KitchenInventory };
