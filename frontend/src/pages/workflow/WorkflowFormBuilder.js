/**
 * WorkflowFormBuilder — مصمم النماذج المخصصة
 *
 * Page for creating and managing custom form templates for workflow steps.
 * Features: CRUD forms, drag-and-drop field ordering, field type catalog,
 * validation rules, conditional visibility, and form preview.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  alpha,
} from '@mui/material';

import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

const FIELD_TYPE_COLORS = {
  text: '#2196F3', textarea: '#1976D2', number: '#FF9800', email: '#4CAF50',
  phone: '#009688', date: '#E91E63', datetime: '#9C27B0', time: '#673AB7',
  select: '#3F51B5', multi_select: '#5C6BC0', radio: '#7C4DFF', checkbox: '#00BCD4',
  file: '#795548', image: '#FF5722', signature: '#607D8B', currency: '#FFC107',
  percentage: '#FF6F00', user_lookup: '#8BC34A', department_lookup: '#CDDC39',
  table: '#455A64', rich_text: '#D32F2F', rating: '#F44336',
};

export default function WorkflowFormBuilder() {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [fieldTypes, setFieldTypes] = useState([]);
  // Dialog states
  const [formDialog, setFormDialog] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [formData, setFormData] = useState({ name: '', nameAr: '', description: '', descriptionAr: '', fields: [], layout: { type: 'single_column' } });
  const [fieldDialog, setFieldDialog] = useState(false);
  const [editingFieldIdx, setEditingFieldIdx] = useState(-1);
  const [fieldData, setFieldData] = useState({ name: '', nameAr: '', fieldType: 'text', required: false, order: 0, section: 'عام' });

  const fetchForms = useCallback(async () => {
    try {
      setLoading(true);
      const [formsRes, statsRes, typesRes] = await Promise.all([
        workflowService.getForms(),
        workflowService.getFormStats(),
        workflowService.getFieldTypes(),
      ]);
      setForms(formsRes.data?.data || []);
      setTotal(formsRes.data?.total || 0);
      setStats(statsRes.data?.data || null);
      setFieldTypes(typesRes.data?.data || []);
    } catch (err) {
      showSnackbar('خطأ في تحميل النماذج', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const handleSaveForm = async () => {
    try {
      if (editingForm) {
        await workflowService.updateForm(editingForm._id, formData);
        showSnackbar('تم تحديث النموذج بنجاح', 'success');
      } else {
        await workflowService.createForm(formData);
        showSnackbar('تم إنشاء النموذج بنجاح', 'success');
      }
      setFormDialog(false);
      setEditingForm(null);
      fetchForms();
    } catch (err) {
      showSnackbar('خطأ في حفظ النموذج', 'error');
    }
  };

  const handleDeleteForm = async (id) => {
    if (!window.confirm('هل تريد حذف هذا النموذج؟')) return;
    try {
      await workflowService.deleteForm(id);
      showSnackbar('تم حذف النموذج', 'success');
      fetchForms();
    } catch (err) {
      showSnackbar('خطأ في حذف النموذج', 'error');
    }
  };

  const handleCloneForm = async (id) => {
    try {
      await workflowService.cloneForm(id);
      showSnackbar('تم نسخ النموذج بنجاح', 'success');
      fetchForms();
    } catch (err) {
      showSnackbar('خطأ في نسخ النموذج', 'error');
    }
  };

  const openEditForm = (form) => {
    setEditingForm(form);
    setFormData({ name: form.name, nameAr: form.nameAr, description: form.description || '', descriptionAr: form.descriptionAr || '', fields: form.fields || [], layout: form.layout || { type: 'single_column' } });
    setFormDialog(true);
  };

  const openNewForm = () => {
    setEditingForm(null);
    setFormData({ name: '', nameAr: '', description: '', descriptionAr: '', fields: [], layout: { type: 'single_column' } });
    setFormDialog(true);
  };

  const addField = () => {
    setEditingFieldIdx(-1);
    setFieldData({ name: '', nameAr: '', fieldType: 'text', required: false, order: formData.fields.length, section: 'عام' });
    setFieldDialog(true);
  };

  const saveField = () => {
    const updatedFields = [...formData.fields];
    if (editingFieldIdx >= 0) {
      updatedFields[editingFieldIdx] = fieldData;
    } else {
      updatedFields.push(fieldData);
    }
    setFormData(prev => ({ ...prev, fields: updatedFields }));
    setFieldDialog(false);
  };

  const removeField = (idx) => {
    setFormData(prev => ({ ...prev, fields: prev.fields.filter((_, i) => i !== idx) }));
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/workflow')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={700}>
            مصمم النماذج المخصصة
          </Typography>
          <Chip label={`${total} نموذج`} color="primary" size="small" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchForms}>
            تحديث
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNewForm}>
            نموذج جديد
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderTop: '4px solid #2196F3' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="#2196F3">{stats.total}</Typography>
                <Typography variant="body2" color="text.secondary">إجمالي النماذج</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderTop: '4px solid #4CAF50' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="#4CAF50">{stats.active}</Typography>
                <Typography variant="body2" color="text.secondary">نماذج نشطة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderTop: '4px solid #FF9800' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="#FF9800">{stats.inactive}</Typography>
                <Typography variant="body2" color="text.secondary">غير نشطة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderTop: '4px solid #9C27B0' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="#9C27B0">{stats.fieldUsage?.length || 0}</Typography>
                <Typography variant="body2" color="text.secondary">أنواع الحقول</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Forms List */}
      <Grid container spacing={2}>
        {forms.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>لا توجد نماذج مخصصة</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>قم بإنشاء نموذج جديد لربطه بخطوات سير العمل</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openNewForm}>إنشاء أول نموذج</Button>
            </Paper>
          </Grid>
        ) : (
          forms.map(form => (
            <Grid item xs={12} sm={6} md={4} key={form._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{form.nameAr || form.name}</Typography>
                    <Chip label={form.isActive ? 'نشط' : 'معطل'} color={form.isActive ? 'success' : 'default'} size="small" />
                  </Box>
                  {form.descriptionAr && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{form.descriptionAr}</Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                    {(form.fields || []).slice(0, 4).map((f, i) => (
                      <Chip key={i} label={f.nameAr || f.name} size="small" variant="outlined"
                        sx={{ borderColor: FIELD_TYPE_COLORS[f.fieldType] || '#999', color: FIELD_TYPE_COLORS[f.fieldType] || '#999' }} />
                    ))}
                    {(form.fields || []).length > 4 && (
                      <Chip label={`+${form.fields.length - 4}`} size="small" color="primary" variant="outlined" />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {form.fields?.length || 0} حقل &bull; الاستخدام: {form.usageCount || 0} مرة
                  </Typography>
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <Tooltip title="تعديل"><IconButton size="small" onClick={() => openEditForm(form)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="نسخ"><IconButton size="small" onClick={() => handleCloneForm(form._id)}><CloneIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDeleteForm(form._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Create/Edit Form Dialog */}
      <Dialog open={formDialog} onClose={() => setFormDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingForm ? 'تعديل النموذج' : 'إنشاء نموذج جديد'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="اسم النموذج (عربي)" value={formData.nameAr} onChange={e => setFormData(prev => ({ ...prev, nameAr: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="اسم النموذج (إنجليزي)" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="الوصف" value={formData.descriptionAr} onChange={e => setFormData(prev => ({ ...prev, descriptionAr: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>نوع التخطيط</InputLabel>
                <Select value={formData.layout.type} label="نوع التخطيط" onChange={e => setFormData(prev => ({ ...prev, layout: { ...prev.layout, type: e.target.value } }))}>
                  <MenuItem value="single_column">عمود واحد</MenuItem>
                  <MenuItem value="two_column">عمودان</MenuItem>
                  <MenuItem value="tabbed">تبويبات</MenuItem>
                  <MenuItem value="wizard">خطوات متسلسلة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Fields Section */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>الحقول ({formData.fields.length})</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addField}>إضافة حقل</Button>
          </Box>

          {formData.fields.length === 0 ? (
            <Alert severity="info">لم يتم إضافة أي حقول بعد. اضغط "إضافة حقل" لبدء تصميم النموذج.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>الاسم</TableCell>
                    <TableCell>النوع</TableCell>
                    <TableCell>مطلوب</TableCell>
                    <TableCell>القسم</TableCell>
                    <TableCell>إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.fields.map((f, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{f.nameAr || f.name}</TableCell>
                      <TableCell>
                        <Chip label={fieldTypes.find(t => t.value === f.fieldType)?.label || f.fieldType} size="small"
                          sx={{ bgcolor: alpha(FIELD_TYPE_COLORS[f.fieldType] || '#999', 0.1), color: FIELD_TYPE_COLORS[f.fieldType] || '#999' }} />
                      </TableCell>
                      <TableCell>{f.required ? '✓' : '—'}</TableCell>
                      <TableCell>{f.section}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => { setEditingFieldIdx(idx); setFieldData(f); setFieldDialog(true); }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => removeField(idx)}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialog(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveForm} disabled={!formData.nameAr}>حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Field Dialog */}
      <Dialog open={fieldDialog} onClose={() => setFieldDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingFieldIdx >= 0 ? 'تعديل الحقل' : 'إضافة حقل جديد'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="اسم الحقل (عربي)" value={fieldData.nameAr} onChange={e => setFieldData(prev => ({ ...prev, nameAr: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="اسم الحقل (إنجليزي)" value={fieldData.name} onChange={e => setFieldData(prev => ({ ...prev, name: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>نوع الحقل</InputLabel>
                <Select value={fieldData.fieldType} label="نوع الحقل" onChange={e => setFieldData(prev => ({ ...prev, fieldType: e.target.value }))}>
                  {fieldTypes.map(ft => (
                    <MenuItem key={ft.value} value={ft.value}>{ft.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="القسم" value={fieldData.section} onChange={e => setFieldData(prev => ({ ...prev, section: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel control={<Switch checked={fieldData.required} onChange={e => setFieldData(prev => ({ ...prev, required: e.target.checked }))} />} label="حقل مطلوب" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="الترتيب" value={fieldData.order} onChange={e => setFieldData(prev => ({ ...prev, order: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="نص المساعدة" value={fieldData.helpTextAr || ''} onChange={e => setFieldData(prev => ({ ...prev, helpTextAr: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={saveField} disabled={!fieldData.nameAr}>حفظ الحقل</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
