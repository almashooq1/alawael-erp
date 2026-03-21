import { useState, useEffect } from 'react';
import riskAssessmentService from '../../services/riskAssessment.service';
import {
  Paper,
} from '@mui/material';

import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors, surfaceColors } from '../../theme/palette';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import ShieldIcon from '@mui/icons-material/Shield';
import AddIcon from '@mui/icons-material/Add';

const demoRisks = [
  {
    _id: 'r1',
    title: 'انقطاع خدمة الإنترنت',
    category: 'technical',
    probability: 3,
    impact: 4,
    status: 'open',
    mitigation: 'توفير خط إنترنت احتياطي',
    owner: 'تقنية المعلومات',
    createdAt: '2026-01-15',
  },
  {
    _id: 'r2',
    title: 'نقص الكادر التمريضي',
    category: 'operational',
    probability: 4,
    impact: 5,
    status: 'mitigated',
    mitigation: 'تعاقد مع شركة توظيف',
    owner: 'الموارد البشرية',
    createdAt: '2026-01-20',
  },
  {
    _id: 'r3',
    title: 'تأخر تسليم المعدات الطبية',
    category: 'supply_chain',
    probability: 2,
    impact: 3,
    status: 'open',
    mitigation: 'تنويع الموردين',
    owner: 'المشتريات',
    createdAt: '2026-02-01',
  },
  {
    _id: 'r4',
    title: 'حريق في المستودع',
    category: 'safety',
    probability: 1,
    impact: 5,
    status: 'mitigated',
    mitigation: 'نظام إطفاء تلقائي + تأمين',
    owner: 'السلامة',
    createdAt: '2026-02-10',
  },
  {
    _id: 'r5',
    title: 'تسرب بيانات المرضى',
    category: 'security',
    probability: 2,
    impact: 5,
    status: 'open',
    mitigation: 'تشفير قاعدة البيانات',
    owner: 'تقنية المعلومات',
    createdAt: '2026-02-12',
  },
  {
    _id: 'r6',
    title: 'تغييرات في الأنظمة الحكومية',
    category: 'compliance',
    probability: 3,
    impact: 3,
    status: 'monitoring',
    mitigation: 'متابعة التحديثات الرسمية',
    owner: 'الشؤون القانونية',
    createdAt: '2026-02-15',
  },
];

const statusMap = {
  open: { label: 'مفتوح', color: 'error' },
  mitigated: { label: 'تم التخفيف', color: 'success' },
  monitoring: { label: 'مراقبة', color: 'warning' },
  closed: { label: 'مغلق', color: 'default' },
};
const categoryMap = {
  technical: 'تقني',
  operational: 'تشغيلي',
  supply_chain: 'سلسلة إمداد',
  safety: 'سلامة',
  security: 'أمن معلومات',
  compliance: 'امتثال',
};

const riskScore = (p, i) => p * i;
const riskLevel = score =>
  score >= 15
    ? { label: 'حرج', color: statusColors.errorDark }
    : score >= 8
      ? { label: 'عالي', color: statusColors.warningDark }
      : score >= 4
        ? { label: 'متوسط', color: statusColors.warningAmber }
        : { label: 'منخفض', color: statusColors.successDark };

