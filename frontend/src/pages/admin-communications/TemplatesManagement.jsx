/**
 * Correspondence Templates Management — إدارة قوالب المراسلات
 */
import { useState, useEffect, useCallback } from 'react';




import adminCommunicationsService from '../../services/adminCommunications.service';
import { CORRESPONDENCE_TYPES } from './constants';

export default function TemplatesManagement() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    nameAr: '',
    type: 'official_letter',
    subject: '',
    content: '',
    category: '',
    placeholders: [],
    headerTemplate: '',
    footerTemplate: '',
  });

  // ─── Fetch ───────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminCommunicationsService.getTemplates(typeFilter || undefined);
      setTemplates(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('فشل في تحميل القوالب');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ─── Filtered templates ──────────────────────────────
  const filtered = templates.filter((t) => {
    if (!searchInput) return true;
    const q = searchInput.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.nameAr?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q)
    );
  });

  // ─── Handlers ────────────────────────────────────────
  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setForm({
      name: '',
      nameAr: '',
      type: 'official_letter',
      subject: '',
      content: '',
      category: '',
      placeholders: [],
      headerTemplate: '',
      footerTemplate: '',
    });
    setDialogOpen(true);
  };

  const handlePreview = (template) => {
    setSelectedTemplate(template);
    setPreviewDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.nameAr.trim() || !form.content.trim()) {
      setError('يرجى ملء الحقول المطلوبة');
      return;
    }

    try {
      await adminCommunicationsService.createTemplate(form);
      setDialogOpen(false);
      setSnackbar({ open: true, message: 'تم إنشاء القالب بنجاح', severity: 'success' });
      fetchTemplates();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'فشل في حفظ القالب',
        severity: 'error',
      });
    }
  };

  // Add a placeholder
  const addPlaceholder = () => {
    setForm((prev) => ({
      ...prev,
      placeholders: [
        ...prev.placeholders,
        { name: '', description: '', defaultValue: '' },
      ],
    }));
  };

  const updatePlaceholder = (idx, field, value) => {
    setForm((prev) => {
      const updated = [...prev.placeholders];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, placeholders: updated };
    });
  };

  const removePlaceholder = (idx) => {
    setForm((prev) => ({
      ...prev,
      placeholders: prev.placeholders.filter((_, i) => i !== idx),
    }));
  };

  const typeOptions = Object.entries(CORRESPONDENCE_TYPES).map(([key, val]) => ({
    value: key,
    label: val.label,
  }));

  // ─── Render ──────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            قوالب المراسلات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة وإنشاء قوالب المراسلات الإدارية
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
          قالب جديد
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="بحث في القوالب..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع المراسلة</InputLabel>
              <Select
                value={typeFilter}
                label="نوع المراسلة"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">الكل</MenuItem>
                {typeOptions.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Templates Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton height={200} variant="rounded" />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <TemplateIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            لا توجد قوالب
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            ابدأ بإنشاء قالب جديد لتسريع عملية إنشاء المراسلات
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            إنشاء قالب
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filtered.map((template) => {
            const typeInfo = CORRESPONDENCE_TYPES[template.type] || {};
            return (
              <Grid item xs={12} sm={6} md={4} key={template._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': { boxShadow: 4 },
                  }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="h6" fontWeight="bold" noWrap>
                        {template.nameAr || template.name}
                      </Typography>
                      <Chip
                        label={typeInfo.label || template.type}
                        size="small"
                        sx={{
                          bgcolor: `${typeInfo.color || '#1976d2'}15`,
                          color: typeInfo.color || '#1976d2',
                          fontSize: '0.7rem',
                        }}
                      />
                    </Box>
                    {template.subject && (
                      <Typography variant="body2" color="text.secondary" noWrap mb={1}>
                        {template.subject}
                      </Typography>
                    )}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {template.content}
                    </Typography>
                    {template.placeholders?.length > 0 && (
                      <Box mt={1} display="flex" flexWrap="wrap" gap={0.5}>
                        {template.placeholders.map((p, i) => (
                          <Chip
                            key={i}
                            label={`{${p.name}}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem' }}
                          />
                        ))}
                      </Box>
                    )}
                    {template.category && (
                      <Chip
                        label={template.category}
                        size="small"
                        sx={{ mt: 1, fontSize: '0.65rem' }}
                        variant="outlined"
                      />
                    )}
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ justifyContent: 'flex-end' }}>
                    <Tooltip title="معاينة">
                      <IconButton size="small" onClick={() => handlePreview(template)}>
                        <PreviewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="نسخ المحتوى">
                      <IconButton
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(template.content);
                          setSnackbar({
                            open: true,
                            message: 'تم نسخ المحتوى',
                            severity: 'info',
                          });
                        }}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ═══ Create Dialog ═══════════════════════════════ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>إنشاء قالب جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم القالب (English) *"
                value={form.name}
                onChange={handleChange('name')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم القالب (عربي) *"
                value={form.nameAr}
                onChange={handleChange('nameAr')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>نوع المراسلة *</InputLabel>
                <Select value={form.type} label="نوع المراسلة *" onChange={handleChange('type')}>
                  {typeOptions.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="التصنيف"
                value={form.category}
                onChange={handleChange('category')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الموضوع"
                value={form.subject}
                onChange={handleChange('subject')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={8}
                label="محتوى القالب *"
                value={form.content}
                onChange={handleChange('content')}
                placeholder="أدخل نص القالب... استخدم {اسم_المتغير} للمتغيرات"
                helperText="استخدم {اسم_المتغير} لإدراج متغيرات تُستبدل عند التطبيق"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="رأس الصفحة"
                value={form.headerTemplate}
                onChange={handleChange('headerTemplate')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="ذيل الصفحة"
                value={form.footerTemplate}
                onChange={handleChange('footerTemplate')}
              />
            </Grid>

            {/* Placeholders */}
            <Grid item xs={12}>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2">المتغيرات (Placeholders)</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addPlaceholder}>
                  إضافة متغير
                </Button>
              </Box>
              {form.placeholders.map((p, idx) => (
                <Box key={idx} display="flex" gap={1} mb={1} alignItems="center">
                  <TextField
                    size="small"
                    label="الاسم"
                    value={p.name}
                    onChange={(e) => updatePlaceholder(idx, 'name', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    label="الوصف"
                    value={p.description}
                    onChange={(e) => updatePlaceholder(idx, 'description', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    label="القيمة الافتراضية"
                    value={p.defaultValue}
                    onChange={(e) => updatePlaceholder(idx, 'defaultValue', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <IconButton color="error" size="small" onClick={() => removePlaceholder(idx)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            حفظ القالب
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Preview Dialog ══════════════════════════════ */}
      <Dialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          معاينة القالب: {selectedTemplate?.nameAr || selectedTemplate?.name}
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box>
              <Box display="flex" gap={1} mb={2}>
                <Chip
                  label={CORRESPONDENCE_TYPES[selectedTemplate.type]?.label || selectedTemplate.type}
                  size="small"
                />
                {selectedTemplate.category && (
                  <Chip label={selectedTemplate.category} size="small" variant="outlined" />
                )}
              </Box>
              {selectedTemplate.subject && (
                <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                  الموضوع: {selectedTemplate.subject}
                </Typography>
              )}
              <Divider sx={{ mb: 2 }} />
              {selectedTemplate.headerTemplate && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" whiteSpace="pre-wrap">
                    {selectedTemplate.headerTemplate}
                  </Typography>
                </Paper>
              )}
              <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography
                  variant="body1"
                  sx={{ whiteSpace: 'pre-wrap', lineHeight: 2, direction: 'rtl' }}
                >
                  {selectedTemplate.content}
                </Typography>
              </Paper>
              {selectedTemplate.footerTemplate && (
                <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" whiteSpace="pre-wrap">
                    {selectedTemplate.footerTemplate}
                  </Typography>
                </Paper>
              )}
              {selectedTemplate.placeholders?.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" mb={1}>
                    المتغيرات المستخدمة:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {selectedTemplate.placeholders.map((p, i) => (
                      <Chip
                        key={i}
                        label={`{${p.name}} — ${p.description || 'بدون وصف'}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
