/**
 * QualityMeasurement Model — نموذج قياسات الجودة الفعلية
 * Rehab-ERP v2.0
 */

const mongoose = require('mongoose');

const qualityMeasurementSchema = new mongoose.Schema(
  {
    measurement_number: { type: String, unique: true }, // QM-YYYY-XXXXXX
    indicator_id: { type: mongoose.Schema.Types.ObjectId, ref: 'QualityIndicator', required: true },

    period_type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'],
      required: true,
    },
    period_label: { type: String }, // '2026-Q1', '2026-01'
    period_start: { type: Date, required: true },
    period_end: { type: Date, required: true },

    actual_value: { type: Number, required: true },
    target_value: { type: Number },
    numerator: { type: Number }, // البسط
    denominator: { type: Number }, // المقام

    // التقييم
    performance_status: {
      type: String,
      enum: ['exceeded', 'met', 'approaching', 'not_met', 'critical'],
      default: 'not_met',
    },
    variance: { type: Number }, // الفرق عن الهدف
    variance_percentage: { type: Number },
    trend: { type: String, enum: ['improving', 'stable', 'declining'] },

    notes: { type: String },
    action_required: { type: Boolean, default: false },
    action_plan: { type: String },
    corrective_action_due: { type: Date },

    data_verified: { type: Boolean, default: false },
    verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verified_at: { type: Date },

    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    measured_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

qualityMeasurementSchema.pre('save', async function (next) {
  if (!this.measurement_number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('QualityMeasurement').countDocuments();
    this.measurement_number = `QM-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  // حساب الانحراف
  if (this.target_value && this.actual_value !== undefined) {
    this.variance = this.actual_value - this.target_value;
    this.variance_percentage =
      this.target_value !== 0 ? (this.variance / this.target_value) * 100 : 0;
  }
  next();
});

qualityMeasurementSchema.index({ indicator_id: 1, period_start: -1 });
qualityMeasurementSchema.index({ branch_id: 1, period_start: -1 });
qualityMeasurementSchema.index({ performance_status: 1 });
qualityMeasurementSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.QualityMeasurement ||
  mongoose.models.QualityMeasurement ||
  mongoose.model('QualityMeasurement', qualityMeasurementSchema);
