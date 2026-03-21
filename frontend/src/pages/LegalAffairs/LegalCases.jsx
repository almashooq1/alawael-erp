/**
 * Legal Cases — إدارة القضايا
 */
import { useState, useEffect, useCallback } from 'react';
import { TableRow, useTheme, alpha,
} from '@mui/material';
import { getLegalCases, createLegalCase, updateLegalCase } from '../../services/legalAffairs.service';
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
import Edit from '@mui/icons-material/Edit';

const TYPE_LABELS = { litigation: 'تقاضي', arbitration: 'تحكيم', labor: 'عمالية', commercial: 'تجارية', administrative: 'إدارية', regulatory: 'تنظيمية', other: 'أخرى' };
const STATUS_LABELS = { open: 'مفتوحة', in_progress: 'جارية', pending_hearing: 'بانتظار جلسة', pending_judgment: 'بانتظار حكم', closed: 'مغلقة', settled: 'تسوية', won: 'ربح', lost: 'خسارة' };
const STATUS_COLORS = { open: 'error', in_progress: 'warning', pending_hearing: 'info', closed: 'default', won: 'success', lost: 'error', settled: 'info' };
const PRIORITY_LABELS = { low: 'منخفض', medium: 'متوسط', high: 'عالٍ', critical: 'حرج' };
const PRIORITY_COLORS = { low: 'default', medium: 'info', high: 'warning', critical: 'error' };

const EMPTY = { caseNumber: '', title: '', type: 'litigation', priority: 'medium', description: '', judge: '' };

export default function LegalCases() {
  const theme = useTheme();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [form, setForm] = useState({ ...EMPTY });
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setList(await getLegalCases()); } catch { setError('خطأ في التحميل'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openNew = () => { setMode('create'); setForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (c) => { setMode('edit'); setForm({ caseNumber: c.caseNumber, title: c.title, type: c.type, priority: c.priority, description: c.description || '', judge: c.judge || '' }); setSelectedId(c._id); setDialogOpen(true); };
  const handleSave = async () => {
    setSaving(true);
    try { if (mode === 'edit') await updateLegalCase(selectedId, form); else await createLegalCase(form); setDialogOpen(false); fetch(); } catch { setError('خطأ أثناء الحفظ'); }
    finally { setSaving(false); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box><Typography variant="h4" fontWeight={700}>إدارة القضايا</Typography><Typography variant="body2" color="text.secondary">القضايا القانونية والتقاضي</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث"><IconButton onClick={fetch} color="primary"><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openNew} sx={{ borderRadius: 2 }}>قضية جديدة</Button>
        </Box>
      </Box>
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={60} /></Box> : list.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Gavel sx={{ fontSize: 64, color: theme.palette.grey[300], mb: 2 }} /><Typography color="text.secondary">لا توجد قضايا</Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={openNew} sx={{ mt: 2 }}>إضافة قضية</Button>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <Table>
            <TableHead><TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableCell sx={{ fontWeight: 700 }}>رقم القضية</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الأولوية</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الجلسة القادمة</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>إجراءات</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {list.map((c, idx) => (
                <motion.tr key={c._id || idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} component={TableRow} style={{ display: 'table-row' }}>
                  <TableCell><Typography fontWeight={600}>{c.caseNumber}</Typography></TableCell>
                  <TableCell>{c.title}</TableCell>
                  <TableCell><Chip label={TYPE_LABELS[c.type] || c.type} size="small" variant="outlined" /></TableCell>
                  <TableCell><Chip label={PRIORITY_LABELS[c.priority] || c.priority} size="small" color={PRIORITY_COLORS[c.priority] || 'default'} /></TableCell>
                  <TableCell><Chip label={STATUS_LABELS[c.status] || c.status} size="small" color={STATUS_COLORS[c.status] || 'default'} /></TableCell>
                  <TableCell>{c.nextHearing ? new Date(c.nextHearing).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  <TableCell align="center"><Tooltip title="تعديل"><IconButton size="small" color="primary" onClick={() => openEdit(c)}><Edit fontSize="small" /></IconButton></Tooltip></TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{mode === 'edit' ? 'تعديل القضية' : 'قضية جديدة'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="رقم القضية" value={form.caseNumber} onChange={(e) => setForm({ ...form, caseNumber: e.target.value })} fullWidth required />
          <TextField label="العنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth required />
          <FormControl fullWidth><InputLabel>النوع</InputLabel><Select value={form.type} label="النوع" onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
          <FormControl fullWidth><InputLabel>الأولوية</InputLabel><Select value={form.priority} label="الأولوية" onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
          <TextField label="القاضي" value={form.judge} onChange={(e) => setForm({ ...form, judge: e.target.value })} fullWidth />
          <TextField label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.caseNumber.trim() || !form.title.trim()}>
            {saving ? <CircularProgress size={20} /> : mode === 'edit' ? 'حفظ' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
