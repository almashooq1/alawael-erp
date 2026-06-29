/**
 * PerformanceDashboard/index.jsx
 * لوحة تحكم الأداء المتكاملة
 */

import React, { useEffect, useState } from 'react';
import { Box, Typography, Container, Paper, Grid, Skeleton, Alert, Tabs, Tab } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import performanceService from '../../../services/performance.service';
import WebVitalsSection from './WebVitalsSection';
import LighthouseSection from './LighthouseSection';
import PageSpeedSection from './PageSpeedSection';
import PerformanceAlerts from './PerformanceAlerts';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 1 }}>{children}</Box> : null;
}

export default function PerformanceDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await performanceService.getDashboard({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
        setSummary(response.data?.data || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <SpeedIcon fontSize="large" />
          لوحة تحكم الأداء
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          مراقبة Web Vitals، Lighthouse، PageSpeed Insights، وتنبيهات الأداء بشكل فوري.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 3 }} />
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="caption" color="text.secondary">
                قياسات Web Vitals
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {summary?.webVitals?.reduce((sum, item) => sum + item.count, 0) || 0}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="caption" color="text.secondary">
                تقارير Lighthouse
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {summary?.latestLighthouse?.length || 0}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="caption" color="text.secondary">
                نتائج PageSpeed
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {summary?.latestPageSpeed?.length || 0}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="caption" color="text.secondary">
                تنبيهات مفتوحة
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: summary?.openAlerts?.length > 0 ? 'error.main' : 'inherit',
                }}
              >
                {summary?.openAlerts?.length || 0}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Paper elevation={1} sx={{ borderRadius: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, newValue) => setTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, pt: 1 }}
        >
          <Tab label="Web Vitals" />
          <Tab label="Lighthouse" />
          <Tab label="PageSpeed" />
          <Tab label="التنبيهات" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tab} index={0}>
            <WebVitalsSection />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <LighthouseSection />
          </TabPanel>
          <TabPanel value={tab} index={2}>
            <PageSpeedSection />
          </TabPanel>
          <TabPanel value={tab} index={3}>
            <PerformanceAlerts />
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
}
