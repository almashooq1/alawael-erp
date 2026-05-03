/**
 * BehaviorManagement — إدارة السلوك (ABC Behavior Incident Log)
 * Real-API version: connects to /api/rehabilitation-advanced/behavior-incidents
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import { behaviorAPI, coreAPI } from '../../services/ddd';

/* ── Constants ───────────────────────────────────────────────── */
const BEHAVIOR_TYPES = [
  { value: 'aggression', label: 'عدوان' },
  { value: 'self_injury', label: 'إيذاء ذاتي' },
  { value: 'elopement', label: 'هروب' },
  { value: 'property_destruction', label: 'تدمير ممتلكات' },
  { value: 'disruption', label: 'تعطيل' },
  { value: 'other', label: 'أخرى' },
];

const SEVERITY_LEVELS = [
  { value: 'minor', label: 'خفيفة', color: 'success' },
  { value: 'moderate', label: 'متوسطة', color: 'warning' },
  { value: 'major', label: 'شديدة', color: 'error' },
];

const EMPTY_FORM = {
  beneficiary_id: '',
  behaviorType: 'aggression',
  severity: 'minor',
  observedAt: new Date().toISOString().slice(0, 16),
  durationMinutes: '',
  antecedent: '',
  behaviorDescription: '',
  consequence: '',
};

