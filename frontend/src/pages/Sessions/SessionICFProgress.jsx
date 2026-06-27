import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, Grid, Slider, Stack, Divider,
  TextField, Chip, Card, CardContent, Alert, CircularProgress,
  LinearProgress, Tooltip, IconButton
} from '@mui/material';
import {
  Save as SaveIcon, CheckCircle, ArrowForward, ArrowBack,
  FitnessCenter, Accessibility, Psychology, Nature, Person
} from '@mui/icons-material';
import { motion } from 'framer-motion';

/**
 * SessionICFProgress.jsx
 * صفحة تسجيل التقدم على أهداف ICF المرتبطة بالجلسة العلاجية
 * تُستخدم أثناء الجلسة لتوثيق مستوى أداء المستفيد لكل هدف مرتبط بتقييم ICF
 */

// تعيين أيقونات المجالات
const DOMAIN_ICONS = {
  bodyFunctions: <FitnessCenter />,
  bodyStructures: <Accessibility />,
  activitiesAndParticipation: <Psychology />,
  environmentalFactors: <Nature />,
  personalFactors: <Person />,
};

// تعيين تسميات المجالات بالعربية
const DOMAIN_LABELS = {
  bodyFunctions: 'وظائف الجسم',
  bodyStructures: 'أجزاء الجسم',
  activitiesAndParticipation: 'الأنشطة والمشاركة',
  environmentalFactors: 'العوامل البيئية',
  personalFactors: 'العوامل الشخصية',
};

// تسميات مقياس ICF
const ICF_LABELS = {
  0: 'لا إعاقة',
  1: 'خفيف',
  2: 'متوسط',
  3: 'شديد',
  4: 'شديد جداً',
};

// دالة لتحديد لون الشريط التمرير بناءً على القيمة
const getSliderColor = (value) => {
  if (value <= 1) return '#4caf50';      // أخضر
  if (value === 2) return '#ff9800';     // أصفر/برتقالي
  return '#f44336';                       // أحمر
};

// دالة لتحديد لون الشريحة بناءً على القيمة
const getChipColor = (value) => {
  if (value <= 1) return 'success';
  if (value === 2) return 'warning';
  return 'error';
};

// بيانات تجريبية لأهداف ICF
const mockTargets = {
  success: true,
  session: { id: 's1', beneficiaryId: 'b1', date: new Date(), type: 'physical' },
  icfAssessment: { overallScore: 2.3, domainScores: { bodyFunctions: 2.5 } },
  targets: [
    {
      goalId: 'g1',
      goalStatement: 'تحسين المشي المستقل',
      icfCode: 'b760',
      icfDomain: 'bodyFunctions',
      currentBaseline: 2.5,
      targetValue: 1.0,
      priorityScore: 80,
    },
    {
      goalId: 'g2',
      goalStatement: 'تقوية العضلات القريبة من المفاصل',
      icfCode: 'b730',
      icfDomain: 'bodyFunctions',
      currentBaseline: 3.0,
      targetValue: 1.0,
      priorityScore: 75,
    },
    {
      goalId: 'g3',
      goalStatement: 'تحسين التوازن أثناء الوقوف',
      icfCode: 'b755',
      icfDomain: 'bodyFunctions',
      currentBaseline: 2.8,
      targetValue: 1.0,
      priorityScore: 70,
    },
    {
      goalId: 'g4',
      goalStatement: 'زيادة المشاركة في أنشطة الترفيه',
      icfCode: 'd920',
      icfDomain: 'activitiesAndParticipation',
      currentBaseline: 3.5,
      targetValue: 1.0,
      priorityScore: 65,
    },
  ],
};

// أنماط حركة framer-motion
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

