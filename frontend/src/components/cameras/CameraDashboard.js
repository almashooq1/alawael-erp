/**
 * Camera Dashboard Component - لوحة تحكم الكاميرات
 * عرض جميع كاميرات الفروع مع التحكم والمراقبة
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Stack,
  Badge,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  FolderSpecial as FolderIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  CheckCircle as OnlineIcon,
  Cancel as OfflineIcon,
  Cloud as CloudIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Info as InfoIcon,
  Motion as MotionIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';

const CameraDashboard = () => {
  // States
  const [branches, setBranches] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState('add'); // add or edit
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Form Data
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    description: '',
    location: { address: '', city: '' },
    contact: { phone: '', email: '', manager: '' },
  });

  const [cameraForm, setCameraForm] = useState({
    name: '',
    branchId: '',
    hikvision: {
      ipAddress: '',
      port: 8000,
      username: '',
      password: '',
      cameraIndex: 1,
    },
    recording: { enabled: true, quality: 'high' },
    motionDetection: { enabled: true, sensitivity: 50 },
    cloudSettings: { uploadEnabled: true, cloudProvider: 'aws-s3' },
  });

  // Fetch data
  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/branches', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setBranches(data.data || []);
    } catch (error) {
      showSnackbar('❌ خطأ في تحميل الفروع', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCameras = useCallback(async branchId => {
    try {
      setLoading(true);
      const url = branchId ? `/api/cameras?branchId=${branchId}` : '/api/cameras';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setCameras(data.data || []);
    } catch (error) {
      showSnackbar('❌ خطأ في تحميل الكاميرات', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (selectedBranch) {
      fetchCameras(selectedBranch._id);
    }
  }, [selectedBranch, fetchCameras]);

  // Handlers
  const handleAddBranch = () => {
    setFormMode('add');
    setBranchForm({
      name: '',
      code: '',
      description: '',
      location: { address: '', city: '' },
      contact: { phone: '', email: '', manager: '' },
    });
    setDialogOpen(true);
  };

  const handleAddCamera = () => {
    if (!selectedBranch) {
      showSnackbar('⚠️ اختر فرعاً أولاً', 'warning');
      return;
    }
    setFormMode('add');
    setCameraForm({
      name: '',
      branchId: selectedBranch._id,
      hikvision: {
        ipAddress: '',
        port: 8000,
        username: '',
        password: '',
        cameraIndex: 1,
      },
      recording: { enabled: true, quality: 'high' },
      motionDetection: { enabled: true, sensitivity: 50 },
      cloudSettings: { uploadEnabled: true, cloudProvider: 'aws-s3' },
    });
    setDialogOpen(true);
  };

  const handleSaveBranch = async () => {
    try {
      const method = formMode === 'add' ? 'POST' : 'PUT';
      const url = formMode === 'add' ? '/api/branches' : `/api/branches/${selectedBranch._id}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(branchForm),
      });

      if (response.ok) {
        showSnackbar('✅ تم حفظ الفرع بنجاح');
        fetchBranches();
        setDialogOpen(false);
      } else {
        showSnackbar('❌ خطأ في حفظ الفرع', 'error');
      }
    } catch (error) {
      showSnackbar('❌ ' + error.message, 'error');
    }
  };

  const handleSaveCamera = async () => {
    try {
      // اختبار الاتصال بـ Hikvision أولاً
      const testResponse = await fetch(`/api/cameras/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ ...cameraForm.hikvision }),
      });

      if (!testResponse.ok) {
        showSnackbar('❌ فشل الاتصال بالكاميرا', 'error');
        return;
      }

      const method = formMode === 'add' ? 'POST' : 'PUT';
      const url = formMode === 'add' ? '/api/cameras' : `/api/cameras/${selectedCamera?._id}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(cameraForm),
      });

      if (response.ok) {
        showSnackbar('✅ تم حفظ الكاميرا بنجاح');
        fetchCameras(selectedBranch._id);
        setDialogOpen(false);
      } else {
        showSnackbar('❌ خطأ في حفظ الكاميرا', 'error');
      }
    } catch (error) {
      showSnackbar('❌ ' + error.message, 'error');
    }
  };

  const handleDeleteCamera = async cameraId => {
    if (window.confirm('هل أنت متأكد من حذف هذه الكاميرا؟')) {
      try {
        const response = await fetch(`/api/cameras/${cameraId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });

        if (response.ok) {
          showSnackbar('✅ تم حذف الكاميرا بنجاح');
          fetchCameras(selectedBranch._id);
        }
      } catch (error) {
        showSnackbar('❌ ' + error.message, 'error');
      }
    }
  };

  const handleTestConnection = async camera => {
    try {
      const response = await fetch(`/api/cameras/${camera._id}/test-connection`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const result = await response.json();
      if (result.success) {
        showSnackbar('✅ الاتصال بنجاح! الكاميرا متصلة');
      } else {
        showSnackbar('❌ فشل الاتصال: ' + result.message, 'error');
      }
    } catch (error) {
      showSnackbar('❌ ' + error.message, 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => setSnackbar({ open: false, message: '', severity: 'success' }), 4000);
  };

  // Render
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <VideocamIcon sx={{ fontSize: 32 }} />
          📹 نظام إدارة كاميرات المراقبة
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddBranch} color="primary">
            فرع جديد
          </Button>
          <Button variant="contained" startIcon={<VideocamIcon />} onClick={handleAddCamera} disabled={!selectedBranch} color="success">
            كاميرا جديدة
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Branches Section */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              📍 الفروع ({branches.length})
            </Typography>

            {loading ? (
              <CircularProgress />
            ) : (
              <Stack spacing={1}>
                {branches.map(branch => (
                  <Card
                    key={branch._id}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: selectedBranch?._id === branch._id ? '#e3f2fd' : 'white',
                      border: selectedBranch?._id === branch._id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      '&:hover': { boxShadow: 3 },
                    }}
                    onClick={() => setSelectedBranch(branch)}
                  >
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {branch.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        📊 {branch.statistics?.totalCameras || 0} كاميرا
                      </Typography>
                      <Chip label={branch.status} size="small" color={branch.status === 'active' ? 'success' : 'error'} sx={{ mt: 1 }} />
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={9}>
          {selectedBranch ? (
            <>
              {/* Branch Info */}
              <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {selectedBranch.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {selectedBranch.location?.address}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={() => fetchCameras(selectedBranch._id)}>
                      تحديث
                    </Button>
                    <Button variant="outlined" size="small" startIcon={<StorageIcon />} onClick={() => console.log('show storage')}>
                      التخزين
                    </Button>
                  </Stack>
                </Box>
              </Paper>

              {/* Cameras Grid */}
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                  <CircularProgress />
                </Box>
              ) : cameras.length > 0 ? (
                <Grid container spacing={2}>
                  {cameras.map(camera => (
                    <Grid item xs={12} sm={6} md={4} key={camera._id}>
                      <Card
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: 2,
                          boxShadow: 2,
                          '&:hover': { boxShadow: 5, transform: 'translateY(-4px)' },
                          transition: 'all 0.3s',
                        }}
                      >
                        {/* Camera Image */}
                        <Box
                          sx={{
                            position: 'relative',
                            backgroundColor: '#f5f5f5',
                            height: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          <VideocamIcon sx={{ fontSize: 60, color: '#ccc' }} />
                          <Badge
                            badgeContent={
                              camera.status === 'online' ? (
                                <OnlineIcon sx={{ color: '#4caf50' }} />
                              ) : (
                                <OfflineIcon sx={{ color: '#f44336' }} />
                              )
                            }
                            sx={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                            }}
                          >
                            <Box />
                          </Badge>
                        </Box>

                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {camera.name}
                          </Typography>

                          <Stack spacing={1} sx={{ mb: 2 }}>
                            <Typography variant="body2" color="textSecondary">
                              📍 {camera.location}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              🎥 {camera.hikvision.resolution || '1080p'}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              🌐 {camera.hikvision.ipAddress}
                            </Typography>
                          </Stack>

                          {/* Status Indicators */}
                          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
                            {camera.recording?.enabled && <Chip label="🔴 تسجيل" size="small" color="error" variant="outlined" />}
                            {camera.motionDetection?.enabled && <Chip label="🚨 حركة" size="small" color="warning" variant="outlined" />}
                            {camera.cloudSettings?.uploadEnabled && <Chip label="☁️ سحابة" size="small" color="info" variant="outlined" />}
                          </Stack>
                        </CardContent>

                        {/* Actions */}
                        <Box sx={{ display: 'flex', gap: 1, p: 1.5, borderTop: '1px solid #e0e0e0' }}>
                          <Tooltip title="اختبار الاتصال">
                            <IconButton size="small" onClick={() => handleTestConnection(camera)} color="primary">
                              <RefreshIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="عرض البث المباشر">
                            <IconButton size="small" color="primary">
                              <VideocamIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="الإعدادات">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setSelectedCamera(camera);
                                setCameraForm(camera);
                                setFormMode('edit');
                                setDialogOpen(true);
                              }}
                            >
                              <SettingsIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton size="small" color="error" onClick={() => handleDeleteCamera(camera._id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  لا توجد كاميرات في هذا الفرع. أضف كاميرا جديدة للبدء.
                </Alert>
              )}
            </>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <FolderIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                اختر فرعاً لعرض الكاميرات
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Dialogs */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          {formMode === 'add' ? '➕ إضافة جديد' : '✏️ تحرير'}
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          {/* Branch Form */}
          {!selectedBranch || (selectedBranch && selectedCamera === undefined) ? (
            <Stack spacing={2}>
              <TextField
                label="اسم الفرع"
                value={branchForm.name}
                onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                fullWidth
              />
              <TextField
                label="كود الفرع"
                value={branchForm.code}
                onChange={e => setBranchForm({ ...branchForm, code: e.target.value })}
                fullWidth
              />
              <TextField
                label="الوصف"
                value={branchForm.description}
                onChange={e => setBranchForm({ ...branchForm, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            </Stack>
          ) : (
            /* Camera Form */
            <Stack spacing={2}>
              <TextField
                label="اسم الكاميرا"
                value={cameraForm.name}
                onChange={e => setCameraForm({ ...cameraForm, name: e.target.value })}
                fullWidth
              />
              <TextField
                label="عنوان IP"
                value={cameraForm.hikvision.ipAddress}
                onChange={e =>
                  setCameraForm({
                    ...cameraForm,
                    hikvision: { ...cameraForm.hikvision, ipAddress: e.target.value },
                  })
                }
                fullWidth
                placeholder="192.168.1.100"
              />
              <TextField
                label="اسم المستخدم"
                value={cameraForm.hikvision.username}
                onChange={e =>
                  setCameraForm({
                    ...cameraForm,
                    hikvision: { ...cameraForm.hikvision, username: e.target.value },
                  })
                }
                fullWidth
              />
              <TextField
                label="كلمة المرور"
                type="password"
                value={cameraForm.hikvision.password}
                onChange={e =>
                  setCameraForm({
                    ...cameraForm,
                    hikvision: { ...cameraForm.hikvision, password: e.target.value },
                  })
                }
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined">
            إلغاء
          </Button>
          <Button
            onClick={selectedCamera ? handleSaveCamera : handleSaveBranch}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CameraDashboard;
