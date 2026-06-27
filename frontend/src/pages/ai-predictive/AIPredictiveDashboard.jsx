/**
 * AI Predictive Analytics Dashboard — لوحة التحليلات التنبؤية
 * RTL Arabic rehabilitation center predictive analytics module.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Paper,
  Button,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Psychology as AIIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Healing as HealingIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  EmojiEvents as TrophyIcon,
  LocalHospital as HospitalIcon,
} from '@mui/icons-material';
import logger from '../../utils/logger';
import { useSnackbar } from '../../contexts/SnackbarContext';
import aiPredictiveService from '../../services/aiPredictiveService';

/* ─── Mock data for development ───────────────────────────────────────── */
const MOCK_BENEFICIARIES = [
  { id: 'demo-1', name: 'أحمد محمد العلي', diagnosis: 'شلل دماغي' },
  { id: 'demo-2', name: 'سارة خالد السالم', diagnosis: 'تأخر حركي' },
  { id: 'demo-3', name: 'عبدالرحمن فهد', diagnosis: 'اضطراب طيف التوحد' },
];

const MOCK_GOAL_PREDICTION = {
  predictedCompletionDate: '15 أغسطس 2025',
  confidence: '85%',
  probability: '78%',
  recommendedAction: 'استمرار الخطة الحالية — الهدف على المسار الصحيح',
  details: {
    currentProgress: '62%',
    predictedProgress: '95%',
    trend: 'تصاعدي',
    entriesCount: 8,
  },
};

const MOCK_DISCHARGE = {
  readinessScore: '75%',
  isReady: true,
  criteria: [
    { name: 'درجات ICF أقل من خفيفة (1.5)', passed: true, value: 'وظائف الجسم: 1.2، هياكل الجسم: 0.8، الأنشطة: 1.1، العوامل البيئية: 0.5' },
    { name: 'معدل تحقيق الأهداف > 70%', passed: true, value: '80% (4/5)' },
    { name: 'حضور الجلسات > 80%', passed: false, value: '75% (9/12)' },
    { name: 'تقييم حديث (< 3 أشهر)', passed: true, value: '10 يونيو 2025' },
  ],
  recommendations: ['معالجة أسباب الغياب وتحسين التزام المستفيد', 'المستفيد يبدو جاهزاً للتقييم النهائي للخروج'],
  summary: 'المستفيد يبدو جاهزاً للخروج بناءً على المعايير الحالية',
};

const MOCK_RISKS = [
  { riskType: 'غياب متكرر عن الجلسات', severity: 'متوسط', description: '3 جلسات متتالية غائب/ملغاة', recommendation: 'التواصل مع الأسرة وتحليل أسباب الغياب' },
  { riskType: 'توقف تقدم الهدف', severity: 'عالي', description: 'الهدف "المشي بمساعدة" لم يُسجل له تقدم منذ 5 أسابيع', recommendation: 'مراجعة الهدف مع الفريق العلاجي' },
];

const MOCK_INTERVENTIONS = [
  { intervention: 'تدليك علاجي مكثف — الأنشطة والمشاركة', rationale: 'المجال يحمل أعلى درجة إعاقة (2.4) ويتطلب تدخلاً مكثفاً', priority: 'عالية', expectedImpact: 'تخفيف درجة الإعاقة وتحسين الأداء الوظيفي في 4–6 أسابيع' },
  { intervention: 'هدف من بنك الأهداف: المشي بمساعدة', rationale: 'يتوافق مع مجال الضعف (الأنشطة والمشاركة) ويُستخدم في الحالات المشابهة', priority: 'متوسطة', expectedImpact: 'تحسين القدرة على التنقل والاستقلالية' },
  { intervention: 'جلسة مع أ.د. سارة (أخصائية علاج وظيفي)', rationale: 'متاحة في الجدول ومتخصصة في المجال المستهدف', priority: 'منخفضة', expectedImpact: 'تقدم منتظم ومتابعة دقيقة للأهداف' },
];

const MOCK_LOS = {
  estimatedWeeksRemaining: '12 أسبوع',
  confidenceRange: { low: '8 أسبوع', high: '16 أسبوع' },
  factors: ['شدة الحالة الأولية: 2.8 / 4', 'معدل التقدم: 0.45 درجة/أسبوع', 'عدد التقييمات: 4', 'اتجاه إيجابي: تحسن في الدرجات الوظيفية'],
};

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0'];

