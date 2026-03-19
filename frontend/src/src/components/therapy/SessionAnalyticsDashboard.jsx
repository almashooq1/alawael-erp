/**
 * Session Analytics Dashboard Component
 * لوحة تحكم تحليلات الجلسات
 *
 * Comprehensive analytics and reporting for therapy sessions
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import {
  Download,
  TrendingUp,
  CheckCircle,
  Clock,
  WarningAmber
} from '@mui/icons-material';
import axios from 'axios';
import { format, subMonths, subDays } from 'date-fns';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
});

const COLORS = {
  completed: '#4CAF50',
  scheduled: '#2196F3',
  cancelled: '#F44336',
  noShow: '#FF9800',
  pending: '#FFC107'
};

// ============================================
// SESSION ANALYTICS DASHBOARD
// ============================================

export default function SessionAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [dateRange, setDateRange] = useState('month');
  const [analytics, setAnalytics] = useState({
    overview: {},
    trends: [],
    breakdown: {},
    therapistComparison: [],
    goalAchievementRate: [],
    sessionDurationAnalysis: [],
    patientRetention: {},
    topPerformers: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      let startDate, endDate = new Date();
      switch (dateRange) {
        case 'week':
          startDate = subDays(endDate, 7);
          break;
        case 'month':
          startDate = subMonths(endDate, 1);
          break;
        case 'quarter':
          startDate = subMonths(endDate, 3);
          break;
        case 'year':
          startDate = subMonths(endDate, 12);
          break;
        default:
          startDate = subMonths(endDate, 1);
      }

      const response = await api.get('/analytics/session-analytics', {
        params: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd')
        }
      });

      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const response = await api.get('/analytics/session-report/export', {
        params: {
          format: 'pdf',
          startDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd')
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `session-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert('Failed to download report');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const { overview, trends, breakdown, therapistComparison, goalAchievementRate, topPerformers } = analytics;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Session Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="quarter">Last Quarter</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={downloadReport}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography color="textSecondary" variant="body2">
              Total Sessions
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              {overview.totalSessions || 0}
            </Typography>
            <Chip
              icon={<TrendingUp />}
              label={`${overview.sessionsTrend || 0}% vs last period`}
              size="small"
              color={overview.sessionsTrend >= 0 ? 'success' : 'error'}
              sx={{ mt: 1 }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography color="textSecondary" variant="body2">
              Completion Rate
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: COLORS.completed }}>
              {(overview.completionRate || 0).toFixed(1)}%
            </Typography>
            <Typography variant="caption">
              {overview.completedSessions || 0} of {overview.totalSessions || 0}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography color="textSecondary" variant="body2">
              Patient Satisfaction
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#4CAF50' }}>
              {(overview.avgRating || 0).toFixed(2)}/5.0
            </Typography>
            <Typography variant="caption">
              Based on {overview.ratingCount || 0} ratings
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography color="textSecondary" variant="body2">
              No-Show Rate
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: COLORS.noShow }}>
              {(overview.noShowRate || 0).toFixed(1)}%
            </Typography>
            <Typography variant="caption">
              {overview.noShowCount || 0} sessions
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
        <Tab label="Trends" />
        <Tab label="Status Breakdown" />
        <Tab label="Therapist Comparison" />
        <Tab label="Goal Achievement" />
        <Tab label="Performance Rankings" />
      </Tabs>

      {/* Tab 1: Trends */}
      {tabValue === 0 && (
        <Card>
          <CardHeader title="Session Trends Over Time" />
          <CardContent>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="scheduled" stroke={COLORS.scheduled} />
                  <Line type="monotone" dataKey="completed" stroke={COLORS.completed} />
                  <Line type="monotone" dataKey="cancelled" stroke={COLORS.cancelled} />
                  <Line type="monotone" dataKey="noShow" stroke={COLORS.noShow} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Typography>No data available</Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Status Breakdown */}
      {tabValue === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Sessions by Status" />
              <CardContent>
                {breakdown.byStatus ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: breakdown.byStatus.completed || 0 },
                          { name: 'Scheduled', value: breakdown.byStatus.scheduled || 0 },
                          { name: 'Cancelled', value: breakdown.byStatus.cancelled || 0 },
                          { name: 'No-Show', value: breakdown.byStatus.noShow || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill={COLORS.completed} />
                        <Cell fill={COLORS.scheduled} />
                        <Cell fill={COLORS.cancelled} />
                        <Cell fill={COLORS.noShow} />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography>No data</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Status Details" />
              <CardContent>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><Chip label="Completed" color="success" size="small" /></TableCell>
                      <TableCell align="right">{breakdown.byStatus?.completed || 0}</TableCell>
                      <TableCell align="right">
                        {breakdown.byStatus?.total > 0
                          ? ((breakdown.byStatus.completed / breakdown.byStatus.total) * 100).toFixed(1)
                          : 0}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Chip label="Scheduled" color="info" size="small" /></TableCell>
                      <TableCell align="right">{breakdown.byStatus?.scheduled || 0}</TableCell>
                      <TableCell align="right">
                        {breakdown.byStatus?.total > 0
                          ? ((breakdown.byStatus.scheduled / breakdown.byStatus.total) * 100).toFixed(1)
                          : 0}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Chip label="Cancelled" color="error" size="small" /></TableCell>
                      <TableCell align="right">{breakdown.byStatus?.cancelled || 0}</TableCell>
                      <TableCell align="right">
                        {breakdown.byStatus?.total > 0
                          ? ((breakdown.byStatus.cancelled / breakdown.byStatus.total) * 100).toFixed(1)
                          : 0}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Chip label="No-Show" color="warning" size="small" /></TableCell>
                      <TableCell align="right">{breakdown.byStatus?.noShow || 0}</TableCell>
                      <TableCell align="right">
                        {breakdown.byStatus?.total > 0
                          ? ((breakdown.byStatus.noShow / breakdown.byStatus.total) * 100).toFixed(1)
                          : 0}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Therapist Comparison */}
      {tabValue === 2 && (
        <Card>
          <CardHeader title="Therapist Performance Comparison" />
          <CardContent>
            {therapistComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={therapistComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sessions" fill={COLORS.scheduled} />
                  <Bar dataKey="completed" fill={COLORS.completed} />
                  <Bar dataKey="rating" fill="#FFD700" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography>No data</Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Goal Achievement */}
      {tabValue === 3 && (
        <Card>
          <CardHeader title="Patient Goal Achievement Rate" />
          <CardContent>
            {goalAchievementRate.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={goalAchievementRate}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#4CAF50" />
                    <Cell fill="#FFC107" />
                    <Cell fill="#F44336" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography>No data</Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Performance Rankings */}
      {tabValue === 4 && (
        <Card>
          <CardHeader title="Top Performers" />
          <CardContent>
            {topPerformers.length > 0 ? (
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>Rank</TableCell>
                    <TableCell>Therapist</TableCell>
                    <TableCell align="right">Sessions</TableCell>
                    <TableCell align="right">Completion %</TableCell>
                    <TableCell align="right">Avg Rating</TableCell>
                    <TableCell align="right">Goals Met %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topPerformers.map((therapist, index) => (
                    <TableRow key={therapist._id}>
                      <TableCell sx={{ fontWeight: 'bold' }}>#{index + 1}️</TableCell>
                      <TableCell>{therapist.name}</TableCell>
                      <TableCell align="right">{therapist.totalSessions}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${(therapist.completionRate || 0).toFixed(1)}%`}
                          size="small"
                          color={therapist.completionRate >= 90 ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">{(therapist.avgRating || 0).toFixed(2)}/5</TableCell>
                      <TableCell align="right">{(therapist.goalAchievementRate || 0).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography>No data</Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
