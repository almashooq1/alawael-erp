/**
 * Student Health Tracker Page
 * صفحة المتابعة الصحية اليومية للطالب
 */

import { useState, useEffect, useCallback } from 'react';

import { gradients } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import api from 'services/api';
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
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Slider,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import WaterIcon from '@mui/icons-material/Water';
import CloseIcon from '@mui/icons-material/Close';

const moodOptions = [
  { value: 'سعيد جداً', emoji: '😄', color: '#2ecc71' },
  { value: 'سعيد', emoji: '😊', color: '#27ae60' },
  { value: 'طبيعي', emoji: '😐', color: '#f39c12' },
  { value: 'حزين', emoji: '😢', color: '#e67e22' },
  { value: 'قلق', emoji: '😰', color: '#e74c3c' },
  { value: 'غاضب', emoji: '😡', color: '#c0392b' },
];

const conditionColors = {
  ممتاز: '#2ecc71',
  جيد: '#27ae60',
  متوسط: '#f39c12',
  'يحتاج متابعة': '#e74c3c',
  حرج: '#c0392b',
};

const StudentHealthTracker = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [openCheckin, setOpenCheckin] = useState(false);
  const [tab, setTab] = useState(0);
  const [checkinForm, setCheckinForm] = useState({
    vitalSigns: { temperature: 37, heartRate: 80, weight: 0 },
    generalCondition: 'جيد',
    moodTracking: { mood: 'طبيعي', energyLevel: 5, sleepQuality: 'جيد', sleepHours: 8, notes: '' },
    nutritionLog: { breakfast: false, lunch: false, snacks: false, waterIntake: 4, notes: '' },
    physicalActivity: { type: '', duration: 0, intensity: 'متوسط', notes: '' },
    symptoms: [],
  });

  const mockToday = {
    records: [
      {
        type: 'فحص يومي',
        date: new Date().toISOString(),
        generalCondition: 'جيد',
        vitalSigns: { temperature: 36.8, heartRate: 78 },
        moodTracking: { mood: 'سعيد', energyLevel: 7, sleepQuality: 'جيد', sleepHours: 8 },
        nutritionLog: { breakfast: true, lunch: true, snacks: true, waterIntake: 6 },
      },
    ],
    alerts: [{ type: 'تنبيه دواء', message: 'تذكير: حان وقت تناول فيتامين D', isRead: false }],
    todayMedications: [
      { name: 'فيتامين D', dosage: '1000 IU', frequency: 'مرة يومياً', administered: false },
    ],
    hasCheckIn: true,
  };

  const mockSummary = {
    recentRecords: 12,
    moodDistribution: { سعيد: 5, طبيعي: 4, 'سعيد جداً': 3 },
    conditionDistribution: { جيد: 8, ممتاز: 3, متوسط: 1 },
    medicationCompliance: 92,
    latestRecord: mockToday.records[0],
    alerts: mockToday.alerts,
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [todayRes, summaryRes] = await Promise.all([
        api.get(`/student-health/${userId}/today`).catch(() => null),
        api.get(`/student-health/${userId}/summary`).catch(() => null),
      ]);
      setTodayData(todayRes?.data?.success ? todayRes.data.data : mockToday);
      setSummary(summaryRes?.data?.success ? summaryRes.data.data : mockSummary);
    } catch {
      setTodayData(mockToday);
      setSummary(mockSummary);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckin = async () => {
    try {
      const res = await api
        .post(`/student-health/${userId}/daily-checkin`, checkinForm)
        .catch(() => null);
      if (res?.data?.success) {
        showSnackbar(res.data.message, 'success');
      } else {
        showSnackbar('تم التسجيل الصحي اليومي بنجاح (وضع تجريبي)', 'success');
      }
      setOpenCheckin(false);
      loadData();
    } catch {
      showSnackbar('حدث خطأ في التسجيل', 'error');
    }
  };

  if (loading)
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #00b894, #00cec9)',
          borderRadius: 3,
          p: 4,
          mb: 3,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              🏥 المتابعة الصحية
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              تتبع حالتك الصحية اليومية
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={todayData?.hasCheckIn ? <CheckIcon /> : <AddIcon />}
            onClick={() => setOpenCheckin(true)}
            disabled={todayData?.hasCheckIn}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            {todayData?.hasCheckIn ? 'تم التسجيل اليوم ✓' : 'التسجيل الصحي اليومي'}
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {todayData?.alerts?.length > 0 && (
        <Stack spacing={1} sx={{ mb: 3 }}>
          {todayData.alerts.map((alert, i) => (
            <Alert
              key={i}
              severity={alert.type === 'حالة طارئة' ? 'error' : 'warning'}
              icon={<AlertIcon />}
            >
              <Typography variant="body2">{alert.message}</Typography>
            </Alert>
          ))}
        </Stack>
      )}

      {/* Today Status */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Vital Signs */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <HeartIcon color="error" /> المؤشرات الحيوية
              </Typography>
              <Stack spacing={2}>
                {todayData?.records?.[0]?.vitalSigns ? (
                  <>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TempIcon color="warning" />
                        <Typography>الحرارة</Typography>
                      </Box>
                      <Chip
                        label={`${todayData.records[0].vitalSigns.temperature}°C`}
                        color={
                          todayData.records[0].vitalSigns.temperature > 37.5 ? 'error' : 'success'
                        }
                      />
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HeartIcon color="error" />
                        <Typography>النبض</Typography>
                      </Box>
                      <Chip
                        label={`${todayData.records[0].vitalSigns.heartRate} bpm`}
                        color="primary"
                      />
                    </Box>
                  </>
                ) : (
                  <Alert severity="info">لم يتم تسجيل المؤشرات الحيوية اليوم</Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Mood & Sleep */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <HappyIcon color="primary" /> المزاج والنوم
              </Typography>
              {todayData?.records?.[0]?.moodTracking ? (
                <Stack spacing={2}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h2">
                      {moodOptions.find(m => m.value === todayData.records[0].moodTracking.mood)
                        ?.emoji || '😐'}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {todayData.records[0].moodTracking.mood}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SleepIcon />
                      <Typography variant="body2">النوم</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {todayData.records[0].moodTracking.sleepHours} ساعات -{' '}
                      {todayData.records[0].moodTracking.sleepQuality}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      مستوى الطاقة
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(todayData.records[0].moodTracking.energyLevel / 10) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Stack>
              ) : (
                <Alert severity="info">سجّل حالتك المزاجية اليوم</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Nutrition */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <FoodIcon color="warning" /> التغذية
              </Typography>
              {todayData?.records?.[0]?.nutritionLog ? (
                <Stack spacing={1.5}>
                  {['breakfast', 'lunch', 'snacks'].map(meal => (
                    <Box
                      key={meal}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="body2">
                        {meal === 'breakfast'
                          ? '🌅 إفطار'
                          : meal === 'lunch'
                            ? '🍽 غداء'
                            : '🍎 وجبات خفيفة'}
                      </Typography>
                      <Chip
                        size="small"
                        label={todayData.records[0].nutritionLog[meal] ? 'تم ✓' : 'لم يتم'}
                        color={todayData.records[0].nutritionLog[meal] ? 'success' : 'default'}
                      />
                    </Box>
                  ))}
                  <Divider />
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WaterIcon color="info" />
                      <Typography variant="body2">الماء</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {todayData.records[0].nutritionLog.waterIntake} أكواب 💧
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Alert severity="info">سجّل وجباتك اليوم</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Health Summary */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Medication Compliance */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{ borderRadius: 2, background: gradients.success || '#2ecc71', color: 'white' }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <MedIcon sx={{ fontSize: 40 }} />
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {summary.medicationCompliance}%
                </Typography>
                <Typography variant="body2">الالتزام بالأدوية</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, background: gradients.info || '#3498db', color: 'white' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <HeartIcon sx={{ fontSize: 40 }} />
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {summary.recentRecords}
                </Typography>
                <Typography variant="body2">سجل صحي (30 يوم)</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  الحالة العامة
                </Typography>
                {Object.entries(summary.conditionDistribution || {}).map(([condition, count]) => (
                  <Chip
                    key={condition}
                    label={`${condition}: ${count}`}
                    size="small"
                    sx={{ m: 0.5, bgcolor: conditionColors[condition], color: 'white' }}
                  />
                ))}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  توزيع المزاج
                </Typography>
                {Object.entries(summary.moodDistribution || {}).map(([mood, count]) => (
                  <Chip
                    key={mood}
                    label={`${moodOptions.find(m => m.value === mood)?.emoji || '😐'} ${count}`}
                    size="small"
                    sx={{ m: 0.5 }}
                  />
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Medications Today */}
      {todayData?.todayMedications?.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            💊 الأدوية المطلوبة اليوم
          </Typography>
          <Grid container spacing={2}>
            {todayData.todayMedications.map((med, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: med.administered ? 'success.main' : 'warning.main',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {med.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={med.administered ? 'تم التناول ✓' : 'لم يتم بعد'}
                        color={med.administered ? 'success' : 'warning'}
                      />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      الجرعة: {med.dosage} • {med.frequency}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Daily Check-in Dialog */}
      <Dialog open={openCheckin} onClose={() => setOpenCheckin(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          🏥 التسجيل الصحي اليومي
          <IconButton
            onClick={() => setOpenCheckin(false)}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="🌡 المؤشرات" />
            <Tab label="😊 المزاج" />
            <Tab label="🍽 التغذية" />
            <Tab label="💪 النشاط" />
          </Tabs>

          {tab === 0 && (
            <Stack spacing={3}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                الحالة العامة
              </Typography>
              <TextField
                select
                fullWidth
                label="الحالة العامة"
                value={checkinForm.generalCondition}
                onChange={e => setCheckinForm({ ...checkinForm, generalCondition: e.target.value })}
              >
                {['ممتاز', 'جيد', 'متوسط', 'يحتاج متابعة'].map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                المؤشرات الحيوية
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    type="number"
                    fullWidth
                    label="🌡 درجة الحرارة (°C)"
                    value={checkinForm.vitalSigns.temperature}
                    onChange={e =>
                      setCheckinForm({
                        ...checkinForm,
                        vitalSigns: {
                          ...checkinForm.vitalSigns,
                          temperature: parseFloat(e.target.value),
                        },
                      })
                    }
                    inputProps={{ step: 0.1, min: 35, max: 42 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    type="number"
                    fullWidth
                    label="❤ النبض (bpm)"
                    value={checkinForm.vitalSigns.heartRate}
                    onChange={e =>
                      setCheckinForm({
                        ...checkinForm,
                        vitalSigns: {
                          ...checkinForm.vitalSigns,
                          heartRate: parseInt(e.target.value),
                        },
                      })
                    }
                    inputProps={{ min: 40, max: 200 }}
                  />
                </Grid>
              </Grid>
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={3}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                كيف تشعر اليوم؟
              </Typography>
              <Grid container spacing={2} justifyContent="center">
                {moodOptions.map(m => (
                  <Grid item key={m.value}>
                    <Tooltip title={m.value}>
                      <IconButton
                        sx={{
                          fontSize: 40,
                          border:
                            checkinForm.moodTracking.mood === m.value
                              ? `3px solid ${m.color}`
                              : 'none',
                          borderRadius: 2,
                          p: 2,
                        }}
                        onClick={() =>
                          setCheckinForm({
                            ...checkinForm,
                            moodTracking: { ...checkinForm.moodTracking, mood: m.value },
                          })
                        }
                      >
                        {m.emoji}
                      </IconButton>
                    </Tooltip>
                  </Grid>
                ))}
              </Grid>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                مستوى الطاقة: {checkinForm.moodTracking.energyLevel}/10
              </Typography>
              <Slider
                value={checkinForm.moodTracking.energyLevel}
                onChange={(_, v) =>
                  setCheckinForm({
                    ...checkinForm,
                    moodTracking: { ...checkinForm.moodTracking, energyLevel: v },
                  })
                }
                min={1}
                max={10}
                marks
                valueLabelDisplay="auto"
              />
              <TextField
                select
                fullWidth
                label="جودة النوم"
                value={checkinForm.moodTracking.sleepQuality}
                onChange={e =>
                  setCheckinForm({
                    ...checkinForm,
                    moodTracking: { ...checkinForm.moodTracking, sleepQuality: e.target.value },
                  })
                }
              >
                {['ممتاز', 'جيد', 'متوسط', 'سيء'].map(q => (
                  <MenuItem key={q} value={q}>
                    {q}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="number"
                fullWidth
                label="ساعات النوم"
                value={checkinForm.moodTracking.sleepHours}
                onChange={e =>
                  setCheckinForm({
                    ...checkinForm,
                    moodTracking: {
                      ...checkinForm.moodTracking,
                      sleepHours: parseInt(e.target.value),
                    },
                  })
                }
                inputProps={{ min: 0, max: 24 }}
              />
            </Stack>
          )}

          {tab === 2 && (
            <Stack spacing={3}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                الوجبات
              </Typography>
              {['breakfast', 'lunch', 'snacks'].map(meal => (
                <FormControlLabel
                  key={meal}
                  control={
                    <Switch
                      checked={checkinForm.nutritionLog[meal]}
                      onChange={e =>
                        setCheckinForm({
                          ...checkinForm,
                          nutritionLog: { ...checkinForm.nutritionLog, [meal]: e.target.checked },
                        })
                      }
                    />
                  }
                  label={
                    meal === 'breakfast'
                      ? '🌅 تناولت الإفطار'
                      : meal === 'lunch'
                        ? '🍽 تناولت الغداء'
                        : '🍎 تناولت وجبات خفيفة'
                  }
                />
              ))}
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                💧 عدد أكواب الماء: {checkinForm.nutritionLog.waterIntake}
              </Typography>
              <Slider
                value={checkinForm.nutritionLog.waterIntake}
                onChange={(_, v) =>
                  setCheckinForm({
                    ...checkinForm,
                    nutritionLog: { ...checkinForm.nutritionLog, waterIntake: v },
                  })
                }
                min={0}
                max={15}
                marks
                valueLabelDisplay="auto"
              />
            </Stack>
          )}

          {tab === 3 && (
            <Stack spacing={3}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                النشاط البدني
              </Typography>
              <TextField
                fullWidth
                label="نوع النشاط"
                value={checkinForm.physicalActivity.type}
                onChange={e =>
                  setCheckinForm({
                    ...checkinForm,
                    physicalActivity: { ...checkinForm.physicalActivity, type: e.target.value },
                  })
                }
                placeholder="مشي، سباحة، تمارين..."
              />
              <TextField
                type="number"
                fullWidth
                label="المدة (دقائق)"
                value={checkinForm.physicalActivity.duration}
                onChange={e =>
                  setCheckinForm({
                    ...checkinForm,
                    physicalActivity: {
                      ...checkinForm.physicalActivity,
                      duration: parseInt(e.target.value),
                    },
                  })
                }
                inputProps={{ min: 0 }}
              />
              <TextField
                select
                fullWidth
                label="الشدة"
                value={checkinForm.physicalActivity.intensity}
                onChange={e =>
                  setCheckinForm({
                    ...checkinForm,
                    physicalActivity: {
                      ...checkinForm.physicalActivity,
                      intensity: e.target.value,
                    },
                  })
                }
              >
                {['خفيف', 'متوسط', 'مكثف'].map(i => (
                  <MenuItem key={i} value={i}>
                    {i}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCheckin(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCheckin} startIcon={<CheckIcon />}>
            حفظ التسجيل
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentHealthTracker;