export default function RiskAssessment() {
  const [risks, setRisks] = useState([]);
  const [tab, setTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'technical',
    probability: 3,
    impact: 3,
    mitigation: '',
    owner: '',
  });
  const showSnackbar = useSnackbar();

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await riskAssessmentService.getAll();
        setRisks(res.data || []);
      } catch {
        setRisks(demoRisks);
      }
    };
    loadData();
  }, []);

  const statuses = ['all', 'open', 'mitigated', 'monitoring'];
  const filtered = tab === 0 ? risks : risks.filter(r => r.status === statuses[tab]);

  const stats = {
    total: risks.length,
    open: risks.filter(r => r.status === 'open').length,
    critical: risks.filter(r => riskScore(r.probability, r.impact) >= 15).length,
    mitigated: risks.filter(r => r.status === 'mitigated').length,
  };

  const handleCreate = async () => {
    if (!form.title) {
      showSnackbar('عنوان الخطر مطلوب', 'warning');
      return;
    }
    const payload = { ...form, status: 'open', createdAt: new Date().toISOString().slice(0, 10) };
    try {
      const res = await riskAssessmentService.create(payload);
      setRisks(prev => [...prev, res.data || { ...payload, _id: Date.now().toString() }]);
      showSnackbar('تم إضافة الخطر بنجاح', 'success');
    } catch {
      setRisks(prev => [...prev, { ...payload, _id: Date.now().toString() }]);
      showSnackbar('تم إضافة الخطر محلياً - لم يتصل بالخادم', 'warning');
    }
    setDialogOpen(false);
    setForm({
      title: '',
      category: 'technical',
      probability: 3,
      impact: 3,
      mitigation: '',
      owner: '',
    });
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ background: gradients.warning, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WarningIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              تقييم المخاطر
            </Typography>
            <Typography variant="body2">تحليل وإدارة المخاطر المؤسسية</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          <ShieldIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          تقييم المخاطر
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          خطر جديد
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي المخاطر',
            val: stats.total,
            color: statusColors.primaryBlue,
            icon: <ShieldIcon />,
          },
          {
            label: 'مخاطر مفتوحة',
            val: stats.open,
            color: statusColors.errorDark,
            icon: <WarningIcon />,
          },
          {
            label: 'مخاطر حرجة',
            val: stats.critical,
            color: statusColors.warningDark,
            icon: <HighIcon />,
          },
          {
            label: 'تم التخفيف',
            val: stats.mitigated,
            color: statusColors.successDark,
            icon: <LowIcon />,
          },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ borderRight: `4px solid ${s.color}` }}>
              <CardContent
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {s.label}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {s.val}
                  </Typography>
                </Box>
                <Box sx={{ color: s.color }}>{s.icon}</Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Risk Matrix */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          مصفوفة المخاطر (الاحتمال × التأثير)
        </Typography>
        <Grid container spacing={1}>
          {[5, 4, 3, 2, 1].map(prob => (
            <React.Fragment key={prob}>
              <Grid item xs={1}>
                <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', pt: 1 }}>
                  {prob}
                </Typography>
              </Grid>
              {[1, 2, 3, 4, 5].map(imp => {
                const score = prob * imp;
                const level = riskLevel(score);
                const count = risks.filter(r => r.probability === prob && r.impact === imp).length;
                return (
                  <Grid item xs={2.2} key={imp}>
                    <Tooltip title={`الاحتمال: ${prob} | التأثير: ${imp} = ${score}`}>
                      <Box
                        sx={{
                          bgcolor: level.color + '22',
                          border: `1px solid ${level.color}`,
                          borderRadius: 1,
                          p: 1,
                          textAlign: 'center',
                          minHeight: 40,
                        }}
                      >
                        {count > 0 && (
                          <Chip
                            label={count}
                            size="small"
                            sx={{ bgcolor: level.color, color: '#fff' }}
                          />
                        )}
                      </Box>
                    </Tooltip>
                  </Grid>
                );
              })}
            </React.Fragment>
          ))}
          <Grid item xs={1}></Grid>
          {[1, 2, 3, 4, 5].map(i => (
            <Grid item xs={2.2} key={i}>
              <Typography variant="caption" sx={{ textAlign: 'center', display: 'block' }}>
                {i}
              </Typography>
            </Grid>
          ))}
        </Grid>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 1 }}
        >
          ← التأثير →
        </Typography>
      </Paper>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`الكل (${risks.length})`} />
          <Tab label={`مفتوح (${stats.open})`} />
          <Tab label={`تم التخفيف (${stats.mitigated})`} />
          <Tab label="مراقبة" />
        </Tabs>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: surfaceColors.lightGray }}>
              <TableCell>الخطر</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell>الاحتمال</TableCell>
              <TableCell>التأثير</TableCell>
              <TableCell>المستوى</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>المسؤول</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(risk => {
              const score = riskScore(risk.probability, risk.impact);
              const level = riskLevel(score);
              return (
                <TableRow key={risk._id} hover>
                  <TableCell>
                    <Typography fontWeight="bold">{risk.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {risk.mitigation}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={categoryMap[risk.category] || risk.category}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{risk.probability}/5</TableCell>
                  <TableCell>{risk.impact}/5</TableCell>
                  <TableCell>
                    <Chip
                      label={`${level.label} (${score})`}
                      size="small"
                      sx={{ bgcolor: level.color, color: '#fff' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusMap[risk.status]?.label}
                      size="small"
                      color={statusMap[risk.status]?.color}
                    />
                  </TableCell>
                  <TableCell>{risk.owner}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة خطر جديد</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="عنوان الخطر"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="الفئة"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            sx={{ mb: 2 }}
            SelectProps={{ native: true }}
          >
            {Object.entries(categoryMap).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </TextField>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="الاحتمال (1-5)"
                value={form.probability}
                onChange={e =>
                  setForm({ ...form, probability: Math.min(5, Math.max(1, +e.target.value)) })
                }
                inputProps={{ min: 1, max: 5 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="التأثير (1-5)"
                value={form.impact}
                onChange={e =>
                  setForm({ ...form, impact: Math.min(5, Math.max(1, +e.target.value)) })
                }
                inputProps={{ min: 1, max: 5 }}
              />
            </Grid>
          </Grid>
          <TextField
            fullWidth
            label="المسؤول"
            value={form.owner}
            onChange={e => setForm({ ...form, owner: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="خطة التخفيف"
            value={form.mitigation}
            onChange={e => setForm({ ...form, mitigation: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
