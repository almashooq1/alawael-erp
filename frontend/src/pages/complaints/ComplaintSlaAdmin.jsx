/**
 * ComplaintSlaAdmin — إدارة إعدادات SLA للشكاوى
 *
 * Calls /api/complaints-enhanced/sla-configs (CRUD)
 * Roles: admin, super_admin, manager
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Timer as SlaIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api';
import logger from '../../utils/logger';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const PRIORITY_LABELS = { low: 'منخفضة', medium: 'متوسطة', high: 'مرتفعة', critical: 'حرجة' };
const PRIORITY_COLORS = { low: 'default', medium: 'info', high: 'warning', critical: 'error' };

const EMPTY_FORM = {
  name: '',
  priority: 'medium',
  resolutionHours: 72,
  firstResponseHours: 4,
  level1EscalationUser: '',
  level2EscalationUser: '',
  level3EscalationUser: '',
  branchId: '',
};

export default function ComplaintSlaAdmin() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await apiClient.get('/api/complaints-enhanced/sla-configs');
      setConfigs(r?.data?.data || []);
    } catch (err) {
      logger.warn('ComplaintSlaAdmin load:', err.message);
      setError('تعذّر تحميل إعدادات SLA. يُعرض وضع التجريبي.');
      setConfigs([
        {
          _id: 'demo1',
          name: 'افتراضي',
          priority: 'medium',
          resolutionHours: 72,
          firstResponseHours: 4,
        },
        {
          _id: 'demo2',
          name: 'حرج',
          priority: 'critical',
          resolutionHours: 12,
          firstResponseHours: 1,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = cfg => {
    setEditing(cfg);
    setForm({
      name: cfg.name || '',
      priority: cfg.priority || 'medium',
      resolutionHours: cfg.resolutionHours ?? 72,
      firstResponseHours: cfg.firstResponseHours ?? 4,
      level1EscalationUser: cfg.level1EscalationUser || '',
      level2EscalationUser: cfg.level2EscalationUser || '',
      level3EscalationUser: cfg.level3EscalationUser || '',
      branchId: cfg.branchId || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        resolutionHours: Number(form.resolutionHours),
        firstResponseHours: Number(form.firstResponseHours),
      };
      if (editing) {
        await apiClient.put(`/api/complaints-enhanced/sla-configs/${editing._id}`, payload);
      } else {
        await apiClient.post('/api/complaints-enhanced/sla-configs', payload);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      logger.error('ComplaintSlaAdmin save:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    try {
      await apiClient.delete(`/api/complaints-enhanced/sla-configs/${id}`);
      setDeleteId(null);
      load();
    } catch (err) {
      logger.error('ComplaintSlaAdmin delete:', err.message);
      setDeleteId(null);
    }
  };

  const field = (k, label, type = 'text', extra = {}) => (
    <TextField
      key={k}
      fullWidth
      size="small"
      label={label}
      type={type}
      value={form[k]}
      onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
      sx={{ mb: 2 }}
      {...extra}
    />
  );

  return (
    <Box sx={{ maxWidth: 'lg', mx: 'auto', p: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg,#7b1fa2,#9c27b0)',
          color: '#fff',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <SlaIcon />
              <Typography variant="h6" fontWeight={800}>
                إدارة إعدادات SLA — الشكاوى
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
              تحديد ساعات الاستجابة والحل والتصعيد لكل مستوى أولوية
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="تحديث">
              <IconButton onClick={load} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              إضافة إعداد
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
      >
        {loading && <LinearProgress />}
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              {['الاسم', 'الأولوية', 'ساعات الحل', 'أول رد', 'التصعيد L1/L2/L3', 'إجراء'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {configs.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  لا توجد إعدادات SLA — أضف الأول
                </TableCell>
              </TableRow>
            ) : (
              configs.map(cfg => (
                <TableRow key={cfg._id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {cfg.name || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={PRIORITY_LABELS[cfg.priority] || cfg.priority || '—'}
                      color={PRIORITY_COLORS[cfg.priority] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${cfg.resolutionHours ?? '—'} ساعة`}
                      size="small"
                      sx={{ bgcolor: 'primary.50', color: 'primary.main' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {cfg.firstResponseHours ? `${cfg.firstResponseHours} ساعة` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {[
                        cfg.level1EscalationUser,
                        cfg.level2EscalationUser,
                        cfg.level3EscalationUser,
                      ]
                        .filter(Boolean)
                        .join(' / ') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => openEdit(cfg)}>
                          <EditIcon fontSize="small" color="primary" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" onClick={() => setDeleteId(cfg._id)}>
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editing ? 'تعديل إعداد SLA' : 'إضافة إعداد SLA جديد'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {field('name', 'الاسم *')}
            <TextField
              select
              fullWidth
              size="small"
              label="الأولوية"
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              sx={{ mb: 2 }}
            >
              {PRIORITIES.map(p => (
                <MenuItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </MenuItem>
              ))}
            </TextField>
            {field('resolutionHours', 'ساعات الحل (SLA)', 'number', { inputProps: { min: 1 } })}
            {field('firstResponseHours', 'ساعات أول رد', 'number', { inputProps: { min: 1 } })}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              مستخدمو التصعيد (ObjectId أو اسم — اختياري)
            </Typography>
            {field('level1EscalationUser', 'مسؤول التصعيد — المستوى 1')}
            {field('level2EscalationUser', 'مسؤول التصعيد — المستوى 2')}
            {field('level3EscalationUser', 'مسؤول التصعيد — المستوى 3')}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {editing ? 'حفظ التعديلات' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل تريد حذف إعداد SLA هذا؟</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>إلغاء</Button>
          <Button color="error" variant="contained" onClick={() => handleDelete(deleteId)}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
