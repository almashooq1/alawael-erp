/**
 * MediaViewer — عارض الوسائط
 *
 * Full-screen preview/details dialog for media files:
 *  - Image preview with zoom
 *  - Video player
 *  - Audio player
 *  - Document / archive icon display
 *  - File details panel (metadata, tags, activity)
 *  - Edit metadata
 *  - Download / favorite / delete actions
 */

import React, { useState } from 'react';
import {
  Dialog, DialogContent, Box, Typography, IconButton,
  Avatar, Chip, Button, Divider, Tooltip,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Slide,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Fullscreen as FullscreenIcon,
  Image as ImageIcon,
  Videocam as VideoIcon,
  AudioFile as AudioIcon,
  Description as DocIcon,
  Archive as ArchiveIcon,
  InsertDriveFile as FileIcon,
  Info as InfoIcon,
  Label as TagIcon,
  Visibility as ViewsIcon,
  CalendarMonth as DateIcon,
  Person as PersonIcon,
  FolderOpen as FolderIcon,
  Storage as SizeIcon,
} from '@mui/icons-material';
import {  statusColors, surfaceColors, neutralColors } from '../../theme/palette';
import mediaService from '../../services/mediaService';

const TYPE_CONFIG = {
  image: { label: 'صورة', icon: <ImageIcon />, color: '#2196f3' },
  video: { label: 'فيديو', icon: <VideoIcon />, color: '#f44336' },
  audio: { label: 'صوت', icon: <AudioIcon />, color: '#ff9800' },
  document: { label: 'مستند', icon: <DocIcon />, color: '#4caf50' },
  archive: { label: 'أرشيف', icon: <ArchiveIcon />, color: '#9c27b0' },
  other: { label: 'ملف', icon: <FileIcon />, color: '#607d8b' },
};

