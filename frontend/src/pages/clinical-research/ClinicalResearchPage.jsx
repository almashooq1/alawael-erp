/**
 * ClinicalResearchPage — إدارة الأبحاث السريرية
 *
 * Tabs:
 *  0 — لوحة المتابعة  → getDashboard
 *  1 — الدراسات       → list + create + update + transitionStatus
 *  2 — المشاركون      → enrollParticipant + withdrawParticipant + recordConsent
 *  3 — منشورات وإنجازات → addMilestone + addPublication
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Button,
  IconButton,
  Stack,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  Science as ResearchIcon,
  Group as ParticipantsIcon,
  LibraryBooks as PublicationsIcon,
  BarChart as ChartIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  CheckCircle as ConsentIcon,
  PersonRemove as WithdrawIcon,
  Flag as MilestoneIcon,
  Article as PaperIcon,
  PlayArrow as ActivateIcon,
} from '@mui/icons-material';
import { researchAPI } from '../../services/ddd';

/* ── colour palette ───────────────────────────────────────── */
const PRIMARY = '#00695c';
const BG = '#f1f8f7';

/* ── helpers ──────────────────────────────────────────────── */
const fmt = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');

const statusColor = s => {
  const map = {
    active: 'success',
    completed: 'primary',
    pending: 'warning',
    terminated: 'error',
    paused: 'default',
  };
  return map[s] || 'default';
};
const statusLabel = s => {
  const map = {
    active: 'نشطة',
    completed: 'مكتملة',
    pending: 'قيد المراجعة',
    terminated: 'منتهية',
    paused: 'موقوفة',
  };
  return map[s] || s || '—';
};

