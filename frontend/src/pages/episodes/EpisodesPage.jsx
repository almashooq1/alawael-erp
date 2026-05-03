/**
 * Episodes of Care Management Page — صفحة إدارة حلقات الرعاية
 *
 * 12-phase lifecycle aligned with backend EpisodeOfCare enum
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Avatar,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Stack,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  SkipNext as AdvanceIcon,
} from '@mui/icons-material';

import { episodesAPI } from '../../services/ddd';

/* ── Phase definitions — backend-aligned enum ── */
const PHASES = [
  { key: 'referral', label: 'الإحالة', icon: '📋', color: '#9e9e9e' },
  { key: 'intake', label: 'القبول', icon: '📥', color: '#2196f3' },
  { key: 'triage', label: 'الفرز', icon: '🔍', color: '#ff9800' },
  { key: 'initial_assessment', label: 'التقييم الأولي', icon: '📊', color: '#673ab7' },
  { key: 'mdt_review', label: 'مراجعة الفريق', icon: '👥', color: '#00bcd4' },
  { key: 'care_plan_approval', label: 'اعتماد خطة الرعاية', icon: '✅', color: '#009688' },
  { key: 'active_treatment', label: 'العلاج النشط', icon: '💊', color: '#4caf50' },
  { key: 'reassessment', label: 'إعادة التقييم', icon: '🔄', color: '#ff5722' },
  { key: 'outcome_review', label: 'مراجعة النتائج', icon: '📈', color: '#795548' },
  { key: 'discharge_planning', label: 'تخطيط الخروج', icon: '📋', color: '#607d8b' },
  { key: 'discharge', label: 'الخروج', icon: '🏠', color: '#9e9e9e' },
  { key: 'post_discharge_followup', label: 'المتابعة البعدية', icon: '📞', color: '#8bc34a' },
];

const PHASE_INDEX = {};
PHASES.forEach((p, i) => {
  PHASE_INDEX[p.key] = i;
});

const EPISODE_TYPES = [
  { value: 'initial', label: 'أولية' },
  { value: 'continuation', label: 'استمرارية' },
  { value: 'readmission', label: 'إعادة قبول' },
  { value: 'intensive', label: 'مكثفة' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'crisis', label: 'أزمة' },
  { value: 'tele_rehab', label: 'تأهيل عن بعد' },
  { value: 'home_based', label: 'منزلي' },
  { value: 'community', label: 'مجتمعي' },
];

const PRIORITIES = [
  { value: 'routine', label: 'اعتيادية' },
  { value: 'urgent', label: 'عاجلة' },
  { value: 'emergency', label: 'طارئة' },
];

