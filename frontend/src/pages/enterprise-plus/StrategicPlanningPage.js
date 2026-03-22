/**
 * Strategic Planning & OKR Management — التخطيط الاستراتيجي وإدارة الأهداف
 * Strategic Objectives, Key Results, Initiatives, Balanced Scorecard
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  IconButton,
  Chip,
  Avatar,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  MenuItem,
  Tab,
  Tabs,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Flag as ObjectiveIcon,
  TrackChanges as KRIcon,
  RocketLaunch as InitiativeIcon,
  Dashboard as ScorecardIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  AccountTree as CascadeIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import * as svc from '../../services/enterpriseProPlus.service';

const PERSPECTIVES = {
  financial: { label: 'مالي', color: '#2e7d32' },
  customer: { label: 'العملاء', color: '#1976d2' },
  internal_process: { label: 'العمليات الداخلية', color: '#ed6c02' },
  learning_growth: { label: 'التعلم والنمو', color: '#9c27b0' },
};
const OBJ_LEVELS = { organization: 'منظمة', department: 'إدارة', team: 'فريق' };
const OBJ_STATUSES = {
  draft: 'مسودة',
  active: 'نشط',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  at_risk: 'في خطر',
};
const OBJ_STATUS_COLORS = {
  draft: 'default',
  active: 'primary',
  completed: 'success',
  cancelled: 'error',
  at_risk: 'warning',
};
const KR_TYPES = {
  numeric: 'رقمي',
  percentage: 'نسبة مئوية',
  currency: 'مالي',
  binary: 'ثنائي',
  milestone: 'مراحل',
};
const INITIATIVE_STATUSES = {
  proposed: 'مقترح',
  approved: 'معتمد',
  active: 'نشط',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  on_hold: 'معلق',
};

export default function StrategicPlanningPage() {
  const showSnackbar = useSnackbar();
  const [tab, setTab] = useState(0);
  const [objectives, setObjectives] = useState([]);
  const [keyResults, setKeyResults] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [scorecard, setScorecard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [objDialog, setObjDialog] = useState(false);
  const [krDialog, setKrDialog] = useState(false);
  const [initDialog, setInitDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [o, kr, init, sc] = await Promise.all([
        svc.getStrategicObjectives().then(r => r.data?.data || []),
        svc.getKeyResults().then(r => r.data?.data || []),
        svc.getStrategicInitiatives().then(r => r.data?.data || []),
        svc.getScorecardEntries().then(r => r.data?.data || []),
      ]);
      setObjectives(o);
      setKeyResults(kr);
      setInitiatives(init);
      setScorecard(sc);
    } catch {
      showSnackbar('خطأ في تحميل البيانات', 'error');
    }
    setLoading(false);
  }, [showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveObjective = async formData => {
    try {
      if (editItem?._id) await svc.updateStrategicObjective(editItem._id, formData);
      else await svc.createStrategicObjective(formData);
      showSnackbar('تم الحفظ', 'success');
      setObjDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleSaveKR = async formData => {
    try {
      await svc.createKeyResult(formData);
      showSnackbar('تم الحفظ', 'success');
      setKrDialog(false);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const _handleCheckInKR = async (krId, value, note) => {
    try {
      await svc.checkInKeyResult(krId, { value, note });
      showSnackbar('تم تسجيل التقدم', 'success');
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleSaveInitiative = async formData => {
    try {
      if (editItem?._id) await svc.updateStrategicInitiative(editItem._id, formData);
      else await svc.createStrategicInitiative(formData);
      showSnackbar('تم الحفظ', 'success');
      setInitDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const activeObjs = objectives.filter(o => o.status === 'active');
  const overallProgress = activeObjs.length
    ? Math.round(activeObjs.reduce((sum, o) => sum + (o.progress || 0), 0) / activeObjs.length)
    : 0;
  const atRisk = objectives.filter(o => o.status === 'at_risk').length;

  const statCards = [
    {
      label: 'أهداف استراتيجية',
      value: objectives.length,
      color: '#1976d2',
      icon: <ObjectiveIcon />,
    },
    { label: 'نتائج رئيسية', value: keyResults.length, color: '#2e7d32', icon: <KRIcon /> },
    {
      label: 'مبادرات نشطة',
      value: initiatives.filter(i => i.status === 'active').length,
      color: '#ed6c02',
      icon: <InitiativeIcon />,
    },
    {
      label: 'معدل التقدم',
      value: `${overallProgress}%`,
      color: overallProgress >= 70 ? '#2e7d32' : overallProgress >= 40 ? '#ed6c02' : '#d32f2f',
      icon: <TrendUpIcon />,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        التخطيط الاستراتيجي وإدارة الأهداف (OKR)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        إدارة الأهداف الاستراتيجية والنتائج الرئيسية والمبادرات وبطاقة الأداء المتوازن
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRight: `4px solid ${s.color}`,
              }}
            >
              <Avatar sx={{ bgcolor: alpha(s.color, 0.12), color: s.color }}>{s.icon}</Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {atRisk > 0 && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            bgcolor: alpha('#ed6c02', 0.08),
            border: '1px solid',
            borderColor: alpha('#ed6c02', 0.3),
          }}
        >
          <Typography fontWeight={600} color="warning.main">
            <ObjectiveIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            {atRisk} هدف استراتيجي في خطر ويحتاج مراجعة
          </Typography>
        </Paper>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="الأهداف الاستراتيجية" icon={<ObjectiveIcon />} iconPosition="start" />
        <Tab label="النتائج الرئيسية (KRs)" icon={<KRIcon />} iconPosition="start" />
        <Tab label="المبادرات" icon={<InitiativeIcon />} iconPosition="start" />
        <Tab label="بطاقة الأداء المتوازن" icon={<ScorecardIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Strategic Objectives */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setObjDialog(true);
              }}
            >
              هدف جديد
            </Button>
          </Box>
          <Grid container spacing={2}>
            {objectives.map(obj => {
              const persp = PERSPECTIVES[obj.perspective] || {
                label: obj.perspective,
                color: '#999',
              };
              return (
                <Grid item xs={12} md={6} key={obj._id}>
                  <Card variant="outlined" sx={{ borderRight: `4px solid ${persp.color}` }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="h6" fontWeight={600}>
                          {obj.title}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          <Chip
                            size="small"
                            label={persp.label}
                            sx={{ bgcolor: alpha(persp.color, 0.12), color: persp.color }}
                          />
                          <Chip
                            size="small"
                            label={OBJ_STATUSES[obj.status] || obj.status}
                            color={OBJ_STATUS_COLORS[obj.status] || 'default'}
                          />
                        </Stack>
                      </Box>
                      {obj.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {obj.description.slice(0, 120)}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<CascadeIcon />}
                          label={OBJ_LEVELS[obj.level] || obj.level}
                        />
                        {obj.owner && (
                          <Chip size="small" variant="outlined" label={`المالك: ${obj.owner}`} />
                        )}
                      </Stack>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={obj.progress || 0}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: alpha(persp.color, 0.12),
                              '& .MuiLinearProgress-bar': { bgcolor: persp.color },
                            }}
                          />
                        </Box>
                        <Typography variant="body2" fontWeight={700}>
                          {obj.progress || 0}%
                        </Typography>
                      </Box>
                      {obj.keyResults?.length > 0 && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 0.5, display: 'block' }}
                        >
                          {obj.keyResults.length} نتيجة رئيسية مرتبطة
                        </Typography>
                      )}
                      <Box sx={{ mt: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditItem(obj);
                            setObjDialog(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            {objectives.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    لا توجد أهداف استراتيجية — ابدأ بتحديد أهدافك
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Tab 1: Key Results */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setKrDialog(true)}>
              نتيجة رئيسية جديدة
            </Button>
          </Box>
          <Grid container spacing={2}>
            {keyResults.map(kr => {
              const progress = kr.target
                ? Math.min(Math.round(((kr.current || 0) / kr.target) * 100), 100)
                : 0;
              const progColor = progress >= 70 ? '#2e7d32' : progress >= 40 ? '#ed6c02' : '#d32f2f';
              return (
                <Grid item xs={12} md={6} lg={4} key={kr._id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {kr.title}
                      </Typography>
                      {kr.objective?.title && (
                        <Typography variant="caption" color="text.secondary">
                          الهدف: {kr.objective.title}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip
                          size="small"
                          label={KR_TYPES[kr.type] || kr.type}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={
                            kr.status === 'on_track'
                              ? 'على المسار'
                              : kr.status === 'at_risk'
                                ? 'في خطر'
                                : kr.status === 'behind'
                                  ? 'متأخر'
                                  : kr.status === 'completed'
                                    ? 'مكتمل'
                                    : kr.status
                          }
                          color={
                            kr.status === 'on_track'
                              ? 'success'
                              : kr.status === 'completed'
                                ? 'success'
                                : kr.status === 'at_risk'
                                  ? 'warning'
                                  : 'error'
                          }
                        />
                      </Stack>
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption">
                            الحالي: {kr.current || 0} {kr.unit}
                          </Typography>
                          <Typography variant="caption">
                            الهدف: {kr.target} {kr.unit}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: alpha(progColor, 0.12),
                            '& .MuiLinearProgress-bar': { bgcolor: progColor },
                          }}
                        />
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          align="center"
                          sx={{ mt: 0.5 }}
                        >
                          {progress}%
                        </Typography>
                      </Box>
                      {kr.checkIns?.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {kr.checkIns.length} تسجيل تقدم
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            {keyResults.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">لا توجد نتائج رئيسية</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Tab 2: Initiatives */}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setInitDialog(true);
              }}
            >
              مبادرة جديدة
            </Button>
          </Box>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>المبادرة</TableCell>
                  <TableCell>المالك</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>الميزانية</TableCell>
                  <TableCell>المنفق</TableCell>
                  <TableCell>المراحل</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {initiatives.map(init => (
                  <TableRow key={init._id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{init.title}</Typography>
                    </TableCell>
                    <TableCell>{init.owner || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={INITIATIVE_STATUSES[init.status] || init.status}
                        color={
                          init.status === 'active'
                            ? 'primary'
                            : init.status === 'completed'
                              ? 'success'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {init.budget?.allocated
                        ? `${init.budget.allocated.toLocaleString()} ر.س`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {init.budget?.spent ? `${init.budget.spent.toLocaleString()} ر.س` : '-'}
                    </TableCell>
                    <TableCell>
                      {init.milestones?.length > 0 ? (
                        <Tooltip title={init.milestones.map(m => m.title).join(', ')}>
                          <Chip
                            size="small"
                            label={`${init.milestones.filter(m => m.status === 'completed').length}/${init.milestones.length}`}
                          />
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditItem(init);
                          setInitDialog(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {initiatives.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      لا توجد مبادرات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Tab 3: Balanced Scorecard */}
      {tab === 3 && (
        <Box>
          <Grid container spacing={2}>
            {Object.entries(PERSPECTIVES).map(([key, persp]) => {
              const entries = scorecard.filter(e => e.perspective === key);
              return (
                <Grid item xs={12} md={6} key={key}>
                  <Paper variant="outlined" sx={{ p: 2, borderTop: `4px solid ${persp.color}` }}>
                    <Typography variant="h6" fontWeight={700} sx={{ color: persp.color, mb: 2 }}>
                      {persp.label}
                    </Typography>
                    {entries.length > 0 ? (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>المقياس</TableCell>
                            <TableCell>الهدف</TableCell>
                            <TableCell>الفعلي</TableCell>
                            <TableCell>الاتجاه</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {entries.map(e => (
                            <TableRow key={e._id}>
                              <TableCell>{e.metric}</TableCell>
                              <TableCell>{e.target}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{e.actual}</TableCell>
                              <TableCell>
                                {e.trend === 'up' ? (
                                  <TrendUpIcon color="success" fontSize="small" />
                                ) : e.trend === 'down' ? (
                                  <TrendDownIcon color="error" fontSize="small" />
                                ) : (
                                  <TimelineIcon fontSize="small" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <Typography variant="body2" color="text.secondary" align="center">
                        لا توجد بيانات
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Objective Dialog */}
      <Dialog
        open={objDialog}
        onClose={() => {
          setObjDialog(false);
          setEditItem(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editItem ? 'تعديل الهدف' : 'هدف جديد'}
          <IconButton
            onClick={() => {
              setObjDialog(false);
              setEditItem(null);
            }}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <ObjectiveForm initial={editItem} onSave={handleSaveObjective} />
        </DialogContent>
      </Dialog>

      {/* Key Result Dialog */}
      <Dialog open={krDialog} onClose={() => setKrDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          نتيجة رئيسية جديدة
          <IconButton
            onClick={() => setKrDialog(false)}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <KRForm objectives={objectives} onSave={handleSaveKR} />
        </DialogContent>
      </Dialog>

      {/* Initiative Dialog */}
      <Dialog
        open={initDialog}
        onClose={() => {
          setInitDialog(false);
          setEditItem(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editItem ? 'تعديل المبادرة' : 'مبادرة جديدة'}
          <IconButton
            onClick={() => {
              setInitDialog(false);
              setEditItem(null);
            }}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <InitiativeForm initial={editItem} onSave={handleSaveInitiative} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function ObjectiveForm({ initial, onSave }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    perspective: 'financial',
    level: 'organization',
    status: 'draft',
    owner: '',
  });
  useEffect(() => {
    if (initial)
      setForm({
        title: initial.title || '',
        description: initial.description || '',
        perspective: initial.perspective || 'financial',
        level: initial.level || 'organization',
        status: initial.status || 'draft',
        owner: initial.owner || '',
      });
  }, [initial]);
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="عنوان الهدف"
          value={form.title}
          onChange={ch('title')}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="الوصف"
          value={form.description}
          onChange={ch('description')}
          multiline
          rows={2}
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          select
          fullWidth
          label="المنظور"
          value={form.perspective}
          onChange={ch('perspective')}
        >
          {Object.entries(PERSPECTIVES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={4}>
        <TextField select fullWidth label="المستوى" value={form.level} onChange={ch('level')}>
          {Object.entries(OBJ_LEVELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={4}>
        <TextField select fullWidth label="الحالة" value={form.status} onChange={ch('status')}>
          {Object.entries(OBJ_STATUSES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="المالك" value={form.owner} onChange={ch('owner')} />
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" fullWidth onClick={() => onSave(form)}>
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}

function KRForm({ objectives, onSave }) {
  const [form, setForm] = useState({
    title: '',
    objective: '',
    type: 'numeric',
    target: '',
    unit: '',
  });
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="عنوان النتيجة"
          value={form.title}
          onChange={ch('title')}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          select
          fullWidth
          label="الهدف المرتبط"
          value={form.objective}
          onChange={ch('objective')}
          required
        >
          {objectives.map(o => (
            <MenuItem key={o._id} value={o._id}>
              {o.title}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={4}>
        <TextField select fullWidth label="النوع" value={form.type} onChange={ch('type')}>
          {Object.entries(KR_TYPES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          type="number"
          label="القيمة المستهدفة"
          value={form.target}
          onChange={ch('target')}
        />
      </Grid>
      <Grid item xs={4}>
        <TextField fullWidth label="الوحدة" value={form.unit} onChange={ch('unit')} />
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          fullWidth
          onClick={() => onSave({ ...form, target: Number(form.target) })}
        >
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}

function InitiativeForm({ initial, onSave }) {
  const [form, setForm] = useState({
    title: '',
    owner: '',
    status: 'proposed',
    budgetAllocated: '',
    description: '',
  });
  useEffect(() => {
    if (initial)
      setForm({
        title: initial.title || '',
        owner: initial.owner || '',
        status: initial.status || 'proposed',
        budgetAllocated: initial.budget?.allocated || '',
        description: initial.description || '',
      });
  }, [initial]);
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="عنوان المبادرة"
          value={form.title}
          onChange={ch('title')}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="الوصف"
          value={form.description}
          onChange={ch('description')}
          multiline
          rows={2}
        />
      </Grid>
      <Grid item xs={4}>
        <TextField fullWidth label="المالك" value={form.owner} onChange={ch('owner')} />
      </Grid>
      <Grid item xs={4}>
        <TextField select fullWidth label="الحالة" value={form.status} onChange={ch('status')}>
          {Object.entries(INITIATIVE_STATUSES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          type="number"
          label="الميزانية المخصصة"
          value={form.budgetAllocated}
          onChange={ch('budgetAllocated')}
        />
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          fullWidth
          onClick={() => onSave({ ...form, budget: { allocated: Number(form.budgetAllocated) } })}
        >
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}
