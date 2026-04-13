/**
 * Training Courses List — قائمة الدورات التدريبية
 */
import { useState, useEffect, useCallback } from 'react';
import { useTheme, alpha,
} from '@mui/material';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../../services/training.service';

const CAT_LABELS = { technical: 'تقنية', leadership: 'قيادة', soft_skills: 'مهارات ناعمة', compliance: 'امتثال', safety: 'سلامة', professional: 'مهنية', language: 'لغات', other: 'أخرى' };
const TYPE_LABELS = { classroom: 'حضوري', online: 'عن بعد', blended: 'مدمج', workshop: 'ورشة عمل', seminar: 'ندوة', on_the_job: 'أثناء العمل' };
const STATUS_LABELS = { draft: 'مسودة', approved: 'معتمدة', active: 'نشطة', completed: 'مكتملة', cancelled: 'ملغاة' };
const STATUS_COLORS = { draft: 'default', approved: 'info', active: 'success', completed: 'primary', cancelled: 'error' };

const EMPTY = { courseCode: '', titleAr: '', category: 'technical', type: 'classroom', description: '', status: 'draft' };

export default function CoursesList() {
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
    try { setList(await getCourses()); } catch { setError('خطأ في التحميل'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openNew = () => { setMode('create'); setForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (c) => { setMode('edit'); setForm({ courseCode: c.courseCode, titleAr: c.titleAr, category: c.category, type: c.type, description: c.description || '', status: c.status }); setSelectedId(c._id); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try { if (mode === 'edit') await updateCourse(selectedId, form); else await createCourse(form); setDialogOpen(false); fetch(); } catch { setError('خطأ أثناء الحفظ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await deleteCourse(id); setConfirmDelete(null); fetch(); } catch { setError('خطأ أثناء الحذف'); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box><Typography variant="h4" fontWeight={700}>الدورات التدريبية</Typography><Typography variant="body2" color="text.secondary">إدارة الدورات والبرامج التدريبية</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث"><IconButton onClick={fetch} color="primary"><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openNew} sx={{ borderRadius: 2 }}>دورة جديدة</Button>
        </Box>
      </Box>
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={60} /></Box> : list.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <School sx={{ fontSize: 64, color: theme.palette.grey[300], mb: 2 }} /><Typography color="text.secondary">لا توجد دورات</Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={openNew} sx={{ mt: 2 }}>إضافة دورة</Button>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <Table>
            <TableHead><TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableCell sx={{ fontWeight: 700 }}>الرمز</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>إجراءات</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {list.map((c, idx) => (
                <TableRow key={c._id || idx}>
                  <TableCell><Typography fontWeight={600}>{c.courseCode}</Typography></TableCell>
                  <TableCell>{c.titleAr}</TableCell>
                  <TableCell><Chip label={CAT_LABELS[c.category] || c.category} size="small" variant="outlined" /></TableCell>
                  <TableCell>{TYPE_LABELS[c.type] || c.type}</TableCell>
                  <TableCell><Chip label={STATUS_LABELS[c.status] || c.status} size="small" color={STATUS_COLORS[c.status] || 'default'} /></TableCell>
                  <TableCell align="center">
                    <Tooltip title="تعديل"><IconButton size="small" color="primary" onClick={() => openEdit(c)}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => setConfirmDelete(c._id)}><Delete fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{mode === 'edit' ? 'تعديل الدورة' : 'دورة جديدة'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="رمز الدورة" value={form.courseCode} onChange={(e) => setForm({ ...form, courseCode: e.target.value })} fullWidth required />
          <TextField label="العنوان (عربي)" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} fullWidth required />
          <FormControl fullWidth><InputLabel>الفئة</InputLabel><Select value={form.category} label="الفئة" onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {Object.entries(CAT_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
          <FormControl fullWidth><InputLabel>النوع</InputLabel><Select value={form.type} label="النوع" onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select></FormControl>
          <TextField label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.courseCode.trim() || !form.titleAr.trim()}>
            {saving ? <CircularProgress size={20} /> : mode === 'edit' ? 'حفظ' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent><Typography>هل أنت متأكد من حذف هذه الدورة؟</Typography></DialogContent>
        <DialogActions><Button onClick={() => setConfirmDelete(null)}>إلغاء</Button><Button color="error" variant="contained" onClick={() => handleDelete(confirmDelete)}>حذف</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
