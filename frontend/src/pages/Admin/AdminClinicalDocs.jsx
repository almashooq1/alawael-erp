/**
 * AdminClinicalDocs — /admin/clinical-docs page.
 *
 * Clinical document library: upload, categorize, share with guardians,
 * e-sign, download. RTL-safe with file-size indicators.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Paper,
  Alert,
  Divider,
  LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import DrawIcon from '@mui/icons-material/Draw';
import ArchiveIcon from '@mui/icons-material/Archive';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';
import StorageIcon from '@mui/icons-material/Storage';
import VerifiedIcon from '@mui/icons-material/Verified';
import api from '../../services/api.client';
import BeneficiaryTypeahead from '../../components/BeneficiaryTypeahead';

const CATEGORIES = ['تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'شهادات', 'مراسلات', 'أخرى'];

function formatBytes(n) {
  if (!n) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = Number(n);
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}
function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}
function fullName(x) {
  if (!x) return '';
  return (
    x.firstName_ar || x.name || `${x.firstName || ''} ${x.lastName || ''}`.trim() || x.email || ''
  );
}

export default function AdminClinicalDocs() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [stats, setStats] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  const [uploadDialog, setUploadDialog] = useState({ open: false, saving: false, err: '' });
  const [uploadForm, setUploadForm] = useState({
    file: null,
    title: '',
    description: '',
    category: 'تقارير',
    tags: '',
    beneficiary: null,
  });
  const [shareDialog, setShareDialog] = useState({
    open: false,
    doc: null,
    guardian: null,
    permission: 'view',
    saving: false,
    err: '',
  });
  const [signDialog, setSignDialog] = useState({ open: false, doc: null, saving: false });
  const [detailDoc, setDetailDoc] = useState(null);

  // Both beneficiary pickers (upload + share) now use BeneficiaryTypeahead.
  // The old code had a subtle bug: loadOptions fetched /admin/beneficiaries
  // twice (once for beneficiaryOpts, once for guardianOpts) — same endpoint,
  // and guardianOpts was never read. Dropped both.

  // No eager load needed — BeneficiaryTypeahead fetches on-demand.

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/clinical-docs/stats');
      setStats(data);
    } catch {
      setStats(null);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      params.set('page', pagination.page);
      params.set('limit', pagination.limit);
      const { data } = await api.get(`/admin/clinical-docs?${params.toString()}`);
      setItems(data?.items || []);
      if (data?.pagination) setPagination(p => ({ ...p, ...data.pagination }));
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, [q, category, pagination.page, pagination.limit]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openUpload = () => {
    setUploadForm({
      file: null,
      title: '',
      description: '',
      category: 'تقارير',
      tags: '',
      beneficiary: null,
    });
    setUploadDialog({ open: true, saving: false, err: '' });
  };

  const submitUpload = async () => {
    if (!uploadForm.file) {
      setUploadDialog(d => ({ ...d, err: 'يجب اختيار ملف' }));
      return;
    }
    if (!uploadForm.title.trim()) {
      setUploadDialog(d => ({ ...d, err: 'العنوان مطلوب' }));
      return;
    }
    setUploadDialog(d => ({ ...d, saving: true, err: '' }));
    try {
      const fd = new FormData();
      fd.append('file', uploadForm.file);
      fd.append('title', uploadForm.title);
      fd.append('description', uploadForm.description || '');
      fd.append('category', uploadForm.category);
      if (uploadForm.tags) fd.append('tags', uploadForm.tags);
      if (uploadForm.beneficiary?.id) fd.append('beneficiaryId', uploadForm.beneficiary.id);
      await api.post('/admin/clinical-docs', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadDialog({ open: false, saving: false, err: '' });
      loadStats();
      loadList();
    } catch (err) {
      setUploadDialog(d => ({
        ...d,
        saving: false,
        err: err?.response?.data?.message || 'فشل الرفع',
      }));
    }
  };

  const doDownload = async doc => {
    try {
      const response = await api.get(`/admin/clinical-docs/${doc._id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.originalFileName || doc.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التنزيل');
    }
  };

  const submitShare = async () => {
    const { doc, guardian, permission } = shareDialog;
    if (!doc || !guardian?.id) return;
    setShareDialog(d => ({ ...d, saving: true, err: '' }));
    try {
      await api.post(`/admin/clinical-docs/${doc._id}/share`, {
        guardianId: guardian.guardians?.[0] || guardian.id, // prefer linked guardian if available
        userId: guardian.userId, // if already resolved
        permission,
      });
      setShareDialog({
        open: false,
        doc: null,
        guardian: null,
        permission: 'view',
        saving: false,
        err: '',
      });
      loadList();
    } catch (err) {
      setShareDialog(d => ({
        ...d,
        saving: false,
        err: err?.response?.data?.message || 'فشل المشاركة',
      }));
    }
  };

  const submitSign = async () => {
    const { doc } = signDialog;
    if (!doc) return;
    setSignDialog(d => ({ ...d, saving: true }));
    try {
      await api.post(`/admin/clinical-docs/${doc._id}/sign`, {});
      setSignDialog({ open: false, doc: null, saving: false });
      loadStats();
      loadList();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التوقيع');
      setSignDialog(d => ({ ...d, saving: false }));
    }
  };

  const doArchive = async doc => {
    if (!window.confirm(`أرشفة "${doc.title}"؟`)) return;
    try {
      await api.delete(`/admin/clinical-docs/${doc._id}`);
      loadStats();
      loadList();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الأرشفة');
    }
  };

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: 'إجمالي المستندات',
        value: stats.total || 0,
        icon: <DescriptionIcon />,
        color: 'primary.main',
      },
      {
        label: 'موقَّعة إلكترونياً',
        value: stats.signedCount || 0,
        icon: <VerifiedIcon />,
        color: 'success.main',
      },
      {
        label: 'الحجم الكلي',
        value: formatBytes(stats.totalBytes || 0),
        icon: <StorageIcon />,
        color: 'info.main',
      },
      {
        label: 'الفئات المستخدَمة',
        value: Object.keys(stats.byCategory || {}).length,
        icon: <FolderIcon />,
        color: 'warning.main',
      },
    ];
  }, [stats]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            مكتبة المستندات الإكلينيكية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            رفع التقارير والعقود، مشاركتها مع ولي الأمر، توقيع إلكتروني hash-based.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={() => {
              loadStats();
              loadList();
            }}
          >
            <RefreshIcon />
          </IconButton>
          <Button variant="contained" startIcon={<UploadFileIcon />} onClick={openUpload}>
            رفع مستند
          </Button>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {s.label}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: s.color }}>
                      {s.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: s.color, fontSize: 36 }}>{s.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          <TextField
            size="small"
            placeholder="بحث بالعنوان/الوصف..."
            value={q}
            onChange={e => setQ(e.target.value)}
            sx={{ minWidth: 240 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>الفئة</InputLabel>
            <Select label="الفئة" value={category} onChange={e => setCategory(e.target.value)}>
              <MenuItem value="">الكل</MenuItem>
              {CATEGORIES.map(c => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>العنوان</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell align="right">الحجم</TableCell>
              <TableCell>مشاركات</TableCell>
              <TableCell>توقيعات</TableCell>
              <TableCell>تاريخ الرفع</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا توجد مستندات
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map(d => (
              <TableRow key={d._id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {d.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {d.originalFileName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={d.fileType?.toUpperCase() || 'FILE'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{d.category}</TableCell>
                <TableCell align="right">{formatBytes(d.fileSize)}</TableCell>
                <TableCell>
                  {d.sharedWith?.length ? (
                    <Chip
                      size="small"
                      icon={<ShareIcon fontSize="small" />}
                      label={d.sharedWith.length}
                    />
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  {d.signatures?.length ? (
                    <Chip
                      size="small"
                      icon={<VerifiedIcon fontSize="small" />}
                      label={d.signatures.length}
                      color="success"
                    />
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{formatDate(d.createdAt)}</TableCell>
                <TableCell align="center">
                  <Tooltip title="عرض">
                    <IconButton size="small" onClick={() => setDetailDoc(d)}>
                      <DescriptionIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تنزيل">
                    <IconButton size="small" color="primary" onClick={() => doDownload(d)}>
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="مشاركة">
                    <IconButton
                      size="small"
                      onClick={() =>
                        setShareDialog({
                          open: true,
                          doc: d,
                          guardian: null,
                          permission: 'view',
                          saving: false,
                          err: '',
                        })
                      }
                    >
                      <ShareIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="توقيع إلكتروني">
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => setSignDialog({ open: true, doc: d, saving: false })}
                    >
                      <DrawIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="أرشفة">
                    <IconButton size="small" color="error" onClick={() => doArchive(d)}>
                      <ArchiveIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          p={2}
          borderTop={1}
          borderColor="divider"
        >
          <Typography variant="body2" color="text.secondary">
            {pagination.total} مستند · صفحة {pagination.page} من {pagination.pages || 1}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >
              السابق
            </Button>
            <Button
              size="small"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >
              التالي
            </Button>
          </Stack>
        </Stack>
      </TableContainer>

      {/* Upload dialog */}
      <Dialog
        open={uploadDialog.open}
        onClose={() => setUploadDialog({ open: false, saving: false, err: '' })}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>رفع مستند جديد</DialogTitle>
        <DialogContent dividers>
          {uploadDialog.err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {uploadDialog.err}
            </Alert>
          )}
          <Stack spacing={2}>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              {uploadForm.file ? uploadForm.file.name : 'اختيار ملف'}
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.tiff,.tif,.zip"
                onChange={e => setUploadForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
              />
            </Button>
            {uploadForm.file && (
              <Typography variant="caption" color="text.secondary">
                الحجم: {formatBytes(uploadForm.file.size)}
              </Typography>
            )}
            <TextField
              fullWidth
              label="العنوان *"
              value={uploadForm.title}
              onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="الوصف"
              value={uploadForm.description}
              onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
            />
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                label="الفئة"
                value={uploadForm.category}
                onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <BeneficiaryTypeahead
              label="المستفيد (اختياري)"
              value={
                uploadForm.beneficiary
                  ? { _id: uploadForm.beneficiary.id, name_ar: uploadForm.beneficiary.label }
                  : null
              }
              onChange={v =>
                setUploadForm(f => ({
                  ...f,
                  beneficiary: v
                    ? {
                        id: v._id,
                        label: v.name_ar || v.name_en || v.beneficiaryNumber || '—',
                      }
                    : null,
                }))
              }
            />
            <TextField
              fullWidth
              label="وسوم (مفصولة بفواصل)"
              value={uploadForm.tags}
              onChange={e => setUploadForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="تقرير, شهرية, معالج فلاني"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setUploadDialog({ open: false, saving: false, err: '' })}
            disabled={uploadDialog.saving}
          >
            إلغاء
          </Button>
          <Button variant="contained" onClick={submitUpload} disabled={uploadDialog.saving}>
            {uploadDialog.saving ? <CircularProgress size={20} /> : 'رفع'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share dialog */}
      <Dialog
        open={shareDialog.open}
        onClose={() =>
          setShareDialog({
            open: false,
            doc: null,
            guardian: null,
            permission: 'view',
            saving: false,
            err: '',
          })
        }
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>مشاركة مستند</DialogTitle>
        <DialogContent dividers>
          {shareDialog.err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {shareDialog.err}
            </Alert>
          )}
          <Stack spacing={2}>
            <Alert severity="info">{shareDialog.doc?.title}</Alert>
            <BeneficiaryTypeahead
              label="اختر المستفيد (لمشاركتها مع وليّه)"
              value={
                shareDialog.guardian
                  ? { _id: shareDialog.guardian.id, name_ar: shareDialog.guardian.label }
                  : null
              }
              onChange={v =>
                setShareDialog(d => ({
                  ...d,
                  guardian: v
                    ? {
                        id: v._id,
                        label: v.name_ar || v.name_en || v.beneficiaryNumber || '—',
                      }
                    : null,
                }))
              }
            />
            <FormControl fullWidth>
              <InputLabel>الصلاحية</InputLabel>
              <Select
                label="الصلاحية"
                value={shareDialog.permission}
                onChange={e => setShareDialog(d => ({ ...d, permission: e.target.value }))}
              >
                <MenuItem value="view">عرض فقط</MenuItem>
                <MenuItem value="download">عرض + تنزيل</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setShareDialog({
                open: false,
                doc: null,
                guardian: null,
                permission: 'view',
                saving: false,
                err: '',
              })
            }
            disabled={shareDialog.saving}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={submitShare}
            disabled={shareDialog.saving || !shareDialog.guardian}
          >
            {shareDialog.saving ? <CircularProgress size={20} /> : 'مشاركة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sign dialog */}
      <Dialog
        open={signDialog.open}
        onClose={() => setSignDialog({ open: false, doc: null, saving: false })}
        dir="rtl"
      >
        <DialogTitle>التوقيع الإلكتروني</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            سيتم إنشاء توقيع SHA-256 يربط بين هويتك والمستند ووقت التوقيع.
          </Alert>
          <Typography>
            المستند: <strong>{signDialog.doc?.title}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSignDialog({ open: false, doc: null, saving: false })}
            disabled={signDialog.saving}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={submitSign}
            disabled={signDialog.saving}
          >
            {signDialog.saving ? <CircularProgress size={20} /> : 'توقيع'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail dialog */}
      <Dialog
        open={Boolean(detailDoc)}
        onClose={() => setDetailDoc(null)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>{detailDoc?.title}</DialogTitle>
        <DialogContent dividers>
          {detailDoc && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الملف الأصلي
                  </Typography>
                  <Typography>{detailDoc.originalFileName}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">
                    النوع
                  </Typography>
                  <Typography>{detailDoc.fileType?.toUpperCase()}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">
                    الحجم
                  </Typography>
                  <Typography>{formatBytes(detailDoc.fileSize)}</Typography>
                </Grid>
                {detailDoc.description && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      الوصف
                    </Typography>
                    <Typography>{detailDoc.description}</Typography>
                  </Grid>
                )}
                {detailDoc.tags?.length > 0 && (
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {detailDoc.tags.map(t => (
                        <Chip key={t} size="small" label={t} />
                      ))}
                    </Stack>
                  </Grid>
                )}
              </Grid>

              {detailDoc.sharedWith?.length > 0 && (
                <>
                  <Divider />
                  <Typography variant="subtitle2">مُشارَك مع</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>الاسم</TableCell>
                        <TableCell>البريد</TableCell>
                        <TableCell>الصلاحية</TableCell>
                        <TableCell>تاريخ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailDoc.sharedWith.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>{s.name || '—'}</TableCell>
                          <TableCell>{s.email || '—'}</TableCell>
                          <TableCell>
                            <Chip size="small" label={s.permission} />
                          </TableCell>
                          <TableCell>{formatDate(s.sharedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}

              {detailDoc.signatures?.length > 0 && (
                <>
                  <Divider />
                  <Typography variant="subtitle2">التوقيعات</Typography>
                  {detailDoc.signatures.map((sig, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <VerifiedIcon color="success" fontSize="small" />
                          <Typography variant="body2">{formatDate(sig.signedAt)}</Typography>
                        </Stack>
                        <Chip size="small" label={sig.status} color="success" />
                      </Stack>
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}
                      >
                        {sig.signatureHash}
                      </Typography>
                    </Paper>
                  ))}
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDoc(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
