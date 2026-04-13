/**
 * Risk Register — سجل المخاطر
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, CircularProgress, IconButton, Tooltip, Alert, Chip, Button,
  Table, TableHead, TableBody, TableRow, TableCell, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, useTheme, alpha,
} from '@mui/material';
import { Refresh, Add, Edit, Delete, Warning } from '@mui/icons-material';
import { getRisks, createRisk, updateRisk, deleteRisk } from '../../services/riskManagement.service';

const CAT_LABELS = { strategic: 'استراتيجي', operational: 'تشغيلي', financial: 'مالي', compliance: 'امتثال', reputational: 'سمعة', technology: 'تقنية', environmental: 'بيئي', safety: 'سلامة', legal: 'قانوني', other: 'أخرى' };
const STATUS_LABELS = { identified: 'محددة', assessed: 'مقيّمة', mitigating: 'قيد التخفيف', monitoring: 'مراقبة', resolved: 'محلولة', accepted: 'مقبولة', closed: 'مغلقة' };
const STATUS_COLORS = { identified: 'default', assessed: 'info', mitigating: 'warning', monitoring: 'primary', resolved: 'success', accepted: 'secondary', closed: 'default' };
const PRIORITY_LABELS = { critical: 'حرجة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
const PRIORITY_COLORS = { critical: '#d32f2f', high: '#f57c00', medium: '#fbc02d', low: '#4caf50' };
const PROB_LABELS = { very_low: 'ضعيف جداً', low: 'ضعيف', medium: 'متوسط', high: 'مرتفع', very_high: 'مرتفع جداً' };
const IMPACT_LABELS = { very_low: 'ضعيف جداً', low: 'ضعيف', medium: 'متوسط', high: 'مرتفع', very_high: 'مرتفع جداً' };

const EMPTY = { riskCode: '', titleAr: '', category: 'operational', description: '', probability: 'medium', impact: 'medium', priority: 'medium', status: 'identified' };

export default function RiskRegister() {
  const theme = useTheme();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [form, setForm] = useState({ ...EMPTY });
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setList(await getRisks()); } catch { setError('خطأ في التحميل'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openNew = () => { setMode('create'); setForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (r) => {
    setMode('edit');
    setForm({ riskCode: r.riskCode, titleAr: r.titleAr, category: r.category, description: r.description || '', probability: r.probability, impact: r.impact, priority: r.priority, status: r.status });
    setSelectedId(r._id); setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try { if (mode === 'edit') await updateRisk(selectedId, form); else await createRisk(form); setDialogOpen(false); fetch(); } catch { setError('خطأ أثناء الحفظ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => { try { await deleteRisk(id); setConfirmDelete(null); fetch(); } catch { setError('خطأ أثناء الحذف'); } };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box><Typography variant="h4" fontWeight={700}>سجل المخاطر</Typography><Typography variant="body2" color="text.secondary">تسجيل وإدارة المخاطر المؤسسية</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث"><IconButton onClick={fetch} color="primary"><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openNew} sx={{ borderRadius: 2 }}>تسجيل مخاطرة</Button>
        </Box>
      </Box>
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={60} /></Box> : list.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Warning sx={{ fontSize: 64, color: theme.palette.grey[300], mb: 2 }} /><Typography color="text.secondary">لا توجد مخاطر مسجلة</Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={openNew} sx={{ mt: 2 }}>تسجيل مخاطرة</Button>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <Table>
            <TableHead><TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableCell sx={{ fontWeight: 700 }}>الرمز</TableCell><TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell><TableCell sx={{ fontWeight: 700 }}>الأولوية</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الاحتمال</TableCell><TableCell sx={{ fontWeight: 700 }}>الأثر</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>إجراءات</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {list.map((r, idx) => (
                <TableRow key={r._id || idx}>
                  <TableCell><Typography fontWeight={600}>{r.riskCode}</Typography></TableCell>
                  <TableCell>{r.titleAr}</TableCell>
                  <TableCell><Chip label={CAT_LABELS[r.category] || r.category} size="small" variant="outlined" /></TableCell>
                  <TableCell><Chip label={PRIORITY_LABELS[r.priority] || r.priority} size="small" sx={{ bgcolor: alpha(PRIORITY_COLORS[r.priority] || '#999', 0.15), color: PRIORITY_COLORS[r.priority], fontWeight: 600 }} /></TableCell>
                  <TableCell>{PROB_LABELS[r.probability] || r.probability}</TableCell>
                  <TableCell>{IMPACT_LABELS[r.impact] || r.impact}</TableCell>
                  <TableCell><Chip label={STATUS_LABELS[r.status] || r.status} size="small" color={STATUS_COLORS[r.status] || 'default'} /></TableCell>
                  <TableCell align="center">
                    <Tooltip title="تعديل"><IconButton size="small" color="primary" onClick={() => openEdit(r)}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => setConfirmDelete(r._id)}><Delete fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{mode === 'edit' ? 'تعديل المخاطرة' : 'تسجيل مخاطرة جديدة'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="رمز المخاطرة" value={form.riskCode} onChange={(e) => setForm({ ...form, riskCode: e.target.value })} fullWidth required />
          <TextField label="العنوان" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} fullWidth required />
          <FormControl fullWidth><InputLabel>الفئة</InputLabel><Select value={form.category} label="الفئة" onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {Object.entries(CAT_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
          <FormControl fullWidth><InputLabel>الاحتمالية</InputLabel><Select value={form.probability} label="الاحتمالية" onChange={(e) => setForm({ ...form, probability: e.target.value })}>
            {Object.entries(PROB_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
          <FormControl fullWidth><InputLabel>التأثير</InputLabel><Select value={form.impact} label="التأثير" onChange={(e) => setForm({ ...form, impact: e.target.value })}>
            {Object.entries(IMPACT_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
          <FormControl fullWidth><InputLabel>الأولوية</InputLabel><Select value={form.priority} label="الأولوية" onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
          <TextField label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.riskCode.trim() || !form.titleAr.trim()}>
            {saving ? <CircularProgress size={20} /> : mode === 'edit' ? 'حفظ' : 'تسجيل'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent><Typography>هل أنت متأكد من حذف هذه المخاطرة؟</Typography></DialogContent>
        <DialogActions><Button onClick={() => setConfirmDelete(null)}>إلغاء</Button><Button color="error" variant="contained" onClick={() => handleDelete(confirmDelete)}>حذف</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
