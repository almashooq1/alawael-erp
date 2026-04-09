/**
 * Episodes of Care Management Page — صفحة إدارة حلقات الرعاية
 *
 * عرض وإدارة جميع حلقات الرعاية مع مخطط المراحل 12-phase
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Avatar,
  Button, IconButton, TextField, InputAdornment, Select,
  FormControl, InputLabel, MenuItem, Pagination, Stack,
  Stepper, Step, StepLabel, LinearProgress, Alert, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, Refresh as RefreshIcon,
  ArrowForward as ArrowIcon, Person as PersonIcon,
  EventNote as EpisodeIcon, CheckCircle as CheckIcon,
  PlayArrow as PlayIcon, Pause as PauseIcon,
} from '@mui/icons-material';

import { episodesAPI } from '../../services/ddd';

/* ── Phase definitions (12-phase Episode of Care) ── */
const PHASES = [
  { key: 'referral', label: 'الإحالة', labelEn: 'Referral', color: '#9e9e9e', icon: '📋' },
  { key: 'screening', label: 'الفرز', labelEn: 'Screening', color: '#ff9800', icon: '🔍' },
  { key: 'intake', label: 'القبول', labelEn: 'Intake', color: '#2196f3', icon: '📥' },
  { key: 'initial_assessment', label: 'التقييم الأولي', labelEn: 'Initial Assessment', color: '#673ab7', icon: '📊' },
  { key: 'planning', label: 'التخطيط', labelEn: 'Planning', color: '#00bcd4', icon: '📝' },
  { key: 'active_treatment', label: 'العلاج النشط', labelEn: 'Active Treatment', color: '#4caf50', icon: '💊' },
  { key: 'review', label: 'المراجعة', labelEn: 'Review', color: '#ff5722', icon: '🔄' },
  { key: 'transition', label: 'الانتقال', labelEn: 'Transition', color: '#795548', icon: '🔀' },
  { key: 'discharge_planning', label: 'تخطيط الخروج', labelEn: 'Discharge Planning', color: '#607d8b', icon: '📋' },
  { key: 'discharged', label: 'مُخرَج', labelEn: 'Discharged', color: '#9e9e9e', icon: '🏠' },
  { key: 'follow_up', label: 'المتابعة', labelEn: 'Follow-up', color: '#8bc34a', icon: '📞' },
  { key: 'closed', label: 'مغلق', labelEn: 'Closed', color: '#424242', icon: '✅' },
];

const PHASE_INDEX = {};
PHASES.forEach((p, i) => { PHASE_INDEX[p.key] = i; });

const STATUS_FILTER = [
  { value: '', label: 'الكل' },
  { value: 'active', label: 'نشط' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'on_hold', label: 'معلق' },
  { value: 'cancelled', label: 'ملغى' },
];

