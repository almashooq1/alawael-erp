import { useState, useEffect } from 'react';




import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { statusColors, neutralColors, surfaceColors } from '../../theme/palette';

const TEMPLATE_TYPES = [
  { value: 'soap', label: 'ملاحظات SOAP', color: '#3b82f6', icon: '📋' },
  { value: 'initial_assessment', label: 'تقييم أولي', color: '#10b981', icon: '🔍' },
  { value: 'discharge_summary', label: 'ملخص خروج', color: '#f59e0b', icon: '📄' },
  { value: 'progress_note', label: 'ملاحظة تقدم', color: '#8b5cf6', icon: '📈' },
  { value: 'treatment_plan', label: 'خطة علاجية', color: '#ec4899', icon: '🎯' },
  { value: 'team_report', label: 'تقرير فريق', color: '#06b6d4', icon: '👥' },
  { value: 'custom', label: 'مخصص', color: '#6b7280', icon: '✏️' },
];

const TherapistDocTemplates = () => {
  const { currentUser: _currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm] = useState({
    name: '',
    type: 'soap',
    description: '',
    content: '',
    sections: '',
  });

  useEffect(() => {
    loadTemplates();
  }, []);  

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getTemplates();
      setTemplates(res?.templates || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const payload = {
        ...form,
        sections: form.sections
          .split('\n')
          .filter(Boolean)
          .map(s => ({ title: s.trim(), content: '' })),
      };
      await therapistService.createTemplate(payload);
      showSnackbar('تم إنشاء النموذج بنجاح', 'success');
      setCreateOpen(false);
      setForm({ name: '', type: 'soap', description: '', content: '', sections: '' });
      loadTemplates();
    } catch {
      showSnackbar('خطأ في إنشاء النموذج', 'error');
    }
  };

  const handleView = async id => {
    try {
      const res = await therapistService.getTemplateById(id);
      setSelectedTemplate(res?.template || res);
      setViewOpen(true);
    } catch {
      showSnackbar('خطأ في تحميل النموذج', 'error');
    }
  };

  const handleEdit = template => {
    setSelectedTemplate(template);
    setForm({
      name: template.name,
      type: template.type,
      description: template.description || '',
      content: template.content || '',
      sections: template.sections?.map(s => s.title).join('\n') || '',
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    try {
      const payload = {
        ...form,
        sections: form.sections
          .split('\n')
          .filter(Boolean)
          .map(s => ({ title: s.trim(), content: '' })),
      };
      await therapistService.updateTemplate(selectedTemplate.id, payload);
      showSnackbar('تم تحديث النموذج بنجاح', 'success');
      setEditOpen(false);
      loadTemplates();
    } catch {
      showSnackbar('خطأ في التحديث', 'error');
    }
  };

  const handleUse = async id => {
    try {
      const res = await therapistService.useTemplate(id);
      showSnackbar('تم إنشاء مستند من النموذج - يمكنك تعبئته الآن', 'success');
      const doc = res?.document || res;
      setSelectedTemplate(doc);
      setViewOpen(true);
    } catch {
      showSnackbar('خطأ في استخدام النموذج', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteTemplate(id);
      showSnackbar('تم حذف النموذج', 'success');
      loadTemplates();
    } catch {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const filtered = templates.filter(t => {
    const matchSearch = !search || t.name?.includes(search) || t.description?.includes(search);
    const matchType = typeFilter === 'all' || t.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DocIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                نماذج التوثيق
              </Typography>
              <Typography variant="body2">قوالب التوثيق السريري والتقارير الجاهزة</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            نموذج جديد
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي النماذج',
            value: stats.totalTemplates || 0,
            color: statusColors.info,
            icon: <TemplateIcon />,
          },
          {
            label: 'الأكثر استخداماً',
            value: stats.mostUsedType || '-',
            color: '#3b82f6',
            icon: <UseIcon />,
          },
          {
            label: 'إجمالي الاستخدامات',
            value: stats.totalUsageCount || 0,
            color: statusColors.success,
            icon: <CopyIcon />,
          },
          { label: 'الأنواع', value: stats.types || 0, color: '#f59e0b', icon: <DocIcon /> },
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: s.color }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Type Chips */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label="الكل"
          onClick={() => setTypeFilter('all')}
          variant={typeFilter === 'all' ? 'filled' : 'outlined'}
          color="primary"
        />
        {TEMPLATE_TYPES.map(t => (
          <Chip
            key={t.value}
            label={`${t.icon} ${t.label}`}
            onClick={() => setTypeFilter(t.value)}
            variant={typeFilter === t.value ? 'filled' : 'outlined'}
            sx={typeFilter === t.value ? { bgcolor: t.color, color: 'white' } : {}}
          />
        ))}
      </Box>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="بحث في النماذج..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Templates Grid */}
      {loading ? (
        <Typography textAlign="center" color="textSecondary" sx={{ py: 4 }}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <DocIcon sx={{ fontSize: 60, color: neutralColors.divider, mb: 2 }} />
          <Typography color="textSecondary">لا توجد نماذج</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(template => {
            const tp = TEMPLATE_TYPES.find(t => t.value === template.type) || TEMPLATE_TYPES[6];
            return (
              <Grid item xs={12} sm={6} md={4} key={template.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderTop: `4px solid ${tp.color}`,
                  }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 1,
                      }}
                    >
                      <Typography variant="h4">{tp.icon}</Typography>
                      <Chip
                        label={tp.label}
                        size="small"
                        sx={{ bgcolor: tp.color + '20', color: tp.color, fontWeight: 'bold' }}
                      />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {template.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {template.description?.slice(0, 100)}
                    </Typography>
                    {template.sections?.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                        {template.sections.slice(0, 4).map((s, idx) => (
                          <Chip
                            key={idx}
                            label={s.title}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                        {template.sections.length > 4 && (
                          <Chip label={`+${template.sections.length - 4}`} size="small" />
                        )}
                      </Box>
                    )}
                    <Typography variant="caption" color="textSecondary">
                      استخدم {template.usageCount || 0} مرة
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
                    <Box>
                      <Tooltip title="استخدام النموذج">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleUse(template.id)}
                        >
                          <UseIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="عرض">
                        <IconButton size="small" onClick={() => handleView(template.id)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => handleEdit(template)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Tooltip title="حذف">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(template.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="h6">{selectedTemplate?.name}</Typography>
          <IconButton onClick={() => setViewOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTemplate && (
            <Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label={
                    TEMPLATE_TYPES.find(t => t.value === selectedTemplate.type)?.label ||
                    selectedTemplate.type
                  }
                  color="primary"
                />
                <Typography variant="caption" color="textSecondary" sx={{ alignSelf: 'center' }}>
                  استخدم {selectedTemplate.usageCount || 0} مرة
                </Typography>
              </Box>
              {selectedTemplate.description && (
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedTemplate.description}
                </Typography>
              )}
              {selectedTemplate.sections?.map((section, idx) => (
                <Paper
                  key={idx}
                  sx={{
                    p: 2,
                    mb: 1.5,
                    borderRadius: 2,
                    bgcolor: surfaceColors?.background || '#f5f5f5',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 'bold', mb: 0.5, color: 'primary.main' }}
                  >
                    {idx + 1}. {section.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {section.content || 'يتم تعبئته عند الاستخدام...'}
                  </Typography>
                </Paper>
              ))}
              {selectedTemplate.content && (
                <Paper
                  sx={{
                    p: 2,
                    mt: 2,
                    borderRadius: 2,
                    bgcolor: surfaceColors?.background || '#f5f5f5',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedTemplate.content}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DocIcon color="primary" />
            <Typography variant="h6">نموذج جديد</Typography>
          </Box>
          <IconButton onClick={() => setCreateOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={8}>
              <TextField
                fullWidth
                size="small"
                label="اسم النموذج"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>النوع</InputLabel>
                <Select
                  value={form.type}
                  label="النوع"
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                >
                  {TEMPLATE_TYPES.map(t => (
                    <MenuItem value={t.value} key={t.value}>
                      {t.icon} {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="الوصف"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="الأقسام (كل سطر = قسم)"
                value={form.sections}
                onChange={e => setForm(p => ({ ...p, sections: e.target.value }))}
                helperText="مثال: البيانات الشخصية↵الشكوى الرئيسية↵الفحص↵التوصيات"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="محتوى إضافي"
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.name}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon color="primary" />
            <Typography variant="h6">تعديل النموذج</Typography>
          </Box>
          <IconButton onClick={() => setEditOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={8}>
              <TextField
                fullWidth
                size="small"
                label="اسم النموذج"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>النوع</InputLabel>
                <Select
                  value={form.type}
                  label="النوع"
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                >
                  {TEMPLATE_TYPES.map(t => (
                    <MenuItem value={t.value} key={t.value}>
                      {t.icon} {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="الوصف"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="الأقسام (كل سطر = قسم)"
                value={form.sections}
                onChange={e => setForm(p => ({ ...p, sections: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="محتوى إضافي"
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={!form.name}>
            حفظ التعديلات
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistDocTemplates;
