/**
 * OCR Document Dashboard — لوحة تحكم معالجة المستندات
 * Phase 18 — مسح التقارير الطبية الورقية وتحويلها لبيانات
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea,
  Chip, LinearProgress, Alert, Snackbar, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Divider, Badge, MenuItem, Select,
  FormControl, InputLabel, Button,
} from '@mui/material';
import {
  DocumentScanner as ScanIcon,
  Description as DocIcon,
  Verified as VerifiedIcon,
  PendingActions as PendingIcon,
  Speed as SpeedIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  CloudUpload as UploadIcon,
  BatchPrediction as BatchIcon,
  TextSnippet as TextIcon,
  HourglassTop as QueueIcon,
  Analytics as AnalyticsIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ocrDocumentService from '../../services/ocrDocumentService';

/* ── helpers ── */
const statusColor = (status) => {
  const map = {
    queued: 'default', preprocessing: 'info', ocr_running: 'info',
    parsing: 'warning', review_needed: 'warning',
    completed: 'success', failed: 'error', archived: 'default',
  };
  return map[status] || 'default';
};

const statusLabel = {
  queued: 'في الانتظار', preprocessing: 'معالجة أولية', ocr_running: 'تعرف ضوئي',
  parsing: 'تحليل', review_needed: 'بحاجة مراجعة',
  completed: 'مكتمل', failed: 'فشل', archived: 'مؤرشف',
};

const docTypeLabel = {
  discharge_summary: 'ملخص خروج', lab_report: 'تقرير مختبر', prescription: 'وصفة طبية',
  radiology_report: 'تقرير أشعة', therapy_report: 'تقرير علاج', progress_note: 'ملاحظة تقدم',
  assessment_form: 'نموذج تقييم', referral_letter: 'خطاب إحالة',
  consent_form: 'نموذج موافقة', insurance_claim: 'مطالبة تأمين', other: 'أخرى',
};

const confColor = (score) => {
  if (!score) return 'text.disabled';
  if (score >= 0.90) return 'success.main';
  if (score >= 0.80) return 'warning.main';
  return 'error.main';
};

