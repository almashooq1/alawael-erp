/**
 * ProgressTracker Component
 * مكون تتبع التقدم الأكاديمي
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Box,
  Typography,
  CircularProgress,
  Tab,
  Tabs,
} from '@material-ui/core';
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
} from 'recharts';
import beneficiaryService from '../../services/beneficiary.service';
import './ProgressTracker.css';

const ProgressTracker = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [progressData, setProgressData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      const [progress, trend] = await Promise.all([
        beneficiaryService.getProgress(),
        beneficiaryService.getProgressTrend(),
      ]);
      setProgressData(progress);
      setTrendData(trend);
    } catch (error) {
      console.error('Error loading progress:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: t('errors.loadingData'),
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <div className="progress-tracker">
      <Box className="page-header">
        <Typography variant="h5">{t('progress.title')}</Typography>
      </Box>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
        <Tab label={t('progress.trend')} />
        <Tab label={t('progress.monthly')} />
        <Tab label={t('progress.details')} />
      </Tabs>

      {/* Tab Content */}
      <Box className="tab-content">
        {tabValue === 0 && (
          <Card>
            <CardHeader title={t('progress.trend')} />
            <CardContent>
              {trendData ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Typography>{t('dashboard.noData')}</Typography>
              )}
            </CardContent>
          </Card>
        )}

        {tabValue === 1 && (
          <Card>
            <CardHeader title={t('progress.monthly')} />
            <CardContent>
              {progressData && (
                <Grid container spacing={2}>
                  {progressData.monthly?.map((month, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Box className="month-card">
                        <Typography variant="h6">{month.month}</Typography>
                        <Typography variant="body2">
                          {t('progress.score')}: {month.score}%
                        </Typography>
                        <Typography variant="body2">
                          {t('progress.activities')}: {month.completedActivities}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

        {tabValue === 2 && (
          <Card>
            <CardHeader title={t('progress.details')} />
            <CardContent>
              {progressData && (
                <Box>
                  <Typography variant="h6">{t('progress.strengths')}</Typography>
                  <ul>
                    {progressData.strengths?.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                  <Typography variant="h6">{t('progress.improvements')}</Typography>
                  <ul>
                    {progressData.areasOfImprovement?.map((area, index) => (
                      <li key={index}>{area}</li>
                    ))}
                  </ul>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </div>
  );
};

export default ProgressTracker;