export default function SessionICFProgress() {
  const { sessionId } = useParams();

  // حالة الأهداف
  const [targets, setTargets] = useState([]);
  // حالة تقدم كل هدف: { goalId: { performanceScore, capacityScore, notes } }
  const [progressData, setProgressData] = useState({});
  // حالة التحميل
  const [loading, setLoading] = useState(true);
  // حالة الحفظ
  const [saving, setSaving] = useState(false);
  // حالة تم الحفظ
  const [saved, setSaved] = useState(false);
  // حالة الخطأ
  const [error, setError] = useState(null);
  // معلومات الجلسة
  const [sessionInfo, setSessionInfo] = useState(null);

  // جلب البيانات عند تحميل المكون (محاكاة API)
  useEffect(() => {
    const fetchTargets = async () => {
      try {
        // TODO: استبدال بـ GET /api/v1/clinical/sessions/:sessionId/icf-targets
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (!mockTargets.success) {
          throw new Error('فشل في جلب الأهداف');
        }

        setTargets(mockTargets.targets);
        setSessionInfo(mockTargets.session);

        // تهيئة حالة التقدم بالقيم الافتراضية
        const initialProgress = {};
        mockTargets.targets.forEach((t) => {
          initialProgress[t.goalId] = {
            performanceScore: t.currentBaseline,
            capacityScore: t.currentBaseline,
            notes: '',
          };
        });
        setProgressData(initialProgress);
      } catch (err) {
        setError(err.message || 'حدث خطأ أثناء جلب البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchTargets();
  }, [sessionId]);

  // تحديث قيمة التقدم لهدف معين
  const handleProgressChange = (goalId, field, value) => {
    setProgressData((prev) => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        [field]: value,
      },
    }));
    // إعادة تعيين حالة الحفظ عند التعديل
    if (saved) setSaved(false);
  };

  // حساب عدد الأهداف التي تم تعديلها
  const getUpdatedCount = () => {
    let count = 0;
    targets.forEach((t) => {
      const pd = progressData[t.gofId];
      const initial = {
        performanceScore: t.currentBaseline,
        capacityScore: t.currentBaseline,
        notes: '',
      };
      if (
        pd &&
        (pd.performanceScore !== initial.performanceScore ||
          pd.capacityScore !== initial.capacityScore ||
          pd.notes !== '')
      ) {
        count += 1;
      }
    });
    return count;
  };

  // حفظ التقدم (محاكاة API)
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      // TODO: استبدال بـ POST /api/v1/clinical/sessions/:sessionId/icf-progress
      // const payload = targets.map((t) => ({
      //   goalId: t.goalId,
      //   ...progressData[t.goalId],
      // }));
      // await axios.post(`/api/v1/clinical/sessions/${sessionId}/icf-progress`, payload);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSaved(true);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ التقدم. يرجى المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  // إنهاء الجلسة
  const handleEndSession = () => {
    // TODO: التوجيه إلى صفحة الجلسة أو إنشاء ملخص
    alert('تم إنهاء الجلسة بنجاح');
  };

  // الرجوع إلى صفحة الجلسة
  const handleBack = () => {
    // TODO: استخدام navigate من react-router
    window.history.back();
  };

  // علامات الشريط التمرير
  const marks = [
    { value: 0, label: '0' },
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
        <Typography sx={{ mr: 2 }}>جاري تحميل الأهداف...</Typography>
      </Box>
    );
  }

  if (error && targets.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBack />}>
          العودة
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, direction: 'rtl' }}>
      {/* رأس الصفحة */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'right',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              تسجيل التقدم على أهداف ICF
            </Typography>
            {sessionInfo && (
              <Stack direction="row" spacing={2} flexWrap="wrap" mt={1}>
                <Typography variant="body1">
                  <strong>الجلسة:</strong> {sessionInfo.id} — {sessionInfo.type === 'physical' ? 'علاج طبيعي' : sessionInfo.type}
                </Typography>
                <Typography variant="body1">
                  <strong>التاريخ:</strong> {new Date(sessionInfo.date).toLocaleDateString('ar-SA')}
                </Typography>
              </Stack>
            )}
          </Box>
          <Button
            variant="contained"
            color="inherit"
            onClick={handleBack}
            startIcon={<ArrowBack />}
            sx={{
              color: '#764ba2',
              bgcolor: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              borderRadius: 2,
              fontWeight: 'bold',
            }}
          >
            رجوع إلى الجلسة
          </Button>
        </Stack>
      </Paper>

      {/* تنبيهات النجاح أو الخطأ */}
      {saved && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} icon={<CheckCircle />}>
            تم حفظ التقدم بنجاح
          </Alert>
        </motion.div>
      )}
      {error && !saved && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* قائمة أهداف ICF */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Grid container spacing={3}>
          {targets.map((target) => {
            const pd = progressData[target.goalId] || {
              performanceScore: target.currentBaseline,
              capacityScore: target.currentBaseline,
              notes: '',
            };
            const perfColor = getSliderColor(pd.performanceScore);
            const capColor = getSliderColor(pd.capacityScore);

            return (
              <Grid item xs={12} key={target.goalId}>
                <motion.div variants={itemVariants}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      textAlign: 'right',
                    }}
                  >
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                      {/* رأس البطاقة: اسم الهدف + شريحة ICF */}
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        flexWrap="wrap"
                        gap={2}
                        mb={2}
                      >
                        <Box>
                          <Typography variant="h6" fontWeight="bold" color="primary">
                            {target.goalStatement}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                            {DOMAIN_ICONS[target.icfDomain]}
                            <Typography variant="body2" color="text.secondary">
                              {DOMAIN_LABELS[target.icfDomain]}
                            </Typography>
                          </Stack>
                        </Box>
                        <Tooltip title={`رمز ICF: ${target.icfCode}`}>
                          <Chip
                            label={`${target.icfCode} — ${DOMAIN_LABELS[target.icfDomain]}`}
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                          />
                        </Tooltip>
                      </Stack>

                      {/* القيم الأساسية */}
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            القيمة الأساسية
                          </Typography>
                          <Typography variant="h6" color="primary.main">
                            {target.currentBaseline}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            الهدف المطلوب
                          </Typography>
                          <Typography variant="h6" color="success.main">
                            {target.targetValue}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            أولوية الهدف
                          </Typography>
                          <Typography variant="h6" color="warning.main">
                            {target.priorityScore}%
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            التقدم المتوقع
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.max(0, Math.min(100, ((target.currentBaseline - pd.performanceScore) / (target.currentBaseline - target.targetValue)) * 100))}
                            sx={{ mt: 1, height: 8, borderRadius: 4 }}
                          />
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 2 }} />

                      {/* شريحة الأداء */}
                      <Box sx={{ mb: 3 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            درجة الأداء
                          </Typography>
                          <Chip
                            label={ICF_LABELS[Math.round(pd.performanceScore)] || ''}
                            size="small"
                            sx={{
                              bgcolor: perfColor,
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.85rem',
                            }}
                          />
                        </Stack>
                        <Slider
                          value={pd.performanceScore}
                          onChange={(_, value) =>
                            handleProgressChange(target.goalId, 'performanceScore', value)
                          }
                          min={0}
                          max={4}
                          step={0.1}
                          marks={marks}
                          valueLabelDisplay="auto"
                          sx={{
                            color: perfColor,
                            '& .MuiSlider-thumb': { borderRadius: '50%' },
                            '& .MuiSlider-valueLabel': {
                              bgcolor: perfColor,
                              color: 'white',
                              fontWeight: 'bold',
                            },
                          }}
                        />
                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">لا إعاقة</Typography>
                          <Typography variant="caption" color="text.secondary">شديد جداً</Typography>
                        </Stack>
                      </Box>

                      {/* شريحة القدرة */}
                      <Box sx={{ mb: 3 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            درجة القدرة
                          </Typography>
                          <Chip
                            label={ICF_LABELS[Math.round(pd.capacityScore)] || ''}
                            size="small"
                            sx={{
                              bgcolor: capColor,
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.85rem',
                            }}
                          />
                        </Stack>
                        <Slider
                          value={pd.capacityScore}
                          onChange={(_, value) =>
                            handleProgressChange(target.goalId, 'capacityScore', value)
                          }
                          min={0}
                          max={4}
                          step={0.1}
                          marks={marks}
                          valueLabelDisplay="auto"
                          sx={{
                            color: capColor,
                            '& .MuiSlider-thumb': { borderRadius: '50%' },
                            '& .MuiSlider-valueLabel': {
                              bgcolor: capColor,
                              color: 'white',
                              fontWeight: 'bold',
                            },
                          }}
                        />
                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">لا إعاقة</Typography>
                          <Typography variant="caption" color="text.secondary">شديد جداً</Typography>
                        </Stack>
                      </Box>

                      {/* ملاحظات */}
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="ملاحظات"
                        placeholder="اكتب أي ملاحظات حول تقدم المستفيد في هذا الهدف..."
                        value={pd.notes}
                        onChange={(e) =>
                          handleProgressChange(target.goalId, 'notes', e.target.value)
                        }
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 2, textAlign: 'right' },
                        }}
                        InputProps={{ dir: 'rtl' }}
                        InputLabelProps={{ sx: { right: 20, left: 'auto', transformOrigin: 'top right' } }}
                      />
                    </CardContent>
                  </Paper>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      </motion.div>

      {/* ملخص التقدم */}
      {targets.length > 0 && (
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mt: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            textAlign: 'right',
          }}
        >
          <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
            ملخص التقدم
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body1">
                <strong>عدد الأهداف:</strong> {targets.length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body1">
                <strong>أهداف تم تحديثها:</strong> {getUpdatedCount()}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body1">
                <strong>متوسط الأداء:</strong>{' '}
                {(
                  targets.reduce((sum, t) => sum + (progressData[t.goalId]?.performanceScore || t.currentBaseline), 0) /
                  targets.length
                ).toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* أزرار الإجراءات */}
      <Stack
        direction="row"
        justifyContent="flex-start"
        spacing={2}
        sx={{ mt: 4, mb: 2 }}
        flexWrap="wrap"
      >
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          sx={{ borderRadius: 2, fontWeight: 'bold', px: 4, py: 1.2, minWidth: 180 }}
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التقدم'}
        </Button>
        <Button
          variant="contained"
          color="success"
          size="large"
          onClick={handleEndSession}
          startIcon={<CheckCircle />}
          sx={{ borderRadius: 2, fontWeight: 'bold', px: 4, py: 1.2, minWidth: 180 }}
        >
          إنهاء الجلسة
        </Button>
      </Stack>
    </Box>
  );
}
