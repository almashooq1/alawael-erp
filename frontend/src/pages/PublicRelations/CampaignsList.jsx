/**
 * Campaigns List — قائمة الحملات الإعلامية
 */
import { useState, useEffect, useCallback } from 'react';
import { useTheme, alpha,
} from '@mui/material';
import { getCampaigns, createCampaign, updateCampaign } from '../../services/publicRelations.service';
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

const TYPE_LABELS = { awareness: 'توعوية', promotional: 'ترويجية', crisis: 'أزمات', branding: 'هوية', community: 'مجتمعية', internal: 'داخلية', social_responsibility: 'مسؤولية اجتماعية' };
const STATUS_LABELS = { draft: 'مسودة', planning: 'تخطيط', active: 'نشطة', paused: 'متوقفة', completed: 'مكتملة', cancelled: 'ملغاة' };
const STATUS_COLORS = { draft: 'default', planning: 'warning', active: 'success', paused: 'info', completed: 'primary', cancelled: 'error' };

const EMPTY = { campaignCode: '', titleAr: '', type: 'awareness', description: '', status: 'draft' };

export default function CampaignsList() {
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
    try { setList(await getCampaigns()); } catch { setError('خطأ في التحميل'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openNew = () => { setMode('create'); setForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (c) => { setMode('edit'); setForm({ campaignCode: c.campaignCode, titleAr: c.titleAr, type: c.type, description: c.description || '', status: c.status }); setSelectedId(c._id); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try { if (mode === 'edit') await updateCampaign(selectedId, form); else await createCampaign(form); setDialogOpen(false); fetch(); } catch { setError('خطأ أثناء الحفظ'); }
    finally { setSaving(false); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box><Typography variant="h4" fontWeight={700}>الحملات الإعلامية</Typography><Typography variant="body2" color="text.secondary">إدارة الحملات الإعلامية والتسويقية</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث"><IconButton onClick={fetch} color="primary"><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openNew} sx={{ borderRadius: 2 }}>حملة جديدة</Button>
        </Box>
      </Box>
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={60} /></Box> : list.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Campaign sx={{ fontSize: 64, color: theme.palette.grey[300], mb: 2 }} /><Typography color="text.secondary">لا توجد حملات</Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={openNew} sx={{ mt: 2 }}>إنشاء حملة</Button>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <Table>
            <TableHead><TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableCell sx={{ fontWeight: 700 }}>الرمز</TableCell><TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell><TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>إجراءات</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {list.map((c, idx) => (
                <TableRow key={c._id || idx}>
                  <TableCell><Typography fontWeight={600}>{c.campaignCode}</Typography></TableCell>
                  <TableCell>{c.titleAr}</TableCell>
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
        <DialogTitle>{mode === 'edit' ? 'تعديل الحملة' : 'حملة جديدة'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="رمز الحملة" value={form.campaignCode} onChange={(e) => setForm({ ...form, campaignCode: e.target.value })} fullWidth required />
          <TextField label="العنوان" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} fullWidth required />
          <FormControl fullWidth><InputLabel>النوع</InputLabel><Select value={form.type} label="النوع" onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
          <TextField label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.campaignCode.trim() || !form.titleAr.trim()}>
            {saving ? <CircularProgress size={20} /> : mode === 'edit' ? 'حفظ' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