export default function EpisodesPage() {
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const perPage = 15;

  const loadEpisodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page, limit: perPage,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(phaseFilter && { currentPhase: phaseFilter }),
      };
      const res = await episodesAPI.list(params);
      const data = res?.data;
      if (data?.data) {
        setEpisodes(data.data);
        setTotal(data.pagination?.total || data.total || data.data.length);
      } else if (Array.isArray(data)) {
        setEpisodes(data);
        setTotal(data.length);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, phaseFilter]);

  useEffect(() => { loadEpisodes(); }, [loadEpisodes]);

  /* ── Phase distribution stats ── */
  const phaseStats = PHASES.map(p => ({
    ...p,
    count: episodes.filter(e => e.currentPhase === p.key).length,
  }));

  const pageCount = Math.ceil(total / perPage);

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">حلقات الرعاية</Typography>
          <Typography variant="body2" color="text.secondary">إدارة مسارات الرعاية (Episode of Care) — {total} حلقة</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AddIcon />}>حلقة رعاية جديدة</Button>
          <IconButton onClick={loadEpisodes}><RefreshIcon /></IconButton>
        </Stack>
      </Box>

      {/* ── Phase Distribution Cards ── */}
      <Box sx={{ mb: 3, overflowX: 'auto' }}>
        <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
          {phaseStats.map(p => (
            <Card
              key={p.key}
              variant="outlined"
              sx={{
                minWidth: 100, cursor: 'pointer',
                borderColor: phaseFilter === p.key ? p.color : 'divider',
                borderWidth: phaseFilter === p.key ? 2 : 1,
                bgcolor: phaseFilter === p.key ? `${p.color}10` : 'background.paper',
              }}
              onClick={() => { setPhaseFilter(phaseFilter === p.key ? '' : p.key); setPage(1); }}
            >
              <CardContent sx={{ textAlign: 'center', py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="h6">{p.icon}</Typography>
                <Typography variant="caption" display="block">{p.label}</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: p.color }}>{p.count}</Typography>
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
                fullWidth size="small" placeholder="بحث بالمستفيد أو رقم الحلقة..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select value={statusFilter} label="الحالة" onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  {STATUS_FILTER.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>المرحلة</InputLabel>
                <Select value={phaseFilter} label="المرحلة" onChange={(e) => { setPhaseFilter(e.target.value); setPage(1); }}>
                  <MenuItem value="">الكل</MenuItem>
                  {PHASES.map(p => <MenuItem key={p.key} value={p.key}>{p.icon} {p.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── Episodes Grid ── */}
      <Grid container spacing={2}>
        {episodes.length === 0 && !loading ? (
          <Grid item xs={12}><Alert severity="info">لا توجد حلقات رعاية مطابقة للبحث</Alert></Grid>
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
                  onClick={() => setSelectedEpisode(ep)}
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
                      {ep.type || 'رعاية شاملة'}
                      {' • '}
                      {ep.startDate ? new Date(ep.startDate).toLocaleDateString('ar-SA') : ''}
                    </Typography>

                    {/* Phase progress */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={ep.progressPercent || progress}
                        sx={{
                          flex: 1, height: 8, borderRadius: 4,
                          '& .MuiLinearProgress-bar': { bgcolor: phaseInfo.color },
                        }}
                      />
                      <Typography variant="caption" fontWeight="bold">{ep.progressPercent || progress}%</Typography>
                    </Box>

                    {/* Mini phase stepper */}
                    <Stack direction="row" spacing={0.3}>
                      {PHASES.map((p, pi) => (
                        <Tooltip key={p.key} title={p.label}>
                          <Box
                            sx={{
                              flex: 1, height: 4, borderRadius: 2,
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
                        size="small" variant="outlined"
                        label={ep.status === 'active' ? 'نشط' : ep.status === 'completed' ? 'مكتمل' : ep.status || '-'}
                        color={ep.status === 'active' ? 'success' : ep.status === 'completed' ? 'default' : 'warning'}
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
          <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
        </Box>
      )}

      {/* ── Episode Detail Dialog ── */}
      <Dialog
        open={!!selectedEpisode}
        onClose={() => setSelectedEpisode(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedEpisode && (() => {
          const ep = selectedEpisode;
          const phaseIdx = PHASE_INDEX[ep.currentPhase] ?? 0;
          return (
            <>
              <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">تفاصيل حلقة الرعاية</Typography>
                <Chip
                  label={PHASES[phaseIdx]?.label || ep.currentPhase}
                  sx={{ bgcolor: PHASES[phaseIdx]?.color || '#999', color: '#fff' }}
                />
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {[
                    ['المستفيد', ep.beneficiary?.name?.full || ep.beneficiaryName || '-'],
                    ['النوع', ep.type || '-'],
                    ['تاريخ البدء', ep.startDate ? new Date(ep.startDate).toLocaleDateString('ar-SA') : '-'],
                    ['الأخصائي المسؤول', ep.primaryTherapist?.name || ep.leadTherapist || '-'],
                    ['الحالة', ep.status || '-'],
                  ].map(([label, value], i) => (
                    <Grid item xs={6} key={i}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2">{value}</Typography>
                    </Grid>
                  ))}
                </Grid>

                {/* Full phase stepper */}
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>مسار المراحل</Typography>
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
                        <Typography variant="caption">{p.icon} {p.label}</Typography>
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>

                {ep.notes && (
                  <>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>ملاحظات</Typography>
                    <Typography variant="body2" color="text.secondary">{ep.notes}</Typography>
                  </>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelectedEpisode(null)}>إغلاق</Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    setSelectedEpisode(null);
                    navigate(`/beneficiaries/${ep.beneficiaryId || ep.beneficiary?._id}`);
                  }}
                >
                  عرض ملف المستفيد
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
}