/* ── AddIncidentDialog ───────────────────────────────────────── */
function AddIncidentDialog({ open, onClose, onSave, error, beneficiaries }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  useEffect(() => {
    if (!open) setForm(EMPTY_FORM);
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>تسجيل حادثة سلوكية جديدة</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>المستفيد</InputLabel>
              <Select value={form.beneficiary_id} label="المستفيد" onChange={set('beneficiary_id')}>
                {beneficiaries.map(b => (
                  <MenuItem key={b._id} value={b._id}>
                    {b.name?.full || `${b.firstName || ''} ${b.lastName || ''}`.trim() || b._id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>نوع السلوك</InputLabel>
              <Select value={form.behaviorType} label="نوع السلوك" onChange={set('behaviorType')}>
                {BEHAVIOR_TYPES.map(t => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>الشدة</InputLabel>
              <Select value={form.severity} label="الشدة" onChange={set('severity')}>
                {SEVERITY_LEVELS.map(s => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="وقت الملاحظة"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={form.observedAt}
              onChange={set('observedAt')}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="المدة (دقائق)"
              type="number"
              value={form.durationMinutes}
              onChange={set('durationMinutes')}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="المحفز (Antecedent)"
              multiline
              rows={2}
              value={form.antecedent}
              onChange={set('antecedent')}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="وصف السلوك"
              multiline
              rows={2}
              value={form.behaviorDescription}
              onChange={set('behaviorDescription')}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="النتيجة / التدخل (Consequence)"
              multiline
              rows={2}
              value={form.consequence}
              onChange={set('consequence')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !form.beneficiary_id}
        >
          {saving ? <CircularProgress size={18} /> : 'تسجيل'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function BehaviorManagement() {
  const [incidents, setIncidents] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = {};
    if (filterType) params.behavior_type = filterType;
    if (filterSeverity) params.severity = filterSeverity;
    try {
      const [incRes, benefRes] = await Promise.allSettled([
        behaviorAPI.list(params),
        coreAPI.list({ limit: 200 }),
      ]);
      if (incRes.status === 'fulfilled') {
        const d = incRes.value?.data;
        setIncidents(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
      } else {
        setError('تعذّر تحميل بيانات الحوادث');
      }
      if (benefRes.status === 'fulfilled') {
        const bd = benefRes.value?.data;
        setBeneficiaries(Array.isArray(bd?.data) ? bd.data : Array.isArray(bd) ? bd : []);
      }
    } finally {
      setLoading(false);
    }
  }, [filterType, filterSeverity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async form => {
    setFormError('');
    try {
      await behaviorAPI.create({
        ...form,
        observedAt: form.observedAt
          ? new Date(form.observedAt).toISOString()
          : new Date().toISOString(),
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
      });
      setAddOpen(false);
      loadData();
    } catch (e) {
      setFormError(e?.response?.data?.message || e?.message || 'خطأ في الحفظ');
    }
  };

  const getBeneficiaryName = id => {
    const b = beneficiaries.find(x => x._id === (id?._id || id));
    if (!b) return String(id || '-');
    return b.name?.full || `${b.firstName || ''} ${b.lastName || ''}`.trim() || '-';
  };

  const typeLabel = v => BEHAVIOR_TYPES.find(t => t.value === v)?.label || v || '-';
  const severityMeta = v =>
    SEVERITY_LEVELS.find(s => s.value === v) || { label: v || '-', color: 'default' };

  const derived = {
    total: incidents.length,
    major: incidents.filter(i => i.severity === 'major').length,
    moderate: incidents.filter(i => i.severity === 'moderate').length,
    minor: incidents.filter(i => i.severity === 'minor').length,
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ── Header ── */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <PsychologyIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              إدارة السلوك
            </Typography>
            <Typography variant="body2" color="text.secondary">
              سجل حوادث السلوك وفق تحليل ABC
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={loadData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setFormError('');
              setAddOpen(true);
            }}
          >
            تسجيل حادثة
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* ── Stats Cards ── */}
      <Grid container spacing={3} mb={3}>
        {[
          { label: 'إجمالي الحوادث', value: derived.total, color: 'primary' },
          { label: 'شديدة', value: derived.major, color: 'error' },
          { label: 'متوسطة', value: derived.moderate, color: 'warning' },
          { label: 'خفيفة', value: derived.minor, color: 'success' },
        ].map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h3" fontWeight="bold" color={`${s.color}.main`}>
                  {loading ? <CircularProgress size={28} /> : s.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Filters ── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FilterListIcon color="action" />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>نوع السلوك</InputLabel>
            <Select
              value={filterType}
              label="نوع السلوك"
              onChange={e => setFilterType(e.target.value)}
            >
              <MenuItem value="">الكل</MenuItem>
              {BEHAVIOR_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>الشدة</InputLabel>
            <Select
              value={filterSeverity}
              label="الشدة"
              onChange={e => setFilterSeverity(e.target.value)}
            >
              <MenuItem value="">الكل</MenuItem>
              {SEVERITY_LEVELS.map(s => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {(filterType || filterSeverity) && (
            <Button
              size="small"
              onClick={() => {
                setFilterType('');
                setFilterSeverity('');
              }}
            >
              مسح الفلاتر
            </Button>
          )}
        </Stack>
      </Paper>

      {/* ── Table ── */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>المستفيد</TableCell>
              <TableCell>وقت الملاحظة</TableCell>
              <TableCell>نوع السلوك</TableCell>
              <TableCell align="center">الشدة</TableCell>
              <TableCell>المحفز</TableCell>
              <TableCell>التدخل</TableCell>
              <TableCell>المدة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : incidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  لا توجد حوادث مسجلة
                </TableCell>
              </TableRow>
            ) : (
              incidents.map(inc => {
                const sev = severityMeta(inc.severity);
                return (
                  <TableRow key={inc._id} hover>
                    <TableCell>
                      {getBeneficiaryName(inc.beneficiary_id || inc.beneficiaryId)}
                    </TableCell>
                    <TableCell>
                      {inc.observedAt ? new Date(inc.observedAt).toLocaleString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell>{typeLabel(inc.behaviorType)}</TableCell>
                    <TableCell align="center">
                      <Chip label={sev.label} color={sev.color} size="small" />
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 160,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {inc.antecedent || '-'}
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 180,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {inc.consequence || '-'}
                    </TableCell>
                    <TableCell>
                      {inc.durationMinutes != null ? `${inc.durationMinutes} د` : '-'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Add Dialog ── */}
      <AddIncidentDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleCreate}
        error={formError}
        beneficiaries={beneficiaries}
      />
    </Container>
  );
}
