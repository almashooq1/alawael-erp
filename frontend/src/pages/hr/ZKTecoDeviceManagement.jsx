import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Typography, Grid, Paper, Box, Button, TextField, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Avatar, IconButton, Alert, Snackbar, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Switch,
  FormControlLabel, LinearProgress,
  InputAdornment,
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  Router as DeviceIcon,
  Wifi as OnlineIcon,
  WifiOff as OfflineIcon,
  Sync as SyncIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as ConnectIcon,
  Stop as DisconnectIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  NetworkCheck as TestIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon,
  AccessTime as TimeIcon,
  DeviceHub as DeviceHubIcon,
  } from '@mui/icons-material';
import zktecoService from 'services/zktecoService';
import { gradients } from '../../theme/palette';

/* ═══════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════ */

const STATUS_CONFIG = {
  online: { label: 'متصل', color: 'success', icon: <OnlineIcon fontSize="small" /> },
  offline: { label: 'غير متصل', color: 'default', icon: <OfflineIcon fontSize="small" /> },
  error: { label: 'خطأ', color: 'error', icon: <ErrorIcon fontSize="small" /> },
  maintenance: { label: 'صيانة', color: 'warning', icon: <SettingsIcon fontSize="small" /> },
  disabled: { label: 'معطل', color: 'default', icon: <OfflineIcon fontSize="small" /> },
};

const INITIAL_DEVICE = {
  deviceName: '',
  ipAddress: '',
  port: 4370,
  model: 'ZKTeco',
  serialNumber: '',
  location: { branchName: '', floor: '', area: '', description: '' },
  notes: '',
};

/* ═══════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════ */