const CATEGORIES = [
  'عام', 'صور المؤسسة', 'صور الفعاليات', 'صور الموظفين',
  'فيديوهات تعليمية', 'فيديوهات توعوية', 'تسجيلات صوتية',
  'مستندات رسمية', 'عروض تقديمية', 'تصاميم', 'شعارات', 'أخرى',
];

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function MediaViewer({
  item,
  open,
  onClose,
  onFavorite,
  onDelete,
  onUpdate,
  showSnackbar,
}) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  if (!item) return null;

  const cfg = TYPE_CONFIG[item.mediaType] || TYPE_CONFIG.other;

  const startEdit = () => {
    setEditForm({
      title: item.title || '',
      description: item.description || '',
      alt: item.alt || '',
      category: item.category || 'عام',
      tags: (item.tags || []).join(', '),
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        alt: editForm.alt,
        category: editForm.category,
        tags: editForm.tags,
      };
      await mediaService.update(item._id, payload);
      if (showSnackbar) showSnackbar('تم تحديث البيانات بنجاح', 'success');
      if (onUpdate) onUpdate();
      setEditing(false);
    } catch {
      if (showSnackbar) showSnackbar('خطأ في تحديث البيانات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFavorite = () => { if (onFavorite) onFavorite(item._id); };
  const handleDelete = () => { if (onDelete) onDelete(item._id); onClose(); };
  const downloadUrl = mediaService.getDownloadUrl(item._id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      TransitionComponent={Transition}
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', maxHeight: '90vh' } }}
    >
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: 500 }}>
        {/* ═══ Preview Area ════════════════════════════════════════════ */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#000',
            position: 'relative',
            minHeight: { xs: 250, md: 400 },
          }}
        >
          {/* Close button */}
          <IconButton
            onClick={onClose}
            sx={{ position: 'absolute', top: 8, left: 8, color: '#fff', bgcolor: 'rgba(0,0,0,0.4)', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' }, zIndex: 2 }}
          >
            <CloseIcon />
          </IconButton>

          {/* Content */}
          {item.mediaType === 'image' && item.url ? (
            <Box
              component="img"
              src={item.url}
              alt={item.alt || item.title || item.originalName}
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          ) : item.mediaType === 'video' && item.url ? (
            <Box
              component="video"
              controls
              autoPlay={false}
              src={item.url}
              sx={{ maxWidth: '100%', maxHeight: '80vh' }}
            />
          ) : item.mediaType === 'audio' && item.url ? (
            <Box sx={{ p: 4, textAlign: 'center', width: '100%' }}>
              <Avatar sx={{ width: 100, height: 100, bgcolor: `${cfg.color}30`, color: cfg.color, mx: 'auto', mb: 3 }}>
                <AudioIcon sx={{ fontSize: 50 }} />
              </Avatar>
              <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>{item.title || item.originalName}</Typography>
              <Box component="audio" controls src={item.url} sx={{ width: '80%' }} />
            </Box>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Avatar sx={{ width: 100, height: 100, bgcolor: `${cfg.color}30`, color: cfg.color, mx: 'auto', mb: 2 }}>
                {React.cloneElement(cfg.icon, { sx: { fontSize: 50 } })}
              </Avatar>
              <Typography variant="h6" sx={{ color: '#fff' }}>{item.title || item.originalName}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
                {cfg.label} — {item.extension?.toUpperCase()}
              </Typography>
            </Box>
          )}
        </Box>

        {/* ═══ Details Sidebar ═════════════════════════════════════════ */}
        <Box sx={{ width: { xs: '100%', md: 340 }, p: 3, overflowY: 'auto', borderLeft: `1px solid ${surfaceColors.border}` }}>
          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mb: 2 }}>
            <Tooltip title="مفضلة">
              <IconButton onClick={handleFavorite}>
                {item.isFavorite ? <StarIcon sx={{ color: statusColors.warning }} /> : <StarBorderIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="تحميل">
              <IconButton component="a" href={downloadUrl} target="_blank"><DownloadIcon /></IconButton>
            </Tooltip>
            <Tooltip title={editing ? 'إلغاء التعديل' : 'تعديل'}>
              <IconButton onClick={() => editing ? setEditing(false) : startEdit()}>
                {editing ? <CancelIcon /> : <EditIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton sx={{ color: statusColors.error }} onClick={handleDelete}><DeleteIcon /></IconButton>
            </Tooltip>
          </Box>

          {editing ? (
            /* ─── Edit Form ──────────────────────────────────────── */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="العنوان" size="small" fullWidth
                value={editForm.title}
                onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
              />
              <TextField
                label="الوصف" size="small" fullWidth multiline rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
              />
              <TextField
                label="النص البديل (Alt)" size="small" fullWidth
                value={editForm.alt}
                onChange={(e) => setEditForm(f => ({ ...f, alt: e.target.value }))}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>التصنيف</InputLabel>
                <Select
                  value={editForm.category} label="التصنيف"
                  onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                label="الوسوم (بفاصلة)" size="small" fullWidth
                value={editForm.tags}
                onChange={(e) => setEditForm(f => ({ ...f, tags: e.target.value }))}
              />
              <Button
                variant="contained" fullWidth
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{ borderRadius: 2, mt: 1 }}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </Box>
          ) : (
            /* ─── Info Display ────────────────────────────────── */
            <Box>
              {/* Title */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                {item.title || item.originalName}
              </Typography>
              {item.description && (
                <Typography variant="body2" sx={{ color: neutralColors.textSecondary, mb: 2 }}>
                  {item.description}
                </Typography>
              )}

              <Divider sx={{ mb: 2 }} />

              {/* Info rows */}
              {[
                { icon: <InfoIcon sx={{ fontSize: 18 }} />, label: 'النوع', value: <Chip size="small" label={cfg.label} sx={{ bgcolor: `${cfg.color}15`, color: cfg.color, fontWeight: 600 }} /> },
                { icon: <SizeIcon sx={{ fontSize: 18 }} />, label: 'الحجم', value: item.formattedSize || mediaService.formatFileSize(item.fileSize) },
                { icon: <FileIcon sx={{ fontSize: 18 }} />, label: 'الصيغة', value: (item.extension || item.mimeType || '-').toUpperCase() },
                ...(item.width ? [{ icon: <FullscreenIcon sx={{ fontSize: 18 }} />, label: 'الأبعاد', value: `${item.width} × ${item.height}` }] : []),
                ...(item.duration ? [{ icon: <AudioIcon sx={{ fontSize: 18 }} />, label: 'المدة', value: `${Math.floor(item.duration / 60)}:${String(Math.round(item.duration % 60)).padStart(2, '0')}` }] : []),
                { icon: <FolderIcon sx={{ fontSize: 18 }} />, label: 'التصنيف', value: item.category || 'عام' },
                { icon: <PersonIcon sx={{ fontSize: 18 }} />, label: 'رفع بواسطة', value: item.uploadedBy?.name || '-' },
                { icon: <DateIcon sx={{ fontSize: 18 }} />, label: 'تاريخ الرفع', value: new Date(item.createdAt).toLocaleDateString('ar-SA') },
                { icon: <ViewsIcon sx={{ fontSize: 18 }} />, label: 'المشاهدات', value: item.viewCount || 0 },
              ].map((row, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ color: neutralColors.textSecondary }}>{row.icon}</Box>
                  <Typography variant="caption" sx={{ color: neutralColors.textSecondary, minWidth: 70 }}>
                    {row.label}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    {typeof row.value === 'string' || typeof row.value === 'number'
                      ? <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
                      : row.value}
                  </Box>
                </Box>
              ))}

              {/* Tags */}
              {item.tags?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <TagIcon sx={{ fontSize: 18, color: neutralColors.textSecondary }} />
                    <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>الوسوم</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {item.tags.map((tag, i) => (
                      <Chip key={i} label={tag} size="small" variant="outlined" sx={{ borderRadius: 1 }} />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Activity Log */}
              {item.activityLog?.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                    سجل النشاط
                  </Typography>
                  <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                    {item.activityLog.slice(-5).reverse().map((log, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, fontSize: '0.75rem' }}>
                        <Typography variant="caption" sx={{ color: neutralColors.textSecondary, whiteSpace: 'nowrap' }}>
                          {new Date(log.timestamp).toLocaleDateString('ar-SA')}
                        </Typography>
                        <Typography variant="caption">{log.action}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
