/**
 * FileFolder Model — نموذج مجلدات الملفات
 * Rehab-ERP v2.0
 */

const mongoose = require('mongoose');

const fileFolderSchema = new mongoose.Schema(
  {
    name_ar: { type: String, required: true, trim: true },
    name_en: { type: String, trim: true },
    description: { type: String },
    color: { type: String, default: '#3B82F6' }, // لون المجلد للتمييز البصري
    icon: { type: String, default: 'folder' },

    parent_folder_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FileFolder' },
    path: { type: String }, // /root/HR/Contracts

    // الصلاحيات
    access_level: {
      type: String,
      enum: ['public', 'internal', 'restricted', 'confidential'],
      default: 'internal',
    },
    allowed_roles: [{ type: String }],
    allowed_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // الإحصاءات
    files_count: { type: Number, default: 0 },
    subfolders_count: { type: Number, default: 0 },
    total_size: { type: Number, default: 0 }, // bytes

    is_system: { type: Boolean, default: false }, // مجلدات النظام لا تُحذف
    is_active: { type: Boolean, default: true },

    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

fileFolderSchema.index({ parent_folder_id: 1 });
fileFolderSchema.index({ branch_id: 1, is_active: 1 });
fileFolderSchema.index({ deleted_at: 1 });

module.exports = mongoose.model('FileFolder', fileFolderSchema);