const AIPredictiveDashboard = () => {
  const showSnackbar = useSnackbar();
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(MOCK_BENEFICIARIES[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [goalPrediction, setGoalPrediction] = useState(MOCK_GOAL_PREDICTION);
  const [dischargeReadiness, setDischargeReadiness] = useState(MOCK_DISCHARGE);
  const [riskFlags, setRiskFlags] = useState(MOCK_RISKS);
  const [interventions, setInterventions] = useState(MOCK_INTERVENTIONS);
  const [lengthOfStay, setLengthOfStay] = useState(MOCK_LOS);

  const loadAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await aiPredictiveService.getFullAnalysis(selectedBeneficiary);
      if (res?.data?.data) {
        const data = res.data.data;
        // Merge with mock fallbacks if any field missing
        setGoalPrediction(prev => ({ ...prev, ...(data.dischargeReadiness?.goalPrediction || {}) }));
        setDischargeReadiness(data.dischargeReadiness || MOCK_DISCHARGE);
        setRiskFlags(data.riskFlags || MOCK_RISKS);
        setInterventions(data.interventions || MOCK_INTERVENTIONS);
        setLengthOfStay(data.lengthOfStay || MOCK_LOS);
      }
    } catch (err) {
      logger.error('[AI-Predictive] loadAnalysis error:', err);
      showSnackbar('حدث خطأ أثناء تحميل التحليلات — يتم عرض البيانات التجريبية', 'warning');
      // Keep mock data on error
      setGoalPrediction(MOCK_GOAL_PREDICTION);
      setDischargeReadiness(MOCK_DISCHARGE);
      setRiskFlags(MOCK_RISKS);
      setInterventions(MOCK_INTERVENTIONS);
      setLengthOfStay(MOCK_LOS);
    } finally {
      setLoading(false);
    }
  }, [selectedBeneficiary, showSnackbar]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  const currentBeneficiary = MOCK_BENEFICIARIES.find(b => b.id === selectedBeneficiary) || MOCK_BENEFICIARIES[0];

  const dischargePieData = dischargeReadiness.criteria.map((c, i) => ({
    name: c.name,
    value: c.passed ? 1 : 0,
    passed: c.passed,
  }));

  const riskSeverityColor = severity => {
    if (severity === 'عالي') return 'error';
    if (severity === 'متوسط') return 'warning';
    return 'info';
  };

  const interventionPriorityColor = priority => {
    if (priority === 'عالية') return 'error';
    if (priority === 'متوسطة') return 'warning';
    return 'success';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3, direction: 'rtl' }}>
      {/* Header */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <AIIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                التحليلات التنبؤية
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                رؤى ذكية مبنية على البيانات السريرية للتخطيط المُحسّن
              </Typography>
            </Box>
          </Box>
          <Chip
            label="AI Powered"
            color="secondary"
            sx={{ fontWeight: 'bold', fontSize: '0.9rem', bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }}
          />
        </Box>
      </Paper>

      {/* Beneficiary Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 280 }}>
              <InputLabel id="ben-select-label">اختيار المستفيد</InputLabel>
              <Select
                labelId="ben-select-label"
                value={selectedBeneficiary}
                label="اختيار المستفيد"
                onChange={e => setSelectedBeneficiary(e.target.value)}
              >
                {MOCK_BENEFICIARIES.map(b => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name} — {b.diagnosis}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                المستفيد الحالي: <strong>{currentBeneficiary.name}</strong> | التشخيص: {currentBeneficiary.diagnosis}
              </Typography>
            </Box>
            <Button variant="contained" onClick={loadAnalysis} disabled={loading}>
              {loading ? 'جاري التحليل...' : 'تحديث التحليل'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress size={60} />
        </Box>
      )}

      <Grid container spacing={3}>
        {/* ─── Goal Achievement Prediction ─── */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={<TrendUpIcon color="success" />}
              title="توقع تحقيق الهدف"
              subheader="النموذج التنبؤي للأهداف العلاجية"
            />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  التقدم الحالي
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={parseInt(goalPrediction.details?.currentProgress, 10) || 0}
                  sx={{ height: 10, borderRadius: 5, mb: 1 }}
                />
                <Typography variant="body2" align="left">
                  {goalPrediction.details?.currentProgress}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  التقدم المتوقع
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={parseInt(goalPrediction.details?.predictedProgress, 10) || 0}
                  color="success"
                  sx={{ height: 10, borderRadius: 5, mb: 1 }}
                />
                <Typography variant="body2" align="left">
                  {goalPrediction.details?.predictedProgress}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <CalendarIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">تاريخ التحقق المتوقع</Typography>
                    <Typography variant="h6" fontWeight="bold">{goalPrediction.predictedCompletionDate}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <TrophyIcon color="success" />
                    <Typography variant="body2" color="text.secondary">نسبة الثقة</Typography>
                    <Typography variant="h6" fontWeight="bold">{goalPrediction.confidence}</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                <Typography variant="body2" fontWeight="bold" color="primary.dark" gutterBottom>
                  التوصية:
                </Typography>
                <Typography variant="body2" color="primary.dark">
                  {goalPrediction.recommendedAction}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ─── Discharge Readiness ─── */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={<HospitalIcon color={dischargeReadiness.isReady ? 'success' : 'warning'} />}
              title="جاهزية الخروج"
              subheader={dischargeReadiness.summary}
            />
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress
                    variant="determinate"
                    value={parseInt(dischargeReadiness.readinessScore, 10)}
                    size={140}
                    thickness={6}
                    color={dischargeReadiness.isReady ? 'success' : 'warning'}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h4" fontWeight="bold">
                      {dischargeReadiness.readinessScore}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      جاهزية
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <List dense>
                {dischargeReadiness.criteria.map((c, i) => (
                  <ListItem key={i}>
                    <ListItemIcon>
                      {c.passed ? <CheckIcon color="success" /> : <ErrorIcon color="error" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={c.name}
                      secondary={c.value}
                      primaryTypographyProps={{ fontWeight: 'medium' }}
                    />
                  </ListItem>
                ))}
              </List>

              {dischargeReadiness.recommendations.length > 0 && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.50', borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight="bold" color="warning.dark" gutterBottom>
                    توصيات:
                  </Typography>
                  {dischargeReadiness.recommendations.map((r, i) => (
                    <Typography key={i} variant="body2" color="warning.dark" sx={{ mb: 0.5 }}>
                      • {r}
                    </Typography>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ─── Risk Flags ─── */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<WarningIcon color="error" />}
              title="أعلام المخاطر"
              subheader="الكشف المبكر عن التحذيرات السريرية"
            />
            <CardContent>
              {riskFlags.length === 0 ? (
                <Alert severity="success">لا توجد مخاطر محددة — الوضع مستقر</Alert>
              ) : (
                <List>
                  {riskFlags.map((risk, i) => (
                    <ListItem
                      key={i}
                      sx={{
                        mb: 1,
                        bgcolor: `${riskSeverityColor(risk.severity)}.50`,
                        borderRadius: 2,
                        borderRight: 4,
                        borderColor: `${riskSeverityColor(risk.severity)}.main`,
                      }}
                    >
                      <ListItemIcon>
                        {risk.severity === 'عالي' ? <ErrorIcon color="error" /> : <WarningIcon color="warning" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {risk.riskType}
                            </Typography>
                            <Chip
                              label={risk.severity}
                              color={riskSeverityColor(risk.severity)}
                              size="small"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {risk.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              <strong>التوصية:</strong> {risk.recommendation}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ─── Recommended Interventions ─── */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<HealingIcon color="primary" />}
              title="التدخلات المقترحة"
              subheader="اقتراحات مبنية على أضعف المجالات"
            />
            <CardContent>
              <List>
                {interventions.map((int, i) => (
                  <ListItem
                    key={i}
                    sx={{
                      mb: 1.5,
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      boxShadow: 1,
                    }}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: `${interventionPriorityColor(int.priority)}.main`, width: 32, height: 32 }}>
                        <HealingIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {int.intervention}
                          </Typography>
                          <Chip
                            label={int.priority}
                            color={interventionPriorityColor(int.priority)}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            <strong>التبرير:</strong> {int.rationale}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            <strong>التأثير المتوقع:</strong> {int.expectedImpact}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* ─── Length of Stay Estimate ─── */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              avatar={<ScheduleIcon color="info" />}
              title="تقدير فترة البقاء"
              subheader="تقدير مبني على شدة الحالة ومعدل التقدم"
            />
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'info.50', borderRadius: 3 }}>
                    <Typography variant="h3" fontWeight="bold" color="info.dark">
                      {lengthOfStay.estimatedWeeksRemaining}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      المتوقع المتبقي
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      نطاق الثقة: {lengthOfStay.confidenceRange?.low} — {lengthOfStay.confidenceRange?.high}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    العوامل المؤثرة:
                  </Typography>
                  <List dense>
                    {lengthOfStay.factors.map((f, i) => (
                      <ListItem key={i}>
                        <ListItemIcon>
                          <InfoIcon color="info" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={f} />
                      </ListItem>
                    ))}
                  </List>

                  {/* Simple timeline visualization */}
                  <Box sx={{ mt: 3, px: 2 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                      الخط الزمني التقديري
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="الآن" size="small" color="default" />
                      <Box sx={{ flex: 1, height: 8, bgcolor: 'grey.200', borderRadius: 4, position: 'relative' }}>
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: '60%',
                            bgcolor: 'info.main',
                            borderRadius: 4,
                          }}
                        />
                      </Box>
                      <Chip label="الخروج المتوقع" size="small" color="info" />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Footer note */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          التحليلات التنبؤية تعتمد على خوارزميات إحصائية ولا تحل محل القرار السريري للفريق الطبي.
        </Typography>
      </Box>
    </Container>
  );
};

export default AIPredictiveDashboard;
