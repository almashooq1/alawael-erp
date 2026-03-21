import { useState, useEffect } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import { modulesAPI, withMockFallback } from 'services/api';
import moduleMocks from 'data/moduleMocks';
import logger from 'utils/logger';
import { gradients, statusColors, surfaceColors, chartColors } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  Typography
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const ModulePage = ({ title, moduleKey = 'reports' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const showSnackbar = useSnackbar();

  const searchParams = new URLSearchParams(location.search);
  const viewState = searchParams.get('state');
  const status =
    viewState === 'loading' || viewState === 'error' || viewState === 'empty'
      ? viewState
      : 'loaded';

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModuleData = async () => {
      setLoading(true);
      try {
        const moduleData = await withMockFallback(
          () => modulesAPI.getModuleData(moduleKey),
          moduleMocks[moduleKey] || moduleMocks.reports
        );
        setData(moduleData || moduleMocks[moduleKey] || moduleMocks.reports);
        setError(null);
      } catch (err) {
        logger.error(`Failed to fetch ${moduleKey} data:`, err);
        setError(`Failed to load ${title} data`);
        showSnackbar('حدث خطأ أثناء تحميل بيانات الوحدة', 'error');
        // Use mock data as fallback
        setData(moduleMocks[moduleKey] || moduleMocks.reports);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'loaded') {
      fetchModuleData();
    } else {
      setLoading(false);
    }
  }, [moduleKey, status, title, showSnackbar]);

  const kpis = status === 'loaded' && data ? data.kpis || [] : [];
  const items = status === 'loaded' && data ? data.items || [] : [];
  const actions = status === 'loaded' && data ? data.actions || [] : [];

  const resetState = () => navigate(location.pathname, { replace: true });

  // Show loading skeleton while fetching data
  if (loading && status === 'loaded') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          <CardContent>
            <Skeleton variant="text" width={300} height={50} />
            <Skeleton variant="text" width="80%" height={20} sx={{ mt: 2 }} />
            <Skeleton variant="text" width="60%" height={20} />
          </CardContent>
        </Card>
        <Grid container spacing={2}>
          {[1, 2, 3].map(s => (
            <Grid item xs={12} sm={6} md={4} key={s}>
              <Card sx={{ p: 2 }}>
                <Skeleton variant="text" width={120} />
                <Skeleton variant="text" width={80} sx={{ fontSize: 32 }} />
                <Skeleton variant="text" width={90} />
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DashboardIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              الوحدات والأقسام
            </Typography>
            <Typography variant="body2">إدارة وتصفح وحدات النظام</Typography>
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error">{error} - يتم استخدام البيانات التجريبية</Alert>}

      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
            عرض سريع لمؤشرات الأداء والمهام الحرجة. يمكن ربط هذه الصفحة بالـ API لاحقًا أو إبقاء
            بيانات Mock للاختبار.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={() => navigate('/reports')}
              endIcon={<ArrowForwardIcon />}
            >
              التقارير الموحدة
            </Button>
            <Button variant="outlined" color="secondary" onClick={() => navigate(-1)}>
              عودة
            </Button>
          </Stack>
          {status !== 'loaded' && (
            <Alert
              severity={status === 'error' ? 'error' : status === 'empty' ? 'info' : 'warning'}
              sx={{ mt: 2 }}
            >
              {status === 'loading' && 'يتم التحميل... يمكن إزالة ?state=loading للعرض الفعلي.'}
              {status === 'error' && 'حدث خطأ في جلب البيانات. حاول مجددًا أو أزل ?state=error.'}
              {status === 'empty' && 'لا توجد بيانات متاحة الآن. أزل ?state=empty لرؤية الـ Mock.'}
              <Button size="small" sx={{ ml: 2 }} onClick={resetState}>
                إعادة الضبط
              </Button>
            </Alert>
          )}
        </CardContent>
      </Card>

      {status === 'loading' ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map(s => (
            <Grid item xs={12} sm={6} md={4} key={s}>
              <Card sx={{ p: 2 }}>
                <Skeleton variant="text" width={120} />
                <Skeleton variant="text" width={80} sx={{ fontSize: 32 }} />
                <Skeleton variant="text" width={90} />
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : status === 'empty' ? (
        <Card sx={{ p: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            لا توجد مؤشرات أداء متاحة حاليًا.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            أزل ?state=empty لعرض بيانات الـ Mock.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {kpis.map(kpi => (
            <Grid item xs={12} sm={6} md={4} key={kpi.label}>
              <Card sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  {kpi.label}
                </Typography>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mt: 1 }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {kpi.value}
                  </Typography>
                  {kpi.chartData && (
                    <Sparkline
                      data={kpi.chartData}
                      color={
                        kpi.tone === 'error'
                          ? statusColors.errorDark
                          : kpi.tone === 'warning'
                            ? statusColors.warningDarker
                            : statusColors.tealDark
                      }
                      width={80}
                      height={32}
                    />
                  )}
                </Stack>
                {kpi.trend && (
                  <Typography
                    variant="body2"
                    color={
                      kpi.tone === 'error'
                        ? 'error.main'
                        : kpi.tone === 'warning'
                          ? 'warning.main'
                          : 'success.main'
                    }
                  >
                    {kpi.trend}
                  </Typography>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              عناصر حرجة / تنبيهات
            </Typography>
            {status === 'loaded' && actions?.[0] && (
              <Button
                size="small"
                variant="text"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate(actions[0].path)}
              >
                فتح
              </Button>
            )}
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {status === 'loading' && (
            <List dense>
              {[1, 2, 3].map(idx => (
                <ListItem
                  key={idx}
                  sx={{ borderBottom: idx < 3 ? `1px solid ${surfaceColors.divider}` : 'none' }}
                >
                  <ListItemText
                    primary={<Skeleton variant="text" width="60%" />}
                    secondary={<Skeleton variant="text" width="40%" />}
                  />
                  <Skeleton variant="rectangular" width={64} height={24} />
                </ListItem>
              ))}
            </List>
          )}

          {status === 'empty' && (
            <Typography variant="body2" color="text.secondary">
              لا توجد عناصر حرجة متاحة الآن. أزل ?state=empty لرؤية بيانات الـ Mock.
            </Typography>
          )}

          {status === 'error' && (
            <Typography variant="body2" color="error.main">
              تعذر عرض العناصر. حاول مجددًا أو أزل ?state=error.
            </Typography>
          )}

          {status === 'loaded' && (
            <List dense>
              {items?.map((item, idx) => (
                <ListItem
                  key={idx}
                  sx={{
                    borderBottom:
                      idx < items.length - 1 ? `1px solid ${surfaceColors.divider}` : 'none',
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {item.title}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {item.status}
                      </Typography>
                    }
                  />
                  {item.amount && (
                    <Chip
                      label={item.amount}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {status === 'loaded' && data && data.charts && (
        <Grid container spacing={2}>
          {data.charts.monthlyActivity && (
            <Grid item xs={12} md={6}>
              <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    النشاط الشهري
                  </Typography>
                  <BarChart
                    data={data.charts.monthlyActivity.data}
                    labels={data.charts.monthlyActivity.labels}
                    height={180}
                    color={statusColors.tealDark}
                  />
                </CardContent>
              </Card>
            </Grid>
          )}
          {data.charts.systemUsage && (
            <Grid item xs={12} md={6}>
              <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    استخدام الأنظمة (%)
                  </Typography>
                  <BarChart
                    data={data.charts.systemUsage.data}
                    labels={data.charts.systemUsage.labels}
                    height={180}
                    color={chartColors.tealLight}
                  />
                </CardContent>
              </Card>
            </Grid>
          )}
          {data.charts.alerts && (
            <Grid item xs={12} md={6}>
              <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    التنبيهات الأسبوعية
                  </Typography>
                  <BarChart
                    data={data.charts.alerts.data}
                    labels={data.charts.alerts.labels}
                    height={180}
                    color={chartColors.warmAmber}
                  />
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {status === 'loading' && (
        <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              روابط سريعة
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flexWrap: 'wrap' }}>
              {[1, 2, 3].map(idx => (
                <Skeleton
                  key={idx}
                  variant="rectangular"
                  width={140}
                  height={40}
                  sx={{ borderRadius: 2 }}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {status === 'loaded' && actions?.length > 0 && (
        <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              روابط سريعة
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flexWrap: 'wrap' }}>
              {actions.map(action => (
                <Button key={action.label} variant="outlined" onClick={() => navigate(action.path)}>
                  {action.label}
                </Button>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ModulePage;
