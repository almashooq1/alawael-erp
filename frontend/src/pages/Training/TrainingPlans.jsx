/**
 * Training Plans — خطط التدريب السنوية
 */
import { useState, useEffect, useCallback } from 'react';
import { useTheme, alpha,
} from '@mui/material';
import { getPlans, createPlan, updatePlan } from '../../services/training.service';
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
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import Refresh from '@mui/icons-material/Refresh';
import Add from '@mui/icons-material/Add';
import Edit from '@mui/icons-material/Edit';

const STATUS_LABELS = { draft: 'مسودة', pending_approval: 'بانتظار الاعتماد', approved: 'معتمدة', in_progress: 'قيد التنفيذ', completed: 'مكتملة' };
const STATUS_COLORS = { draft: 'default', pending_approval: 'warning', approved: 'info', in_progress: 'success', completed: 'primary' };

const EMPTY = { planCode: '', titleAr: '', year: new Date().getFullYear(), department: '', totalBudget: 0, status: 'draft' };

export default function TrainingPlans() {
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
    try { setList(await getPlans()); } catch { setError('خطأ في التحميل'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openNew = () => { setMode('create'); setForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (p) => { setMode('edit'); setForm({ planCode: p.planCode, titleAr: p.titleAr, year: p.year, department: p.department || '', totalBudget: p.totalBudget || 0, status: p.status }); setSelectedId(p._id); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try { if (mode === 'edit') await updatePlan(selectedId, form); else await createPlan(form); setDialogOpen(false); fetch(); } catch { setError('خطأ أثناء الحفظ'); }
    finally { setSaving(false); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box><Typography variant="h4" fontWeight={700}>خطط التدريب</Typography><Typography variant="body2" color="text.secondary">إدارة الخطط التدريبية السنوية</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث"><IconButton onClick={fetch} color="primary"><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openNew} sx={{ borderRadius: 2 }}>خطة جديدة</Button>
        </Box>
      </Box>
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={60} /></Box> : list.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <EventNote sx={{ fontSize: 64, color: theme.palette.grey[300], mb: 2 }} /><Typography color="text.secondary">لا توجد خطط تدريب</Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={openNew} sx={{ mt: 2 }}>إنشاء خطة</Button>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <Table>
            <TableHead><TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableCell sx={{ fontWeight: 700 }}>الرمز</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>السنة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الميزانية</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>إجراءات</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {list.map((p, idx) => (
                <TableRow key={p._id || idx}>
                  <TableCell><Typography fontWeight={600}>{p.planCode}</Typography></TableCell>
                  <TableCell>{p.titleAr}</TableCell>
                  <TableCell>{p.year}</TableCell>
                  <TableCell>{p.department || '—'}</TableCell>
                  <TableCell>{(p.totalBudget || 0).toLocaleString('ar-SA')} ر.س</TableCell>
                  <TableCell><Chip label={STATUS_LABELS[p.status] || p.status} size="small" color={STATUS_COLORS[p.status] || 'default'} /></TableCell>
                  <TableCell align="center"><Tooltip title="تعديل"><IconButton size="small" color="primary" onClick={() => openEdit(p)}><Edit fontSize="small" /></IconButton></Tooltip></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{mode === 'edit' ? 'تعديل الخطة' : 'خطة جديدة'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="رمز الخطة" value={form.planCode} onChange={(e) => setForm({ ...form, planCode: e.target.value })} fullWidth required />
          <TextField label="العنوان" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} fullWidth required />
          <TextField label="السنة" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} fullWidth />
          <TextField label="القسم" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} fullWidth />
          <TextField label="الميزانية (ر.س)" type="number" value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: Number(e.target.value) })} fullWidth />
          <FormControl fullWidth><InputLabel>الحالة</InputLabel><Select value={form.status} label="الحالة" onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.planCode.trim() || !form.titleAr.trim()}>
            {saving ? <CircularProgress size={20} /> : mode === 'edit' ? 'حفظ' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
