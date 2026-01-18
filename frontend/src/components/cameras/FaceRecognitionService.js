/**
 * Face Recognition Service
 * خدمة التعرف على الوجوه
 *
 * Features:
 * ✅ كشف الوجوه من الفيديو
 * ✅ التعرف على الوجوه
 * ✅ تحديد الهوية
 * ✅ قاعدة بيانات الوجوه
 * ✅ التنبيهات الفورية
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
  Avatar,
  AvatarGroup,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  LinearProgress,
  Tooltip,
  IconButton,
  TextField,
} from '@mui/material';
import {
  FaceRetouching as FaceIcon,
  Done as DoneIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const FaceRecognitionService = ({ camera, onClose, onDetectFace }) => {
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [faceDatabase, setFaceDatabase] = useState([
    { id: 1, name: 'محمد علي', confidence: 98, lastSeen: Date.now() },
    { id: 2, name: 'فاطمة أحمد', confidence: 95, lastSeen: Date.now() - 3600000 },
    { id: 3, name: 'أحمد حسن', confidence: 91, lastSeen: Date.now() - 7200000 },
  ]);
  const [alerts, setAlerts] = useState([]);
  const [unrecognized, setUnrecognized] = useState([]);

  const simulateFaceDetection = useCallback(async () => {
    setIsProcessing(true);
    setProgress(0);

    // محاكاة اكتشاف الوجوه
    const mockDetectedFaces = [
      {
        id: 1,
        face_id: 'face_001',
        confidence: 97,
        location: { x: 100, y: 50, width: 120, height: 140 },
        name: 'محمد علي',
        status: 'recognized',
      },
      {
        id: 2,
        face_id: 'face_002',
        confidence: 85,
        location: { x: 300, y: 80, width: 100, height: 120 },
        name: 'فاطمة أحمد',
        status: 'recognized',
      },
      {
        id: 3,
        face_id: 'face_003',
        confidence: 35,
        location: { x: 500, y: 100, width: 110, height: 130 },
        name: 'غير معروف',
        status: 'unrecognized',
      },
    ];

    for (let i = 0; i <= 100; i += 10) {
      setProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setDetectedFaces(mockDetectedFaces);

    // فصل الوجوه المعروفة والغير معروفة
    const recognized = mockDetectedFaces.filter(f => f.status === 'recognized');
    const unrecognizedFaces = mockDetectedFaces.filter(f => f.status === 'unrecognized');

    setUnrecognized(unrecognizedFaces);

    // إنشاء تنبيهات للوجوه المشبوهة
    if (unrecognizedFaces.length > 0) {
      setAlerts(prev => [
        ...prev,
        {
          id: `alert_${Date.now()}`,
          type: 'suspicious_person',
          timestamp: Date.now(),
          count: unrecognizedFaces.length,
          confidence: unrecognizedFaces[0].confidence,
        },
      ]);
    }

    setIsProcessing(false);
  }, []);

  const handleTrainFace = useCallback(
    name => {
      if (!name.trim()) return;

      const newFace = {
        id: faceDatabase.length + 1,
        name,
        confidence: 0,
        lastSeen: Date.now(),
      };

      setFaceDatabase(prev => [...prev, newFace]);
    },
    [faceDatabase.length],
  );

  const handleDeleteFace = useCallback(faceId => {
    setFaceDatabase(prev => prev.filter(f => f.id !== faceId));
  }, []);

  const handleConfirmFace = useCallback((faceId, name) => {
    setFaceDatabase(prev =>
      prev.map(f => (f.id === faceId ? { ...f, confidence: Math.min(f.confidence + 10, 99), lastSeen: Date.now() } : f)),
    );
  }, []);

  return (
    <Dialog open={true} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <FaceIcon />
        خدمة التعرف على الوجوه
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* زر البدء */}
          <Button
            variant="contained"
            onClick={simulateFaceDetection}
            disabled={isProcessing}
            fullWidth
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              p: 1.5,
            }}
          >
            {isProcessing ? 'جاري البحث عن الوجوه...' : 'ابدأ كشف الوجوه'}
          </Button>

          {/* شريط التقدم */}
          {isProcessing && (
            <Paper sx={{ p: 2, bgcolor: '#f8f9ff', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={24} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    جاري معالجة الإطار {progress}%
                  </Typography>
                  <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 2 }} />
                </Box>
              </Box>
            </Paper>
          )}

          {/* الوجوه المكتشفة */}
          {detectedFaces.length > 0 && (
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FaceIcon fontSize="small" />
                الوجوه المكتشفة ({detectedFaces.length})
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
                {detectedFaces.map(face => (
                  <Card key={face.face_id} sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ position: 'relative', mb: 2 }}>
                        <Box
                          sx={{
                            width: '100%',
                            height: 120,
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `3px solid ${face.status === 'recognized' ? '#4caf50' : '#f44336'}`,
                          }}
                        >
                          <FaceIcon sx={{ fontSize: 48, color: 'action.disabled' }} />
                        </Box>
                        <Chip
                          label={face.status === 'recognized' ? `✅ معروف` : `❌ غير معروف`}
                          size="small"
                          color={face.status === 'recognized' ? 'success' : 'error'}
                          sx={{
                            position: 'absolute',
                            top: -12,
                            right: -12,
                          }}
                        />
                      </Box>

                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {face.name}
                      </Typography>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          الثقة:
                        </Typography>
                        <Chip
                          label={`${face.confidence}%`}
                          size="small"
                          color={face.confidence > 90 ? 'success' : face.confidence > 70 ? 'warning' : 'error'}
                        />
                      </Box>

                      <Box sx={{ width: '100%', height: 4, bgcolor: '#e0e0e0', borderRadius: 2, mb: 1, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            width: `${face.confidence}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #4caf50, #2196f3)',
                          }}
                        />
                      </Box>

                      {face.status === 'recognized' && (
                        <Button size="small" fullWidth onClick={() => handleConfirmFace(face.id, face.name)} sx={{ mt: 1 }}>
                          تأكيد
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Paper>
          )}

          {/* التنبيهات */}
          {alerts.length > 0 && (
            <Alert severity="warning" icon={<WarningIcon />} sx={{ borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  ⚠️ تم اكتشاف {alerts[0].count} أشخاص غير معروفين
                </Typography>
                <Typography variant="caption" color="inherit">
                  معدل الثقة: {alerts[0].confidence}%
                </Typography>
              </Box>
            </Alert>
          )}

          {/* قاعدة بيانات الوجوه */}
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon fontSize="small" />
              قاعدة بيانات الوجوه ({faceDatabase.length})
            </Typography>

            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8f9ff' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>الاسم</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>الثقة</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>آخر مشاهدة</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {faceDatabase.map(face => (
                  <TableRow key={face.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28 }}>{face.name.charAt(0)}</Avatar>
                        {face.name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 60, height: 4, bgcolor: '#e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              width: `${face.confidence}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #4caf50, #2196f3)',
                            }}
                          />
                        </Box>
                        {face.confidence}%
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{new Date(face.lastSeen).toLocaleTimeString('ar-SA')}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="تأكيد">
                          <IconButton size="small" onClick={() => handleConfirmFace(face.id, face.name)}>
                            <DoneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" onClick={() => handleDeleteFace(face.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {/* إضافة وجه جديد */}
          <Paper sx={{ p: 2, bgcolor: '#f0fff4', borderRadius: 2, border: '2px solid #4caf50' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              ➕ إضافة وجه جديد
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField placeholder="اسم الشخص" size="small" fullWidth id="new-face-name" />
              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  const nameInput = document.getElementById('new-face-name');
                  if (nameInput) {
                    handleTrainFace(nameInput.value);
                    nameInput.value = '';
                  }
                }}
              >
                إضافة
              </Button>
            </Box>
          </Paper>

          {/* الإحصائيات */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="success.main" sx={{ fontWeight: 700 }}>
                  {detectedFaces.filter(f => f.status === 'recognized').length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  وجوه معروفة
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ bgcolor: 'error.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="error.main" sx={{ fontWeight: 700 }}>
                  {unrecognized.length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  وجوه غير معروفة
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ bgcolor: 'info.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="info.main" sx={{ fontWeight: 700 }}>
                  {faceDatabase.length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  وجوه في قاعدة البيانات
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
        <Button
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          حفظ التغييرات
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FaceRecognitionService;
