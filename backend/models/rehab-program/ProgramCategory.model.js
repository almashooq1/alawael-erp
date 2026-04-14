'use strict';

const mongoose = require('mongoose');

const ProgramCategorySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      example: 'DAILY_LIVING',
    },

    nameAr: {
      type: String,
      required: true,
      trim: true,
    },

    nameEn: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    color: String,

    icon: String,

    isActive: {
      type: Boolean,
      default: true,
    },

    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'program_categories' }
);

const ProgramCategory =
  mongoose.models.ProgramCategory || mongoose.model('ProgramCategory', ProgramCategorySchema);

module.exports = ProgramCategory;
