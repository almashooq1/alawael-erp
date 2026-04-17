import { useState, useEffect } from 'react';
import { getToken } from '../../utils/tokenStorage';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Chip,
} from '@mui/material';
import { TrendingUp, AccountBalance, Speed, Warning } from '@mui/icons-material';
import { surfaceColors, neutralColors, statusColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const RatioCard = ({ ratio }) => {
  const getStatusColor = s =>
    s === 'good'
      ? statusColors.success
      : s === 'warning'
        ? statusColors.warning
        : statusColors.error;
  return (
    <Card sx={{ borderRadius: 2, border: `1px solid ${surfaceColors.border}`, height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ color: neutralColors.textSecondary, mb: 1 }}>
          {ratio.label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h4" fontWeight={800} sx={{ color: getStatusColor(ratio.status) }}>
            {ratio.value}
            {ratio.label?.includes('%') ? '' : ''}
          </Typography>
          {ratio.benchmark && (
            <Chip
              size="small"
              label={`المعيار: ${ratio.benchmark}`}
              sx={{ bgcolor: `${neutralColors.textSecondary}15`, fontSize: '0.7rem' }}
            />
          )}
        </Box>
        <Chip
          size="small"
          label={ratio.status === 'good' ? 'جيد' : 'يحتاج متابعة'}
          sx={{
            mt: 1,
            bgcolor: `${getStatusColor(ratio.status)}15`,
            color: getStatusColor(ratio.status),
            fontWeight: 600,
          }}
        />
      </CardContent>
    </Card>
  );
};

const FinancialRatios = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatios();
  }, []);

  const fetchRatios = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/advanced/financial-ratios`, {
        headers: { Authorization: `Bearer ${getToken()}` },
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

  const sections = [
    {
      title: 'نسب السيولة',
      icon: <AccountBalance />,
      color: '#2196F3',
      ratios: data.ratios.liquidity,
    },
    {
      title: 'نسب الربحية',
      icon: <TrendingUp />,
      color: '#4CAF50',
      ratios: data.ratios.profitability,
    },
    { title: 'نسب المديونية', icon: <Warning />, color: '#FF5722', ratios: data.ratios.leverage },
    { title: 'نسب النشاط', icon: <Speed />, color: '#FF9800', ratios: data.ratios.activity },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          النسب المالية
        </Typography>
        <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
          Financial Ratios - تحليل الأداء المالي الشامل
        </Typography>
      </Box>

      {/* Base Data Summary */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          {
            label: 'إجمالي الأصول',
            value: formatCurrency(data.baseData.totalAssets),
            color: '#2196F3',
          },
          {
            label: 'إجمالي الخصوم',
            value: formatCurrency(data.baseData.totalLiabilities),
            color: '#FF5722',
          },
          {
            label: 'حقوق الملكية',
            value: formatCurrency(data.baseData.totalEquity),
            color: '#4CAF50',
          },
          { label: 'صافي الدخل', value: formatCurrency(data.baseData.netIncome), color: '#FF9800' },
        ].map((item, i) => (
          <Card
            key={i}
            sx={{
              flex: 1,
              minWidth: 180,
              borderRadius: 2,
              border: `1px solid ${surfaceColors.border}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                {item.label}
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: item.color, mt: 0.5 }}>
                {item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Ratio Sections */}
      {sections.map((section, sIdx) => (
        <Box key={sIdx} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: `${section.color}15`,
                color: section.color,
                display: 'flex',
              }}
            >
              {section.icon}
            </Box>
            <Typography variant="h6" fontWeight={700}>
              {section.title}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {Object.values(section.ratios).map((ratio, rIdx) => (
              <Grid item xs={12} sm={6} md={3} key={rIdx}>
                <RatioCard ratio={ratio} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Container>
  );
};

export default FinancialRatios;
