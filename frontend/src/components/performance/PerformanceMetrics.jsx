import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Speed as SpeedIcon } from '@mui/icons-material';
import { fetchCacheStats, runLoadTest } from '../../store/slices/performanceSlice';

const PerformanceMetrics = () => {
  const dispatch = useDispatch();
  const { cacheStats, metrics, testing } = useSelector((state) => state.performance);

  useEffect(() => {
    dispatch(fetchCacheStats());
  }, [dispatch]);

  const handleRunTest = () => {
    dispatch(
      runLoadTest({
        duration: 60,
        concurrentUsers: 100,
      })
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">مقاييس الأداء</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SpeedIcon />}
          disabled={testing}
          onClick={handleRunTest}
        >
          {testing ? 'جاري الاختبار...' : 'اختبار الأداء'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Cache Hit Rate */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                معدل Cache Hit
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={cacheStats?.hitRate || 0}
                  />
                </Box>
                <Typography>{cacheStats?.hitRate || 0}%</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Query Performance */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                متوسط سرعة الاستعلام
              </Typography>
              <Typography variant="h6">
                {metrics?.avgQueryTime || 0} ms
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Response Time */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                وقت الاستجابة
              </Typography>
              <Typography variant="h6">
                {metrics?.responseTime || 0} ms
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Optimization Recommendations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                توصيات التحسين
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell>التوصية</TableCell>
                      <TableCell>التأثير</TableCell>
                      <TableCell>الأولوية</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>تفعيل جداول الفهرسة الإضافية</TableCell>
                      <TableCell>15% تحسن</TableCell>
                      <TableCell>عالية</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>تحسين استعلامات قاعدة البيانات</TableCell>
                      <TableCell>20% تحسن</TableCell>
                      <TableCell>عالية</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>تفعيل CDN للملفات الثابتة</TableCell>
                      <TableCell>30% تحسن</TableCell>
                      <TableCell>متوسطة</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PerformanceMetrics;