export default function OCRDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, docsRes] = await Promise.all([
        ocrDocumentService.getDashboard(),
        ocrDocumentService.listDocuments({
          search: search || undefined,
          status: statusFilter || undefined,
          documentType: typeFilter || undefined,
        }),
      ]);
      setDashboard(dashRes.data?.data || dashRes.data);
      setDocuments(docsRes.data?.data || docsRes.data || []);
    } catch (e) {
      setSnack({ open: true, msg: 'فشل تحميل البيانات', severity: 'error' });
    } finally { setLoading(false); }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const kpis = dashboard?.kpis || {};

  /* ── KPI Cards ── */
  const kpiCards = [
    { label: 'إجمالي المستندات', value: kpis.totalDocuments ?? 0, icon: <DocIcon />, color: '#1976d2' },
    { label: 'مستندات مكتملة', value: kpis.completedDocuments ?? 0, icon: <VerifiedIcon />, color: '#2e7d32' },
    { label: 'بحاجة مراجعة', value: kpis.pendingReview ?? 0, icon: <PendingIcon />, color: '#ed6c02' },
    { label: 'في الانتظار', value: kpis.queuedDocuments ?? 0, icon: <QueueIcon />, color: '#9c27b0' },
    { label: 'متوسط الثقة', value: `${Math.round((kpis.avgConfidence || 0) * 100)}%`, icon: <SpeedIcon />, color: '#0288d1' },
    { label: 'إجمالي الصفحات', value: kpis.totalPages ?? 0, icon: <TextIcon />, color: '#00695c' },
    { label: 'الحجم (MB)', value: kpis.totalSizeMB ?? 0, icon: <AnalyticsIcon />, color: '#5d4037' },
    { label: 'الدفعات النشطة', value: kpis.activeBatches ?? 0, icon: <BatchIcon />, color: '#c62828' },
  ];

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            <ScanIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 36 }} />
            معالجة المستندات بالتعرف الضوئي (OCR)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مسح التقارير الطبية الورقية وتحويلها لبيانات رقمية منظمة
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<UploadIcon />}
            onClick={() => navigate('/ocr-documents/process')}>
            رفع مستند جديد
          </Button>
          <IconButton onClick={load} color="primary"><RefreshIcon /></IconButton>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpiCards.map((kpi, i) => (
          <Grid item xs={6} sm={3} md={1.5} key={i}>
            <Card sx={{ textAlign: 'center', borderTop: `3px solid ${kpi.color}` }}>
              <CardContent sx={{ py: 1.5, px: 1, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ color: kpi.color, mb: 0.5 }}>{kpi.icon}</Box>
                <Typography variant="h5" fontWeight="bold">{kpi.value}</Typography>
                <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'معالجة مستند', icon: <ScanIcon />, path: '/ocr-documents/process', color: '#1976d2' },
          { label: 'معالجة دفعة', icon: <BatchIcon />, path: '/ocr-documents/process', color: '#9c27b0' },
          { label: 'القوالب', icon: <TextIcon />, path: '/ocr-documents/process', color: '#00695c' },
          { label: 'البحث في النصوص', icon: <SearchIcon />, path: '/ocr-documents/process', color: '#ed6c02' },
        ].map((action, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card>
              <CardActionArea onClick={() => navigate(action.path)} sx={{ p: 2, textAlign: 'center' }}>
                <Box sx={{ color: action.color, mb: 1 }}>{action.icon}</Box>
                <Typography variant="subtitle2">{action.label}</Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="ابحث بالاسم أو الوسم..."
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ minWidth: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>الحالة</InputLabel>
          <Select value={statusFilter} label="الحالة" onChange={e => setStatusFilter(e.target.value)}>
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(statusLabel).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>نوع المستند</InputLabel>
          <Select value={typeFilter} label="نوع المستند" onChange={e => setTypeFilter(e.target.value)}>
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(docTypeLabel).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select>
        </FormControl>
        <Button size="small" startIcon={<FilterIcon />} onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }}>
          مسح الفلاتر
        </Button>
      </Box>

      {/* Documents Table */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell align="right"><strong>اسم الملف</strong></TableCell>
              <TableCell align="right"><strong>النوع</strong></TableCell>
              <TableCell align="right"><strong>الحالة</strong></TableCell>
              <TableCell align="right"><strong>الثقة</strong></TableCell>
              <TableCell align="right"><strong>الصفحات</strong></TableCell>
              <TableCell align="right"><strong>تاريخ الرفع</strong></TableCell>
              <TableCell align="center"><strong>إجراءات</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>لا توجد مستندات</Typography>
                </TableCell>
              </TableRow>
            ) : documents.map((doc) => (
              <TableRow key={doc.id} hover>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DocIcon fontSize="small" color="action" />
                    <Typography variant="body2">{doc.fileName}</Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Chip size="small" label={docTypeLabel[doc.documentType] || doc.documentType} variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  <Chip size="small" label={statusLabel[doc.status] || doc.status}
                    color={statusColor(doc.status)} />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ color: confColor(doc.confidenceScore), fontWeight: 'bold' }}>
                    {doc.confidenceScore ? `${Math.round(doc.confidenceScore * 100)}%` : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">{doc.pageCount || '—'}</TableCell>
                <TableCell align="right">
                  <Typography variant="caption">
                    {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('ar-SA') : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="عرض التفاصيل">
                    <IconButton size="small" onClick={() => navigate(`/ocr-documents/process`)}>
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تصدير">
                    <IconButton size="small" color="primary"><DownloadIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Review Needed Section */}
      {(dashboard?.reviewNeeded?.length > 0) && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <Badge badgeContent={dashboard.reviewNeeded.length} color="warning" sx={{ mr: 2 }}>
              <PendingIcon color="warning" />
            </Badge>
            مستندات بحاجة مراجعة
          </Typography>
          <Grid container spacing={2}>
            {dashboard.reviewNeeded.map((doc) => (
              <Grid item xs={12} sm={6} md={4} key={doc.id}>
                <Card variant="outlined" sx={{ borderColor: 'warning.main' }}>
                  <CardActionArea sx={{ p: 2 }} onClick={() => navigate('/ocr-documents/process')}>
                    <Typography variant="subtitle2">{doc.fileName}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Chip size="small" label={docTypeLabel[doc.documentType] || doc.documentType} />
                      <Typography variant="body2" sx={{ color: confColor(doc.confidenceScore) }}>
                        ثقة: {doc.confidenceScore ? `${Math.round(doc.confidenceScore * 100)}%` : '—'}
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
