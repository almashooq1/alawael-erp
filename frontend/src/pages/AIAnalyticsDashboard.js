import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
} from '@mui/material';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const AIAnalyticsDashboard = () => {
  const [predictions, setPredictions] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      // Determine userId - in a real app, this comes from auth context.
      // We will try to get it from localStorage or fallback to a demo ID if testing.
      // const userId = localStorage.getItem('userId') || 'demo-user-id';

      // For now, let's just use the current user from session or a hardcoded one for the concept
      // In production, endpoints should use req.user from token.
      // The endpoints use req.user.id from token, so axios interceptors must be set up.
      // Assuming axios is configured with interceptors elsewhere in the project.

      const userId = localStorage.getItem('userId');
      if (!userId) {
        // If no user, mock data for display purposes
        setPredictions({
          prediction: { value: 78.5, confidence: 0.92 },
          factors: [
            { factor: 'Historical Trend', weight: 0.35 },
            { factor: 'Activity Level', weight: 0.25 },
            { factor: 'Engagement', weight: 0.2 },
            { factor: 'External', weight: 0.2 },
          ],
        });
        setRecommendations([
          { title: 'Good Performance', description: 'Keep up the good work!', priority: 'low', expectedImpact: 0.1 },
          { title: 'Increase Activity', description: 'Try to log in more frequently.', priority: 'medium', expectedImpact: 0.2 },
        ]);
        setLoading(false);
        return;
      }

      const [predRes, recRes] = await Promise.all([
        axios.get(`/api/ai-predictions/predictions/${userId}`),
        axios.get(`/api/ai-predictions/recommendations/${userId}`),
      ]);

      setPredictions(predRes.data.data[0]); // Latest prediction
      setRecommendations(recRes.data.data);
    } catch (err) {
      console.error(err);
      setError('Could not load analytics data. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        🤖 AI Analytics Dashboard
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Using demo data: {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Main Prediction Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Performance Prediction" />
            <CardContent>
              {predictions && predictions.prediction && (
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                      variant="determinate"
                      value={predictions.prediction.value}
                      size={150}
                      thickness={4}
                      color={predictions.prediction.value > 70 ? 'success' : 'primary'}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="h4">{predictions.prediction.value.toFixed(1)}%</Typography>
                    </Box>
                  </Box>
                  <Typography variant="subtitle1" display="block" sx={{ mt: 2 }}>
                    Confidence: {(predictions.prediction.confidence * 100).toFixed(0)}%
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Factors Card */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Influencing Factors" />
            <CardContent>
              {predictions?.factors?.map((factor, idx) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body1">{factor.factor}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(factor.weight * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={factor.weight * 100} sx={{ height: 10, borderRadius: 5 }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Personalized Recommendations" />
            <CardContent>
              {recommendations.length > 0 ? (
                recommendations.map((rec, idx) => (
                  <Alert
                    key={idx}
                    severity={rec.priority === 'critical' ? 'error' : rec.priority === 'high' ? 'warning' : 'info'}
                    sx={{ mb: 2 }}
                    action={
                      <Chip label={`Impact: ${(rec.expectedImpact * 100).toFixed(0)}%`} size="small" color="primary" variant="outlined" />
                    }
                  >
                    <Typography variant="subtitle1" fontWeight="bold">
                      {rec.title}
                    </Typography>
                    <Typography variant="body2">{rec.description}</Typography>
                  </Alert>
                ))
              ) : (
                <Typography>No recommendations available.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Performance Trend" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={generateTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="performance" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Recommendation Priorities" />
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={generatePriorityData()} dataKey="value" nameKey="name" outerRadius={100} label>
                      <Cell fill="#ef5350" />
                      <Cell fill="#ff9800" />
                      <Cell fill="#4caf50" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Button variant="contained" onClick={loadAnalytics} sx={{ mt: 3 }} size="large">
        Refresh Data
      </Button>
    </Container>
  );
};

const generateTrendData = () => {
  return [
    { name: 'Week 1', performance: 65 },
    { name: 'Week 2', performance: 72 },
    { name: 'Week 3', performance: 78 },
    { name: 'Week 4', performance: 82 },
  ];
};

const generatePriorityData = () => {
  return [
    { name: 'High', value: 25 },
    { name: 'Medium', value: 35 },
    { name: 'Low', value: 40 },
  ];
};

export default AIAnalyticsDashboard;