const ZKTecoDeviceManagement = () => {
  // State
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [_tabIndex, _setTabIndex] = useState(0);
  const [search, setSearch] = useState('');

  // Dialogs
  const [deviceDialog, setDeviceDialog] = useState({ open: false, mode: 'add', data: INITIAL_DEVICE });
  const [usersDialog, setUsersDialog] = useState({ open: false, deviceId: null, users: [] });
  const [syncHistoryDialog, setSyncHistoryDialog] = useState({ open: false, deviceId: null, logs: [] });
  const [testDialog, setTestDialog] = useState({ open: false, ip: '', port: 4370, result: null, testing: false });

  // Snackbar
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });

  /* ─── Load Data ─── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [devRes, statRes] = await Promise.all([
        zktecoService.getDevices(),
        zktecoService.getStats(),
      ]);
      setDevices(Array.isArray(devRes.data) ? devRes.data : []);
      setStats(statRes.data || {});
    } catch {
      showSnack('خطأ في تحميل البيانات', 'error');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ─── Filtered Devices ─── */
  const filtered = useMemo(() => {
    if (!search) return devices;
    const q = search.toLowerCase();
    return devices.filter(d =>
      d.deviceName?.toLowerCase().includes(q) ||
      d.ipAddress?.includes(q) ||
      d.location?.branchName?.toLowerCase().includes(q)
    );
  }, [devices, search]);

  /* ─── Device CRUD ─── */
  const handleSaveDevice = async () => {
    setActionLoading('save');
    try {
      if (deviceDialog.mode === 'add') {
        await zktecoService.addDevice(deviceDialog.data);
        showSnack('تم إضافة الجهاز بنجاح');
      } else {
        await zktecoService.updateDevice(deviceDialog.data._id, deviceDialog.data);
        showSnack('تم تحديث الجهاز بنجاح');
      }
      setDeviceDialog({ open: false, mode: 'add', data: INITIAL_DEVICE });
      loadData();
    } catch (e) {
      showSnack(e?.message || 'خطأ في حفظ الجهاز', 'error');
    }
    setActionLoading(null);
  };

  const handleDeleteDevice = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الجهاز؟')) return;
    setActionLoading(`delete-${id}`);
    try {
      await zktecoService.deleteDevice(id);
      showSnack('تم حذف الجهاز');
      loadData();
    } catch {
      showSnack('خطأ في حذف الجهاز', 'error');
    }
    setActionLoading(null);
  };

  /* ─── Connection ─── */
  const handleConnect = async (id) => {
    setActionLoading(`connect-${id}`);
    try {
      await zktecoService.connectDevice(id);
      showSnack('تم الاتصال بالجهاز بنجاح');
      loadData();
    } catch (e) {
      showSnack(e?.response?.data?.message || 'فشل الاتصال', 'error');
    }
    setActionLoading(null);
  };

  const handleDisconnect = async (id) => {
    setActionLoading(`disconnect-${id}`);
    try {
      await zktecoService.disconnectDevice(id);
      showSnack('تم قطع الاتصال');
      loadData();
    } catch {
      showSnack('خطأ', 'error');
    }
    setActionLoading(null);
  };

  /* ─── Sync ─── */
  const handleSync = async (id) => {
    setActionLoading(`sync-${id}`);
    try {
      const res = await zktecoService.syncDevice(id);
      const d = res.data;
      showSnack(`المزامنة: ${d?.recordsSynced || 0} مسجل، ${d?.recordsSkipped || 0} مُتخطى`);
      loadData();
    } catch {
      showSnack('فشلت المزامنة', 'error');
    }
    setActionLoading(null);
  };

  const handleSyncAll = async () => {
    setActionLoading('sync-all');
    try {
      const res = await zktecoService.syncAllDevices();
      showSnack(res.data?.message || 'تمت مزامنة جميع الأجهزة');
      loadData();
    } catch {
      showSnack('خطأ في المزامنة الشاملة', 'error');
    }
    setActionLoading(null);
  };

  /* ─── Auto Sync Toggle ─── */
  const handleAutoSyncToggle = async (id, enabled) => {
    try {
      await zktecoService.toggleAutoSync(id, enabled);
      showSnack(enabled ? 'تم تفعيل المزامنة التلقائية' : 'تم تعطيل المزامنة التلقائية');
      loadData();
    } catch {
      showSnack('خطأ', 'error');
    }
  };

  /* ─── Test Connection ─── */
  const handleTestConnection = async () => {
    setTestDialog(prev => ({ ...prev, testing: true, result: null }));
    try {
      const res = await zktecoService.testConnection(testDialog.ip, testDialog.port);
      setTestDialog(prev => ({ ...prev, testing: false, result: res.data || res }));
    } catch {
      setTestDialog(prev => ({ ...prev, testing: false, result: { success: false, message: 'فشل الاتصال' } }));
    }
  };

  /* ─── Device Users ─── */
  const handleOpenUsers = async (deviceId) => {
    try {
      setUsersDialog({ open: true, deviceId, users: [], loading: true });
      const res = await zktecoService.getDeviceUsers(deviceId);
      setUsersDialog(prev => ({ ...prev, users: Array.isArray(res.data) ? res.data : [], loading: false }));
    } catch {
      showSnack('خطأ في جلب مستخدمي الجهاز', 'error');
      setUsersDialog(prev => ({ ...prev, loading: false }));
    }
  };

  /* ─── Sync History ─── */
  const handleOpenSyncHistory = async (deviceId) => {
    try {
      setSyncHistoryDialog({ open: true, deviceId, logs: [], loading: true });
      const res = await zktecoService.getSyncHistory(deviceId);
      setSyncHistoryDialog(prev => ({
        ...prev,
        logs: res.data?.logs || [],
        deviceName: res.data?.deviceName || '',
        loading: false,
      }));
    } catch {
      showSnack('خطأ في جلب سجلات المزامنة', 'error');
      setSyncHistoryDialog(prev => ({ ...prev, loading: false }));
    }
  };

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            <FingerprintIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              إدارة أجهزة البصمة - ZKTeco
            </Typography>
            <Typography variant="body2" color="text.secondary">
              إدارة أجهزة الحضور والانصراف والمزامنة
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<TestIcon />}
            onClick={() => setTestDialog({ open: true, ip: '', port: 4370, result: null, testing: false })}
          >
            اختبار اتصال
          </Button>
          <Button
            variant="outlined"
            startIcon={actionLoading === 'sync-all' ? <CircularProgress size={18} /> : <SyncIcon />}
            onClick={handleSyncAll}
            disabled={!!actionLoading}
          >
            مزامنة الكل
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDeviceDialog({ open: true, mode: 'add', data: { ...INITIAL_DEVICE } })}
          >
            إضافة جهاز
          </Button>
          <IconButton onClick={loadData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الأجهزة', value: stats.totalDevices || 0, icon: <DeviceHubIcon />, gradient: gradients?.primary || 'linear-gradient(135deg, #667eea, #764ba2)' },
          { label: 'متصل', value: stats.online || 0, icon: <OnlineIcon />, gradient: 'linear-gradient(135deg, #11998e, #38ef7d)' },
          { label: 'غير متصل', value: stats.offline || 0, icon: <OfflineIcon />, gradient: 'linear-gradient(135deg, #bdc3c7, #95a5a6)' },
          { label: 'خطأ', value: stats.error || 0, icon: <ErrorIcon />, gradient: 'linear-gradient(135deg, #eb3349, #f45c43)' },
          { label: 'موظفون مربوطون', value: stats.totalMappedUsers || 0, icon: <PeopleIcon />, gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
          { label: 'بصمات اليوم', value: stats.todayBiometricCheckIns || 0, icon: <FingerprintIcon />, gradient: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' },
        ].map(({ label, value, icon, gradient }, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card sx={{ background: gradient, color: '#fff', borderRadius: 3 }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>{label}</Typography>
                    <Typography variant="h5" fontWeight="bold">{value}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36 }}>
                    {icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="بحث عن جهاز بالاسم أو عنوان IP أو الفرع..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Device List */}
      {filtered.length === 0 && !loading ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <DeviceIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">لا توجد أجهزة</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            أضف جهاز ZKTeco جديد للبدء في مزامنة سجلات الحضور
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => setDeviceDialog({ open: true, mode: 'add', data: { ...INITIAL_DEVICE } })}>
            إضافة جهاز
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(device => {
            const st = STATUS_CONFIG[device.status] || STATUS_CONFIG.offline;
            const isConnected = device.isConnected || device.status === 'online';
            return (
              <Grid item xs={12} md={6} lg={4} key={device._id}>
                <Card sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: isConnected ? 'success.light' : 'divider',
                  transition: 'all 0.2s',
                  '&:hover': { boxShadow: 4 },
                }}>
                  <CardContent>
                    {/* Device Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{
                          bgcolor: isConnected ? 'success.light' : 'grey.200',
                          color: isConnected ? 'success.dark' : 'grey.500',
                        }}>
                          <FingerprintIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">{device.deviceName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {device.ipAddress}:{device.port} • {device.model || 'ZKTeco'}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        icon={st.icon}
                        label={st.label}
                        color={st.color}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    {/* Device Info */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {device.location?.branchName && (
                        <Chip label={device.location.branchName} size="small" variant="outlined" />
                      )}
                      {device.serialNumber && (
                        <Chip label={`SN: ${device.serialNumber}`} size="small" variant="outlined" />
                      )}
                      {device.syncSettings?.autoSync && (
                        <Chip icon={<ScheduleIcon />} label="مزامنة تلقائية" size="small" color="info" variant="outlined" />
                      )}
                    </Box>

                    {/* Last Sync Info */}
                    {device.syncSettings?.lastSync && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                        <TimeIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                        آخر مزامنة: {new Date(device.syncSettings.lastSync).toLocaleString('ar-SA')}
                      </Typography>
                    )}

                    {/* User Mapping Count */}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                      <PeopleIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                      المستخدمون المربوطون: {device.userMappings?.filter(m => m.employeeId)?.length || 0}
                    </Typography>

                    <Divider sx={{ mb: 1.5 }} />

                    {/* Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5 }}>
                      <Box>
                        {isConnected ? (
                          <Tooltip title="قطع الاتصال">
                            <IconButton color="error" size="small"
                              disabled={!!actionLoading}
                              onClick={() => handleDisconnect(device._id)}>
                              {actionLoading === `disconnect-${device._id}` ? <CircularProgress size={18} /> : <DisconnectIcon />}
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="اتصال">
                            <IconButton color="success" size="small"
                              disabled={!!actionLoading}
                              onClick={() => handleConnect(device._id)}>
                              {actionLoading === `connect-${device._id}` ? <CircularProgress size={18} /> : <ConnectIcon />}
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="مزامنة">
                          <IconButton color="primary" size="small"
                            disabled={!!actionLoading}
                            onClick={() => handleSync(device._id)}>
                            {actionLoading === `sync-${device._id}` ? <CircularProgress size={18} /> : <SyncIcon />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box>
                        <Tooltip title="المستخدمون">
                          <IconButton size="small" onClick={() => handleOpenUsers(device._id)}>
                            <PeopleIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="سجل المزامنة">
                          <IconButton size="small" onClick={() => handleOpenSyncHistory(device._id)}>
                            <HistoryIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton size="small"
                            onClick={() => setDeviceDialog({ open: true, mode: 'edit', data: { ...device } })}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error"
                            disabled={!!actionLoading}
                            onClick={() => handleDeleteDevice(device._id)}>
                            {actionLoading === `delete-${device._id}` ? <CircularProgress size={18} /> : <DeleteIcon />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* Auto Sync Toggle */}
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={!!device.syncSettings?.autoSync}
                            onChange={(e) => handleAutoSyncToggle(device._id, e.target.checked)}
                          />
                        }
                        label={<Typography variant="caption">مزامنة تلقائية</Typography>}
                      />
                      {device.syncSettings?.autoSync && (
                        <Typography variant="caption" color="text.secondary">
                          كل {device.syncSettings.syncInterval || 15} دقيقة
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          DIALOGS
         ════════════════════════════════════════════════════════════════════════ */}

      {/* Add/Edit Device Dialog */}
      <Dialog
        open={deviceDialog.open}
        onClose={() => setDeviceDialog({ open: false, mode: 'add', data: INITIAL_DEVICE })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {deviceDialog.mode === 'add' ? 'إضافة جهاز جديد' : 'تعديل الجهاز'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="اسم الجهاز"
              required
              fullWidth
              value={deviceDialog.data.deviceName}
              onChange={e => setDeviceDialog(p => ({ ...p, data: { ...p.data, deviceName: e.target.value } }))}
              placeholder="مثال: جهاز البصمة - المدخل الرئيسي"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="عنوان IP"
                required
                fullWidth
                value={deviceDialog.data.ipAddress}
                onChange={e => setDeviceDialog(p => ({ ...p, data: { ...p.data, ipAddress: e.target.value } }))}
                placeholder="192.168.1.100"
              />
              <TextField
                label="المنفذ"
                type="number"
                sx={{ minWidth: 120 }}
                value={deviceDialog.data.port}
                onChange={e => setDeviceDialog(p => ({ ...p, data: { ...p.data, port: parseInt(e.target.value) || 4370 } }))}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="الموديل"
                fullWidth
                value={deviceDialog.data.model}
                onChange={e => setDeviceDialog(p => ({ ...p, data: { ...p.data, model: e.target.value } }))}
              />
              <TextField
                label="الرقم التسلسلي"
                fullWidth
                value={deviceDialog.data.serialNumber}
                onChange={e => setDeviceDialog(p => ({ ...p, data: { ...p.data, serialNumber: e.target.value } }))}
              />
            </Box>
            <Divider><Chip label="الموقع" size="small" /></Divider>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="الفرع"
                fullWidth
                value={deviceDialog.data.location?.branchName || ''}
                onChange={e => setDeviceDialog(p => ({
                  ...p, data: { ...p.data, location: { ...p.data.location, branchName: e.target.value } }
                }))}
              />
              <TextField
                label="الطابق"
                fullWidth
                value={deviceDialog.data.location?.floor || ''}
                onChange={e => setDeviceDialog(p => ({
                  ...p, data: { ...p.data, location: { ...p.data.location, floor: e.target.value } }
                }))}
              />
            </Box>
            <TextField
              label="المنطقة / الوصف"
              fullWidth
              value={deviceDialog.data.location?.area || ''}
              onChange={e => setDeviceDialog(p => ({
                ...p, data: { ...p.data, location: { ...p.data.location, area: e.target.value } }
              }))}
            />
            <TextField
              label="ملاحظات"
              fullWidth
              multiline
              rows={2}
              value={deviceDialog.data.notes || ''}
              onChange={e => setDeviceDialog(p => ({ ...p, data: { ...p.data, notes: e.target.value } }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeviceDialog({ open: false, mode: 'add', data: INITIAL_DEVICE })}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveDevice}
            disabled={!deviceDialog.data.deviceName || !deviceDialog.data.ipAddress || actionLoading === 'save'}
            startIcon={actionLoading === 'save' ? <CircularProgress size={18} /> : null}
          >
            {deviceDialog.mode === 'add' ? 'إضافة' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Connection Dialog */}
      <Dialog
        open={testDialog.open}
        onClose={() => setTestDialog({ open: false, ip: '', port: 4370, result: null, testing: false })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>اختبار الاتصال بجهاز</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="عنوان IP"
              fullWidth
              value={testDialog.ip}
              onChange={e => setTestDialog(p => ({ ...p, ip: e.target.value }))}
              placeholder="192.168.1.100"
            />
            <TextField
              label="المنفذ"
              type="number"
              fullWidth
              value={testDialog.port}
              onChange={e => setTestDialog(p => ({ ...p, port: parseInt(e.target.value) || 4370 }))}
            />
            {testDialog.testing && <LinearProgress />}
            {testDialog.result && (
              <Alert severity={testDialog.result.success ? 'success' : 'error'}>
                {testDialog.result.message || (testDialog.result.success ? 'تم الاتصال بنجاح' : 'فشل الاتصال')}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialog({ open: false, ip: '', port: 4370, result: null, testing: false })}>
            إغلاق
          </Button>
          <Button
            variant="contained"
            onClick={handleTestConnection}
            disabled={!testDialog.ip || testDialog.testing}
            startIcon={testDialog.testing ? <CircularProgress size={18} /> : <TestIcon />}
          >
            اختبار
          </Button>
        </DialogActions>
      </Dialog>

      {/* Device Users Dialog */}
      <Dialog
        open={usersDialog.open}
        onClose={() => setUsersDialog({ open: false, deviceId: null, users: [] })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon />
            مستخدمو الجهاز
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {usersDialog.loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          ) : usersDialog.users.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              لا يوجد مستخدمون في هذا الجهاز
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>معرف الجهاز</TableCell>
                    <TableCell>الاسم (الجهاز)</TableCell>
                    <TableCell>الموظف المربوط</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell align="center">إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usersDialog.users.map((user, i) => (
                    <TableRow key={user.zktecoUserId || i}>
                      <TableCell>{user.zktecoUserId}</TableCell>
                      <TableCell>{user.name || '-'}</TableCell>
                      <TableCell>{user.employeeName || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          icon={user.isMapped ? <LinkIcon /> : <UnlinkIcon />}
                          label={user.isMapped ? 'مربوط' : 'غير مربوط'}
                          size="small"
                          color={user.isMapped ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {user.isMapped ? (
                          <Tooltip title="إلغاء الربط">
                            <IconButton size="small" color="error"
                              onClick={async () => {
                                await zktecoService.unmapDeviceUser(usersDialog.deviceId, user.zktecoUserId);
                                handleOpenUsers(usersDialog.deviceId);
                                showSnack('تم إلغاء الربط');
                              }}>
                              <UnlinkIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="ربط بموظف (قريباً)">
                            <IconButton size="small" color="primary" disabled>
                              <LinkIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUsersDialog({ open: false, deviceId: null, users: [] })}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sync History Dialog */}
      <Dialog
        open={syncHistoryDialog.open}
        onClose={() => setSyncHistoryDialog({ open: false, deviceId: null, logs: [] })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon />
            سجل المزامنة {syncHistoryDialog.deviceName ? `- ${syncHistoryDialog.deviceName}` : ''}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {syncHistoryDialog.loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          ) : syncHistoryDialog.logs.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              لا توجد سجلات مزامنة
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>النوع</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>تم جلبها</TableCell>
                    <TableCell>تمت مزامنتها</TableCell>
                    <TableCell>تم تخطيها</TableCell>
                    <TableCell>فشلت</TableCell>
                    <TableCell>المدة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {syncHistoryDialog.logs.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {log.startedAt ? new Date(log.startedAt).toLocaleString('ar-SA') : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.syncType === 'manual' ? 'يدوي' : log.syncType === 'auto' ? 'تلقائي' : 'مجدول'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={log.status === 'success' ? <SuccessIcon /> : log.status === 'failed' ? <ErrorIcon /> : <WarningIcon />}
                          label={log.status === 'success' ? 'نجاح' : log.status === 'failed' ? 'فشل' : 'جزئي'}
                          color={log.status === 'success' ? 'success' : log.status === 'failed' ? 'error' : 'warning'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{log.recordsFetched || 0}</TableCell>
                      <TableCell>{log.recordsSynced || 0}</TableCell>
                      <TableCell>{log.recordsSkipped || 0}</TableCell>
                      <TableCell>{log.recordsFailed || 0}</TableCell>
                      <TableCell>{log.duration ? `${(log.duration / 1000).toFixed(1)}s` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncHistoryDialog({ open: false, deviceId: null, logs: [] })}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ZKTecoDeviceManagement;
