/**
 * Barcode Statistics Dashboard Component
 * Display analytics and statistics for all barcodes
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  CircularProgress,
  Alert,
  PieChart,
  BarChart,
  LineChart,
  ProgressBar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
  Stack,
  Paper,
} from '@mui/material';
import {
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material/';
import BarcodeService from '../../services/BarcodeService';

const StatCard = ({ title, value, unit = '', color = 'primary', icon: Icon }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
            {unit && <Typography color="textSecondary">{unit}</Typography>}
          </Box>
        </Box>
        {Icon && (
          <Box sx={{ color: `${color}.main`, opacity: 0.3 }}>
            <Icon sx={{ fontSize: 60 }} />
          </Box>
        )}
      </Box>
    </CardContent>
  </Card>
);

const BarcodeStatistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await BarcodeService.getStatistics();
      setStats(result.statistics);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to load statistics'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Alert severity="info">
        No statistics available. Generate some barcodes first.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {message.text && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {/* Key Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Barcodes"
            value={stats.totalBarcodes || 0}
            color="primary"
            icon={BarChartIcon}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Barcodes"
            value={stats.activeBarcodes || 0}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Scans"
            value={stats.totalScans || 0}
            color="info"
            icon={TrendingUpIcon}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Inactive Barcodes"
            value={stats.inactiveBarcodes || 0}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Detailed Statistics */}
      <Grid container spacing={3}>
        {/* Status Distribution */}
        {stats.statusDistribution && stats.statusDistribution.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Status Distribution" />
              <CardContent>
                <Stack spacing={2}>
                  {stats.statusDistribution.map((item) => (
                    <Box key={item.status}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">{item.status}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {item.count} ({Math.round((item.count / stats.totalBarcodes) * 100)}%)
                        </Typography>
                      </Box>
                      <Box sx={{ height: 8, backgroundColor: '#e0e0e0', borderRadius: 4 }}>
                        <Box
                          sx={{
                            height: '100%',
                            borderRadius: 4,
                            backgroundColor: item.status === 'ACTIVE' ? '#4caf50' :
                              item.status === 'INACTIVE' ? '#ff9800' : '#9e9e9e',
                            width: `${(item.count / stats.totalBarcodes) * 100}%`
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Barcode Type Distribution */}
        {stats.typeDistribution && stats.typeDistribution.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Barcode Type Distribution" />
              <CardContent>
                <Stack spacing={1}>
                  {stats.typeDistribution.map((item) => (
                    <Box key={item.type} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body2">{item.type}</Typography>
                      <Chip label={`${item.count} (${Math.round((item.count / stats.totalBarcodes) * 100)}%)`} size="small" />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Entity Type Distribution */}
        {stats.entityTypeDistribution && stats.entityTypeDistribution.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Entity Type Distribution" />
              <CardContent>
                <Stack spacing={1}>
                  {stats.entityTypeDistribution.map((item) => (
                    <Box key={item.entityType} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body2">{item.entityType}</Typography>
                      <Chip label={`${item.count}`} size="small" />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Scan Trends */}
        {stats.scanTrends && stats.scanTrends.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Most Scanned Barcodes" />
              <CardContent>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell><strong>Barcode</strong></TableCell>
                        <TableCell align="right"><strong>Scans</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.scanTrends.slice(0, 5).map((item) => (
                        <TableRow key={item.code} hover>
                          <TableCell>{item.code}</TableCell>
                          <TableCell align="right">
                            <Chip label={item.totalScans} size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Quick Insights */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Quick Insights" />
            <CardContent>
              <Stack spacing={2}>
                {stats.averageScansPerBarcode && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                    <Typography variant="body2">Average Scans Per Barcode</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {stats.averageScansPerBarcode.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                {stats.activeBarcodes !== undefined && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, backgroundColor: '#f3e5f5', borderRadius: 1 }}>
                    <Typography variant="body2">Active Rate</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {Math.round((stats.activeBarcodes / stats.totalBarcodes) * 100)}%
                    </Typography>
                  </Box>
                )}

                {stats.mostUsedType && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, backgroundColor: '#e8f5e9', borderRadius: 1 }}>
                    <Typography variant="body2">Most Used Type</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {stats.mostUsedType}
                    </Typography>
                  </Box>
                )}

                {stats.mostUsedEntityType && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, backgroundColor: '#fff3e0', borderRadius: 1 }}>
                    <Typography variant="body2">Most Used Entity</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {stats.mostUsedEntityType}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BarcodeStatistics;
