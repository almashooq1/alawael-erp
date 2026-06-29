import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import performanceService from '../../../services/performance.service';

const SEVERITY_COLORS = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
};

const TYPE_LABELS = {
  'web-vital': 'Web Vital',
  'lighthouse-score': 'Lighthouse Score',
  'pagespeed-api-failed': 'PageSpeed API',
  'resource-budget': 'Resource Budget',
  'backend-latency': 'Backend Latency',
  'backend-error-rate': 'Backend Error Rate',
  custom: 'Custom',
};

export default function PerformanceAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await performanceService.getAlerts({ status: filter, limit: 50 });
      setAlerts(response.data?.data?.alerts || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const handleStatusChange = async (id, status) => {
    try {
      await performanceService.updateAlert(id, status);
      await fetchAlerts();
    } catch (err) {
      console.error('Failed to update alert:', err);
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          تنبيهات الأداء
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>الحالة</InputLabel>
          <Select value={filter} label="الحالة" onChange={e => setFilter(e.target.value)}>
            <MenuItem value="open">مفتوحة</MenuItem>
            <MenuItem value="acknowledged">مُقرّ بها</MenuItem>
            <MenuItem value="resolved">تم الحل</MenuItem>
            <MenuItem value="ignored">متجاهلة</MenuItem>
            <MenuItem value="">الكل</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      ) : alerts.length > 0 ? (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الخطورة</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>العنوان</TableCell>
                <TableCell>القيمة</TableCell>
                <TableCell>التاريخ</TableCell>
                <TableCell>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map(alert => (
                <TableRow key={alert._id}>
                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        alert.severity === 'critical'
                          ? 'حرج'
                          : alert.severity === 'warning'
                            ? 'تحذير'
                            : 'معلومة'
                      }
                      color={SEVERITY_COLORS[alert.severity] || 'default'}
                    />
                  </TableCell>
                  <TableCell>{TYPE_LABELS[alert.type] || alert.type}</TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>{alert.title}</TableCell>
                  <TableCell>
                    {alert.metricValue !== undefined ? `${alert.metricValue}` : '-'}
                  </TableCell>
                  <TableCell>{new Date(alert.triggeredAt).toLocaleString('ar-SA')}</TableCell>
                  <TableCell>
                    {alert.status === 'open' && (
                      <>
                        <IconButton
                          size="small"
                          title="إقرار"
                          onClick={() => handleStatusChange(alert._id, 'acknowledged')}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          title="حل"
                          onClick={() => handleStatusChange(alert._id, 'resolved')}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">لا توجد تنبيهات مطابقة.</Typography>
        </Paper>
      )}
    </Box>
  );
}
