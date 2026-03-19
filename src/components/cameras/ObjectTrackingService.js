/**
 * Object Tracking Service
 * خدمة تتبع الأشياء والحركة
 *
 * Features:
 * ✅ تتبع الأشياء تلقائياً
 * ✅ كشف الحركة المشبوهة
 * ✅ تتبع المسارات
 * ✅ التنبيهات الفورية
 * ✅ الإحصائيات
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Card,
  CardContent,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
} from '@mui/icons-material';

const ObjectTrackingService = ({ camera, onClose }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [trackedObjects, setTrackedObjects] = useState([]);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [statistics, setStatistics] = useState({
    totalTracked: 0,
    totalAlerts: 0,
    averageSpeed: 0,
    suspiciousCount: 0,
  });

  const startTracking = useCallback(async () => {
    setIsTracking(true);

    // محاكاة التتبع
    const mockTrackedObjects = [
      {
        id: 'obj_001',
        type: 'person',
        label: 'شخص 1',
        confidence: 94,
        position: { x: 120, y: 180, width: 80, height: 150 },
        speed: 1.2,
        direction: 'شمال',
        status: 'moving',
        color: '#4caf50',
      },
      {
        id: 'obj_002',
        type: 'person',
        label: 'شخص 2',
        confidence: 89,
        position: { x: 350, y: 250, width: 75, height: 140 },
        speed: 0.5,
        direction: 'جنوب',
        status: 'slow',
        color: '#2196f3',
      },
      {
        id: 'obj_003',
        type: 'vehicle',
        label: 'سيارة',
        confidence: 97,
        position: { x: 600, y: 100, width: 200, height: 120 },
        speed: 3.5,
        direction: 'شرق',
        status: 'fast',
        color: '#ff9800',
      },
      {
        id: 'obj_004',
        type: 'bag',
        label: 'حقيبة مريبة',
        confidence: 72,
        position: { x: 450, y: 400, width: 50, height: 70 },
        speed: 0,
        direction: 'ثابت',
        status: 'suspicious',
        color: '#f44336',
      },
    ];

    setTrackedObjects(mockTrackedObjects);

    // الأنشطة المريبة
    setSuspiciousActivities([
      {
        id: 'alert_001',
        type: 'stationary_object',
        object: 'حقيبة مريبة',
        timestamp: Date.now(),
        location: '450, 400',
        severity: 'high',
        description: 'تم اكتشاف شيء ثابت لفترة طويلة',
      },
      {
        id: 'alert_002',
        type: 'loitering',
        object: 'شخص 2',
        timestamp: Date.now() - 60000,
        location: '350, 250',
        severity: 'medium',
        description: 'شخص يتحرك ببطء قرب الباب',
      },
    ]);

    // سجل التتبع
    setTrackingHistory(
      mockTrackedObjects.map(obj => ({
        id: `history_${obj.id}_${Date.now()}`,
        object: obj.label,
        type: obj.type,
        timestamp: Date.now(),
        position: `(${obj.position.x}, ${obj.position.y})`,
        speed: obj.speed,
        action: obj.status,
      }))
    );

    // الإحصائيات
    setStatistics({
      totalTracked: mockTrackedObjects.length,
      totalAlerts: 2,
      averageSpeed: (
        mockTrackedObjects.reduce((sum, obj) => sum + obj.speed, 0) / mockTrackedObjects.length
      ).toFixed(2),
      suspiciousCount: mockTrackedObjects.filter(obj => obj.status === 'suspicious').length,
    });
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const deleteSuspiciousActivity = useCallback(activityId => {
    setSuspiciousActivities(prev => prev.filter(a => a.id !== activityId));
  }, []);

  const getObjectTypeLabel = type => {
    const labels = {
      person: '👤 شخص',
      vehicle: '🚗 سيارة',
      bag: '🎒 حقيبة',
      animal: '🐕 حيوان',
    };
    return labels[type] || type;
  };

  const getSeverityColor = severity => {
    const colors = {
      high: 'error',
      medium: 'warning',
      low: 'info',
    };
    return colors[severity] || 'default';
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon />
          خدمة تتبع الأشياء
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isTracking ? (
            <Chip label="قيد التتبع 🔴" size="small" color="error" variant="filled" />
          ) : (
            <Chip label="متوقف ⚪" size="small" variant="outlined" />
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* أزرار التحكم */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<PlayArrowIcon />}
              onClick={startTracking}
              disabled={isTracking}
              fullWidth
            >
              بدء التتبع
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={stopTracking}
              disabled={!isTracking}
              fullWidth
            >
              إيقاف التتبع
            </Button>
          </Box>

          {/* الأشياء المتتبعة */}
          {trackedObjects.length > 0 && (
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <VideocamIcon fontSize="small" />
                الأشياء المتتبعة ({trackedObjects.length})
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 2,
                }}
              >
                {trackedObjects.map(obj => (
                  <Card key={obj.id} sx={{ borderRadius: 2, borderLeft: `4px solid ${obj.color}` }}>
                    <CardContent>
                      {/* صورة معاينة */}
                      <Box
                        sx={{
                          width: '100%',
                          height: 120,
                          bgcolor: '#f0f0f0',
                          borderRadius: 1,
                          mb: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `2px dashed ${obj.color}`,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${obj.position.x / 10}%`,
                            top: `${obj.position.y / 10}%`,
                            width: `${obj.position.width / 10}px`,
                            height: `${obj.position.height / 10}px`,
                            border: `2px solid ${obj.color}`,
                            borderRadius: 1,
                          }}
                        />
                        <VideocamIcon sx={{ fontSize: 40, color: 'action.disabled' }} />
                      </Box>

                      {/* المعلومات */}
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {obj.label}
                      </Typography>

                      <Box sx={{ mb: 1 }}>
                        <Chip
                          label={getObjectTypeLabel(obj.type)}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                        <Chip
                          label={obj.status}
                          size="small"
                          color={
                            obj.status === 'suspicious'
                              ? 'error'
                              : obj.status === 'fast'
                                ? 'warning'
                                : 'success'
                          }
                        />
                      </Box>

                      {/* الثقة */}
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="textSecondary">
                            الثقة
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {obj.confidence}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={obj.confidence}
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Box>

                      {/* السرعة والاتجاه */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                        <Box>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{ display: 'block' }}
                          >
                            السرعة
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {obj.speed} m/s
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{ display: 'block' }}
                          >
                            الاتجاه
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {obj.direction}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Paper>
          )}

          {/* الأنشطة المريبة */}
          {suspiciousActivities.length > 0 && (
            <Alert severity="warning" icon={<WarningIcon />} sx={{ borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                ⚠️ تم اكتشاف {suspiciousActivities.length} أنشطة مريبة
              </Typography>
            </Alert>
          )}

          {/* جدول الأنشطة المريبة */}
          {suspiciousActivities.length > 0 && (
            <Paper sx={{ p: 2, borderRadius: 2, overflow: 'hidden' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                🚨 الأنشطة المريبة
              </Typography>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8f9ff' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>الشيء</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>الشدة</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>الوقت</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suspiciousActivities.map(activity => (
                    <TableRow key={activity.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {activity.object}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={activity.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={activity.severity}
                          size="small"
                          color={getSeverityColor(activity.severity)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(activity.timestamp).toLocaleTimeString('ar-SA')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            onClick={() => deleteSuspiciousActivity(activity.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

          {/* سجل التتبع */}
          {trackingHistory.length > 0 && (
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                📊 سجل التتبع ({trackingHistory.length})
              </Typography>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8f9ff' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>الشيء</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>الموضع</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>السرعة</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>الوقت</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trackingHistory.slice(0, 5).map(entry => (
                    <TableRow key={entry.id} hover>
                      <TableCell>
                        <Typography variant="body2">{entry.object}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={entry.type} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {entry.position}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {entry.speed} m/s
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(entry.timestamp).toLocaleTimeString('ar-SA')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

          {/* الإحصائيات */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 2,
            }}
          >
            <Card sx={{ bgcolor: 'info.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="info.main" sx={{ fontWeight: 700 }}>
                  {statistics.totalTracked}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  أشياء متتبعة
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="warning.main" sx={{ fontWeight: 700 }}>
                  {statistics.totalAlerts}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  تنبيهات
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ bgcolor: 'error.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="error.main" sx={{ fontWeight: 700 }}>
                  {statistics.suspiciousCount}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  أشياء مريبة
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="success.main" sx={{ fontWeight: 700 }}>
                  {statistics.averageSpeed}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  متوسط السرعة
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ObjectTrackingService;
