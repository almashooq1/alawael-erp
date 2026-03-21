import { useState, useEffect } from 'react';

import { surfaceColors, neutralColors, brandColors } from 'theme/palette';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography
} from '@mui/material';
import Dashboard from '@mui/icons-material/Dashboard';
import TrendingUp from '@mui/icons-material/TrendingUp';
import Assessment from '@mui/icons-material/Assessment';
import RemoveCircle from '@mui/icons-material/RemoveCircle';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Warning from '@mui/icons-material/Warning';
import Info from '@mui/icons-material/Info';

const API = process.env.REACT_APP_API_URL || '/api';

const ExecutiveSummary = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/advanced/analytics/executive-summary`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(v || 0);

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  if (!data) return null;

  const kpis = data.kpis || {};
  const highlights = data.highlights || [];
  const position = data.financialPosition || {};
  const cashFlow = data.cashFlow || {};
  const risks = data.risks || [];
  const recommendations = data.recommendations || [];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Dashboard sx={{ color: brandColors.primary }} /> الملخص التنفيذي
        </Typography>
        <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
          Executive Summary - نظرة شاملة على الأداء المالي للمنشأة
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          {
            label: 'إجمالي الإيرادات',
            value: formatCurrency(kpis.totalRevenue),
            icon: <MonetizationOn />,
            color: '#4CAF50',
            trend: kpis.revenueTrend,
          },
          {
            label: 'إجمالي المصروفات',
            value: formatCurrency(kpis.totalExpenses),
            icon: <Receipt />,
            color: '#F44336',
            trend: kpis.expenseTrend,
          },
          {
            label: 'صافي الربح',
            value: formatCurrency(kpis.netProfit),
            icon: <TrendingUp />,
            color: kpis.netProfit >= 0 ? '#4CAF50' : '#F44336',
            trend: kpis.profitTrend,
          },
          {
            label: 'هامش الربح',
            value: `${kpis.profitMargin || 0}%`,
            icon: <Speed />,
            color: '#2196F3',
          },
          {
            label: 'النقد المتاح',
            value: formatCurrency(kpis.cashAvailable),
            icon: <AccountBalance />,
            color: '#673AB7',
          },
          {
            label: 'التحصيلات المعلقة',
            value: formatCurrency(kpis.pendingCollections),
            icon: <Assessment />,
            color: '#FF9800',
          },
        ].map((item, i) => (
          <Card
            key={i}
            sx={{
              flex: 1,
              minWidth: 190,
              borderRadius: 2.5,
              border: `1px solid ${surfaceColors.border}`,
              position: 'relative',
              overflow: 'visible',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                    {item.label}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: item.color, mt: 0.5 }}>
                    {item.value}
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: `${item.color}15`, borderRadius: 2, p: 1, display: 'flex' }}>
                  {item.icon}
                </Box>
              </Box>
              {item.trend !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  {item.trend > 0 ? (
                    <ArrowUpward sx={{ fontSize: 14, color: '#4CAF50' }} />
                  ) : item.trend < 0 ? (
                    <ArrowDownward sx={{ fontSize: 14, color: '#F44336' }} />
                  ) : (
                    <RemoveCircle sx={{ fontSize: 14, color: '#9E9E9E' }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      color: item.trend > 0 ? '#4CAF50' : item.trend < 0 ? '#F44336' : '#9E9E9E',
                      fontWeight: 600,
                    }}
                  >
                    {Math.abs(item.trend || 0)}% عن الشهر السابق
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Two column layout */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        {/* Financial Position */}
        <Card
          sx={{
            flex: 1,
            minWidth: 400,
            borderRadius: 2.5,
            border: `1px solid ${surfaceColors.border}`,
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <AccountBalance sx={{ color: brandColors.primary }} /> المركز المالي
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                {
                  label: 'إجمالي الأصول',
                  value: formatCurrency(position.totalAssets),
                  color: '#4CAF50',
                },
                {
                  label: 'الأصول المتداولة',
                  value: formatCurrency(position.currentAssets),
                  color: '#66BB6A',
                },
                {
                  label: 'الأصول الثابتة',
                  value: formatCurrency(position.fixedAssets),
                  color: '#81C784',
                },
                {
                  label: 'إجمالي الالتزامات',
                  value: formatCurrency(position.totalLiabilities),
                  color: '#F44336',
                },
                {
                  label: 'الالتزامات المتداولة',
                  value: formatCurrency(position.currentLiabilities),
                  color: '#EF5350',
                },
                {
                  label: 'الالتزامات طويلة الأجل',
                  value: formatCurrency(position.longTermLiabilities),
                  color: '#E57373',
                },
              ].map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 1,
                    '&:hover': { bgcolor: '#f5f5f5' },
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {item.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ color: item.color }}>
                    {item.value}
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1,
                  bgcolor: '#E3F2FD',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body1" fontWeight={800}>
                  صافي حقوق الملكية
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#1565C0' }}>
                  {formatCurrency(position.equity)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Cash Flow */}
        <Card
          sx={{
            flex: 1,
            minWidth: 400,
            borderRadius: 2.5,
            border: `1px solid ${surfaceColors.border}`,
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <TrendingUp sx={{ color: '#4CAF50' }} /> التدفقات النقدية
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { label: 'من الأنشطة التشغيلية', value: cashFlow.operating, color: '#4CAF50' },
                { label: 'من الأنشطة الاستثمارية', value: cashFlow.investing, color: '#2196F3' },
                { label: 'من الأنشطة التمويلية', value: cashFlow.financing, color: '#FF9800' },
              ].map((item, i) => (
                <Box key={i}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {item.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      sx={{ color: (item.value || 0) >= 0 ? '#4CAF50' : '#F44336' }}
                    >
                      {formatCurrency(item.value)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(
                      100,
                      Math.abs(((item.value || 0) / (cashFlow.operating || 1)) * 100)
                    )}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': { bgcolor: item.color },
                    }}
                  />
                </Box>
              ))}
              <Divider />
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  p: 1.5,
                  bgcolor: cashFlow.netChange >= 0 ? '#E8F5E9' : '#FFEBEE',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body1" fontWeight={800}>
                  صافي التغير في النقد
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  sx={{ color: cashFlow.netChange >= 0 ? '#2E7D32' : '#C62828' }}
                >
                  {formatCurrency(cashFlow.netChange)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Highlights, Risks, Recommendations */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Highlights */}
        <Card
          sx={{
            flex: 1,
            minWidth: 350,
            borderRadius: 2.5,
            border: `1px solid ${surfaceColors.border}`,
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <CheckCircle sx={{ color: '#4CAF50' }} /> أبرز الإنجازات
            </Typography>
            <List dense>
              {highlights.map((h, i) => (
                <ListItem key={i} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckCircle sx={{ color: '#4CAF50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={h.title || h}
                    secondary={h.description || null}
                    primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
              {highlights.length === 0 && (
                <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                  لا توجد إنجازات مسجلة
                </Typography>
              )}
            </List>
          </CardContent>
        </Card>

        {/* Risks */}
        <Card
          sx={{
            flex: 1,
            minWidth: 350,
            borderRadius: 2.5,
            border: `1px solid ${surfaceColors.border}`,
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Warning sx={{ color: '#FF9800' }} /> المخاطر المالية
            </Typography>
            <List dense>
              {risks.map((r, i) => (
                <ListItem key={i} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Warning
                      sx={{
                        color:
                          r.severity === 'high'
                            ? '#F44336'
                            : r.severity === 'medium'
                              ? '#FF9800'
                              : '#FFC107',
                        fontSize: 20,
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{r.title || r}</span>
                        {r.severity && (
                          <Chip
                            size="small"
                            label={
                              r.severity === 'high'
                                ? 'عالي'
                                : r.severity === 'medium'
                                  ? 'متوسط'
                                  : 'منخفض'
                            }
                            sx={{
                              bgcolor: r.severity === 'high' ? '#F4433615' : '#FF980015',
                              color: r.severity === 'high' ? '#F44336' : '#FF9800',
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={r.description || null}
                    primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
              {risks.length === 0 && (
                <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                  لا توجد مخاطر مسجلة
                </Typography>
              )}
            </List>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card
          sx={{
            flex: 1,
            minWidth: 350,
            borderRadius: 2.5,
            border: `1px solid ${surfaceColors.border}`,
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Info sx={{ color: '#2196F3' }} /> التوصيات
            </Typography>
            <List dense>
              {recommendations.map((rec, i) => (
                <ListItem key={i} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Info sx={{ color: '#2196F3', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={rec.title || rec}
                    secondary={rec.description || null}
                    primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  {rec.priority && (
                    <Chip
                      size="small"
                      label={rec.priority === 'high' ? 'أولوية عالية' : 'عادي'}
                      sx={{
                        bgcolor: rec.priority === 'high' ? '#F4433615' : '#2196F315',
                        color: rec.priority === 'high' ? '#F44336' : '#2196F3',
                        fontWeight: 600,
                        ml: 1,
                      }}
                    />
                  )}
                </ListItem>
              ))}
              {recommendations.length === 0 && (
                <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                  لا توجد توصيات
                </Typography>
              )}
            </List>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ExecutiveSummary;
