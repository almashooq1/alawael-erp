/**
 * MediaAlbum Model — نموذج ألبومات الوسائط
 *
 * Albums / folders for organizing media files
 */

const mongoose = require('mongoose');

const mediaAlbumSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'اسم الألبوم مطلوب'], trim: true },
    description: { type: String, trim: true, default: '' },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    coverImage: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parentAlbum: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAlbum', default: null },
    color: { type: String, default: '#1976d2' },
    icon: { type: String, default: 'folder' },
    visibility: {
      type: String,
      enum: ['public', 'private', 'restricted'],
      default: 'public',
    },
    status: {
      type: String,
      enum: ['نشط', 'مؤرشف', 'محذوف'],
      default: 'نشط',
    },
    mediaCount: { type: Number, default: 0 },
    totalSize: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'media_albums',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

mediaAlbumSchema.index({ createdBy: 1, status: 1 });
mediaAlbumSchema.index({ parentAlbum: 1 });

// Auto-generate slug from name
mediaAlbumSchema.pre('save', async function () {
  if (this.isNew || this.isModified('name')) {
    this.slug =
      this.name
        .replace(/\s+/g, '-')
        .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '')
        .toLowerCase() +
      '-' +
      Date.now().toString(36);
  }
});

module.exports = mongoose.models.MediaAlbum || mongoose.model('MediaAlbum', mediaAlbumSchema);
