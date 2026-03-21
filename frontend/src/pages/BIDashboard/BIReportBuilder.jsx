/**
 * BI Report Builder — منشئ التقارير
 *
 * List saved reports, create / edit / delete / export reports.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  TableRow,
  useTheme,
  alpha,
} from '@mui/material';

import {
  getReports,
  createReport,
  updateReport,
  deleteReport,
} from '../../services/biDashboard.service';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import Refresh from '@mui/icons-material/Refresh';
import Add from '@mui/icons-material/Add';
import FilterList from '@mui/icons-material/FilterList';
import Description from '@mui/icons-material/Description';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';

const CATEGORIES = [
  { value: '', label: 'الكل' },
  { value: 'executive', label: 'تنفيذي' },
  { value: 'financial', label: 'مالي' },
  { value: 'hr', label: 'موارد بشرية' },
  { value: 'operations', label: 'تشغيلي' },
  { value: 'custom', label: 'مخصص' },
];

const STATUS_MAP = {
  active: { label: 'نشط', color: 'success' },
  draft: { label: 'مسودة', color: 'warning' },
  archived: { label: 'مؤرشف', color: 'default' },
};

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'custom',
  type: 'dashboard',
};

export default function BIReportBuilder() {
  const theme = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReports({ category: filterCategory || undefined });
      setReports(result || []);
    } catch {
      setError('خطأ في تحميل التقارير');
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleOpen = (mode, report = null) => {
    setDialogMode(mode);
    if (mode === 'edit' && report) {
      setForm({
        name: report.name || '',
        description: report.description || '',
        category: report.category || 'custom',
        type: report.type || 'dashboard',
      });
      setSelectedId(report._id);
    } else {
      setForm({ ...EMPTY_FORM });
      setSelectedId(null);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (dialogMode === 'edit' && selectedId) {
        await updateReport(selectedId, form);
      } else {
        await createReport(form);
      }
      setDialogOpen(false);
      fetchReports();
    } catch {
      setError('خطأ أثناء حفظ التقرير');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteReport(selectedId);
      setDeleteDialogOpen(false);
      setSelectedId(null);
      fetchReports();
    } catch {
      setError('خطأ أثناء حذف التقرير');
    }
  };

  const openDeleteDialog = (id) => {
    setSelectedId(id);
    setDeleteDialogOpen(true);
  };

  const filteredReports = filterCategory
    ? reports.filter((r) => r.category === filterCategory)
    : reports;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            منشئ التقارير
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إنشاء وإدارة التقارير المخصصة
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchReports} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen('create')} sx={{ borderRadius: 2 }}>
            تقرير جديد
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filter */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FilterList color="action" />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>التصنيف</InputLabel>
            <Select value={filterCategory} label="التصنيف" onChange={(e) => setFilterCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Chip label={`${filteredReports.length} تقرير`} variant="outlined" />
        </Box>
      </Paper>

      {/* Report Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={60} />
        </Box>
      ) : filteredReports.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
          <Description sx={{ fontSize: 64, color: theme.palette.grey[300], mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            لا توجد تقارير
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            انقر "تقرير جديد" لإنشاء أول تقرير
          </Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={() => handleOpen('create')}>
            إنشاء تقرير
          </Button>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التصنيف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>آخر تحديث</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  إجراءات
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReports.map((r, idx) => {
                const st = STATUS_MAP[r.status] || STATUS_MAP.draft;
                const cat = CATEGORIES.find((c) => c.value === r.category);
                return (
                  <motion.tr
                    key={r._id || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    component={TableRow}
                    style={{ display: 'table-row' }}
                  >
                    <TableCell>
                      <Typography fontWeight={600}>{r.name}</Typography>
                      {r.description && (
                        <Typography variant="caption" color="text.secondary">
                          {r.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={cat?.label || r.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={st.label} size="small" color={st.color} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('ar-SA') : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="تعديل">
                        <IconButton size="small" color="primary" onClick={() => handleOpen('edit', r)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => openDeleteDialog(r._id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogMode === 'edit' ? 'تعديل التقرير' : 'تقرير جديد'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="اسم التقرير"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="الوصف"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
          <FormControl fullWidth>
            <InputLabel>التصنيف</InputLabel>
            <Select value={form.category} label="التصنيف" onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.filter((c) => c.value).map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>النوع</InputLabel>
            <Select value={form.type} label="النوع" onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <MenuItem value="dashboard">لوحة معلومات</MenuItem>
              <MenuItem value="table">جدول</MenuItem>
              <MenuItem value="chart">رسم بياني</MenuItem>
              <MenuItem value="summary">ملخص</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? <CircularProgress size={20} /> : dialogMode === 'edit' ? 'حفظ التعديلات' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف هذا التقرير؟ لا يمكن التراجع عن هذا الإجراء.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
