import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Box,
  Grid,
  LinearProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import MonitoringService from '../services/monitoringService';
import '../styles/PerformanceDashboard.css';

const PerformanceDashboard = () => {
  // State
  const [tabIndex, setTabIndex] = useState(0);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [apiMetrics, setApiMetrics] = useState(null);
  const [errorRate, setErrorRate] = useState(null);
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [uptime, setUptime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertFormData, setAlertFormData] = useState({
    name: '',
    metric_type: 'cpu_usage',
    condition: 'greater_than',
    threshold: 80,
    action: 'notification',
    enabled: true,
  });

  // Load data
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [system, api, error, errorLogs, alertsList, uptimeData] = await Promise.all([
        MonitoringService.getSystemMetrics(),
        MonitoringService.getApiMetrics(60),
        MonitoringService.getErrorRate(60),
        MonitoringService.getErrorLogs(20),
        MonitoringService.getAlerts(),
        MonitoringService.getUptime(),
      ]);

      setSystemMetrics(system);
      setApiMetrics(api);
      setErrorRate(error);
      setLogs(errorLogs.logs || []);
      setAlerts(alertsList.alerts || []);
      setUptime(uptimeData);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    try {
      const result = await MonitoringService.createAlertRule(alertFormData);
      if (result.id) {
        alert('تم إنشاء قاعدة التنبيه بنجاح');
        setShowAlertDialog(false);
        setAlertFormData({
          name: '',
          metric_type: 'cpu_usage',
          condition: 'greater_than',
          threshold: 80,
          action: 'notification',
          enabled: true,
        });
        loadData();
      }
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  if (loading && !systemMetrics) {
    return (
      <Box className="performance-dashboard-container">
        <Box className="loading">
          <CircularProgress size={60} />
          <p>جاري تحميل بيانات المراقبة...</p>
        </Box>
      </Box>
    );
  }

  // Colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box className="performance-dashboard-container">
      <div className="dashboard-header">
        <h1>📊 لوحة تحكم مراقبة الأداء</h1>
        <div className="header-controls">
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowAlertDialog(true)}
            className="btn-create-alert"
          >
            + إنشاء تنبيه
          </Button>
          <Button
            variant="outlined"
            onClick={loadData}
            className="btn-refresh"
          >
            🔄 تحديث الآن
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Box className="status-cards">
        <Card className="status-card">
          <CardContent>
            <h3>حالة النظام العام</h3>
            <Chip
              label={MonitoringService.getStatusText('healthy')}
              style={{
                backgroundColor: MonitoringService.getStatusColor('healthy'),
                color: 'white',
                fontSize: '16px',
                padding: '10px 20px',
              }}
            />
          </CardContent>
        </Card>

        <Card className="status-card">
          <CardContent>
            <h3>وقت التشغيل</h3>
            {uptime && (
              <p className="uptime-text">
                {uptime.uptime_hours}س {uptime.uptime_minutes}د
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="status-card">
          <CardContent>
            <h3>معدل الأخطاء</h3>
            {errorRate && (
              <p className="error-rate-text">
                {errorRate.error_rate_percent.toFixed(2)}%
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="status-card">
          <CardContent>
            <h3>إجمالي الطلبات</h3>
            {apiMetrics && (
              <p className="requests-text">
                {Math.round(apiMetrics.request_count)}
              </p>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Paper className="tabs-container">
        <Tabs
          value={tabIndex}
          onChange={(e, newValue) => setTabIndex(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="📈 مقاييس النظام" />
          <Tab label="⚡ أداء API" />
          <Tab label="❌ الأخطاء" />
          <Tab label="⚠️ التنبيهات" />
          <Tab label="📝 السجلات" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box className="tab-content">
        {/* System Metrics Tab */}
        {tabIndex === 0 && (
          <Grid container spacing={3}>
            {systemMetrics && (
              <>
                {/* CPU */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="استخدام CPU" />
                    <CardContent>
                      <Box className="metric-display">
                        <h3>{systemMetrics.cpu.usage_percent.toFixed(1)}%</h3>
                        <LinearProgress
                          variant="determinate"
                          value={systemMetrics.cpu.usage_percent}
                          className="metric-progress"
                        />
                        <p className="metric-status">
                          الحالة: <Chip
                            size="small"
                            label={MonitoringService.getStatusText(systemMetrics.cpu.status)}
                            style={{
                              backgroundColor: MonitoringService.getStatusColor(
                                systemMetrics.cpu.status
                              ),
                              color: 'white',
                            }}
                          />
                        </p>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Memory */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="استخدام الذاكرة" />
                    <CardContent>
                      <Box className="metric-display">
                        <h3>{systemMetrics.memory.usage_percent.toFixed(1)}%</h3>
                        <LinearProgress
                          variant="determinate"
                          value={systemMetrics.memory.usage_percent}
                          className="metric-progress"
                        />
                        <p className="metric-info">
                          المتاح: {systemMetrics.memory.available_mb.toFixed(0)} MB
                        </p>
                        <p className="metric-status">
                          الحالة: <Chip
                            size="small"
                            label={MonitoringService.getStatusText(
                              systemMetrics.memory.status
                            )}
                            style={{
                              backgroundColor: MonitoringService.getStatusColor(
                                systemMetrics.memory.status
                              ),
                              color: 'white',
                            }}
                          />
                        </p>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Disk */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="استخدام القرص" />
                    <CardContent>
                      <Box className="metric-display">
                        <h3>{systemMetrics.disk.usage_percent.toFixed(1)}%</h3>
                        <LinearProgress
                          variant="determinate"
                          value={systemMetrics.disk.usage_percent}
                          className="metric-progress"
                        />
                        <p className="metric-info">
                          المتاح: {systemMetrics.disk.free_gb.toFixed(2)} GB
                        </p>
                        <p className="metric-status">
                          الحالة: <Chip
                            size="small"
                            label={MonitoringService.getStatusText(systemMetrics.disk.status)}
                            style={{
                              backgroundColor: MonitoringService.getStatusColor(
                                systemMetrics.disk.status
                              ),
                              color: 'white',
                            }}
                          />
                        </p>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Network Stats */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="احصائيات الشبكة" />
                    <CardContent>
                      <Box className="network-stats">
                        <p>
                          <strong>البيانات المرسلة:</strong>{' '}
                          {(systemMetrics.network.bytes_sent / (1024 * 1024 * 1024)).toFixed(2)} GB
                        </p>
                        <p>
                          <strong>البيانات المستقبلة:</strong>{' '}
                          {(systemMetrics.network.bytes_recv / (1024 * 1024 * 1024)).toFixed(2)} GB
                        </p>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
          </Grid>
        )}

        {/* API Performance Tab */}
        {tabIndex === 1 && (
          <Grid container spacing={3}>
            {apiMetrics && (
              <>
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="ملخص أداء API" />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={2}>
                          <Box className="metric-box">
                            <p className="metric-label">المتوسط (ms)</p>
                            <p className="metric-value">
                              {apiMetrics.avg_response_time_ms.toFixed(2)}
                            </p>
                          </Box>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Box className="metric-box">
                            <p className="metric-label">الأدنى (ms)</p>
                            <p className="metric-value">
                              {apiMetrics.min_response_time_ms.toFixed(2)}
                            </p>
                          </Box>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Box className="metric-box">
                            <p className="metric-label">الأعلى (ms)</p>
                            <p className="metric-value">
                              {apiMetrics.max_response_time_ms.toFixed(2)}
                            </p>
                          </Box>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Box className="metric-box">
                            <p className="metric-label">P95 (ms)</p>
                            <p className="metric-value">
                              {apiMetrics.p95_response_time_ms.toFixed(2)}
                            </p>
                          </Box>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Box className="metric-box">
                            <p className="metric-label">P99 (ms)</p>
                            <p className="metric-value">
                              {apiMetrics.p99_response_time_ms.toFixed(2)}
                            </p>
                          </Box>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Box className="metric-box">
                            <p className="metric-label">الطلبات</p>
                            <p className="metric-value">
                              {Math.round(apiMetrics.request_count)}
                            </p>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
          </Grid>
        )}

        {/* Error Tab */}
        {tabIndex === 2 && (
          <Grid container spacing={3}>
            {errorRate && (
              <>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardHeader title="معدل الأخطاء" />
                    <CardContent>
                      <Box className="error-summary">
                        <p className="error-rate">
                          {errorRate.error_rate_percent.toFixed(2)}%
                        </p>
                        <p className="error-details">
                          {errorRate.total_errors} خطأ من {errorRate.total_requests} طلب
                        </p>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Card>
                    <CardHeader title="توزيع الأخطاء حسب الحالة" />
                    <CardContent>
                      {errorRate.errors_by_status && Object.keys(errorRate.errors_by_status).length > 0 ? (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>رمز الحالة</TableCell>
                              <TableCell align="right">عدد الأخطاء</TableCell>
                              <TableCell align="right">النسبة</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(errorRate.errors_by_status).map(([status, count]) => (
                              <TableRow key={status}>
                                <TableCell>{status}</TableCell>
                                <TableCell align="right">{count}</TableCell>
                                <TableCell align="right">
                                  {((count / errorRate.total_errors) * 100).toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <Alert severity="success">لا توجد أخطاء في الفترة المحددة ✓</Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
          </Grid>
        )}

        {/* Alerts Tab */}
        {tabIndex === 3 && (
          <Grid container spacing={3}>
            {alerts.length > 0 ? (
              <Grid item xs={12}>
                <Card>
                  <CardHeader title={`التنبيهات النشطة (${alerts.length})`} />
                  <CardContent>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>اسم التنبيه</TableCell>
                          <TableCell>المقياس</TableCell>
                          <TableCell>الشرط</TableCell>
                          <TableCell>القيمة الحدية</TableCell>
                          <TableCell>الحالة</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {alerts.map((alert) => (
                          <TableRow key={alert.id}>
                            <TableCell>{alert.name}</TableCell>
                            <TableCell>{alert.metric_type}</TableCell>
                            <TableCell>{alert.condition}</TableCell>
                            <TableCell>{alert.threshold}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={alert.enabled ? 'مفعل' : 'معطل'}
                                color={alert.enabled ? 'success' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            ) : (
              <Grid item xs={12}>
                <Alert severity="info">لا توجد تنبيهات مُنشأة حالياً</Alert>
              </Grid>
            )}
          </Grid>
        )}

        {/* Logs Tab */}
        {tabIndex === 4 && (
          <Grid container spacing={3}>
            {logs.length > 0 ? (
              <Grid item xs={12}>
                <Card>
                  <CardHeader title={`سجلات الأخطاء (${logs.length})`} />
                  <CardContent>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>الطريقة</TableCell>
                          <TableCell>المسار</TableCell>
                          <TableCell>رمز الحالة</TableCell>
                          <TableCell>وقت الاستجابة (ms)</TableCell>
                          <TableCell>الوقت</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id} className="error-log-row">
                            <TableCell>{log.method}</TableCell>
                            <TableCell>{log.path}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={log.status_code}
                                color={log.status_code >= 500 ? 'error' : 'warning'}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{log.response_time_ms.toFixed(2)}</TableCell>
                            <TableCell>
                              {new Date(log.timestamp).toLocaleTimeString('ar-SA')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            ) : (
              <Grid item xs={12}>
                <Alert severity="success">لا توجد أخطاء في السجلات ✓</Alert>
              </Grid>
            )}
          </Grid>
        )}
      </Box>

      {/* Create Alert Dialog */}
      <Dialog open={showAlertDialog} onClose={() => setShowAlertDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء قاعدة تنبيه جديدة</DialogTitle>
        <DialogContent>
          <Box className="alert-form">
            <TextField
              fullWidth
              label="اسم التنبيه"
              value={alertFormData.name}
              onChange={(e) =>
                setAlertFormData({ ...alertFormData, name: e.target.value })
              }
              margin="normal"
            />

            <Select
              fullWidth
              label="نوع المقياس"
              value={alertFormData.metric_type}
              onChange={(e) =>
                setAlertFormData({
                  ...alertFormData,
                  metric_type: e.target.value,
                })
              }
              margin="normal"
            >
              <MenuItem value="cpu_usage">استخدام CPU</MenuItem>
              <MenuItem value="memory_usage">استخدام الذاكرة</MenuItem>
              <MenuItem value="disk_usage">استخدام القرص</MenuItem>
              <MenuItem value="error_rate">معدل الأخطاء</MenuItem>
              <MenuItem value="api_response_time">وقت استجابة API</MenuItem>
            </Select>

            <Select
              fullWidth
              label="الشرط"
              value={alertFormData.condition}
              onChange={(e) =>
                setAlertFormData({
                  ...alertFormData,
                  condition: e.target.value,
                })
              }
              margin="normal"
            >
              <MenuItem value="greater_than">أكبر من</MenuItem>
              <MenuItem value="less_than">أقل من</MenuItem>
            </Select>

            <TextField
              fullWidth
              label="القيمة الحدية"
              type="number"
              value={alertFormData.threshold}
              onChange={(e) =>
                setAlertFormData({
                  ...alertFormData,
                  threshold: parseFloat(e.target.value),
                })
              }
              margin="normal"
            />

            <Select
              fullWidth
              label="الإجراء"
              value={alertFormData.action}
              onChange={(e) =>
                setAlertFormData({
                  ...alertFormData,
                  action: e.target.value,
                })
              }
              margin="normal"
            >
              <MenuItem value="notification">إشعار</MenuItem>
              <MenuItem value="email">بريد إلكتروني</MenuItem>
              <MenuItem value="log">تسجيل</MenuItem>
            </Select>

            <FormControlLabel
              control={
                <Switch
                  checked={alertFormData.enabled}
                  onChange={(e) =>
                    setAlertFormData({
                      ...alertFormData,
                      enabled: e.target.checked,
                    })
                  }
                />
              }
              label="مفعل"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAlertDialog(false)}>إلغاء</Button>
          <Button onClick={handleCreateAlert} variant="contained" color="primary">
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PerformanceDashboard;
