import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Card, CardContent, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Alert, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Divider,
  FormControl, InputLabel, Select, Pagination,
  List, ListItem, ListItemText, ListItemIcon,
} from '@mui/material';
import {
  Assessment as ReportIcon, ArrowBack as BackIcon,
  Download as ExportIcon, PlayArrow as RunIcon,
  Share as ShareIcon, Schedule as ScheduleIcon,
  PieChart as ChartIcon, TableChart as TableViewIcon,
  FilterList as FilterIcon, Refresh as RefreshIcon,
  History as HistoryIcon, Star as StarIcon, StarBorder as StarBorderIcon,
  PersonAdd as ShareUserIcon, } from '@mui/icons-material';
import reportBuilderService from '../../services/reportBuilderService';

/* ═══════════════════════════════════════════════════════════
   Report Viewer — Execute & View Results
   ═══════════════════════════════════════════════════════════ */
export default function ReportViewer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [executions, setExecutions] = useState([]);

  // Dialogs
  const [shareOpen, setShareOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareForm, setShareForm] = useState({ userId: '', role: '', permission: 'view' });
  const [scheduleForm, setScheduleForm] = useState({ frequency: 'daily', time: '08:00', recipients: '', format: 'excel' });
  const [shares, setShares] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);

  // Load report details
  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reportBuilderService.getReportById(id);
      setReport(res.data?.data);
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في تحميل التقرير');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Execute report
  const executeReport = useCallback(async (p = page) => {
    try {
      setLoading(true);
      setError(null);
      const res = await reportBuilderService.executeReport(id, { page: p, pageSize });
      setResult(res.data?.data);
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في تنفيذ التقرير');
    } finally {
      setLoading(false);
    }
  }, [id, page, pageSize]);

  useEffect(() => { loadReport(); }, [loadReport]);
  useEffect(() => { if (report) executeReport(page); }, [report, page]); // eslint-disable-line

  // ── Export ──
  const handleExport = async (format) => {
    try {
      const res = await reportBuilderService.exportReport(id, format);
      if (res.data?.data?.downloadUrl) {
        window.open(res.data.data.downloadUrl, '_blank');
      }
    } catch (err) {
      setError('خطأ في التصدير');
    }
  };

  // ── Share ──
  const handleShare = async () => {
    try {
      await reportBuilderService.shareReport(id, {
        userId: shareForm.userId || undefined,
        role: shareForm.role || undefined,
        permission: shareForm.permission,
      });
      setShareOpen(false);
      loadShares();
    } catch (err) {
      setError('خطأ في المشاركة');
    }
  };

  const loadShares = async () => {
    try {
      const res = await reportBuilderService.getReportShares(id);
      setShares(res.data?.data || []);
    } catch (err) { /* ignore */ }
  };

  // ── Schedule ──
  const handleCreateSchedule = async () => {
    try {
      await reportBuilderService.createSchedule({
        reportId: id,
        frequency: scheduleForm.frequency,
        time: scheduleForm.time,
        recipients: scheduleForm.recipients.split(',').map(s => s.trim()).filter(Boolean),
        format: scheduleForm.format,
      });
      setScheduleOpen(false);
    } catch (err) {
      setError('خطأ في إنشاء الجدولة');
    }
  };

  // ── Execution History ──
  const loadHistory = async () => {
    try {
      const res = await reportBuilderService.getExecutionHistory(id);
      setExecutions(res.data?.data || []);
      setHistoryOpen(true);
    } catch (err) { /* ignore */ }
  };

  // ── Favorite ──
  const handleToggleFavorite = async () => {
    try {
      const res = await reportBuilderService.toggleFavorite(id);
      setIsFavorite(res.data?.data?.isFavorite);
    } catch (err) { /* ignore */ }
  };

  const columns = result?.columns || report?.columns || [];
  const rows = result?.rows || [];
  const pagination = result?.pagination || {};
  const summary = result?.summary;

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={() => navigate('/report-builder')}><BackIcon /></IconButton>
          <ReportIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {report?.nameAr || report?.name || 'عرض التقرير'}
            </Typography>
            {report?.description && (
              <Typography variant="body2" color="text.secondary">{report.description}</Typography>
            )}
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <IconButton onClick={handleToggleFavorite}>
            {isFavorite ? <StarIcon color="warning" /> : <StarBorderIcon />}
          </IconButton>
          <Button startIcon={<RefreshIcon />} onClick={() => executeReport(page)} disabled={loading}>
            تحديث
          </Button>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={() => handleExport('excel')}>
            تصدير Excel
          </Button>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={() => handleExport('pdf')}>
            PDF
          </Button>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={() => handleExport('csv')}>
            CSV
          </Button>
          <Button startIcon={<ShareIcon />} onClick={() => { setShareOpen(true); loadShares(); }}>
            مشاركة
          </Button>
          <Button startIcon={<ScheduleIcon />} onClick={() => setScheduleOpen(true)}>
            جدولة
          </Button>
          <Button startIcon={<HistoryIcon />} onClick={loadHistory}>
            السجل
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Execution Info */}
      {result && (
        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
          <Chip icon={<RunIcon />} label={`وقت التنفيذ: ${result.duration}ms`} size="small" color="info" />
          <Chip icon={<TableViewIcon />} label={`${pagination.totalRows || 0} صف`} size="small" />
          <Chip icon={<FilterIcon />} label={`${report?.filters?.length || 0} تصفية`} size="small" variant="outlined" />
          {report?.chartConfig && <Chip icon={<ChartIcon />} label={`رسم: ${report.chartConfig.type}`} size="small" color="secondary" />}
        </Box>
      )}

      {/* Active Filters */}
      {report?.filters?.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>التصفيات النشطة:</Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {report.filters.map((f, i) => (
              <Chip key={i} label={`${f.fieldId} ${f.operator} ${f.value}`} size="small" onDelete={() => {}} variant="outlined" />
            ))}
          </Box>
        </Paper>
      )}

      {/* Chart Placeholder */}
      {report?.chartConfig && result && (
        <Paper sx={{ p: 3, mb: 2, textAlign: 'center' }}>
          <ChartIcon sx={{ fontSize: 60, color: 'primary.light', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            {report.chartConfig.title || 'الرسم البياني'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            نوع: {report.chartConfig.type} • محور X: {report.chartConfig.xAxis || '—'} • محور Y: {report.chartConfig.yAxis || '—'}
          </Typography>
          <Alert severity="info" sx={{ mt: 1 }}>
            سيتم عرض الرسم البياني التفاعلي (Chart.js / Recharts) في النسخة الكاملة
          </Alert>
        </Paper>
      )}

      {/* Data Table */}
      <Paper sx={{ mb: 2 }}>
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>#</TableCell>
                {columns.map(col => (
                  <TableCell key={col.fieldId || col} sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                    {col.label || col.fieldId || col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{(page - 1) * pageSize + idx + 1}</TableCell>
                  {columns.map(col => {
                    const key = col.fieldId || col;
                    return <TableCell key={key}>{row[key] ?? '—'}</TableCell>;
                  })}
                </TableRow>
              ))}
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center">
                    <Typography color="text.secondary" py={3}>لا توجد بيانات</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Summary Row */}
        {summary && (
          <Box sx={{ p: 1, bgcolor: 'primary.50', borderTop: '2px solid', borderColor: 'primary.main' }}>
            <Typography variant="subtitle2">الملخص:</Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              {Object.entries(summary).map(([key, val]) => (
                <Chip key={key} label={`${key}: ${typeof val === 'number' ? val.toLocaleString('ar-SA') : val}`} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mb={3}>
          <Pagination
            count={pagination.totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            showFirstButton showLastButton
          />
        </Box>
      )}

      {/* Grouped Data */}
      {result?.grouped && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>البيانات المجمّعة</Typography>
          <Grid container spacing={2}>
            {result.grouped.map((g, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">{g.key || g._id || `المجموعة ${i + 1}`}</Typography>
                    {Object.entries(g).filter(([k]) => k !== 'key' && k !== '_id').map(([k, v]) => (
                      <Typography key={k} variant="body2">{k}: {typeof v === 'number' ? v.toLocaleString('ar-SA') : v}</Typography>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* ── Share Dialog ── */}
      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>مشاركة التقرير</DialogTitle>
        <DialogContent>
          {shares.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>المشاركات الحالية:</Typography>
              <List dense>
                {shares.map((s, i) => (
                  <ListItem key={i}>
                    <ListItemIcon><ShareUserIcon /></ListItemIcon>
                    <ListItemText primary={s.userId || s.role} secondary={s.permission} />
                  </ListItem>
                ))}
              </List>
              <Divider sx={{ mb: 1 }} />
            </Box>
          )}
          <TextField fullWidth size="small" label="معرّف المستخدم" value={shareForm.userId}
            onChange={e => setShareForm(p => ({ ...p, userId: e.target.value }))} sx={{ mb: 1, mt: 1 }} />
          <TextField fullWidth size="small" label="أو الدور" value={shareForm.role}
            onChange={e => setShareForm(p => ({ ...p, role: e.target.value }))} sx={{ mb: 1 }} />
          <FormControl fullWidth size="small">
            <InputLabel>الصلاحية</InputLabel>
            <Select value={shareForm.permission} label="الصلاحية" onChange={e => setShareForm(p => ({ ...p, permission: e.target.value }))}>
              <MenuItem value="view">عرض فقط</MenuItem>
              <MenuItem value="edit">تعديل</MenuItem>
              <MenuItem value="admin">إدارة كاملة</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleShare} disabled={!shareForm.userId && !shareForm.role}>مشاركة</Button>
        </DialogActions>
      </Dialog>

      {/* ── Schedule Dialog ── */}
      <Dialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>جدولة التقرير</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1, mb: 1 }}>
            <InputLabel>التكرار</InputLabel>
            <Select value={scheduleForm.frequency} label="التكرار" onChange={e => setScheduleForm(p => ({ ...p, frequency: e.target.value }))}>
              <MenuItem value="daily">يومي</MenuItem>
              <MenuItem value="weekly">أسبوعي</MenuItem>
              <MenuItem value="monthly">شهري</MenuItem>
              <MenuItem value="quarterly">ربع سنوي</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth size="small" type="time" label="الوقت" value={scheduleForm.time}
            onChange={e => setScheduleForm(p => ({ ...p, time: e.target.value }))} sx={{ mb: 1 }} InputLabelProps={{ shrink: true }} />
          <TextField fullWidth size="small" label="البريد الإلكتروني (فاصلة بين عدة عناوين)"
            value={scheduleForm.recipients} onChange={e => setScheduleForm(p => ({ ...p, recipients: e.target.value }))} sx={{ mb: 1 }} />
          <FormControl fullWidth size="small">
            <InputLabel>صيغة التصدير</InputLabel>
            <Select value={scheduleForm.format} label="صيغة التصدير" onChange={e => setScheduleForm(p => ({ ...p, format: e.target.value }))}>
              <MenuItem value="pdf">PDF</MenuItem>
              <MenuItem value="excel">Excel</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleOpen(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<ScheduleIcon />} onClick={handleCreateSchedule}>إنشاء جدولة</Button>
        </DialogActions>
      </Dialog>

      {/* ── Execution History Dialog ── */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>سجل التنفيذ</DialogTitle>
        <DialogContent>
          <List dense>
            {executions.length === 0 && (
              <ListItem><ListItemText primary="لا يوجد سجل تنفيذ" /></ListItem>
            )}
            {executions.map((e, i) => (
              <ListItem key={i} divider>
                <ListItemIcon><HistoryIcon /></ListItemIcon>
                <ListItemText
                  primary={`${new Date(e.executedAt).toLocaleString('ar-SA')} — ${e.rowCount} صف`}
                  secondary={`المدة: ${e.duration}ms • المستخدم: ${e.executedBy || '—'}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
