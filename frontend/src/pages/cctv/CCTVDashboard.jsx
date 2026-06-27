/**
 * CCTVDashboard.jsx — مركز المراقبة (CCTV Monitoring Dashboard)
 * ════════════════════════════════════════════════════════════════
 * Professional security monitoring interface with:
 *   • Camera grid (2×2 / 3×3) with gradient placeholders
 *   • Camera list sidebar with status indicators
 *   • Selected camera: preview + recordings + face events
 *   • Security alerts panel with severity
 *   • Analytics tab: people count trend + heatmap + peak hours
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Typography,
  useTheme,
  Badge,
  Tooltip,
  Fade,
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  HelpOutline as HelpOutlineIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Analytics as AnalyticsIcon,
  NotificationsActive as AlertsIcon,
  Schedule as ScheduleIcon,
  Face as FaceIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import cctvService from '../services/cctvService';

// ─── Status helpers ─────────────────────────────────────────────────────────

const STATUS_MAP = {
  online: { color: 'success', icon: <CheckCircleIcon fontSize="small" />, label: 'متصل' },
  offline: { color: 'error', icon: <VideocamOffIcon fontSize="small" />, label: 'غير متصل' },
  degraded: { color: 'warning', icon: <WarningIcon fontSize="small" />, label: 'متدهور' },
  provisioned: { color: 'info', icon: <HelpOutlineIcon fontSize="small" />, label: 'مهيأ' },
  retired: { color: 'default', icon: <VideocamOffIcon fontSize="small" />, label: 'متوقف' },
};

const SEVERITY_MAP = {
  critical: { color: '#d32f2f', bg: '#ffebee', label: 'حرج' },
  high: { color: '#f57c00', bg: '#fff3e0', label: 'مرتفع' },
  medium: { color: '#fbc02d', bg: '#fffde7', label: 'متوسط' },
  low: { color: '#388e3c', bg: '#e8f5e9', label: 'منخفض' },
};

function getGradientForCamera(index) {
  const gradients = [
    'from-slate-700 to-slate-900',
    'from-indigo-700 to-slate-900',
    'from-emerald-700 to-slate-900',
    'from-amber-700 to-slate-900',
    'from-rose-700 to-slate-900',
    'from-cyan-700 to-slate-900',
    'from-violet-700 to-slate-900',
    'from-teal-700 to-slate-900',
    'from-fuchsia-700 to-slate-900',
  ];
  return gradients[index % gradients.length];
}

// ─── Camera Placeholder Card ────────────────────────────────────────────────

function CameraPlaceholderCard({ camera, index, selected, onClick }) {
  const status = STATUS_MAP[camera.status] || STATUS_MAP.provisioned;
  const gradient = getGradientForCamera(index);

  return (
    <Card
      onClick={() => onClick(camera)}
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
        selected ? 'ring-2 ring-sky-400 shadow-xl' : ''
      }`}
      dir="rtl"
    >
      <Box className={`relative h-36 bg-gradient-to-br ${gradient} flex items-center justify-center rounded-t-md overflow-hidden`}>
        <VideocamIcon className="text-white/20 text-6xl absolute" />
        <Box className="absolute top-2 right-2">
          <Chip
            size="small"
            icon={status.icon}
            label={status.label}
            color={status.color}
            className="text-xs font-bold"
          />
        </Box>
        <Box className="absolute bottom-2 left-2 right-2">
          <Typography variant="subtitle2" className="text-white font-bold drop-shadow-md">
            {camera.name_ar || camera.name || 'كاميرا بدون اسم'}
          </Typography>
          <Typography variant="caption" className="text-white/80">
            {camera.code || camera._id}
          </Typography>
        </Box>
      </Box>
      <CardContent className="p-2">
        <Box className="flex justify-between items-center">
          <Typography variant="caption" color="text.secondary">
            {camera.location?.room || camera.location?.area || '—'}
          </Typography>
          <Tooltip title="عرض البث المباشر">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onClick(camera); }}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function CCTVDashboard() {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);
  const [branchId, setBranchId] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [faceLogs, setFaceLogs] = useState([]);
  const [feed, setFeed] = useState(null);

  // Load cameras
  const loadCameras = async () => {
    setLoading(true);
    try {
      const res = await cctvService.getCameras(branchId || undefined);
      setCameras(res.data || []);
      if (res.data && res.data.length > 0 && !selectedCamera) {
        setSelectedCamera(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load cameras', err);
    } finally {
      setLoading(false);
    }
  };

  // Load alerts
  const loadAlerts = async () => {
    try {
      const res = await cctvService.getAlerts();
      setAlerts(res.data || []);
    } catch (err) {
      console.error('Failed to load alerts', err);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    try {
      const res = await cctvService.getAnalytics(branchId || undefined, 'today');
      setAnalytics(res.data || null);
    } catch (err) {
      console.error('Failed to load analytics', err);
    }
  };

  // Load selected camera details
  const loadCameraDetails = async (camera) => {
    if (!camera) return;
    try {
      const [feedRes, recRes, faceRes] = await Promise.all([
        cctvService.getLiveFeed(camera._id),
        cctvService.getRecordings(camera._id),
        cctvService.getFaceRecognitionLog('benef-mock-001'),
      ]);
      setFeed(feedRes.data || null);
      setRecordings(recRes.data || []);
      setFaceLogs(faceRes.data || []);
    } catch (err) {
      console.error('Failed to load camera details', err);
    }
  };

  useEffect(() => {
    loadCameras();
    loadAlerts();
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => {
    loadCameraDetails(selectedCamera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera]);

  const openAlertsCount = useMemo(
    () => alerts.filter((a) => a.status === 'open' || a.status === 'investigating').length,
    [alerts]
  );

  const onlineCount = useMemo(() => cameras.filter((c) => c.status === 'online').length, [cameras]);
  const offlineCount = useMemo(() => cameras.filter((c) => c.status === 'offline').length, [cameras]);

  return (
    <Box className="min-h-screen bg-slate-50 p-4" dir="rtl">
      {/* Header */}
      <Paper className="p-4 mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <Box className="flex items-center gap-3">
          <VideocamIcon color="primary" className="text-3xl" />
          <Box>
            <Typography variant="h5" className="font-bold text-slate-800">
              مركز المراقبة
            </Typography>
            <Typography variant="body2" color="text.secondary">
              نظام CCTV المتكامل — مراقبة مباشرة وتحليلات ذكية
            </Typography>
          </Box>
        </Box>

        <Box className="flex items-center gap-3 flex-wrap">
          <FormControl size="small" className="min-w-[180px]">
            <InputLabel>الفرع</InputLabel>
            <Select value={branchId} label="الفرع" onChange={(e) => setBranchId(e.target.value)}>
              <MenuItem value="">الكل</MenuItem>
              <MenuItem value="HQ-01">الفرع الرئيسي</MenuItem>
              <MenuItem value="BR-02">فرع الشمال</MenuItem>
              <MenuItem value="BR-03">فرع الجنوب</MenuItem>
            </Select>
          </FormControl>

          <Badge badgeContent={openAlertsCount} color="error" overlap="circular">
            <Chip
              icon={<AlertsIcon />}
              label={`تنبيهات: ${openAlertsCount}`}
              color={openAlertsCount > 0 ? 'error' : 'success'}
              variant="filled"
              className="font-bold"
            />
          </Badge>

          <Chip
            icon={<CheckCircleIcon />}
            label={`متصل: ${onlineCount}`}
            color="success"
            variant="outlined"
          />
          <Chip
            icon={<VideocamOffIcon />}
            label={`غير متصل: ${offlineCount}`}
            color="error"
            variant="outlined"
          />

          <Tooltip title="تحديث">
            <IconButton onClick={loadCameras}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper className="mb-4">
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
          dir="rtl"
        >
          <Tab icon={<VideocamIcon />} label="البث المباشر" />
          <Tab icon={<AlertsIcon />} label="التنبيهات الأمنية" />
          <Tab icon={<AnalyticsIcon />} label="التحليلات" />
        </Tabs>
      </Paper>

      {/* Tab 1: Live Monitoring */}
      {tabIndex === 0 && (
        <Grid container spacing={3}>
          {/* Camera List Sidebar */}
          <Grid item xs={12} md={3}>
            <Paper className="h-full max-h-[70vh] overflow-auto p-2">
              <Typography variant="subtitle1" className="font-bold mb-2 px-2">
                قائمة الكاميرات ({cameras.length})
              </Typography>
              <List dense>
                {cameras.map((cam) => {
                  const st = STATUS_MAP[cam.status] || STATUS_MAP.provisioned;
                  return (
                    <ListItem key={cam._id} disablePadding className="mb-1">
                      <ListItemButton
                        selected={selectedCamera?._id === cam._id}
                        onClick={() => setSelectedCamera(cam)}
                        className="rounded-lg"
                      >
                        <Box className="ml-2">
                          {st.icon}
                        </Box>
                        <ListItemText
                          primary={cam.name_ar || cam.name || cam.code}
                          secondary={cam.code}
                          primaryTypographyProps={{ className: 'font-bold text-sm' }}
                          secondaryTypographyProps={{ className: 'text-xs' }}
                        />
                        <Chip size="small" label={st.label} color={st.color} className="text-xs" />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Paper>
          </Grid>

          {/* Main Content */}
          <Grid item xs={12} md={9}>
            {loading ? (
              <Box className="flex justify-center items-center h-64">
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Selected Camera Preview */}
                {selectedCamera && (
                  <Fade in>
                    <Paper className="mb-4 overflow-hidden">
                      <Box className={`relative h-72 bg-gradient-to-br ${getGradientForCamera(
                        cameras.findIndex((c) => c._id === selectedCamera._id)
                      )} flex items-center justify-center`}>
                        <VideocamIcon className="text-white/10 text-9xl absolute" />
                        <Box className="text-center text-white z-10">
                          <Typography variant="h4" className="font-bold drop-shadow-lg">
                            {selectedCamera.name_ar || selectedCamera.name}
                          </Typography>
                          <Typography variant="body1" className="opacity-90">
                            {selectedCamera.code} — {selectedCamera.location?.room || '—'}
                          </Typography>
                          <Box className="mt-3">
                            <Chip
                              label={STATUS_MAP[selectedCamera.status]?.label || '—'}
                              color={STATUS_MAP[selectedCamera.status]?.color || 'default'}
                              className="text-white font-bold"
                            />
                          </Box>
                          {feed?.placeholder && (
                            <Typography variant="caption" className="block mt-2 opacity-70">
                              بث تجريبي — لا يوجد اتصال حقيقي بالكاميرا
                            </Typography>
                          )}
                        </Box>

                        {/* Overlay info */}
                        <Box className="absolute top-3 left-3 bg-black/50 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">
                          {new Date().toLocaleTimeString('ar-SA')}
                        </Box>
                        <Box className="absolute bottom-3 right-3 bg-black/50 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">
                          {feed?.streams?.[0]?.resolution || '1920x1080'} — {feed?.streams?.[0]?.fps || '25'} FPS
                        </Box>
                      </Box>

                      {/* Camera detail tabs */}
                      <Box className="p-3">
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" className="font-bold mb-2 flex items-center gap-1">
                              <ScheduleIcon fontSize="small" /> التسجيلات
                            </Typography>
                            <Box className="max-h-40 overflow-auto bg-slate-50 rounded-lg p-2">
                              {recordings.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                  لا توجد تسجيلات
                                </Typography>
                              ) : (
                                recordings.slice(0, 8).map((rec) => (
                                  <Box key={rec._id} className="flex justify-between items-center py-1 border-b last:border-0 border-slate-200">
                                    <Typography variant="caption" className="font-bold">
                                      {new Date(rec.startTime).toLocaleTimeString('ar-SA')}
                                    </Typography>
                                    <Box className="flex items-center gap-2">
                                      <Chip size="small" label={rec.kind === 'motion' ? 'حركة' : 'مستمر'} color={rec.kind === 'motion' ? 'warning' : 'default'} className="text-xs" />
                                      <Typography variant="caption" color="text.secondary">
                                        {Math.floor((rec.durationMs || 0) / 60000)} د
                                      </Typography>
                                    </Box>
                                  </Box>
                                ))
                              )}
                            </Box>
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" className="font-bold mb-2 flex items-center gap-1">
                              <FaceIcon fontSize="small" /> التعرف على الوجوه
                            </Typography>
                            <Box className="max-h-40 overflow-auto bg-slate-50 rounded-lg p-2">
                              {faceLogs.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                  لا توجد أحداث
                                </Typography>
                              ) : (
                                faceLogs.slice(0, 8).map((log) => (
                                  <Box key={log._id} className="flex justify-between items-center py-1 border-b last:border-0 border-slate-200">
                                    <Typography variant="caption" className="font-bold">
                                      {log.aiResult?.label || '—'}
                                    </Typography>
                                    <Box className="flex items-center gap-2">
                                      <Chip
                                        size="small"
                                        label={log.type === 'face_unknown' ? 'غير معروف' : 'معروف'}
                                        color={log.type === 'face_unknown' ? 'error' : 'success'}
                                        className="text-xs"
                                      />
                                      <Typography variant="caption" color="text.secondary">
                                        {new Date(log.startedAt).toLocaleTimeString('ar-SA')}
                                      </Typography>
                                    </Box>
                                  </Box>
                                ))
                              )}
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    </Paper>
                  </Fade>
                )}

                {/* Camera Grid */}
                <Typography variant="h6" className="font-bold mb-3">
                  شبكة الكاميرات
                </Typography>
                <Grid container spacing={2}>
                  {cameras.map((cam, idx) => (
                    <Grid item xs={12} sm={6} lg={4} key={cam._id}>
                      <CameraPlaceholderCard
                        camera={cam}
                        index={idx}
                        selected={selectedCamera?._id === cam._id}
                        onClick={setSelectedCamera}
                      />
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Alerts */}
      {tabIndex === 1 && (
        <Paper className="p-4">
          <Typography variant="h6" className="font-bold mb-4 flex items-center gap-2">
            <AlertsIcon color="error" /> التنبيهات الأمنية
          </Typography>
          <Grid container spacing={2}>
            {alerts.map((alert) => {
              const sev = SEVERITY_MAP[alert.severity] || SEVERITY_MAP.low;
              return (
                <Grid item xs={12} md={6} lg={4} key={alert._id}>
                  <Card className="border-r-4" style={{ borderRightColor: sev.color }}>
                    <CardContent>
                      <Box className="flex justify-between items-start mb-2">
                        <Chip
                          size="small"
                          label={sev.label}
                          style={{ backgroundColor: sev.bg, color: sev.color, fontWeight: 'bold' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(alert.firstEventAt).toLocaleString('ar-SA')}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle1" className="font-bold mb-1">
                        {alert.title_ar || alert.title_en || alert.code}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" className="mb-2">
                        الكاميرا: {alert.cameraCode || '—'} | الأحداث: {alert.eventCount}
                      </Typography>
                      <Box className="flex gap-2">
                        <Chip
                          size="small"
                          label={alert.status === 'open' ? 'مفتوح' : alert.status === 'acknowledged' ? 'مُقر' : 'قيد التحقيق'}
                          color={alert.status === 'open' ? 'error' : alert.status === 'acknowledged' ? 'warning' : 'info'}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={alert.category || 'عام'}
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            {alerts.length === 0 && (
              <Grid item xs={12}>
                <Box className="text-center py-12">
                  <CheckCircleIcon className="text-6xl text-green-200 mb-3" />
                  <Typography variant="h6" color="text.secondary">
                    لا توجد تنبيهات أمنية نشطة
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Tab 3: Analytics */}
      {tabIndex === 2 && (
        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {analytics?.summary && (
                <>
                  <Grid item xs={6} md={3}>
                    <Paper className="p-4 text-center">
                      <Typography variant="h4" className="font-bold text-sky-600">
                        {analytics.summary.totalPeopleToday}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        إجمالي الأشخاص اليوم
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper className="p-4 text-center">
                      <Typography variant="h4" className="font-bold text-emerald-600">
                        {analytics.summary.avgPerHour}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        متوسط / ساعة
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper className="p-4 text-center">
                      <Typography variant="h4" className="font-bold text-amber-600">
                        {analytics.summary.peakHour}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ساعة الذروة
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper className="p-4 text-center">
                      <Typography variant="h4" className="font-bold text-rose-600">
                        {analytics.summary.alertsToday}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        تنبيهات اليوم
                      </Typography>
                    </Paper>
                  </Grid>
                </>
              )}
            </Grid>
          </Grid>

          {/* People Count Trend */}
          <Grid item xs={12} md={8}>
            <Paper className="p-4">
              <Typography variant="h6" className="font-bold mb-4">
                عدد الأشخاص بمرور الوقت
              </Typography>
              <Box className="h-72">
                {analytics?.peopleCountTrend ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.peopleCountTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip
                        contentStyle={{ textAlign: 'right' }}
                        formatter={(value, name) => [value, name === 'peopleCount' ? 'عدد الأشخاص' : name]}
                      />
                      <Line
                        type="monotone"
                        dataKey="peopleCount"
                        stroke="#0284c7"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                        name="peopleCount"
                      />
                      <Line
                        type="monotone"
                        dataKey="uniqueFaces"
                        stroke="#059669"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="uniqueFaces"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Box className="flex justify-center items-center h-full">
                    <CircularProgress />
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Peak Hours */}
          <Grid item xs={12} md={4}>
            <Paper className="p-4">
              <Typography variant="h6" className="font-bold mb-4">
                ساعات الذروة
              </Typography>
              <Box className="h-72">
                {analytics?.peakHours ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.peakHours} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="hour" type="category" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}:00`} />
                      <RechartsTooltip
                        contentStyle={{ textAlign: 'right' }}
                        formatter={(value) => [value, 'العدد']}
                      />
                      <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="count" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box className="flex justify-center items-center h-full">
                    <CircularProgress />
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Heatmap Placeholder */}
          <Grid item xs={12}>
            <Paper className="p-4">
              <Typography variant="h6" className="font-bold mb-4">
                خريطة الكثافة (Heatmap)
              </Typography>
              <Box className="relative h-64 bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                <Box className="grid grid-cols-4 gap-2 w-full h-full p-4">
                  {analytics?.heatmap?.map((zone) => (
                    <Box
                      key={zone.zone}
                      className="rounded-lg flex flex-col items-center justify-center text-white font-bold text-sm transition-all hover:scale-105 cursor-pointer"
                      style={{
                        backgroundColor: `rgba(2, 132, 199, ${zone.intensity / 100})`,
                        gridColumn: zone.intensity > 80 ? 'span 2' : 'span 1',
                        gridRow: zone.intensity > 80 ? 'span 2' : 'span 1',
                      }}
                    >
                      <Typography variant="body2" className="font-bold text-center">
                        {zone.zone}
                      </Typography>
                      <Typography variant="caption">
                        {zone.intensity}%
                      </Typography>
                    </Box>
                  ))}
                </Box>
                {!analytics?.heatmap && (
                  <Typography variant="body1" color="text.secondary">
                    لا توجد بيانات كثافة
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
