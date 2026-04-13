/**
 * Events List — قائمة الفعاليات
 */
import { useState, useEffect, useCallback } from 'react';
import { useTheme, alpha,
} from '@mui/material';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../../services/events.service';

const TYPE_LABELS = { conference: 'مؤتمر', seminar: 'ندوة', workshop: 'ورشة عمل', ceremony: 'حفل', exhibition: 'معرض', meeting: 'اجتماع', training: 'تدريب', social: 'اجتماعي', sports: 'رياضي', other: 'أخرى' };
const STATUS_LABELS = { draft: 'مسودة', planning: 'تخطيط', approved: 'معتمدة', registration_open: 'التسجيل مفتوح', in_progress: 'قيد التنفيذ', completed: 'مكتملة', cancelled: 'ملغاة', postponed: 'مؤجلة' };
const STATUS_COLORS = { draft: 'default', planning: 'warning', approved: 'info', registration_open: 'success', in_progress: 'primary', completed: 'success', cancelled: 'error', postponed: 'warning' };
const CAT_LABELS = { internal: 'داخلية', external: 'خارجية', governmental: 'حكومية', community: 'مجتمعية', corporate: 'مؤسسية' };

const EMPTY = { eventCode: '', titleAr: '', type: 'seminar', category: 'internal', description: '', startDate: '', endDate: '', status: 'draft' };

export default function EventsList() {
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
    try { setList(await getEvents()); } catch { setError('خطأ في التحميل'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openNew = () => { setMode('create'); setForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (e) => {
    setMode('edit');
    setForm({ eventCode: e.eventCode, titleAr: e.titleAr, type: e.type, category: e.category || 'internal', description: e.description || '', startDate: e.startDate?.slice(0, 10) || '', endDate: e.endDate?.slice(0, 10) || '', status: e.status });
    setSelectedId(e._id); setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try { if (mode === 'edit') await updateEvent(selectedId, form); else await createEvent(form); setDialogOpen(false); fetch(); } catch { setError('خطأ أثناء الحفظ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => { try { await deleteEvent(id); setConfirmDelete(null); fetch(); } catch { setError('خطأ أثناء الحذف'); } };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box><Typography variant="h4" fontWeight={700}>إدارة الفعاليات</Typography><Typography variant="body2" color="text.secondary">إنشاء وإدارة الفعاليات والأنشطة</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث"><IconButton onClick={fetch} color="primary"><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openNew} sx={{ borderRadius: 2 }}>فعالية جديدة</Button>
        </Box>
      </Box>
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={60} /></Box> : list.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <EventIcon sx={{ fontSize: 64, color: theme.palette.grey[300], mb: 2 }} /><Typography color="text.secondary">لا توجد فعاليات</Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={openNew} sx={{ mt: 2 }}>إنشاء فعالية</Button>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <Table>
            <TableHead><TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableCell sx={{ fontWeight: 700 }}>الرمز</TableCell><TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell><TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell><TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>إجراءات</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {list.map((e, idx) => (
                <TableRow key={e._id || idx}>
                  <TableCell><Typography fontWeight={600}>{e.eventCode}</Typography></TableCell>
                  <TableCell>{e.titleAr}</TableCell>
                  <TableCell><Chip label={TYPE_LABELS[e.type] || e.type} size="small" variant="outlined" /></TableCell>
                  <TableCell>{CAT_LABELS[e.category] || e.category}</TableCell>
                  <TableCell>{e.startDate ? new Date(e.startDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  <TableCell><Chip label={STATUS_LABELS[e.status] || e.status} size="small" color={STATUS_COLORS[e.status] || 'default'} /></TableCell>
                  <TableCell align="center">
                    <Tooltip title="تعديل"><IconButton size="small" color="primary" onClick={() => openEdit(e)}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => setConfirmDelete(e._id)}><Delete fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{mode === 'edit' ? 'تعديل الفعالية' : 'فعالية جديدة'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="رمز الفعالية" value={form.eventCode} onChange={(e) => setForm({ ...form, eventCode: e.target.value })} fullWidth required />
          <TextField label="العنوان" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} fullWidth required />
          <FormControl fullWidth><InputLabel>النوع</InputLabel><Select value={form.type} label="النوع" onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
          <FormControl fullWidth><InputLabel>الفئة</InputLabel><Select value={form.category} label="الفئة" onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {Object.entries(CAT_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
          <TextField label="تاريخ البداية" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="تاريخ النهاية" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.eventCode.trim() || !form.titleAr.trim()}>
            {saving ? <CircularProgress size={20} /> : mode === 'edit' ? 'حفظ' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent><Typography>هل أنت متأكد من حذف هذه الفعالية؟</Typography></DialogContent>
        <DialogActions><Button onClick={() => setConfirmDelete(null)}>إلغاء</Button><Button color="error" variant="contained" onClick={() => handleDelete(confirmDelete)}>حذف</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
