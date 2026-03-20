/**
 * نموذج الفصل / القاعة الدراسية
 * Classroom Model
 */
const mongoose = require('mongoose');

const ClassroomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم الفصل مطلوب'],
      trim: true,
    },
    nameEn: { type: String, trim: true },
    code: {
      type: String,
      required: [true, 'رمز الفصل مطلوب'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    building: { type: String, default: 'المبنى الرئيسي' },
    floor: { type: Number, default: 0 },
    roomNumber: { type: String },
    type: {
      type: String,
      enum: [
        'regular',
        'lab',
        'computer_lab',
        'library',
        'workshop',
        'therapy_room',
        'sensory_room',
        'auditorium',
        'gym',
        'art_room',
        'music_room',
        'prayer_room',
        'outdoor',
        'virtual',
      ],
      default: 'regular',
    },
    capacity: {
      type: Number,
      required: [true, 'سعة الفصل مطلوبة'],
      min: 1,
      max: 200,
    },
    currentOccupancy: { type: Number, default: 0, min: 0 },

    // ── Accessibility ──
    accessibility: {
      wheelchairAccessible: { type: Boolean, default: false },
      hasRamp: { type: Boolean, default: false },
      hasElevatorAccess: { type: Boolean, default: false },
      hasAdjustableFurniture: { type: Boolean, default: false },
      hasSoundSystem: { type: Boolean, default: false },
      hasVisualAlerts: { type: Boolean, default: false },
      hasSpecialLighting: { type: Boolean, default: false },
      hearingLoopInstalled: { type: Boolean, default: false },
    },

    // ── Equipment ──
    equipment: {
      hasProjector: { type: Boolean, default: false },
      hasSmartBoard: { type: Boolean, default: false },
      hasComputers: { type: Boolean, default: false },
      computerCount: { type: Number, default: 0 },
      hasAC: { type: Boolean, default: true },
      hasCameras: { type: Boolean, default: false },
      hasWhiteboard: { type: Boolean, default: true },
      otherEquipment: [{ type: String }],
    },

    // ── Assignment ──
    assignedTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    assignedGrade: { type: String },
    assignedSection: { type: String },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ── Status ──
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance', 'reserved', 'inactive'],
      default: 'available',
    },
    maintenanceNotes: { type: String },
    lastMaintenanceDate: { type: Date },
    color: { type: String, default: '#4caf50' },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

ClassroomSchema.index({ name: 'text', nameEn: 'text', code: 'text' });
ClassroomSchema.index({ type: 1, status: 1 });
ClassroomSchema.index({ building: 1, floor: 1 });
ClassroomSchema.index({ academicYear: 1, assignedGrade: 1 });

module.exports = mongoose.model('Classroom', ClassroomSchema);
