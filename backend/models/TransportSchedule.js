const mongoose = require('mongoose');

const transportScheduleSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true }, // "2026-01-16"
    direction: { type: String, enum: ['PICKUP', 'DROPOFF'], required: true },

    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }, // Optional override

    passengers: [
      {
        beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'BeneficiaryFile' },
        status: { type: String, enum: ['SCHEDULED', 'BOARDED', 'ARRIVED', 'ABSENT'], default: 'SCHEDULED' },
        boardedTime: Date,
        arrivedTime: Date,
        location: {
          // Where they got on/off
          lat: Number,
          lng: Number,
        },
      },
    ],

    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'], default: 'PENDING' },
  },
  { timestamps: true },
);

// Prevent dupes for same bus same time
transportScheduleSchema.index({ date: 1, vehicle: 1, direction: 1 }, { unique: true });

module.exports = mongoose.model('TransportSchedule', transportScheduleSchema);