/* ── KPI card ─────────────────────────────────────────────── */
function KpiCard({ label, value, icon, color }) {
  return (
    <Card variant="outlined" sx={{ borderRight: `4px solid ${color}`, height: '100%' }}>
      <CardContent
        sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}
      >
        <Avatar sx={{ bgcolor: `${color}18`, color, width: 44, height: 44 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color }}>
            {value ?? '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function ClinicalResearchPage() {
  const [tab, setTab] = useState(0);

  /* ── dashboard ── */
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

  /* ── studies ── */
  const [studies, setStudies] = useState([]);
  const [studiesLoading, setStudiesLoading] = useState(false);
  const [studiesError, setStudiesError] = useState(null);
  const [studySearch, setStudySearch] = useState('');
  const [selectedStudy, setSelectedStudy] = useState(null);

  /* ── participants ── */
  const [participantStudyId, setParticipantStudyId] = useState('');
  const [participants, setParticipants] = useState([]);
  const [partLoading, setPartLoading] = useState(false);
  const [partError, setPartError] = useState(null);

  /* ── milestones / publications ── */
  const [pubStudyId, setPubStudyId] = useState('');
  const [studyDetail, setStudyDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* ── dialogs ── */
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    protocol: '',
    irbNumber: '',
    startDate: '',
    endDate: '',
    objectives: '',
  });
  const [createLoading, setCreateLoading] = useState(false);

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ beneficiaryId: '', notes: '' });
  const [enrollLoading, setEnrollLoading] = useState(false);

  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    status: 'pending',
  });
  const [milestoneLoading, setMilestoneLoading] = useState(false);

  const [pubOpen, setPubOpen] = useState(false);
  const [pubForm, setPubForm] = useState({
    title: '',
    journal: '',
    publishDate: '',
    doi: '',
    authors: '',
  });
  const [pubLoading, setPubLoading] = useState(false);

  const [statusTransOpen, setStatusTransOpen] = useState(false);
  const [transStudy, setTransStudy] = useState(null);
  const [transStatus, setTransStatus] = useState('');
  const [transNote, setTransNote] = useState('');
  const [transLoading, setTransLoading] = useState(false);

  /* ── snackbar ── */
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const toast = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  /* ── loaders ── */
  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      const res = await researchAPI.getDashboard({});
      setDashboard(res?.data?.data || res?.data || null);
    } catch (e) {
      setDashError(e.message);
    } finally {
      setDashLoading(false);
    }
  }, []);

  const loadStudies = useCallback(async () => {
    setStudiesLoading(true);
    setStudiesError(null);
    try {
      const res = await researchAPI.list({ search: studySearch });
      const data = res?.data?.data || res?.data;
      setStudies(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setStudiesError(e.message);
    } finally {
      setStudiesLoading(false);
    }
  }, [studySearch]);

  const loadParticipants = useCallback(async () => {
    if (!participantStudyId) return;
    setPartLoading(true);
    setPartError(null);
    try {
      const res = await researchAPI.get(participantStudyId);
      const data = res?.data?.data || res?.data;
      setParticipants(data?.participants || []);
    } catch (e) {
      setPartError(e.message);
    } finally {
      setPartLoading(false);
    }
  }, [participantStudyId]);

  const loadStudyDetail = useCallback(async () => {
    if (!pubStudyId) return;
    setDetailLoading(true);
    try {
      const res = await researchAPI.get(pubStudyId);
      setStudyDetail(res?.data?.data || res?.data || null);
    } catch (_e) {
      /* silent */
    } finally {
      setDetailLoading(false);
    }
  }, [pubStudyId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  useEffect(() => {
    if (tab === 1) loadStudies();
  }, [tab, loadStudies]);
  useEffect(() => {
    if (tab === 2) loadParticipants();
  }, [tab, participantStudyId, loadParticipants]);
  useEffect(() => {
    if (tab === 3) loadStudyDetail();
  }, [tab, pubStudyId, loadStudyDetail]);

  /* ── create study ── */
  const handleCreateStudy = async () => {
    setCreateLoading(true);
    try {
      await researchAPI.create({
        ...createForm,
        objectives: createForm.objectives ? createForm.objectives.split('\n').filter(Boolean) : [],
      });
      toast('تم إنشاء الدراسة بنجاح');
      setCreateOpen(false);
      setCreateForm({
        title: '',
        description: '',
        protocol: '',
        irbNumber: '',
        startDate: '',
        endDate: '',
        objectives: '',
      });
      loadStudies();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  /* ── status transition ── */
  const handleTransition = async () => {
    setTransLoading(true);
    try {
      await researchAPI.transitionStatus(transStudy._id, { status: transStatus, note: transNote });
      toast('تم تغيير حالة الدراسة');
      setStatusTransOpen(false);
      setTransNote('');
      loadStudies();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setTransLoading(false);
    }
  };

  /* ── enroll participant ── */
  const handleEnroll = async () => {
    setEnrollLoading(true);
    try {
      await researchAPI.enrollParticipant(participantStudyId, enrollForm);
      toast('تم تسجيل المشارك بنجاح');
      setEnrollOpen(false);
      setEnrollForm({ beneficiaryId: '', notes: '' });
      loadParticipants();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setEnrollLoading(false);
    }
  };

  /* ── record consent ── */
  const handleConsent = async beneficiaryId => {
    try {
      await researchAPI.recordConsent(participantStudyId, beneficiaryId, {
        consentGiven: true,
        date: new Date().toISOString(),
      });
      toast('تم توثيق الموافقة المستنيرة');
      loadParticipants();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  /* ── withdraw participant ── */
  const handleWithdraw = async beneficiaryId => {
    try {
      await researchAPI.withdrawParticipant(participantStudyId, beneficiaryId, {
        reason: 'طلب المشارك',
      });
      toast('تم سحب المشاركة');
      loadParticipants();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  /* ── add milestone ── */
  const handleAddMilestone = async () => {
    setMilestoneLoading(true);
    try {
      await researchAPI.addMilestone(pubStudyId, milestoneForm);
      toast('تمت إضافة الإنجاز');
      setMilestoneOpen(false);
      setMilestoneForm({ title: '', description: '', dueDate: '', status: 'pending' });
      loadStudyDetail();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setMilestoneLoading(false);
    }
  };

  /* ── add publication ── */
  const handleAddPub = async () => {
    setPubLoading(true);
    try {
      await researchAPI.addPublication(pubStudyId, {
        ...pubForm,
        authors: pubForm.authors ? pubForm.authors.split(',').map(a => a.trim()) : [],
      });
      toast('تمت إضافة المنشور العلمي');
      setPubOpen(false);
      setPubForm({ title: '', journal: '', publishDate: '', doi: '', authors: '' });
      loadStudyDetail();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setPubLoading(false);
    }
  };

  const kpis = [
    {
      label: 'إجمالي الدراسات',
      value: dashboard?.totalStudies ?? 0,
      icon: <ResearchIcon />,
      color: PRIMARY,
    },
    {
      label: 'الدراسات النشطة',
      value: dashboard?.activeStudies ?? 0,
      icon: <ActivateIcon />,
      color: '#2e7d32',
    },
    {
      label: 'المشاركون',
      value: dashboard?.totalParticipants ?? 0,
      icon: <ParticipantsIcon />,
      color: '#1565c0',
    },
    {
      label: 'المنشورات',
      value: dashboard?.totalPublications ?? 0,
      icon: <PaperIcon />,
      color: '#6a1b9a',
    },
  ];

  return (
    <Box sx={{ p: 3, direction: 'rtl', bgcolor: BG, minHeight: '100vh' }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 52, height: 52 }}>
          <ResearchIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" color={PRIMARY}>
            إدارة الأبحاث السريرية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تتبع الدراسات السريرية والمشاركين والمنشورات العلمية
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadDashboard}
          sx={{ borderColor: PRIMARY, color: PRIMARY }}
        >
          تحديث
        </Button>
      </Box>

      {/* ── Tabs ── */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': { fontWeight: 600 },
          '& .Mui-selected': { color: PRIMARY },
          '& .MuiTabs-indicator': { bgcolor: PRIMARY },
        }}
      >
        <Tab icon={<ChartIcon />} iconPosition="start" label="لوحة المتابعة" />
        <Tab icon={<ResearchIcon />} iconPosition="start" label="الدراسات" />
        <Tab icon={<ParticipantsIcon />} iconPosition="start" label="المشاركون" />
        <Tab icon={<PublicationsIcon />} iconPosition="start" label="منشورات وإنجازات" />
      </Tabs>

      {/* ════════════════════════════════
          TAB 0 — Dashboard
      ════════════════════════════════ */}
      {tab === 0 && (
        <Box>
          {dashLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
          {dashError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dashError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {kpis.map((k, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <KpiCard {...k} />
              </Grid>
            ))}
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    توزيع حالات الدراسات
                  </Typography>
                  {['active', 'pending', 'completed', 'terminated'].map(s => {
                    const count = dashboard?.byStatus?.[s] ?? 0;
                    const total = dashboard?.totalStudies || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <Box key={s} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Chip size="small" label={statusLabel(s)} color={statusColor(s)} />
                          <Typography variant="body2">
                            {count} دراسة ({pct}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          color={statusColor(s)}
                          sx={{ height: 7, borderRadius: 4 }}
                        />
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    ملخص النشاط البحثي
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    {[
                      {
                        label: 'معدل إكمال الدراسات',
                        val: dashboard?.completionRate ? `${dashboard.completionRate}%` : '—',
                      },
                      {
                        label: 'متوسط مدة الدراسة',
                        val: dashboard?.avgDuration ? `${dashboard.avgDuration} شهر` : '—',
                      },
                      { label: 'الإنجازات المحققة', val: dashboard?.completedMilestones ?? '—' },
                      { label: 'إجمالي الاقتبسات', val: dashboard?.totalCitations ?? '—' },
                    ].map((r, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 0.5,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {r.label}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color={PRIMARY}>
                          {r.val}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ════════════════════════════════
          TAB 1 — Studies
      ════════════════════════════════ */}
      {tab === 1 && (
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="بحث في الدراسات..."
              value={studySearch}
              onChange={e => setStudySearch(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#004d40' } }}
            >
              دراسة جديدة
            </Button>
            <IconButton onClick={loadStudies} size="small">
              <RefreshIcon />
            </IconButton>
          </Stack>

          {studiesError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {studiesError}
            </Alert>
          )}
          {studiesLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#e0f2f1' }}>
                  <TableCell>عنوان الدراسة</TableCell>
                  <TableCell>رقم IRB</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>تاريخ البدء</TableCell>
                  <TableCell>تاريخ الانتهاء</TableCell>
                  <TableCell>المشاركون</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studies.length === 0 && !studiesLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">لا توجد دراسات مسجلة</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  studies.map((study, i) => (
                    <TableRow
                      key={study._id || i}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedStudy(study)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {study.title || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {study.irbNumber || study.irb || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusLabel(study.status)}
                          color={statusColor(study.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{fmt(study.startDate)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{fmt(study.endDate)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={study.participants?.length ?? study.participantCount ?? 0}
                          color="info"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center" onClick={e => e.stopPropagation()}>
                        <Tooltip title="تغيير الحالة">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setTransStudy(study);
                              setTransStatus(study.status || 'active');
                              setStatusTransOpen(true);
                            }}
                          >
                            <ActivateIcon fontSize="small" sx={{ color: PRIMARY }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ════════════════════════════════
          TAB 2 — Participants
      ════════════════════════════════ */}
      {tab === 2 && (
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              size="small"
              select
              label="اختر الدراسة"
              value={participantStudyId}
              onChange={e => setParticipantStudyId(e.target.value)}
              sx={{ minWidth: 280 }}
            >
              <MenuItem value="">— اختر دراسة —</MenuItem>
              {studies.map(s => (
                <MenuItem key={s._id} value={s._id}>
                  {s.title}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              size="small"
              disabled={!participantStudyId}
              startIcon={<AddIcon />}
              onClick={() => setEnrollOpen(true)}
              sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#004d40' } }}
            >
              تسجيل مشارك
            </Button>
            <IconButton onClick={loadParticipants} size="small">
              <RefreshIcon />
            </IconButton>
          </Stack>

          {partError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {partError}
            </Alert>
          )}
          {partLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {!participantStudyId && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <ParticipantsIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">اختر دراسة لعرض المشاركين</Typography>
            </Box>
          )}

          {participantStudyId && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#e0f2f1' }}>
                    <TableCell>المستفيد</TableCell>
                    <TableCell>تاريخ التسجيل</TableCell>
                    <TableCell>الموافقة المستنيرة</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell align="center">إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {participants.length === 0 && !partLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          لا يوجد مشاركون في هذه الدراسة
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    participants.map((p, i) => {
                      const bid = p.beneficiaryId?._id || p.beneficiaryId;
                      const name = p.beneficiaryId?.name?.full || p.name || `مشارك #${i + 1}`;
                      const hasConsent = p.consentGiven || p.consent?.given;
                      return (
                        <TableRow key={p._id || i} hover>
                          <TableCell>
                            <Typography variant="body2">{name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {fmt(p.enrolledAt || p.enrollmentDate)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={hasConsent ? 'موثقة' : 'غير موثقة'}
                              color={hasConsent ? 'success' : 'warning'}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={p.status === 'withdrawn' ? 'منسحب' : 'نشط'}
                              color={p.status === 'withdrawn' ? 'default' : 'success'}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              {!hasConsent && (
                                <Tooltip title="توثيق الموافقة المستنيرة">
                                  <IconButton size="small" onClick={() => handleConsent(bid)}>
                                    <ConsentIcon fontSize="small" color="success" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {p.status !== 'withdrawn' && (
                                <Tooltip title="سحب المشاركة">
                                  <IconButton size="small" onClick={() => handleWithdraw(bid)}>
                                    <WithdrawIcon fontSize="small" color="error" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ════════════════════════════════
          TAB 3 — Milestones & Publications
      ════════════════════════════════ */}
      {tab === 3 && (
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              size="small"
              select
              label="اختر الدراسة"
              value={pubStudyId}
              onChange={e => setPubStudyId(e.target.value)}
              sx={{ minWidth: 280 }}
            >
              <MenuItem value="">— اختر دراسة —</MenuItem>
              {studies.map(s => (
                <MenuItem key={s._id} value={s._id}>
                  {s.title}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              size="small"
              disabled={!pubStudyId}
              startIcon={<MilestoneIcon />}
              onClick={() => setMilestoneOpen(true)}
              sx={{ borderColor: PRIMARY, color: PRIMARY }}
            >
              إضافة إنجاز
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={!pubStudyId}
              startIcon={<PaperIcon />}
              onClick={() => setPubOpen(true)}
              sx={{ borderColor: '#6a1b9a', color: '#6a1b9a' }}
            >
              إضافة منشور
            </Button>
          </Stack>

          {detailLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {!pubStudyId && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <PublicationsIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">اختر دراسة لعرض الإنجازات والمنشورات</Typography>
            </Box>
          )}

          {pubStudyId && studyDetail && (
            <Grid container spacing={2}>
              {/* Milestones */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ color: PRIMARY }}
                    >
                      <MilestoneIcon sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: 18 }} />
                      الإنجازات ({studyDetail.milestones?.length || 0})
                    </Typography>
                    {(studyDetail.milestones || []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        لا توجد إنجازات مسجلة
                      </Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {(studyDetail.milestones || []).map((m, i) => (
                          <Box
                            key={i}
                            sx={{
                              p: 1.5,
                              bgcolor: 'grey.50',
                              borderRadius: 1,
                              borderRight: `3px solid ${m.status === 'completed' ? '#388e3c' : '#f57c00'}`,
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" fontWeight="bold">
                                {m.title}
                              </Typography>
                              <Chip
                                size="small"
                                label={m.status === 'completed' ? 'محقق' : 'قيد التنفيذ'}
                                color={m.status === 'completed' ? 'success' : 'warning'}
                              />
                            </Box>
                            {m.description && (
                              <Typography variant="caption" color="text.secondary">
                                {m.description}
                              </Typography>
                            )}
                            <Typography variant="caption" display="block" color="text.disabled">
                              {fmt(m.dueDate)}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Publications */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ color: '#6a1b9a' }}
                    >
                      <PaperIcon sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: 18 }} />
                      المنشورات العلمية ({studyDetail.publications?.length || 0})
                    </Typography>
                    {(studyDetail.publications || []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        لا توجد منشورات مسجلة
                      </Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {(studyDetail.publications || []).map((pub, i) => (
                          <Box
                            key={i}
                            sx={{
                              p: 1.5,
                              bgcolor: '#f3e5f5',
                              borderRadius: 1,
                              borderRight: '3px solid #6a1b9a',
                            }}
                          >
                            <Typography variant="body2" fontWeight="bold">
                              {pub.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {pub.journal} · {fmt(pub.publishDate)}
                            </Typography>
                            {pub.doi && (
                              <Typography variant="caption" display="block" color="#6a1b9a">
                                DOI: {pub.doi}
                              </Typography>
                            )}
                            {pub.authors?.length > 0 && (
                              <Typography variant="caption" color="text.disabled">
                                {Array.isArray(pub.authors) ? pub.authors.join('، ') : pub.authors}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* ══ Create Study Dialog ══ */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#e0f2f1', color: PRIMARY }}>
          إنشاء دراسة سريرية جديدة
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="عنوان الدراسة *"
              fullWidth
              size="small"
              value={createForm.title}
              onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
            />
            <TextField
              label="الوصف"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={createForm.description}
              onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
            />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  label="رقم موافقة IRB"
                  fullWidth
                  size="small"
                  value={createForm.irbNumber}
                  onChange={e => setCreateForm(f => ({ ...f, irbNumber: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="البروتوكول"
                  fullWidth
                  size="small"
                  value={createForm.protocol}
                  onChange={e => setCreateForm(f => ({ ...f, protocol: e.target.value }))}
                />
              </Grid>
            </Grid>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  label="تاريخ البدء"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={createForm.startDate}
                  onChange={e => setCreateForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="تاريخ الانتهاء"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={createForm.endDate}
                  onChange={e => setCreateForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </Grid>
            </Grid>
            <TextField
              label="الأهداف (سطر لكل هدف)"
              fullWidth
              multiline
              rows={3}
              size="small"
              value={createForm.objectives}
              onChange={e => setCreateForm(f => ({ ...f, objectives: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!createForm.title || createLoading}
            onClick={handleCreateStudy}
            sx={{ bgcolor: PRIMARY }}
          >
            {createLoading ? 'جاري...' : 'إنشاء الدراسة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ Status Transition Dialog ══ */}
      <Dialog
        open={statusTransOpen}
        onClose={() => setStatusTransOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>تغيير حالة الدراسة</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {transStudy?.title}
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            label="الحالة الجديدة"
            value={transStatus}
            onChange={e => setTransStatus(e.target.value)}
            sx={{ mb: 2 }}
          >
            {['active', 'paused', 'completed', 'terminated'].map(s => (
              <MenuItem key={s} value={s}>
                {statusLabel(s)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="ملاحظات"
            fullWidth
            multiline
            rows={2}
            size="small"
            value={transNote}
            onChange={e => setTransNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusTransOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={transLoading}
            onClick={handleTransition}
            sx={{ bgcolor: PRIMARY }}
          >
            {transLoading ? 'جاري...' : 'تأكيد'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ Enroll Participant Dialog ══ */}
      <Dialog open={enrollOpen} onClose={() => setEnrollOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>تسجيل مشارك في الدراسة</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="معرف المستفيد (ID) *"
              fullWidth
              size="small"
              value={enrollForm.beneficiaryId}
              onChange={e => setEnrollForm(f => ({ ...f, beneficiaryId: e.target.value }))}
            />
            <TextField
              label="ملاحظات"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={enrollForm.notes}
              onChange={e => setEnrollForm(f => ({ ...f, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!enrollForm.beneficiaryId || enrollLoading}
            onClick={handleEnroll}
            sx={{ bgcolor: PRIMARY }}
          >
            {enrollLoading ? 'جاري...' : 'تسجيل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ Add Milestone Dialog ══ */}
      <Dialog open={milestoneOpen} onClose={() => setMilestoneOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>إضافة إنجاز بحثي</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="عنوان الإنجاز *"
              fullWidth
              size="small"
              value={milestoneForm.title}
              onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))}
            />
            <TextField
              label="الوصف"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={milestoneForm.description}
              onChange={e => setMilestoneForm(f => ({ ...f, description: e.target.value }))}
            />
            <TextField
              label="الموعد المستهدف"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={milestoneForm.dueDate}
              onChange={e => setMilestoneForm(f => ({ ...f, dueDate: e.target.value }))}
            />
            <TextField
              select
              fullWidth
              size="small"
              label="الحالة"
              value={milestoneForm.status}
              onChange={e => setMilestoneForm(f => ({ ...f, status: e.target.value }))}
            >
              <MenuItem value="pending">قيد التنفيذ</MenuItem>
              <MenuItem value="completed">محقق</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMilestoneOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!milestoneForm.title || milestoneLoading}
            onClick={handleAddMilestone}
            sx={{ bgcolor: PRIMARY }}
          >
            {milestoneLoading ? 'جاري...' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ Add Publication Dialog ══ */}
      <Dialog open={pubOpen} onClose={() => setPubOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f3e5f5', color: '#6a1b9a' }}>إضافة منشور علمي</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="عنوان البحث *"
              fullWidth
              size="small"
              value={pubForm.title}
              onChange={e => setPubForm(f => ({ ...f, title: e.target.value }))}
            />
            <TextField
              label="المجلة العلمية"
              fullWidth
              size="small"
              value={pubForm.journal}
              onChange={e => setPubForm(f => ({ ...f, journal: e.target.value }))}
            />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  label="تاريخ النشر"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={pubForm.publishDate}
                  onChange={e => setPubForm(f => ({ ...f, publishDate: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="DOI"
                  fullWidth
                  size="small"
                  value={pubForm.doi}
                  onChange={e => setPubForm(f => ({ ...f, doi: e.target.value }))}
                />
              </Grid>
            </Grid>
            <TextField
              label="المؤلفون (مفصولون بفاصلة)"
              fullWidth
              size="small"
              value={pubForm.authors}
              onChange={e => setPubForm(f => ({ ...f, authors: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPubOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!pubForm.title || pubLoading}
            onClick={handleAddPub}
            sx={{ bgcolor: '#6a1b9a' }}
          >
            {pubLoading ? 'جاري...' : 'إضافة المنشور'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ Study Detail Dialog ══ */}
      <Dialog open={!!selectedStudy} onClose={() => setSelectedStudy(null)} maxWidth="sm" fullWidth>
        {selectedStudy && (
          <>
            <DialogTitle sx={{ bgcolor: '#e0f2f1' }}>{selectedStudy.title}</DialogTitle>
            <DialogContent sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                {[
                  {
                    label: 'الحالة',
                    val: (
                      <Chip
                        size="small"
                        label={statusLabel(selectedStudy.status)}
                        color={statusColor(selectedStudy.status)}
                      />
                    ),
                  },
                  { label: 'رقم IRB', val: selectedStudy.irbNumber || '—' },
                  { label: 'تاريخ البدء', val: fmt(selectedStudy.startDate) },
                  { label: 'تاريخ الانتهاء', val: fmt(selectedStudy.endDate) },
                  { label: 'البروتوكول', val: selectedStudy.protocol || '—' },
                  {
                    label: 'عدد المشاركين',
                    val: selectedStudy.participants?.length ?? selectedStudy.participantCount ?? 0,
                  },
                ].map((r, i) => (
                  <Grid item xs={6} key={i}>
                    <Typography variant="caption" color="text.secondary">
                      {r.label}
                    </Typography>
                    <Box>
                      <Typography variant="body2">{r.val}</Typography>
                    </Box>
                  </Grid>
                ))}
                {selectedStudy.description && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      الوصف
                    </Typography>
                    <Typography variant="body2">{selectedStudy.description}</Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedStudy(null)}>إغلاق</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          severity={snack.severity}
          sx={{ width: '100%' }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
