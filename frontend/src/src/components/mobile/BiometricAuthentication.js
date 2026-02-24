/**
 * Biometric Authentication System 🔐
 * نظام المصادقة البيومترية المتقدم
 *
 * Features:
 * ✅ Fingerprint recognition
 * ✅ Face recognition
 * ✅ Iris scanning
 * ✅ Voice recognition
 * ✅ Multi-factor authentication
 * ✅ Biometric templates
 * ✅ Security audit logs
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  AlertTitle,
  Divider,
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  Face as FaceIcon,
  RemoveRedEye as IrisIcon,
  GraphicEq as VoiceIcon,
  Verified as VerifiedIcon,
  Security as SecurityIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

const BiometricAuthentication = () => {
  const [biometrics, setBiometrics] = useState([
    {
      id: 1,
      type: 'fingerprint',
      name: 'البصمة اليمنى - السبابة',
      registered: '2025-12-01',
      lastUsed: '2026-01-16',
      enabled: true,
      quality: 98,
      verified: true,
    },
    {
      id: 2,
      type: 'fingerprint',
      name: 'البصمة اليسرى - الإبهام',
      registered: '2025-12-01',
      lastUsed: '2026-01-15',
      enabled: true,
      quality: 95,
      verified: true,
    },
    {
      id: 3,
      type: 'face',
      name: 'الوجه - الزاوية الأمامية',
      registered: '2025-12-15',
      lastUsed: '2026-01-16',
      enabled: true,
      quality: 96,
      verified: true,
    },
    {
      id: 4,
      type: 'voice',
      name: 'الصوت - العربية',
      registered: '2026-01-01',
      lastUsed: '2026-01-10',
      enabled: false,
      quality: 85,
      verified: false,
    },
  ]);

  const [authMethods, setAuthMethods] = useState([
    { id: 1, name: 'المصادقة البيومترية', enabled: true, primary: true, riskLevel: 'low' },
    { id: 2, name: 'كلمة المرور', enabled: true, primary: false, riskLevel: 'medium' },
    { id: 3, name: 'مفتاح الأمان', enabled: false, primary: false, riskLevel: 'very-low' },
    { id: 4, name: 'الرسالة النصية', enabled: true, primary: false, riskLevel: 'medium' },
  ]);

  const [authLogs, setAuthLogs] = useState([
    { id: 1, timestamp: '2026-01-16 14:30:45', method: 'fingerprint', status: 'success', device: 'iPhone 15', location: 'الرياض' },
    { id: 2, timestamp: '2026-01-16 12:00:30', method: 'face', status: 'success', device: 'iPhone 15', location: 'جدة' },
    { id: 3, timestamp: '2026-01-16 09:15:20', method: 'fingerprint', status: 'failed', device: 'iPad', location: 'الرياض' },
    { id: 4, timestamp: '2026-01-15 18:45:00', method: 'password', status: 'success', device: 'Web Browser', location: 'الرياض' },
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [registrationProcess, setRegistrationProcess] = useState(null);
  const [selectedBiometric, setSelectedBiometric] = useState(null);

  const stats = {
    registered: biometrics.filter(b => b.verified).length,
    enabled: biometrics.filter(b => b.enabled).length,
    types: new Set(biometrics.map(b => b.type)).size,
    successRate: 99.2,
  };

  const biometricTypeInfo = {
    fingerprint: { icon: <FingerprintIcon />, color: '#667eea', label: 'بصمة الإصبع' },
    face: { icon: <FaceIcon />, color: '#4caf50', label: 'التعرف على الوجه' },
    iris: { icon: <IrisIcon />, color: '#ff9800', label: 'مسح الحدقة' },
    voice: { icon: <VoiceIcon />, color: '#2196f3', label: 'التعرف على الصوت' },
  };

  const startRegistration = type => {
    setRegistrationProcess(type);
    setOpenDialog(true);
  };

  const completeRegistration = () => {
    const newBiometric = {
      id: biometrics.length + 1,
      type: registrationProcess,
      name: `${biometricTypeInfo[registrationProcess].label} - جديد`,
      registered: new Date().toISOString().split('T')[0],
      lastUsed: null,
      enabled: false,
      quality: Math.floor(Math.random() * 20) + 80,
      verified: false,
    };
    setBiometrics([...biometrics, newBiometric]);
    setOpenDialog(false);
    setRegistrationProcess(null);
  };

  const toggleBiometric = id => {
    setBiometrics(biometrics.map(b => (b.id === id ? { ...b, enabled: !b.enabled } : b)));
  };

  const deleteBiometric = id => {
    setBiometrics(biometrics.filter(b => b.id !== id));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'البيانات المسجلة', value: stats.registered, icon: '✅', color: '#4caf50' },
          { label: 'النشطة', value: stats.enabled, icon: '⚡', color: '#2196f3' },
          { label: 'الأنواع', value: stats.types, icon: '🔐', color: '#667eea' },
          { label: 'معدل النجاح', value: `${stats.successRate}%`, icon: '🎯', color: '#ff9800' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}05)`,
                border: `2px solid ${stat.color}30`,
              }}
            >
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                {stat.icon}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Security Alert */}
      <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>🛡️ البيانات البيومترية آمنة</AlertTitle>
        تتم معالجة جميع البيانات البيومترية محلياً على جهازك ولا تُخزن على الخوادم.
      </Alert>

      {/* Registered Biometrics */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📋 البيانات المسجلة
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {biometrics.map(bio => (
          <Grid item xs={12} sm={6} key={bio.id}>
            <Card sx={{ borderRadius: 2, border: bio.verified ? '2px solid #4caf50' : '2px solid #ccc' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Box sx={{ color: biometricTypeInfo[bio.type].color, fontSize: 24 }}>{biometricTypeInfo[bio.type].icon}</Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {bio.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {biometricTypeInfo[bio.type].label}
                      </Typography>
                    </Box>
                  </Box>
                  {bio.verified && <CheckIcon sx={{ color: '#4caf50' }} />}
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      جودة النموذج
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {bio.quality}%
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={bio.quality} sx={{ height: 4, borderRadius: 2 }} />
                </Box>

                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                  📅 التسجيل: {bio.registered}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                  🕐 آخر استخدام: {bio.lastUsed || 'لم يتم الاستخدام'}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Switch checked={bio.enabled} onChange={() => toggleBiometric(bio.id)} />
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => deleteBiometric(bio.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Register New Biometric */}
      <Paper sx={{ p: 3, borderRadius: 2, mb: 3, backgroundColor: '#e3f2fd', border: '2px solid #2196f3' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2', mb: 2 }}>
          🆕 تسجيل بيانات جديدة
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(biometricTypeInfo).map(([type, info]) => (
            <Grid item xs={12} sm={6} key={type}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={info.icon}
                onClick={() => startRegistration(type)}
                sx={{ borderColor: info.color, color: info.color, fontWeight: 600 }}
              >
                {info.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Authentication Methods */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        🔑 طرق المصادقة
      </Typography>
      <List sx={{ backgroundColor: '#f8f9ff', borderRadius: 2, mb: 3 }}>
        {authMethods.map(method => (
          <ListItem key={method.id} sx={{ borderRadius: 1, mb: 1 }}>
            <ListItemIcon>{method.primary ? <SecurityIcon sx={{ color: '#667eea' }} /> : <VerifiedIcon />}</ListItemIcon>
            <ListItemText
              primary={method.name}
              secondary={`مستوى الأمان: ${method.riskLevel === 'very-low' ? 'عالي جداً' : method.riskLevel === 'low' ? 'عالي' : 'متوسط'}`}
            />
            <Switch checked={method.enabled} />
          </ListItem>
        ))}
      </List>

      {/* Authentication Logs */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📜 سجل المصادقة
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#667eea' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الوقت</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الطريقة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الجهاز</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الموقع</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {authLogs.map(log => (
              <TableRow key={log.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                <TableCell sx={{ fontWeight: 600 }}>{log.timestamp}</TableCell>
                <TableCell>
                  <Chip label={log.method} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={log.status === 'success' ? 'نجح' : 'فشل'}
                    color={log.status === 'success' ? 'success' : 'error'}
                    size="small"
                    icon={log.status === 'success' ? <CheckIcon /> : <CloseIcon />}
                  />
                </TableCell>
                <TableCell>{log.device}</TableCell>
                <TableCell>{log.location}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Registration Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>🔐 تسجيل بيومتري جديد</DialogTitle>
        <DialogContent sx={{ mt: 2, textAlign: 'center' }}>
          <Box sx={{ my: 3 }}>
            <Typography variant="h2" sx={{ mb: 2 }}>
              {registrationProcess && biometricTypeInfo[registrationProcess].icon}
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              {registrationProcess === 'fingerprint' && 'ضع إصبعك على القارئ'}
              {registrationProcess === 'face' && 'انظر إلى الكاميرا'}
              {registrationProcess === 'iris' && 'ركز نظرك على ماسح الحدقة'}
              {registrationProcess === 'voice' && 'كرر العبارة المطلوبة'}
            </Typography>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="caption" color="textSecondary">
              جاري المعالجة...
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={completeRegistration} variant="contained">
            تأكيد التسجيل
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BiometricAuthentication;
