/**
 * Warehouse List — قائمة المستودعات
 */
import { useState, useEffect, useCallback } from 'react';
import { TableRow, useTheme, alpha,
} from '@mui/material';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../../services/warehouse.service';

const TYPE_LABELS = { main: 'رئيسي', sub: 'فرعي', transit: 'عبور', quarantine: 'حجر', returns: 'مرتجعات' };
const STATUS_LABELS = { active: 'نشط', inactive: 'غير نشط', maintenance: 'صيانة', closed: 'مغلق' };
const STATUS_COLORS = { active: 'success', inactive: 'default', maintenance: 'warning', closed: 'error' };

const EMPTY = { code: '', nameAr: '', nameEn: '', type: 'main', status: 'active', notes: '' };

export default function WarehouseList() {
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
    try { setList(await getWarehouses()); } catch { setError('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openNew = () => { setMode('create'); setForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (wh) => { setMode('edit'); setForm({ code: wh.code, nameAr: wh.nameAr, nameEn: wh.nameEn || '', type: wh.type, status: wh.status, notes: wh.notes || '' }); setSelectedId(wh._id); setDialogOpen(true); };
  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === 'edit') await updateWarehouse(selectedId, form);
      else await createWarehouse(form);
      setDialogOpen(false); fetch();
    } catch { setError('خطأ أثناء الحفظ'); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('هل تريد إغلاق هذا المستودع؟')) return;
    try { await deleteWarehouse(id); fetch(); } catch { setError('خطأ أثناء الحذف'); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>قائمة المستودعات</Typography>
          <Typography variant="body2" color="text.secondary">إدارة جميع المستودعات</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث"><IconButton onClick={fetch} color="primary"><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openNew} sx={{ borderRadius: 2 }}>مستودع جديد</Button>
        </Box>
      </Box>
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={60} /></Box> : list.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <WHIcon sx={{ fontSize: 64, color: theme.palette.grey[300], mb: 2 }} />
          <Typography color="text.secondary">لا توجد مستودعات — أضف مستودعاً جديداً</Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={openNew} sx={{ mt: 2 }}>إضافة مستودع</Button>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableCell sx={{ fontWeight: 700 }}>الكود</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((wh, idx) => (
                <motion.tr key={wh._id || idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} component={TableRow} style={{ display: 'table-row' }}>
                  <TableCell><Typography fontWeight={600}>{wh.code}</Typography></TableCell>
                  <TableCell>{wh.nameAr}</TableCell>
                  <TableCell><Chip label={TYPE_LABELS[wh.type] || wh.type} size="small" variant="outlined" /></TableCell>
                  <TableCell><Chip label={STATUS_LABELS[wh.status] || wh.status} size="small" color={STATUS_COLORS[wh.status] || 'default'} /></TableCell>
                  <TableCell align="center">
                    <Tooltip title="تعديل"><IconButton size="small" color="primary" onClick={() => openEdit(wh)}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="إغلاق"><IconButton size="small" color="error" onClick={() => handleDelete(wh._id)}><Delete fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{mode === 'edit' ? 'تعديل المستودع' : 'مستودع جديد'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="كود المستودع" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} fullWidth required />
          <TextField label="الاسم (عربي)" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} fullWidth required />
          <TextField label="الاسم (إنجليزي)" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} fullWidth />
          <FormControl fullWidth><InputLabel>النوع</InputLabel><Select value={form.type} label="النوع" onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
          <TextField label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} fullWidth multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.code.trim() || !form.nameAr.trim()}>
            {saving ? <CircularProgress size={20} /> : mode === 'edit' ? 'حفظ' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
