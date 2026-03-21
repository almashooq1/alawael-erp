/**
 * Legal Consultations — الاستشارات القانونية
 */
import { useState, useEffect, useCallback } from 'react';
import { useTheme, alpha,
} from '@mui/material';
import { getConsultations, createConsultation, updateConsultation } from '../../services/legalAffairs.service';
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

const TYPE_LABELS = { contract_review: 'مراجعة عقد', legal_opinion: 'رأي قانوني', compliance: 'امتثال', risk_assessment: 'تقييم مخاطر', general: 'عامة', employment: 'توظيف' };
const STATUS_LABELS = { pending: 'معلقة', in_review: 'قيد المراجعة', completed: 'مكتملة', cancelled: 'ملغاة' };
const STATUS_COLORS = { pending: 'warning', in_review: 'info', completed: 'success', cancelled: 'default' };

const EMPTY = { title: '', type: 'general', priority: 'medium', description: '' };

export default function LegalConsultations() {
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
    try { setList(await getConsultations()); } catch { setError('خطأ في التحميل'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openNew = () => { setMode('create'); setForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (c) => { setMode('edit'); setForm({ title: c.title, type: c.type, priority: c.priority || 'medium', description: c.description || '' }); setSelectedId(c._id); setDialogOpen(true); };
  const handleSave = async () => {
    setSaving(true);
    try { if (mode === 'edit') await updateConsultation(selectedId, form); else await createConsultation(form); setDialogOpen(false); fetch(); } catch { setError('خطأ أثناء الحفظ'); }
    finally { setSaving(false); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box><Typography variant="h4" fontWeight={700}>الاستشارات القانونية</Typography><Typography variant="body2" color="text.secondary">طلبات الاستشارة والآراء القانونية</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث"><IconButton onClick={fetch} color="primary"><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openNew} sx={{ borderRadius: 2 }}>استشارة جديدة</Button>
        </Box>
      </Box>
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={60} /></Box> : list.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Balance sx={{ fontSize: 64, color: theme.palette.grey[300], mb: 2 }} /><Typography color="text.secondary">لا توجد استشارات</Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={openNew} sx={{ mt: 2 }}>طلب استشارة</Button>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <Table>
            <TableHead><TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableCell sx={{ fontWeight: 700 }}>الرقم</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>إجراءات</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {list.map((c, idx) => (
                <TableRow key={c._id || idx}>
                  <TableCell><Typography fontWeight={600}>{c.consultationNumber}</Typography></TableCell>
                  <TableCell>{c.title}</TableCell>
                  <TableCell><Chip label={TYPE_LABELS[c.type] || c.type} size="small" variant="outlined" /></TableCell>
                  <TableCell><Chip label={STATUS_LABELS[c.status] || c.status} size="small" color={STATUS_COLORS[c.status] || 'default'} /></TableCell>
                  <TableCell>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  <TableCell align="center"><Tooltip title="تعديل"><IconButton size="small" color="primary" onClick={() => openEdit(c)}><Edit fontSize="small" /></IconButton></Tooltip></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{mode === 'edit' ? 'تعديل الاستشارة' : 'استشارة جديدة'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="العنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth required />
          <FormControl fullWidth><InputLabel>النوع</InputLabel><Select value={form.type} label="النوع" onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
          <TextField label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? <CircularProgress size={20} /> : mode === 'edit' ? 'حفظ' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
