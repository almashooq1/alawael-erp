import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  TextField,
  MenuItem,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import performanceService from '../../../services/performance.service';
import ScoreGauge from './ScoreGauge';

export default function LighthouseSection() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [url, setUrl] = useState('');
  const [strategy, setStrategy] = useState('mobile');

  const fetchAudits = async () => {
    try {
      setLoading(true);
      const response = await performanceService.getLatestLighthouse();
      setAudits(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load lighthouse audits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const handleRun = async () => {
    if (!url) return;
    try {
      setRunning(true);
      await performanceService.runLighthouse(url, strategy);
      await fetchAudits();
    } catch (err) {
      console.error('Lighthouse run failed:', err);
    } finally {
      setRunning(false);
    }
  };

  const latest = audits[0];

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        Lighthouse Audits
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
              startIcon={<PlayArrowIcon />}
              onClick={handleRun}
              disabled={!url || running}
            >
              {running ? 'جاري التشغيل...' : 'تشغيل Lighthouse'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      ) : latest ? (
        <>
          <Grid container spacing={2}>
            <Grid item xs={6} md={2.4}>
              <ScoreGauge title="Performance" score={latest.scores?.performance || 0} />
            </Grid>
            <Grid item xs={6} md={2.4}>
              <ScoreGauge title="Accessibility" score={latest.scores?.accessibility || 0} />
            </Grid>
            <Grid item xs={6} md={2.4}>
              <ScoreGauge title="Best Practices" score={latest.scores?.bestPractices || 0} />
            </Grid>
            <Grid item xs={6} md={2.4}>
              <ScoreGauge title="SEO" score={latest.scores?.seo || 0} />
            </Grid>
            <Grid item xs={6} md={2.4}>
              <ScoreGauge title="PWA" score={latest.scores?.pwa || 0} />
            </Grid>
          </Grid>

          <TableContainer component={Paper} elevation={0} sx={{ mt: 3, borderRadius: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الرابط</TableCell>
                  <TableCell>الاستراتيجية</TableCell>
                  <TableCell>Performance</TableCell>
                  <TableCell>Accessibility</TableCell>
                  <TableCell>Best Practices</TableCell>
                  <TableCell>SEO</TableCell>
                  <TableCell>تاريخ التدقيق</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {audits.map(audit => (
                  <TableRow key={audit._id}>
                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {audit.url}
                    </TableCell>
                    <TableCell>{audit.strategy}</TableCell>
                    <TableCell>{audit.scores?.performance ?? '-'}</TableCell>
                    <TableCell>{audit.scores?.accessibility ?? '-'}</TableCell>
                    <TableCell>{audit.scores?.bestPractices ?? '-'}</TableCell>
                    <TableCell>{audit.scores?.seo ?? '-'}</TableCell>
                    <TableCell>{new Date(audit.auditedAt).toLocaleString('ar-SA')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">
            لا توجد تقارير Lighthouse متاحة. قم بتشغيل تدقيق جديد.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
