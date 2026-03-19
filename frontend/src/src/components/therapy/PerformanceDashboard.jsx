/**
 * Performance Dashboard Component
 * مكون لوحة تحكم الأداء
 *
 * Displays therapist and clinic-wide performance metrics
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
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Alert,
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
  Cell
} from '@mui/material';
import { TrendingUp, Assessment, People, CheckCircle } from '@mui/icons-material';
import axios from 'axios';
import { format, subMonths } from 'date-fns';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
});

const COLORS = ['#4CAF50', '#FFC107', '#F44336', '#2196F3'];

// ============================================
// STAT CARD COMPONENT
// ============================================

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Icon sx={{ fontSize: 40, color, opacity: 0.3 }} />
      </Box>
    </CardContent>
  </Card>
);

// ============================================
// PERFORMANCE DASHBOARD
// ============================================

export default function PerformanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [metrics, setMetrics] = useState({
    clinicMetrics: {},
    therapistMetrics: [],
    monthlyTrend: [],
    documentationStats: {},
    noShowTrend: []
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch clinic-wide metrics
      const clinicResponse = await api.get('/analytics/clinic-metrics', {
        params: {
          startDate: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
          endDate: format(new Date(), 'yyyy-MM-dd')
        }
      });

      // Fetch therapist metrics
      const therapistResponse = await api.get('/analytics/therapist-metrics', {
        params: {
          limit: 10
        }
      });

      // Fetch trends
      const trendsResponse = await api.get('/analytics/trends', {
        params: {
          period: 'monthly',
          months: 6
        }
      });

      // Fetch documentation stats
      const docResponse = await api.get('/analytics/documentation-stats');

      setMetrics({
        clinicMetrics: clinicResponse.data.data,
        therapistMetrics: therapistResponse.data.data,
        monthlyTrend: trendsResponse.data.data.trend,
        documentationStats: docResponse.data.data,
        noShowTrend: trendsResponse.data.data.noShowTrend
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load metrics');
      console.error('Metrics error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const { clinicMetrics, therapistMetrics, monthlyTrend, documentationStats, noShowTrend } = metrics;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Performance Dashboard
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Key Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Sessions"
            value={clinicMetrics.totalSessions || 0}
            icon={Assessment}
            color="#2196F3"
            subtitle="This month"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completion Rate"
            value={`${(clinicMetrics.completionRate || 0).toFixed(1)}%`}
            icon={CheckCircle}
            color="#4CAF50"
            subtitle="Sessions completed"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Therapists"
            value={clinicMetrics.activeTherapists || 0}
            icon={People}
            color="#FF9800"
            subtitle="Current staff"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Avg Patient Rating"
            value={`${(clinicMetrics.avgPatientRating || 0).toFixed(2)}/5.0`}
            icon={TrendingUp}
            color="#4CAF50"
            subtitle="Patient satisfaction"
          />
        </Grid>
      </Grid>

      {/* Tabs for different views */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
        <Tab label="Trends" />
        <Tab label="Therapist Ranking" />
        <Tab label="Documentation" />
        <Tab label="No-Show Analysis" />
      </Tabs>

      {/* Tab 1: Session Trends */}
      {tabValue === 0 && (
        <Card>
          <CardHeader title="Session Trends (Last 6 Months)" />
          <CardContent>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="scheduled" stroke="#2196F3" />
                  <Line type="monotone" dataKey="completed" stroke="#4CAF50" />
                  <Line type="monotone" dataKey="cancelled" stroke="#F44336" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Typography>No data available</Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Therapist Ranking */}
      {tabValue === 1 && (
        <Card>
          <CardHeader title="Top Therapists by Performance" />
          <CardContent>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>Rank</TableCell>
                  <TableCell>Therapist</TableCell>
                  <TableCell align="right">Sessions</TableCell>
                  <TableCell align="right">Completion Rate</TableCell>
                  <TableCell align="right">Avg Rating</TableCell>
                  <TableCell align="right">No-Show Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {therapistMetrics.slice(0, 10).map((therapist, index) => (
                  <TableRow key={therapist._id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{index + 1}</TableCell>
                    <TableCell>{therapist.name}</TableCell>
                    <TableCell align="right">{therapist.totalSessions}</TableCell>
                    <TableCell align="right">{(therapist.completionRate || 0).toFixed(1)}%</TableCell>
                    <TableCell align="right">{(therapist.avgRating || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{(therapist.noShowRate || 0).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Documentation Statistics */}
      {tabValue === 2 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Documentation Completion" />
              <CardContent>
                {documentationStats.total > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Complete', value: documentationStats.complete || 0 },
                          { name: 'Pending', value: documentationStats.pending || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#4CAF50" />
                        <Cell fill="#FFC107" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography>No documentation data</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Documentation Metrics" />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Total Completed Sessions
                  </Typography>
                  <Typography variant="h6">{documentationStats.total || 0}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Documented
                  </Typography>
                  <Typography variant="h6">{documentationStats.complete || 0}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Pending Documentation
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#FFC107' }}>
                    {documentationStats.pending || 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Documentation Rate
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#4CAF50' }}>
                    {documentationStats.total > 0
                      ? ((documentationStats.complete / documentationStats.total) * 100).toFixed(1)
                      : 0}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 4: No-Show Analysis */}
      {tabValue === 3 && (
        <Card>
          <CardHeader title="No-Show Trends" />
          <CardContent>
            {noShowTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={noShowTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="noShows" fill="#F44336" />
                  <Bar dataKey="showed" fill="#4CAF50" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography>No data available</Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Section */}
      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={fetchMetrics}
          sx={{ mr: 1 }}
        >
          Refresh Data
        </Button>
        <Button variant="outlined" color="primary">
          Export Report
        </Button>
      </Box>
    </Box>
  );
}
