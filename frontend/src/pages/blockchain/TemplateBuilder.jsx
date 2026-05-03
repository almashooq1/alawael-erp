/**
 * Template Builder — صفحة قوالب الشهادات
 *
 * CRUD for CertificateTemplate. Each template is a reusable spec used when
 * creating new certs (defines bilingual name, category, validity, signatories,
 * and a list of dynamic data fields).
 *
 * The dynamic-fields editor is the heart of this page: admins add/remove rows
 * that will become the per-cert `data` payload (e.g. "score", "course", "hours").
 * Field types match the backend enum: text | date | number | select.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Article as TemplateIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { templatesService } from '../../services/blockchainService';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import logger from '../../utils/logger';

const CATEGORIES = [
  { value: 'academic', label: 'أكاديمي' },
  { value: 'professional', label: 'مهني' },
  { value: 'training', label: 'تدريب' },
  { value: 'rehabilitation', label: 'تأهيل' },
  { value: 'attendance', label: 'حضور' },
  { value: 'achievement', label: 'إنجاز' },
  { value: 'compliance', label: 'امتثال' },
  { value: 'accreditation', label: 'اعتماد' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'نص' },
  { value: 'date', label: 'تاريخ' },
  { value: 'number', label: 'رقم' },
  { value: 'select', label: 'اختيار' },
];

const emptyTemplate = () => ({
  name: { ar: '', en: '' },
  description: '',
  category: 'training',
  fields: [],
  signatories: [],
  validityDuration: '',
  isActive: true,
});

export default function TemplateBuilder() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | template
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await templatesService.getAll();
      setTemplates(Array.isArray(r.data) ? r.data : []);
    } catch (err) {
      logger.error('TemplateBuilder load', err);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => setEditing(emptyTemplate());
  const openEdit = t => setEditing(JSON.parse(JSON.stringify(t)));

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.ar?.trim()) {
      setError('اسم القالب بالعربية مطلوب');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...editing,
        validityDuration: editing.validityDuration === '' ? null : Number(editing.validityDuration),
      };
      if (editing._id) {
        await templatesService.update(editing._id, payload);
      } else {
        await templatesService.create(payload);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (idx, patch) => {
    setEditing(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    }));
  };
  const removeField = idx =>
    setEditing(prev => ({ ...prev, fields: prev.fields.filter((_, i) => i !== idx) }));
  const addField = () =>
    setEditing(prev => ({
      ...prev,
      fields: [
        ...prev.fields,
        { name: '', label: { ar: '', en: '' }, type: 'text', required: false },
      ],
    }));

  const updateSignatory = (idx, patch) => {
    setEditing(prev => ({
      ...prev,
      signatories: prev.signatories.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };
  const removeSignatory = idx =>
    setEditing(prev => ({ ...prev, signatories: prev.signatories.filter((_, i) => i !== idx) }));
  const addSignatory = () =>
    setEditing(prev => ({
      ...prev,
      signatories: [...prev.signatories, { role: '', name: '', title: '' }],
    }));

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => (a.name?.ar || '').localeCompare(b.name?.ar || '', 'ar')),
    [templates]
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1280, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TemplateIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              قوالب الشهادات
            </Typography>
            <Typography variant="body2" color="text.secondary">
              قوالب قابلة لإعادة الاستخدام تحدد حقول كل شهادة
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={load}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            قالب جديد
          </Button>
        </Stack>
      </Stack>

      <Paper
        elevation={0}
        sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
      >
        {loading ? (
          <Box display="flex" justifyContent="center" p={6}>
            <CircularProgress />
          </Box>
        ) : sortedTemplates.length === 0 ? (
          <EmptyState title="لا توجد قوالب بعد" height={200} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {['الرمز', 'الاسم', 'الفئة', 'الحقول', 'المدة', 'نشط', 'إجراء'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedTemplates.map(t => (
                <TableRow key={t._id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {t.templateNumber || '—'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {t.name?.ar || '—'}
                    </Typography>
                    {t.name?.en && (
                      <Typography variant="caption" color="text.secondary">
                        {t.name.en}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{t.fields?.length || 0}</TableCell>
                  <TableCell>
                    {t.validityDuration ? `${t.validityDuration} يوم` : 'دائمة'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t.isActive ? 'نشط' : 'موقوف'}
                      color={t.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openEdit(t)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={!!editing} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="md">
        <DialogTitle>{editing?._id ? 'تعديل قالب' : 'قالب جديد'}</DialogTitle>
        <DialogContent dividers>
          {editing && (
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="الاسم بالعربية *"
                    fullWidth
                    size="small"
                    value={editing.name?.ar || ''}
                    onChange={e =>
                      setEditing({ ...editing, name: { ...editing.name, ar: e.target.value } })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Name (English)"
                    fullWidth
                    size="small"
                    value={editing.name?.en || ''}
                    onChange={e =>
                      setEditing({ ...editing, name: { ...editing.name, en: e.target.value } })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="الفئة *"
                    fullWidth
                    size="small"
                    value={editing.category}
                    onChange={e => setEditing({ ...editing, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => (
                      <MenuItem key={c.value} value={c.value}>
                        {c.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    type="number"
                    label="مدة الصلاحية (يوم) — اتركه فارغاً للدائم"
                    fullWidth
                    size="small"
                    value={editing.validityDuration ?? ''}
                    onChange={e => setEditing({ ...editing, validityDuration: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="الوصف"
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    value={editing.description || ''}
                    onChange={e => setEditing({ ...editing, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!editing.isActive}
                        onChange={e => setEditing({ ...editing, isActive: e.target.checked })}
                      />
                    }
                    label="القالب نشط"
                  />
                </Grid>
              </Grid>

              <Divider />

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    الحقول الديناميكية ({editing.fields.length})
                  </Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={addField}>
                    إضافة حقل
                  </Button>
                </Stack>
                {editing.fields.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    لا حقول إضافية. الحقول تُملأ عند إنشاء كل شهادة.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {editing.fields.map((f, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                        <Grid container spacing={1.5} alignItems="center">
                          <Grid item xs={12} sm={3}>
                            <TextField
                              label="اسم الحقل (en)"
                              fullWidth
                              size="small"
                              value={f.name}
                              onChange={e => updateField(idx, { name: e.target.value })}
                              placeholder="course_name"
                            />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <TextField
                              label="عنوان عربي"
                              fullWidth
                              size="small"
                              value={f.label?.ar || ''}
                              onChange={e =>
                                updateField(idx, { label: { ...f.label, ar: e.target.value } })
                              }
                            />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <TextField
                              label="Label (en)"
                              fullWidth
                              size="small"
                              value={f.label?.en || ''}
                              onChange={e =>
                                updateField(idx, { label: { ...f.label, en: e.target.value } })
                              }
                            />
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <TextField
                              select
                              label="النوع"
                              fullWidth
                              size="small"
                              value={f.type}
                              onChange={e => updateField(idx, { type: e.target.value })}
                            >
                              {FIELD_TYPES.map(ft => (
                                <MenuItem key={ft.value} value={ft.value}>
                                  {ft.label}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={6} sm={1}>
                            <FormControlLabel
                              control={
                                <Switch
                                  size="small"
                                  checked={!!f.required}
                                  onChange={e => updateField(idx, { required: e.target.checked })}
                                />
                              }
                              label="مطلوب"
                              sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }}
                            />
                          </Grid>
                          <Grid item>
                            <IconButton size="small" color="error" onClick={() => removeField(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>

              <Divider />

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    الموقّعون ({editing.signatories.length})
                  </Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={addSignatory}>
                    إضافة موقّع
                  </Button>
                </Stack>
                {editing.signatories.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    لا موقّعين معرّفين مسبقاً.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {editing.signatories.map((s, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                        <Grid container spacing={1.5} alignItems="center">
                          <Grid item xs={12} sm={4}>
                            <TextField
                              label="الدور"
                              fullWidth
                              size="small"
                              value={s.role}
                              onChange={e => updateSignatory(idx, { role: e.target.value })}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              label="الاسم"
                              fullWidth
                              size="small"
                              value={s.name}
                              onChange={e => updateSignatory(idx, { name: e.target.value })}
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              label="المسمى"
                              fullWidth
                              size="small"
                              value={s.title}
                              onChange={e => updateSignatory(idx, { title: e.target.value })}
                            />
                          </Grid>
                          <Grid item>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeSignatory(idx)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>

              {error && (
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} disabled={saving}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={save}
            disabled={saving}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
