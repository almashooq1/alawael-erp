/**
 * Sustainability & ESG Management Page
 * صفحة إدارة الاستدامة والطاقة والبيئة
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';

import * as susService from '../../services/enterpriseUltra.service';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import NatureIcon from '@mui/icons-material/Nature';
import AddIcon from '@mui/icons-material/Add';

const statusColors = {
  draft: 'default',
  active: 'success',
  reported: 'primary',
  archived: 'default',
  on_track: 'success',
  at_risk: 'warning',
  behind: 'error',
  completed: 'primary',
  not_started: 'default',
  pending_review: 'warning',
  published: 'success',
  submitted: 'info',
};

export default function SustainabilityPage() {
  const [tab, setTab] = useState(0);
  const [energy, setEnergy] = useState([]);
  const [carbon, setCarbon] = useState([]);
  const [waste, setWaste] = useState([]);
  const [esgReports, setEsgReports] = useState([]);
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState({ open: false, type: '' });
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [energyRes, carbonRes, wasteRes, esgRes, goalsRes, statsRes] = await Promise.all([
        susService.getEnergyReadings(),
        susService.getCarbonFootprints(),
        susService.getWasteRecords(),
        susService.getESGReports(),
        susService.getSustainabilityGoals(),
        susService.getSustainabilityDashboard(),
      ]);
      setEnergy(energyRes.data?.data || []);
      setCarbon(carbonRes.data?.data || []);
      setWaste(wasteRes.data?.data || []);
      setEsgReports(esgRes.data?.data || []);
      setGoals(goalsRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch {
      setError('حدث خطأ في تحميل البيانات');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.type === 'energy') await susService.createEnergyReading(form);
      else if (dialog.type === 'carbon') await susService.createCarbonFootprint(form);
      else if (dialog.type === 'waste') await susService.createWasteRecord(form);
      else if (dialog.type === 'esg') await susService.createESGReport(form);
      else if (dialog.type === 'goal') await susService.createSustainabilityGoal(form);
      setDialog({ open: false, type: '' });
      setForm({});
      fetchData();
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    }
  };

  const openDialog = type => {
    setDialog({ open: true, type });
    setForm({});
    setError('');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <EcoIcon color="success" fontSize="large" /> الاستدامة وESG
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مراقبة الطاقة والبصمة الكربونية وإدارة النفايات وتقارير ESG
          </Typography>
        </Box>
        <IconButton onClick={fetchData}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {loading && <LinearProgress color="success" sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          {
            label: 'استهلاك الطاقة (kWh)',
            value: stats.totalEnergy?.toLocaleString() || '0',
            color: '#ed6c02',
            icon: <EnergyIcon />,
          },
          {
            label: 'البصمة الكربونية (طن)',
            value: stats.totalCarbon?.toLocaleString() || '0',
            color: '#616161',
            icon: <CarbonIcon />,
          },
          {
            label: 'معدل إعادة التدوير',
            value: `${stats.recyclingRate || 0}%`,
            color: '#2e7d32',
            icon: <NatureIcon />,
          },
          {
            label: 'أهداف محققة',
            value: `${stats.goalsAchieved || 0}/${goals.length}`,
            color: '#1976d2',
            icon: <GoalIcon />,
          },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card
              sx={{
                background: `linear-gradient(135deg, ${s.color}15, ${s.color}08)`,
                borderLeft: `4px solid ${s.color}`,
              }}
            >
              <CardContent sx={{ py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ color: s.color }}>{s.icon}</Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {s.label}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color={s.color}>
                      {s.value}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={`الطاقة (${energy.length})`} icon={<EnergyIcon />} iconPosition="start" />
        <Tab label={`الكربون (${carbon.length})`} icon={<CarbonIcon />} iconPosition="start" />
        <Tab label={`النفايات (${waste.length})`} icon={<WasteIcon />} iconPosition="start" />
        <Tab label={`تقارير ESG (${esgReports.length})`} icon={<ESGIcon />} iconPosition="start" />
        <Tab label={`الأهداف (${goals.length})`} icon={<GoalIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Energy Readings */}
      {tab === 0 && (
        <Box>
          <Button
            variant="contained"
            color="warning"
            startIcon={<AddIcon />}
            onClick={() => openDialog('energy')}
            sx={{ mb: 2 }}
          >
            قراءة طاقة جديدة
          </Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الموقع</TableCell>
                  <TableCell>مصدر الطاقة</TableCell>
                  <TableCell>الاستهلاك (kWh)</TableCell>
                  <TableCell>التكلفة (ر.س)</TableCell>
                  <TableCell>الفترة</TableCell>
                  <TableCell>التاريخ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {energy.map(e => (
                  <TableRow key={e._id} hover>
                    <TableCell>{e.facility || e.location}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={e.energySource?.replace(/_/g, ' ')}
                        color={
                          e.energySource?.includes('solar') || e.energySource?.includes('wind')
                            ? 'success'
                            : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>{e.consumption?.toLocaleString() || '—'}</TableCell>
                    <TableCell>{e.cost ? `${e.cost.toLocaleString()} ر.س` : '—'}</TableCell>
                    <TableCell>{e.period}</TableCell>
                    <TableCell>{new Date(e.readingDate).toLocaleDateString('ar-SA')}</TableCell>
                  </TableRow>
                ))}
                {!energy.length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      لا توجد قراءات طاقة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 1: Carbon Footprint */}
      {tab === 1 && (
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openDialog('carbon')}
            sx={{ mb: 2 }}
          >
            سجل كربون جديد
          </Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>النطاق</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell>الانبعاث (طن CO₂)</TableCell>
                  <TableCell>المصدر</TableCell>
                  <TableCell>الفترة</TableCell>
                  <TableCell>التخفيف</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {carbon.map(c => (
                  <TableRow key={c._id} hover>
                    <TableCell>
                      <Chip
                        size="small"
                        label={`النطاق ${c.scope}`}
                        color={c.scope === 1 ? 'error' : c.scope === 2 ? 'warning' : 'info'}
                      />
                    </TableCell>
                    <TableCell>{c.category?.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography>{c.emissions?.toLocaleString() || '—'}</Typography>
                        {c.reduction > 0 && (
                          <Chip
                            size="small"
                            color="success"
                            label={`-${c.reduction}%`}
                            icon={<TrendDownIcon />}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{c.source}</TableCell>
                    <TableCell>{c.period}</TableCell>
                    <TableCell>{c.mitigationActions?.length || 0} إجراء</TableCell>
                  </TableRow>
                ))}
                {!carbon.length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      لا توجد سجلات كربون
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 2: Waste Records */}
      {tab === 2 && (
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openDialog('waste')}
            sx={{ mb: 2 }}
          >
            سجل نفايات جديد
          </Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>النوع</TableCell>
                  <TableCell>الكمية (كجم)</TableCell>
                  <TableCell>طريقة التخلص</TableCell>
                  <TableCell>المعاد تدويره</TableCell>
                  <TableCell>الموقع</TableCell>
                  <TableCell>التاريخ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {waste.map(w => (
                  <TableRow key={w._id} hover>
                    <TableCell>
                      <Chip
                        size="small"
                        label={w.wasteType?.replace(/_/g, ' ')}
                        color={w.wasteType === 'hazardous' ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{w.quantity?.toLocaleString() || '—'}</TableCell>
                    <TableCell>{w.disposalMethod?.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      {w.recycledPercentage != null ? (
                        <Chip
                          size="small"
                          color={w.recycledPercentage >= 50 ? 'success' : 'warning'}
                          label={`${w.recycledPercentage}%`}
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{w.facility || '—'}</TableCell>
                    <TableCell>{new Date(w.recordDate).toLocaleDateString('ar-SA')}</TableCell>
                  </TableRow>
                ))}
                {!waste.length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      لا توجد سجلات نفايات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 3: ESG Reports */}
      {tab === 3 && (
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openDialog('esg')}
            sx={{ mb: 2 }}
          >
            تقرير ESG جديد
          </Button>
          <Grid container spacing={2}>
            {esgReports.map(r => (
              <Grid item xs={12} md={4} key={r._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={1}
                    >
                      <Typography fontWeight="bold">{r.title}</Typography>
                      <Chip
                        size="small"
                        color={statusColors[r.status] || 'default'}
                        label={r.status?.replace(/_/g, ' ')}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {r.description}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption">
                      الإطار: {r.framework?.replace(/_/g, ' ') || '—'}
                    </Typography>
                    <br />
                    <Typography variant="caption">الفترة: {r.reportingPeriod}</Typography>
                    <br />
                    {r.scores && (
                      <Stack direction="row" spacing={1} mt={1}>
                        <Chip
                          size="small"
                          color="success"
                          label={`E: ${r.scores.environmental || '—'}`}
                        />
                        <Chip size="small" color="info" label={`S: ${r.scores.social || '—'}`} />
                        <Chip
                          size="small"
                          color="warning"
                          label={`G: ${r.scores.governance || '—'}`}
                        />
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {!esgReports.length && (
              <Grid item xs={12}>
                <Alert severity="info">لا توجد تقارير ESG</Alert>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Tab 4: Sustainability Goals */}
      {tab === 4 && (
        <Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => openDialog('goal')}
            sx={{ mb: 2 }}
          >
            هدف جديد
          </Button>
          <Grid container spacing={2}>
            {goals.map(g => (
              <Grid item xs={12} md={6} key={g._id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderColor:
                      g.status === 'completed'
                        ? 'success.main'
                        : g.status === 'behind'
                          ? 'error.main'
                          : 'divider',
                  }}
                >
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={1}
                    >
                      <Typography fontWeight="bold">{g.goalName}</Typography>
                      <Chip
                        size="small"
                        color={statusColors[g.status] || 'default'}
                        label={g.status?.replace(/_/g, ' ')}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {g.description}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption">
                      التصنيف: {g.category?.replace(/_/g, ' ')}
                    </Typography>
                    <br />
                    <Typography variant="caption">
                      الهدف: {g.targetValue} {g.unit || ''}
                    </Typography>
                    <br />
                    <Typography variant="caption">
                      الحالي: {g.currentValue || 0} {g.unit || ''}
                    </Typography>
                    {g.targetValue && g.currentValue != null && (
                      <Box mt={1}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((g.currentValue / g.targetValue) * 100, 100)}
                          color={g.currentValue >= g.targetValue ? 'success' : 'primary'}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption" sx={{ mt: 0.5 }}>
                          {Math.round((g.currentValue / g.targetValue) * 100)}% مكتمل
                        </Typography>
                      </Box>
                    )}
                    {g.deadline && (
                      <Typography
                        variant="caption"
                        color={new Date(g.deadline) < new Date() ? 'error' : 'text.secondary'}
                        sx={{ display: 'block', mt: 1 }}
                      >
                        الموعد النهائي: {new Date(g.deadline).toLocaleDateString('ar-SA')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {!goals.length && (
              <Grid item xs={12}>
                <Alert severity="info">لا توجد أهداف استدامة</Alert>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Add Dialog */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, type: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialog.type === 'energy' && 'قراءة طاقة جديدة'}
          {dialog.type === 'carbon' && 'سجل كربون جديد'}
          {dialog.type === 'waste' && 'سجل نفايات جديد'}
          {dialog.type === 'esg' && 'تقرير ESG جديد'}
          {dialog.type === 'goal' && 'هدف استدامة جديد'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialog.type === 'energy' && (
              <>
                <TextField
                  label="الموقع / المنشأة"
                  fullWidth
                  value={form.facility || ''}
                  onChange={e => setForm({ ...form, facility: e.target.value })}
                />
                <TextField
                  select
                  label="مصدر الطاقة"
                  fullWidth
                  value={form.energySource || ''}
                  onChange={e => setForm({ ...form, energySource: e.target.value })}
                >
                  {['electricity', 'natural_gas', 'diesel', 'solar', 'wind', 'other'].map(t => (
                    <MenuItem key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="الاستهلاك (kWh)"
                  fullWidth
                  type="number"
                  value={form.consumption || ''}
                  onChange={e => setForm({ ...form, consumption: e.target.value })}
                />
                <TextField
                  label="التكلفة (ر.س)"
                  fullWidth
                  type="number"
                  value={form.cost || ''}
                  onChange={e => setForm({ ...form, cost: e.target.value })}
                />
                <TextField
                  label="تاريخ القراءة"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={form.readingDate || ''}
                  onChange={e => setForm({ ...form, readingDate: e.target.value })}
                />
              </>
            )}
            {dialog.type === 'carbon' && (
              <>
                <TextField
                  select
                  label="النطاق"
                  fullWidth
                  value={form.scope || ''}
                  onChange={e => setForm({ ...form, scope: e.target.value })}
                >
                  {[1, 2, 3].map(s => (
                    <MenuItem key={s} value={s}>{`النطاق ${s}`}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="الفئة"
                  fullWidth
                  value={form.category || ''}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                />
                <TextField
                  label="الانبعاث (طن CO₂)"
                  fullWidth
                  type="number"
                  value={form.emissions || ''}
                  onChange={e => setForm({ ...form, emissions: e.target.value })}
                />
                <TextField
                  label="المصدر"
                  fullWidth
                  value={form.source || ''}
                  onChange={e => setForm({ ...form, source: e.target.value })}
                />
                <TextField
                  label="الفترة"
                  fullWidth
                  value={form.period || ''}
                  onChange={e => setForm({ ...form, period: e.target.value })}
                />
              </>
            )}
            {dialog.type === 'waste' && (
              <>
                <TextField
                  select
                  label="نوع النفايات"
                  fullWidth
                  value={form.wasteType || ''}
                  onChange={e => setForm({ ...form, wasteType: e.target.value })}
                >
                  {[
                    'general',
                    'recyclable',
                    'hazardous',
                    'organic',
                    'electronic',
                    'construction',
                    'medical',
                  ].map(t => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="الكمية (كجم)"
                  fullWidth
                  type="number"
                  value={form.quantity || ''}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                />
                <TextField
                  select
                  label="طريقة التخلص"
                  fullWidth
                  value={form.disposalMethod || ''}
                  onChange={e => setForm({ ...form, disposalMethod: e.target.value })}
                >
                  {[
                    'landfill',
                    'recycling',
                    'incineration',
                    'composting',
                    'hazardous_treatment',
                    'reuse',
                  ].map(t => (
                    <MenuItem key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="نسبة إعادة التدوير (%)"
                  fullWidth
                  type="number"
                  value={form.recycledPercentage || ''}
                  onChange={e => setForm({ ...form, recycledPercentage: e.target.value })}
                />
              </>
            )}
            {dialog.type === 'esg' && (
              <>
                <TextField
                  label="عنوان التقرير"
                  fullWidth
                  value={form.title || ''}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
                <TextField
                  select
                  label="الإطار"
                  fullWidth
                  value={form.framework || ''}
                  onChange={e => setForm({ ...form, framework: e.target.value })}
                >
                  {['gri', 'sasb', 'tcfd', 'cdp', 'un_sdg', 'custom'].map(t => (
                    <MenuItem key={t} value={t}>
                      {t.toUpperCase()}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="فترة التقرير"
                  fullWidth
                  value={form.reportingPeriod || ''}
                  onChange={e => setForm({ ...form, reportingPeriod: e.target.value })}
                />
                <TextField
                  label="الوصف"
                  fullWidth
                  multiline
                  rows={2}
                  value={form.description || ''}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </>
            )}
            {dialog.type === 'goal' && (
              <>
                <TextField
                  label="اسم الهدف"
                  fullWidth
                  value={form.goalName || ''}
                  onChange={e => setForm({ ...form, goalName: e.target.value })}
                />
                <TextField
                  select
                  label="التصنيف"
                  fullWidth
                  value={form.category || ''}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {[
                    'emissions_reduction',
                    'energy_efficiency',
                    'waste_reduction',
                    'water_conservation',
                    'renewable_energy',
                    'biodiversity',
                    'social_impact',
                  ].map(t => (
                    <MenuItem key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="القيمة المستهدفة"
                  fullWidth
                  type="number"
                  value={form.targetValue || ''}
                  onChange={e => setForm({ ...form, targetValue: e.target.value })}
                />
                <TextField
                  label="الموعد النهائي"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={form.deadline || ''}
                  onChange={e => setForm({ ...form, deadline: e.target.value })}
                />
                <TextField
                  label="الوصف"
                  fullWidth
                  multiline
                  rows={2}
                  value={form.description || ''}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, type: '' })}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
