/**
 * DocumentListDialogs — Extracted dialog components from DocumentList
 * نوافذ الحوار المستخلصة من قائمة المستندات
 *
 * Contains: BulkEditDialog, PreviewDialog, EditDialog, DetailsDialog
 */
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Paper,
  Chip,
  Divider,
  Avatar,
  Alert,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Info as InfoIcon,
  LocalOffer as LocalOfferIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import documentService from 'services/documentService';
import { gradients, surfaceColors } from 'theme/palette';
import { CATEGORIES, getCategoryColor } from './documentListConstants';

// Filter out 'الكل' for dropdown usage
const CATEGORY_OPTIONS = CATEGORIES.filter(c => c !== 'الكل');

/* ─── Bulk Edit Dialog ─── */
export function BulkEditDialog({ dialogs, selection, onApply }) {
  return (
    <Dialog
      open={dialogs.bulkEditOpen}
      onClose={dialogs.closeBulkEdit}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          background: gradients.primary,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {dialogs.bulkEditType === 'tags' ? <LocalOfferIcon /> : <CategoryIcon />}
        تحرير جماعي
      </DialogTitle>
      <DialogContent sx={{ mt: 3 }}>
        {dialogs.bulkEditType === 'tags' ? (
          <TextField
            label="الوسوم الجديدة (مفصولة بفواصل)"
            value={dialogs.bulkEditTagsInput}
            onChange={e => dialogs.setBulkEditTagsInput(e.target.value)}
            fullWidth
            placeholder="وسم1, وسم2, وسم3"
          />
        ) : (
          <FormControl fullWidth>
            <InputLabel>الفئة الجديدة</InputLabel>
            <Select
              value={dialogs.bulkEditCategory}
              onChange={e => dialogs.setBulkEditCategory(e.target.value)}
              label="الفئة الجديدة"
            >
              {CATEGORY_OPTIONS.map(cat => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          سيتم تطبيق التغييرات على العناصر المحددة ({selection.selected.length}).
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={dialogs.closeBulkEdit} variant="outlined" sx={{ borderRadius: 2 }}>
          إلغاء
        </Button>
        <Button
          onClick={onApply}
          variant="contained"
          disabled={
            (dialogs.bulkEditType === 'tags' && !dialogs.bulkEditTagsInput.trim()) ||
            (dialogs.bulkEditType === 'category' && !dialogs.bulkEditCategory)
          }
          sx={{ borderRadius: 2, background: gradients.primary }}
        >
          تطبيق
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── Preview Dialog ─── */
export function PreviewDialog({ dialogs, actions }) {
  return (
    <Dialog
      open={dialogs.previewOpen}
      onClose={dialogs.closePreview}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          background: gradients.primary,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <VisibilityIcon />
        معاينة سريعة
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {dialogs.selectedDoc ? (
          (() => {
            const previewUrl = documentService.getPreviewUrl
              ? documentService.getPreviewUrl(dialogs.selectedDoc._id)
              : null;
            const isImage = (dialogs.selectedDoc.fileType || '').startsWith('image');
            const isPdf = (dialogs.selectedDoc.fileType || '').toLowerCase().includes('pdf');
            if (previewUrl) {
              if (isImage) {
                return (
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      component="img"
                      src={previewUrl}
                      alt={dialogs.selectedDoc.title || dialogs.selectedDoc.originalFileName}
                      sx={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 2 }}
                    />
                  </Box>
                );
              }
              if (isPdf) {
                return (
                  <Box sx={{ height: '70vh' }}>
                    <iframe
                      title="document-preview"
                      src={previewUrl}
                      style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                    />
                  </Box>
                );
              }
              return (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  لا تتوفر معاينة مدمجة لهذا النوع. يمكنك تنزيل الملف لعرضه.
                </Alert>
              );
            }
            return (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                المعاينة غير متاحة. حاول فتح التفاصيل أو تنزيل الملف.
              </Alert>
            );
          })()
        ) : (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            اختر مستنداً للمعاينة.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={dialogs.closePreview} variant="outlined" sx={{ borderRadius: 2 }}>
          إغلاق
        </Button>
        {dialogs.selectedDoc && (
          <Button
            onClick={() => {
              actions.handleDownload(dialogs.selectedDoc);
              dialogs.closePreview();
            }}
            variant="contained"
            startIcon={<DownloadIcon />}
            sx={{ borderRadius: 2, background: gradients.primary }}
          >
            تنزيل المستند
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

/* ─── Edit Dialog ─── */
export function EditDialog({ dialogs, actions, onRefresh }) {

  return (
    <Dialog
      open={dialogs.editOpen}
      onClose={dialogs.closeEdit}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          background: gradients.primary,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <EditIcon />
        تحرير المستند
      </DialogTitle>
      <DialogContent sx={{ mt: 3 }}>
        <Stack spacing={3}>
          <TextField
            label="العنوان"
            value={dialogs.editForm.title}
            onChange={e => dialogs.setEditForm({ ...dialogs.editForm, title: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="الوصف"
            value={dialogs.editForm.description}
            onChange={e =>
              dialogs.setEditForm({ ...dialogs.editForm, description: e.target.value })
            }
            fullWidth
            multiline
            rows={3}
          />
          <FormControl fullWidth>
            <InputLabel>الفئة</InputLabel>
            <Select
              value={dialogs.editForm.category}
              onChange={e =>
                dialogs.setEditForm({ ...dialogs.editForm, category: e.target.value })
              }
              label="الفئة"
            >
              {CATEGORY_OPTIONS.map(cat => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="الوسوم (مفصولة بفواصل)"
            value={dialogs.editForm.tags.join(', ')}
            onChange={e =>
              dialogs.setEditForm({
                ...dialogs.editForm,
                tags: e.target.value.split(',').map(t => t.trim()),
              })
            }
            fullWidth
            placeholder="وسم1, وسم2, وسم3"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={dialogs.closeEdit} variant="outlined" sx={{ borderRadius: 2 }}>
          إلغاء
        </Button>
        <Button
          onClick={async () => {
            try {
              actions.setLoading(true);
              if (!dialogs.selectedDoc?._id) throw new Error('معرّف المستند غير متوفر');
              await documentService.updateDocument(dialogs.selectedDoc._id, {
                title: dialogs.editForm.title,
                description: dialogs.editForm.description,
                category: dialogs.editForm.category,
                tags: dialogs.editForm.tags,
              });
              actions.showMessage('✅ تم تحديث المستند بنجاح');
              dialogs.closeEdit();
              if (onRefresh) onRefresh();
            } catch (error) {
              actions.showMessage('❌ خطأ في تحديث المستند: ' + error.message, 'error');
            } finally {
              actions.setLoading(false);
            }
          }}
          variant="contained"
          disabled={!dialogs.editForm.title}
          sx={{ borderRadius: 2, background: gradients.primary }}
        >
          حفظ التغييرات
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── Details Dialog ─── */
export function DetailsDialog({ dialogs, actions }) {
  const doc = dialogs.selectedDoc;

  return (
    <Dialog
      open={dialogs.detailsOpen}
      onClose={dialogs.closeDetails}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, boxShadow: 24 } }}
    >
      <DialogTitle
        sx={{
          background: gradients.primary,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <InfoIcon />
        تفاصيل المستند
      </DialogTitle>
      <DialogContent sx={{ mt: 3 }}>
        {doc && (
          <Stack spacing={3}>
            {/* معلومات أساسية */}
            <Paper elevation={0} sx={{ p: 2, backgroundColor: surfaceColors.brandTint, borderRadius: 2 }}>
              <Typography variant="overline" color="primary" sx={{ fontWeight: 600 }}>
                المعلومات الأساسية
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    📌 العنوان
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {doc.title}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    📝 الوصف
                  </Typography>
                  <Typography variant="body2">
                    {doc.description || 'لا يوجد وصف'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      📁 الفئة
                    </Typography>
                    <Chip
                      label={doc.category}
                      color={getCategoryColor(doc.category)}
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      💾 الحجم
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {documentService.formatFileSize(doc.fileSize)}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Paper>

            {/* معلومات الملف */}
            <Paper elevation={0} sx={{ p: 2, backgroundColor: surfaceColors.warningTint, borderRadius: 2 }}>
              <Typography variant="overline" color="warning.main" sx={{ fontWeight: 600 }}>
                معلومات الملف
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      📎 اسم الملف
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {doc.originalFileName}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      📅 تاريخ التحميل
                    </Typography>
                    <Typography variant="body2">
                      {new Date(doc.createdAt).toLocaleString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Paper>

            {/* معلومات المستخدم */}
            <Paper elevation={0} sx={{ p: 2, backgroundColor: surfaceColors.infoTint, borderRadius: 2 }}>
              <Typography variant="overline" color="info.main" sx={{ fontWeight: 600 }}>
                معلومات المستخدم
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    background: gradients.primary,
                    fontSize: '20px',
                    fontWeight: 600,
                  }}
                >
                  {doc.uploadedByName?.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {doc.uploadedByName}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {doc.uploadedByEmail || 'محمّل المستند'}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* الوسوم */}
            {doc.tags && doc.tags.length > 0 && (
              <Paper elevation={0} sx={{ p: 2, backgroundColor: surfaceColors.successTint, borderRadius: 2 }}>
                <Typography variant="overline" color="success.main" sx={{ fontWeight: 600 }}>
                  🏷️ الوسوم
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {doc.tags.map((tag, idx) => (
                    <Chip key={idx} label={tag} size="small" variant="outlined" color="success" />
                  ))}
                </Box>
              </Paper>
            )}

            {/* الإحصائيات */}
            <Paper elevation={0} sx={{ p: 2, backgroundColor: surfaceColors.pinkTint, borderRadius: 2 }}>
              <Typography variant="overline" color="error.main" sx={{ fontWeight: 600 }}>
                📊 الإحصائيات
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                    {doc.viewCount || 0}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    👁️ مشاهدة
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                    {doc.downloadCount || 0}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    📥 تنزيل
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={dialogs.closeDetails} variant="outlined" sx={{ borderRadius: 2 }}>
          إغلاق
        </Button>
        <Button
          onClick={() => {
            actions.handleDownload(doc);
            dialogs.closeDetails();
          }}
          variant="contained"
          startIcon={<DownloadIcon />}
          sx={{ borderRadius: 2, background: gradients.primary }}
        >
          تنزيل المستند
        </Button>
      </DialogActions>
    </Dialog>
  );
}
