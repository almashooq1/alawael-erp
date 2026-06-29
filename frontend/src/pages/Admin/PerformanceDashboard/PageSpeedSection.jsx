import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  TextField,
  MenuItem,
  Skeleton,
  Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import performanceService from '../../../services/performance.service';
import ScoreGauge from './ScoreGauge';

export default function PageSpeedSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [strategy, setStrategy] = useState('mobile');
  const [error, setError] = useState(null);

  const fetchData = async (refresh = false) => {
    if (!url) return;
    try {
      setLoading(true);
      setError(null);
      const response = await performanceService.getPageSpeed(url, strategy, refresh);
      setData(response.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = () => fetchData(true);

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        PageSpeed Insights
      </Typography>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="رابط الصفحة"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="الاستراتيجية"
              value={strategy}
              onChange={e => setStrategy(e.target.value)}
              size="small"
            >
              <MenuItem value="mobile">Mobile</MenuItem>
              <MenuItem value="desktop">Desktop</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleFetch}
              disabled={!url || loading}
            >
              {loading ? 'جاري الجلب...' : 'جلب البيانات'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loading && !data ? (
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      ) : data?.lighthouseScores ? (
        <>
          <Grid container spacing={2}>
            <Grid item xs={6} md={2.4}>
              <ScoreGauge title="Performance" score={data.lighthouseScores.performance || 0} />
            </Grid>
            <Grid item xs={6} md={2.4}>
              <ScoreGauge title="Accessibility" score={data.lighthouseScores.accessibility || 0} />
            </Grid>
            <Grid item xs={6} md={2.4}>
              <ScoreGauge title="Best Practices" score={data.lighthouseScores.bestPractices || 0} />
            </Grid>
            <Grid item xs={6} md={2.4}>
              <ScoreGauge title="SEO" score={data.lighthouseScores.seo || 0} />
            </Grid>
            <Grid item xs={6} md={2.4}>
              <ScoreGauge title="PWA" score={data.lighthouseScores.pwa || 0} />
            </Grid>
          </Grid>

          {data.fieldData && Object.keys(data.fieldData).length > 0 && (
            <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                بيانات الميدان (CrUX)
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(data.fieldData).map(([key, metric]) => (
                  <Grid item xs={12} sm={6} md={4} key={key}>
                    <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {key}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {metric.percentile} {key.includes('shift') ? '' : 'ms'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {metric.category}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </>
      ) : (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">
            أدخل رابطًا واضغط "جلب البيانات" لعرض نتائج PageSpeed Insights.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
