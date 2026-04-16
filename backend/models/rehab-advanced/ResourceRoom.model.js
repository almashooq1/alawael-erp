'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const resourceRoomSchema = new Schema(
  {
    room_id: {
      type: String,
      unique: true,
      default: () => `ROM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },

    room_info: {
      name: { type: String, required: true },
      code: String,
      building: String,
      floor: String,
      capacity: Number,
      area: Number, // بالمتر المربع
      room_type: {
        type: String,
        enum: [
          'therapy_room',
          'assessment_room',
          'group_room',
          'sensory_room',
          'gym',
          'pool',
          'classroom',
          'office',
          'conference',
        ],
      },
    },

    // المعدات المتوفرة
    equipment: [
      {
        equipment_id: { type: Schema.Types.ObjectId, ref: 'AssistiveEquipment' },
        name: String,
        quantity: Number,
        condition: String,
      },
    ],

    // الميزات الخاصة
    features: {
      wheelchair_accessible: { type: Boolean, default: true },
      sensory_equipment: { type: Boolean, default: false },
      sound_proofing: { type: Boolean, default: false },
      adjustable_lighting: { type: Boolean, default: false },
      ac: { type: Boolean, default: true },
      projector: { type: Boolean, default: false },
      whiteboard: { type: Boolean, default: true },
      computer: { type: Boolean, default: false },
      bathroom_attached: { type: Boolean, default: false },
    },

    // الجدول الزمني
    schedule: [
      {
        day: {
          type: String,
          enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        },
        time_slots: [
          {
            start_time: String,
            end_time: String,
            is_available: { type: Boolean, default: true },
            booking_id: String,
            purpose: String,
          },
        ],
      },
    ],

    // الحجوزات
    bookings: [
      {
        booking_id: String,
        date: Date,
        start_time: String,
        end_time: String,
        booked_by: { type: Schema.Types.ObjectId, ref: 'User' },
        purpose: String,
        beneficiaries_count: Number,
        status: { type: String, enum: ['booked', 'confirmed', 'cancelled', 'completed'] },
      },
    ],

    // الصيانة
    maintenance: [
      {
        date: Date,
        type: { type: String, enum: ['routine', 'repair', 'deep_clean', 'renovation'] },
        description: String,
        cost: Number,
        performed_by: String,
        next_maintenance: Date,
      },
    ],

    is_available: { type: Boolean, default: true },
    notes: String,
  },
  { timestamps: true }
);

resourceRoomSchema.index({ 'room_info.room_type': 1, is_available: 1 });

const ResourceRoom =
  mongoose.models.ResourceRoom || mongoose.model('ResourceRoom', resourceRoomSchema);

module.exports = ResourceRoom;
