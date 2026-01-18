const mongoose = require('mongoose');

const rehabEquipmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Wheelchair, Sensory Kit, Tablet
    code: { type: String, unique: true }, // EQ-2024-001
    type: { type: String, enum: ['ASSET', 'CONSUMABLE', 'EDUCATIONAL_TOOL'], required: true },

    // Inventory
    quantityTotal: { type: Number, default: 0 },
    quantityAvailable: { type: Number, default: 0 },
    minThreshold: { type: Number, default: 5 }, // Low stock alert level

    // Asset Management
    condition: { type: String, enum: ['NEW', 'GOOD', 'NEEDS_MAINTENANCE', 'RETIRED'], default: 'GOOD' },
    lastMaintenanceDate: Date,
    nextMaintenanceDate: Date,

    // Assignment (Who has it?)
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // For Tablets/Tools

    location: { type: String }, // Room 1, Warehouse
  },
  { timestamps: true },
);

module.exports = mongoose.model('RehabEquipment', rehabEquipmentSchema);
