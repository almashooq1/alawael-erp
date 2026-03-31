/**
 * AI Diagnostic Dashboard — لوحة تحكم الذكاء الاصطناعي
 * Phase 17
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent,
  Chip, Alert, Snackbar, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Divider, Avatar, MenuItem, Select,
  FormControl, InputLabel, CircularProgress,
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  AutoAwesome as AIIcon,
  MedicalServices as MedicalIcon,
  Speed as SpeedIcon,
  NotificationsActive as AlertIcon,
  BarChart as ChartIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import aiDiagnosticService from '../../services/aiDiagnosticService';

/* ── helpers ── */
const _riskColor = (level) => {
  const map = { low: 'success', medium: 'warning', high: 'error', critical: 'error' };
  return map[level] || 'default';
};

const disabilityLabel = {
  physical: 'حركية', intellectual: 'ذهنية', autism: 'توحد',
  hearing: 'سمعية', visual: 'بصرية', speech: 'نطقية',
  learning: 'تعلم', multiple: 'متعددة', psychiatric: 'نفسية', neurological: 'عصبية',
};

export default function AIDiagnosticDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, benRes] = await Promise.all([
        aiDiagnosticService.getDashboard(),
        aiDiagnosticService.listBeneficiaries({ search, disabilityType: typeFilter || undefined }),
      ]);
      setDashboard(dashRes.data?.data || dashRes.data);
      setBeneficiaries(dashRes.data?.data ? benRes.data?.data || [] : benRes.data || []);
    } catch (e) {
      setSnackbar({ open: true, message: 'حدث خطأ في تحميل البيانات', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  const kpis = dashboard || {};

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            <PsychologyIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">ذكاء اصطناعي للتشخيص</Typography>
            <Typography variant="body2" color="text.secondary">
              تحليل تقدم المستفيد وتوصيات علاجية بالـ AI
            </Typography>
          </Box>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={load} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── KPI Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'المستفيدون النشطون', value: kpis.totalBeneficiaries, icon: <PeopleIcon />, color: '#1976d2' },
          { label: 'متوسط التقدم', value: `${kpis.averageProgress || 0}%`, icon: <TrendingUpIcon />, color: '#2e7d32' },
          { label: 'متوسط المشاركة', value: `${kpis.averageEngagement || 0}%`, icon: <SpeedIcon />, color: '#ed6c02' },
          { label: 'في تحسن', value: kpis.improvingBeneficiaries, icon: <ChartIcon />, color: '#9c27b0' },
          { label: 'الأهداف العلاجية', value: kpis.totalGoals, icon: <AssessmentIcon />, color: '#0288d1' },
          { label: 'الخطط النشطة', value: kpis.activePlans, icon: <MedicalIcon />, color: '#d32f2f' },
          { label: 'نماذج AI نشطة', value: kpis.aiModelsActive, icon: <AIIcon />, color: '#7b1fa2' },
          { label: 'تنبيهات نشطة', value: kpis.activeAlerts, icon: <AlertIcon />, color: '#f57c00' },
        ].map((kpi, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card elevation={2}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: kpi.color, width: 44, height: 44 }}>{kpi.icon}</Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{kpi.value ?? '-'}</Typography>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Alerts Summary ── */}
      {kpis.alertsSummary && (kpis.alertsSummary.critical > 0 || kpis.alertsSummary.warning > 0) && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
          <strong>تنبيهات نشطة:</strong>
          {kpis.alertsSummary.critical > 0 && ` ${kpis.alertsSummary.critical} حرج`}
          {kpis.alertsSummary.warning > 0 && ` • ${kpis.alertsSummary.warning} تحذير`}
          {kpis.alertsSummary.info > 0 && ` • ${kpis.alertsSummary.info} معلومات`}
        </Alert>
      )}

      {/* ── Disability Distribution ── */}
      {kpis.disabilityDistribution && (
        <Card sx={{ mb: 3 }} elevation={1}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              توزيع أنواع الإعاقة
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(kpis.disabilityDistribution).map(([type, count]) => (
                <Chip
                  key={type}
                  label={`${disabilityLabel[type] || type}: ${count}`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* ── Filters ── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="بحث بالاسم أو رقم الهوية..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ minWidth: 280 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>نوع الإعاقة</InputLabel>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} label="نوع الإعاقة">
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(disabilityLabel).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* ── Beneficiaries Table ── */}
      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              {['المستفيد', 'نوع الإعاقة', 'الشدة', 'الحالة', 'تاريخ التسجيل', 'إجراءات'].map((h) => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {beneficiaries.map((b) => (
              <TableRow key={b.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: 14 }}>
                      {b.name?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{b.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{b.nationalId}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={disabilityLabel[b.disabilityType] || b.disabilityType} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={b.disabilitySeverity === 'mild' ? 'خفيفة' : b.disabilitySeverity === 'moderate' ? 'متوسطة' : 'شديدة'}
                    size="small"
                    color={b.disabilitySeverity === 'mild' ? 'success' : b.disabilitySeverity === 'moderate' ? 'warning' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={b.status === 'active' ? 'نشط' : 'غير نشط'}
                    size="small"
                    color={b.status === 'active' ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>{b.enrollmentDate}</TableCell>
                <TableCell>
                  <Tooltip title="تحليل AI">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => navigate(`/ai-diagnostic/beneficiary/${b.id}`)}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {beneficiaries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>لا توجد نتائج</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
