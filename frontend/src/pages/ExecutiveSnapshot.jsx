/**
 * Executive Snapshot — landing page for L2 (HQ exec) roles.
 *
 * Consumes GET /api/dashboard/executive-snapshot and renders KPI cards
 * grouped by category with Arabic-first RTL layout.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  Alert as MuiAlert,
} from '@mui/material';
import { getExecutiveSnapshot } from '../services/dashboard.service';

const categoryLabels = {
  clinical: 'إكلينيكي',
  financial: 'مالي',
  operational: 'تشغيلي',
  quality: 'جودة',
  hr: 'الموارد البشرية',
  compliance: 'امتثال',
};

const unitLabels = {
  count: '',
  '%': '%',
  sar: 'ر.س',
  days: 'يوم',
  minutes: 'دقيقة',
  hours: 'ساعة',
  score: '',
};

const directionColor = {
  higher_is_better: 'success',
  lower_is_better: 'warning',
  neutral: 'default',
};

function formatValue(value, unit) {
  if (value == null) return '—';
  if (typeof value !== 'number') return String(value);
  if (unit === 'sar') {
    return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(value) + ' ر.س';
  }
  const formatted = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(value);
  const suffix = unitLabels[unit] || '';
  return suffix ? `${formatted} ${suffix}` : formatted;
}

export default function ExecutiveSnapshot() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branchId, setBranchId] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getExecutiveSnapshot(branchId ? { branchId } : {})
      .then(payload => {
        if (!cancelled) setData(payload);
      })
      .catch(err => {
        if (!cancelled) setError(err?.response?.data?.error || err.message || 'فشل التحميل');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const categories = useMemo(() => {
    if (!data || !data.byCategory) return [];
    return Object.keys(data.byCategory);
  }, [data]);

  return (
    <Container maxWidth="xl" sx={{ py: 3, direction: 'rtl' }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          لوحة الأداء التنفيذي
        </Typography>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="branch-filter-label">الفرع</InputLabel>
          <Select
            labelId="branch-filter-label"
            value={branchId}
            label="الفرع"
            onChange={e => setBranchId(e.target.value)}
          >
            <MenuItem value="">جميع الفروع</MenuItem>
            <MenuItem value="HQ">المقر الرئيسي</MenuItem>
            <MenuItem value="RYD1">الرياض 1</MenuItem>
            <MenuItem value="JED1">جدة 1</MenuItem>
            <MenuItem value="DMM1">الدمام 1</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {error && (
        <MuiAlert severity="error" sx={{ mb: 2 }}>
          {error}
        </MuiAlert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {!loading && data && (
        <>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            الفترة: {new Date(data.period.from).toLocaleDateString('ar-SA')} —{' '}
            {new Date(data.period.to).toLocaleDateString('ar-SA')}
          </Typography>

          {categories.map(cat => (
            <Box key={cat} mb={4}>
              <Typography variant="h6" mb={1.5} sx={{ fontWeight: 700 }}>
                {categoryLabels[cat] || cat}
              </Typography>
              <Grid container spacing={2}>
                {data.byCategory[cat].map(kpi => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={kpi.id}>
                    <Card elevation={2} sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                          {kpi.id}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ minHeight: '2.5em', mt: 0.5 }}>
                          {kpi.nameAr}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, mb: 1 }}>
                          {formatValue(kpi.value, kpi.unit)}
                        </Typography>
                        {kpi.direction && (
                          <Chip
                            size="small"
                            label={
                              kpi.direction === 'higher_is_better'
                                ? 'الأعلى أفضل'
                                : kpi.direction === 'lower_is_better'
                                  ? 'الأقل أفضل'
                                  : 'محايد'
                            }
                            color={directionColor[kpi.direction] || 'default'}
                            variant="outlined"
                          />
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </>
      )}
    </Container>
  );
}