const STATUS_FILTER = [
  { value: '', label: 'الكل' },
  { value: 'active', label: 'نشط' },
  { value: 'planned', label: 'مخطط' },
  { value: 'on_hold', label: 'معلق' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغى' },
];

/* ── CreateEpisodeDialog ── */
const EMPTY_FORM = {
  beneficiaryId: '',
  type: 'initial',
  priority: 'routine',
  startDate: new Date().toISOString().split('T')[0],
  expectedEndDate: '',
  primaryDiagnosis: '',
  clinicalNotes: '',
};

function CreateEpisodeDialog({ open, onClose, onSave, error }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  useEffect(() => {
    if (open) setForm(EMPTY_FORM);
  }, [open]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>إنشاء حلقة رعاية جديدة</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="معرّف المستفيد"
            value={form.beneficiaryId}
            onChange={e => set('beneficiaryId', e.target.value)}
            fullWidth
            size="small"
            required
            helperText="أدخل معرّف المستفيد (ID)"
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الحلقة</InputLabel>
                <Select
                  value={form.type}
                  label="نوع الحلقة"
                  onChange={e => set('type', e.target.value)}
                >
                  {EPISODE_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={form.priority}
                  label="الأولوية"
                  onChange={e => set('priority', e.target.value)}
                >
                  {PRIORITIES.map(p => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="تاريخ البدء"
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                fullWidth
                size="small"
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="تاريخ الانتهاء المتوقع"
                type="date"
                value={form.expectedEndDate}
                onChange={e => set('expectedEndDate', e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          <TextField
            label="التشخيص الأولي"
            value={form.primaryDiagnosis}
            onChange={e => set('primaryDiagnosis', e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="ملاحظات سريرية"
            value={form.clinicalNotes}
            onChange={e => set('clinicalNotes', e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={3}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          variant="contained"
          onClick={() => onSave(form)}
          disabled={!form.beneficiaryId || !form.startDate}
        >
          إنشاء
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── AdvancePhaseDialog ── */
function AdvancePhaseDialog({ open, episode, onClose, onSave, error }) {
  const currentIdx = episode ? (PHASE_INDEX[episode.currentPhase] ?? 0) : 0;
  const [targetPhase, setTargetPhase] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (open && episode) {
      setTargetPhase(PHASES[currentIdx + 1]?.key || '');
      setNotes('');
    }
  }, [open, episode, currentIdx]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>تقدم المرحلة</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            المرحلة الحالية: <strong>{PHASES[currentIdx]?.label}</strong>
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>المرحلة التالية</InputLabel>
            <Select
              value={targetPhase}
              label="المرحلة التالية"
              onChange={e => setTargetPhase(e.target.value)}
            >
              {PHASES.slice(currentIdx + 1).map(p => (
                <MenuItem key={p.key} value={p.key}>
                  {p.icon} {p.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="ملاحظات الانتقال"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={3}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          variant="contained"
          disabled={!targetPhase}
          onClick={() => onSave(episode._id, targetPhase, notes)}
        >
          تقدم للمرحلة
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function EpisodesPage() {
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const perPage = 15;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: perPage,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(phaseFilter && { currentPhase: phaseFilter }),
      };
      const [epRes, stRes] = await Promise.allSettled([
        episodesAPI.list(params),
        episodesAPI.stats(),
      ]);
      if (epRes.status === 'fulfilled') {
        const data = epRes.value?.data;
        if (data?.data) {
          setEpisodes(data.data);
          setTotal(data.pagination?.total || data.total || data.data.length);
        } else if (Array.isArray(data)) {
          setEpisodes(data);
          setTotal(data.length);
        }
      }
      if (stRes.status === 'fulfilled') {
        setStats(stRes.value?.data?.data || stRes.value?.data || null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, phaseFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = useCallback(
    async form => {
      setActionError('');
      try {
        await episodesAPI.create(form);
        setCreateOpen(false);
        loadData();
      } catch (err) {
        setActionError(err.response?.data?.message || 'خطأ في إنشاء الحلقة');
      }
    },
    [loadData]
  );

  const handleAdvance = useCallback(
    async (id, phase, notes) => {
      setActionError('');
      try {
        await episodesAPI.advancePhase(id, phase, notes);
        setAdvanceOpen(false);
        const res = await episodesAPI.get(id);
        setSelectedEpisode(res?.data?.data || res?.data);
        loadData();
      } catch (err) {
        setActionError(err.response?.data?.message || 'خطأ في تقدم المرحلة');
      }
    },
    [loadData]
  );

  const phaseStats = PHASES.map(p => ({
    ...p,
    count: stats?.byPhase?.[p.key] ?? episodes.filter(e => e.currentPhase === p.key).length,
  }));
  const pageCount = Math.ceil(total / perPage);

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            حلقات الرعاية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة مسارات الرعاية (Episode of Care) — {total} حلقة
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setActionError('');
              setCreateOpen(true);
            }}
          >
            حلقة رعاية جديدة
          </Button>
          <IconButton onClick={loadData}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* ── Stats Cards ── */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'إجمالي الحلقات', value: stats.total || total, color: '#1976d2' },
            { label: 'نشطة', value: stats.active || stats.byStatus?.active || 0, color: '#2e7d32' },
            {
              label: 'مكتملة',
              value: stats.completed || stats.byStatus?.completed || 0,
              color: '#757575',
            },
            {
              label: 'معلقة',
              value: stats.onHold || stats.byStatus?.on_hold || 0,
              color: '#ed6c02',
            },
          ].map((s, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                    {s.value ?? 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Phase Distribution Cards ── */}
      <Box sx={{ mb: 3, overflowX: 'auto' }}>
        <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
          {phaseStats.map(p => (
            <Card
              key={p.key}
              variant="outlined"
              sx={{
                minWidth: 100,
                cursor: 'pointer',
                borderColor: phaseFilter === p.key ? p.color : 'divider',
                borderWidth: phaseFilter === p.key ? 2 : 1,
                bgcolor: phaseFilter === p.key ? `${p.color}10` : 'background.paper',
              }}
              onClick={() => {
                setPhaseFilter(phaseFilter === p.key ? '' : p.key);
                setPage(1);
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="h6">{p.icon}</Typography>
                <Typography variant="caption" display="block">
                  {p.label}
                </Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: p.color }}>
                  {p.count}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>

      {/* ── Filters ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                placeholder="بحث بالمستفيد أو رقم الحلقة..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={statusFilter}
                  label="الحالة"
                  onChange={e => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  {STATUS_FILTER.map(s => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>المرحلة</InputLabel>
                <Select
                  value={phaseFilter}
                  label="المرحلة"
                  onChange={e => {
                    setPhaseFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {PHASES.map(p => (
                    <MenuItem key={p.key} value={p.key}>
                      {p.icon} {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── Episodes Grid ── */}
      <Grid container spacing={2}>
        {episodes.length === 0 && !loading ? (
          <Grid item xs={12}>
            <Alert severity="info">لا توجد حلقات رعاية مطابقة للبحث</Alert>
          </Grid>
        ) : (
          episodes.map((ep, i) => {
            const phaseIdx = PHASE_INDEX[ep.currentPhase] ?? 0;
            const phaseInfo = PHASES[phaseIdx] || PHASES[0];
            const progress = Math.round(((phaseIdx + 1) / PHASES.length) * 100);

            return (
              <Grid item xs={12} md={6} lg={4} key={ep._id || i}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRight: `4px solid ${phaseInfo.color}`,
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 3 },
                    transition: 'box-shadow .2s',
                  }}
                  onClick={() => {
                    setActionError('');
                    setSelectedEpisode(ep);
                  }}
                >
                  <CardContent>
                    {/* Top row */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {ep.beneficiary?.name?.full || ep.beneficiaryName || `حلقة #${i + 1}`}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={phaseInfo.label}
                        sx={{ bgcolor: phaseInfo.color, color: '#fff' }}
                      />
                    </Box>

                    {/* Type & dates */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {EPISODE_TYPES.find(t => t.value === ep.type)?.label ||
                        ep.type ||
                        'رعاية شاملة'}
                      {' • '}
                      {ep.startDate ? new Date(ep.startDate).toLocaleDateString('ar-SA') : ''}
                    </Typography>

                    {/* Phase progress */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={ep.progressPercent || progress}
                        sx={{
                          flex: 1,
                          height: 8,
                          borderRadius: 4,
                          '& .MuiLinearProgress-bar': { bgcolor: phaseInfo.color },
                        }}
                      />
                      <Typography variant="caption" fontWeight="bold">
                        {ep.progressPercent || progress}%
                      </Typography>
                    </Box>

                    {/* Mini phase stepper */}
                    <Stack direction="row" spacing={0.3}>
                      {PHASES.map((p, pi) => (
                        <Tooltip key={p.key} title={p.label}>
                          <Box
                            sx={{
                              flex: 1,
                              height: 4,
                              borderRadius: 2,
                              bgcolor: pi <= phaseIdx ? phaseInfo.color : 'grey.200',
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Stack>

                    {/* Bottom info */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      {ep.primaryTherapist?.name && (
                        <Typography variant="caption" color="text.secondary">
                          {ep.primaryTherapist.name}
                        </Typography>
                      )}
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          STATUS_FILTER.find(s => s.value === ep.status)?.label || ep.status || '-'
                        }
                        color={
                          ep.status === 'active'
                            ? 'success'
                            : ep.status === 'completed'
                              ? 'default'
                              : 'warning'
                        }
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* ── Pagination ── */}
      {pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      {/* ── Episode Detail Dialog ── */}
      <Dialog
        open={!!selectedEpisode}
        onClose={() => setSelectedEpisode(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedEpisode &&
          (() => {
            const ep = selectedEpisode;
            const phaseIdx = PHASE_INDEX[ep.currentPhase] ?? 0;
            const hasNext = phaseIdx < PHASES.length - 1;
            return (
              <>
                <DialogTitle
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="h6">تفاصيل حلقة الرعاية</Typography>
                  <Chip
                    label={PHASES[phaseIdx]?.label || ep.currentPhase}
                    sx={{ bgcolor: PHASES[phaseIdx]?.color || '#999', color: '#fff' }}
                  />
                </DialogTitle>
                <DialogContent dividers>
                  {actionError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError('')}>
                      {actionError}
                    </Alert>
                  )}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    {[
                      ['رقم الحلقة', ep.episodeNumber || '-'],
                      ['المستفيد', ep.beneficiary?.name?.full || ep.beneficiaryName || '-'],
                      [
                        'النوع',
                        EPISODE_TYPES.find(t => t.value === ep.type)?.label || ep.type || '-',
                      ],
                      [
                        'الأولوية',
                        PRIORITIES.find(p => p.value === ep.priority)?.label || ep.priority || '-',
                      ],
                      [
                        'تاريخ البدء',
                        ep.startDate ? new Date(ep.startDate).toLocaleDateString('ar-SA') : '-',
                      ],
                      ['الأخصائي المسؤول', ep.primaryTherapist?.name || ep.leadTherapist || '-'],
                      ['التشخيص الأولي', ep.primaryDiagnosis || '-'],
                      [
                        'الحالة',
                        STATUS_FILTER.find(s => s.value === ep.status)?.label || ep.status || '-',
                      ],
                    ].map(([label, value], idx) => (
                      <Grid item xs={6} key={idx}>
                        <Typography variant="caption" color="text.secondary">
                          {label}
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {value}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Full phase stepper */}
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                    مسار المراحل
                  </Typography>
                  <Stepper activeStep={phaseIdx} alternativeLabel sx={{ mb: 2 }}>
                    {PHASES.map((p, pi) => (
                      <Step key={p.key} completed={pi < phaseIdx}>
                        <StepLabel
                          StepIconProps={{
                            sx: {
                              color: pi <= phaseIdx ? `${p.color} !important` : undefined,
                              '&.Mui-completed': { color: `${p.color} !important` },
                              '&.Mui-active': { color: `${p.color} !important` },
                            },
                          }}
                        >
                          <Typography variant="caption">
                            {p.icon} {p.label}
                          </Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>

                  {ep.notes && (
                    <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        ملاحظات سريرية
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {ep.notes}
                      </Typography>
                    </Box>
                  )}
                </DialogContent>
                <DialogActions>
                  {hasNext && (
                    <Button
                      variant="outlined"
                      startIcon={<AdvanceIcon />}
                      onClick={() => {
                        setActionError('');
                        setAdvanceOpen(true);
                      }}
                    >
                      تقدم المرحلة
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setSelectedEpisode(null);
                      navigate(`/beneficiaries/${ep.beneficiaryId || ep.beneficiary?._id}`);
                    }}
                  >
                    عرض ملف المستفيد
                  </Button>
                  <Button onClick={() => setSelectedEpisode(null)}>إغلاق</Button>
                </DialogActions>
              </>
            );
          })()}
      </Dialog>

      {/* ── Create Episode Dialog ── */}
      <CreateEpisodeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
        error={actionError}
      />

      {/* ── Advance Phase Dialog ── */}
      <AdvancePhaseDialog
        open={advanceOpen}
        episode={selectedEpisode}
        onClose={() => setAdvanceOpen(false)}
        onSave={handleAdvance}
        error={actionError}
      />
    </Box>
  );
}
