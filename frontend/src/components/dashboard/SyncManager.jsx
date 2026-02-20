/**
 * Sync Manager Component
 * Controls and monitors data synchronization
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Box,
  Button,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Refresh,
  PlayArrow,
  Stop,
  CheckCircle,
  Error,
  Schedule,
  Sync,
  Info,
} from '@mui/icons-material';

const SyncManager = ({
  syncStatus,
  onStartSync,
  onStopSync,
  onManualSync,
  loading = false,
  error = null,
}) => {
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState(null);

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            فشل في تحميل حالة المزامنة: {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  const {
    enabled = false,
    interval = 60000,
    nextSync = new Date().toISOString(),
    lastSync = new Date().toISOString(),
    syncCount = 0,
    lastError = null,
  } = syncStatus || {};

  const getLastSyncTime = () => {
    if (!lastSync) return 'لم تتم';
    const diff = Date.now() - new Date(lastSync).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'للتو';
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    if (hours < 24) return `قبل ${hours} ساعة`;
    return `قبل ${Math.floor(hours / 24)} يوم`;
  };

  const getNextSyncTime = () => {
    if (!nextSync || !enabled) return 'غير محدد';
    const diff = new Date(nextSync).getTime() - Date.now();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes < 1) return `خلال ${seconds} ثانية`;
    if (minutes < 60) return `خلال ${minutes} دقيقة`;
    return `خلال ${Math.floor(minutes / 60)} ساعة`;
  };

  const handleConfirmAction = (action) => {
    setDialogAction(action);
    setConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (dialogAction === 'start') {
      onStartSync();
    } else if (dialogAction === 'stop') {
      onStopSync();
    } else if (dialogAction === 'manual') {
      onManualSync();
    }
    setConfirmDialog(false);
    setDialogAction(null);
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {/* Status Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, background: 'linear-gradient(135deg, #2196f3 0%, #2196f3cc 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {enabled ? <CheckCircle /> : <Info />}
              <Typography variant="caption">حالة المزامنة</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {enabled ? 'نشطة' : 'معطلة'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, background: 'linear-gradient(135deg, #4caf50 0%, #4caf50cc 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Schedule />
              <Typography variant="caption">آخر مزامنة</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {getLastSyncTime()}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, background: 'linear-gradient(135deg, #ff9800 0%, #ff9800cc 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Sync />
              <Typography variant="caption">المزامنة التالية</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {getNextSyncTime()}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, background: 'linear-gradient(135deg, #9c27b0 0%, #9c27b0cc 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Refresh />
              <Typography variant="caption">عدد المزامنات</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {syncCount}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Control Card */}
      <Card>
        <CardHeader
          title="تحكم المزامنة"
          action={
            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleConfirmAction('start');
                    } else {
                      handleConfirmAction('stop');
                    }
                  }}
                />
              }
              label={enabled ? 'المزامنة مفعلة' : 'المزامنة معطلة'}
            />
          }
        />
        <CardContent>
          {lastError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              آخر خطأ: {lastError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                فترة المزامنة الآلية
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {Math.round(interval / 1000)} ثانية
              </Typography>
              <LinearProgress
                variant="determinate"
                value={70}
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                حالة الاتصال
              </Typography>
              <Chip
                icon={<CheckCircle />}
                label="متصل"
                color="success"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                آخر اختبار اتصال
              </Typography>
              <Chip
                label={new Date().toLocaleTimeString('ar-SA')}
                variant="outlined"
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={() => handleConfirmAction('start')}
              disabled={enabled}
            >
              بدء المزامنة
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<Stop />}
              onClick={() => handleConfirmAction('stop')}
              disabled={!enabled}
            >
              إيقاف المزامنة
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => handleConfirmAction('manual')}
            >
              مزامنة يدوية
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader title="سجل المزامنة" />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>الوقت</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="right">المدة</TableCell>
                  <TableCell>التفاصيل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  { time: '2:30 ص', type: 'آلية', status: 'نجح', duration: '2.5 ثانية', details: '125 عنصر محدثة' },
                  { time: '1:30 ص', type: 'آلية', status: 'نجح', duration: '2.3 ثانية', details: '98 عنصر محدثة' },
                  { time: '12:30 ص', type: 'يدوية', status: 'نجح', duration: '3.1 ثانية', details: '256 عنصر محدثة' },
                  { time: '11:30 م', type: 'آلية', status: 'نجح', duration: '2.4 ثانية', details: '112 عنصر محدثة' },
                ].map((record, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{record.time}</TableCell>
                    <TableCell>{record.type}</TableCell>
                    <TableCell>
                      <Chip
                        icon={<CheckCircle />}
                        label={record.status}
                        size="small"
                        color="success"
                      />
                    </TableCell>
                    <TableCell align="right">{record.duration}</TableCell>
                    <TableCell>
                      <Typography variant="caption">{record.details}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>تأكيد الإجراء</DialogTitle>
        <DialogContent>
          <Typography>
            {dialogAction === 'start' && 'هل تريد بدء المزامنة الآلية للبيانات؟'}
            {dialogAction === 'stop' && 'هل تريد إيقاف المزامنة الآلية؟'}
            {dialogAction === 'manual' && 'هل تريد بدء مزامنة يدوية الآن؟'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>إلغاء</Button>
          <Button onClick={handleConfirm} variant="contained" color="primary">
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SyncManager;
