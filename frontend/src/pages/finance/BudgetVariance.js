 
import { useState, useEffect } from 'react';
import { getToken } from '../../utils/tokenStorage';


import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const BudgetVariance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/advanced/budget-vs-actual?fiscalYear=${fiscalYear}`, {
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

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            الموازنة مقابل الفعلي
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Budget vs Actual - تحليل الانحرافات المالية
          </Typography>
        </Box>
        <TextField
          select
          size="small"
          label="السنة المالية"
          value={fiscalYear}
          onChange={e => setFiscalYear(e.target.value)}
          sx={{ width: 130 }}
        >
          {[2024, 2025, 2026].map(y => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Net Result Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          {
            label: 'الربح المخطط',
            value: formatCurrency(data.netBudget.budgetedProfit),
            color: brandColors.primary,
          },
          {
            label: 'الربح الفعلي',
            value: formatCurrency(data.netBudget.actualProfit),
            color: data.netBudget.actualProfit > 0 ? '#4CAF50' : '#F44336',
          },
          {
            label: 'الانحراف',
            value: formatCurrency(data.netBudget.variance),
            color: data.netBudget.variance >= 0 ? '#4CAF50' : '#F44336',
          },
          {
            label: 'استغلال الميزانية',
            value: `${data.expenses.utilizationRate}%`,
            color: '#FF9800',
          },
          { label: 'تحقيق الإيرادات', value: `${data.revenue.achievementRate}%`, color: '#2196F3' },
        ].map((item, i) => (
          <Card
            key={i}
            sx={{
              flex: 1,
              minWidth: 170,
              borderRadius: 2,
              border: `1px solid ${surfaceColors.border}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                {item.label}
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: item.color, mt: 0.5 }}>
                {item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Revenue Table */}
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <TrendingUp sx={{ color: '#4CAF50' }} /> الإيرادات
      </Typography>
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}`, mb: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>مصدر الإيراد</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  الموازنة
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  الفعلي
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  الانحراف
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  نسبة الانحراف
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>نسبة التحقيق</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.revenue.items.map((item, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{item.source}</TableCell>
                  <TableCell align="right">{formatCurrency(item.budgeted)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(item.actual)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: item.variance >= 0 ? '#4CAF50' : '#F44336', fontWeight: 600 }}
                  >
                    {item.variance >= 0 ? '+' : ''}
                    {formatCurrency(item.variance)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: item.variancePercent >= 0 ? '#4CAF50' : '#F44336' }}
                  >
                    {item.variancePercent >= 0 ? '+' : ''}
                    {item.variancePercent}%
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, Math.round((item.actual / item.budgeted) * 100))}
                        sx={{
                          flex: 1,
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: item.actual >= item.budgeted ? '#4CAF50' : '#FF9800',
                          },
                        }}
                      />
                      <Typography variant="caption" fontWeight={600}>
                        {Math.round((item.actual / item.budgeted) * 100)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.status === 'on_target' ? 'محقق' : 'أقل من الهدف'}
                      sx={{
                        bgcolor: item.status === 'on_target' ? '#4CAF5015' : '#FF572215',
                        color: item.status === 'on_target' ? '#4CAF50' : '#FF5722',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 800 }}>الإجمالي</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  {formatCurrency(data.revenue.totalBudgeted)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  {formatCurrency(data.revenue.totalActual)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 800,
                    color: data.revenue.totalVariance >= 0 ? '#4CAF50' : '#F44336',
                  }}
                >
                  {formatCurrency(data.revenue.totalVariance)}
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Expenses Table */}
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <TrendingDown sx={{ color: '#FF5722' }} /> المصروفات
      </Typography>
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>بند المصروفات</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  الموازنة
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  الفعلي
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  الانحراف
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  نسبة الانحراف
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>نسبة الاستغلال</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.expenses.items.map((item, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{item.category}</TableCell>
                  <TableCell align="right">{formatCurrency(item.budgeted)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(item.actual)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: item.variance >= 0 ? '#4CAF50' : '#F44336', fontWeight: 600 }}
                  >
                    {formatCurrency(item.variance)}
                  </TableCell>
                  <TableCell align="right">{item.variancePercent}%</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, Math.round((item.actual / item.budgeted) * 100))}
                        sx={{
                          flex: 1,
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: item.status === 'under_budget' ? '#4CAF50' : '#F44336',
                          },
                        }}
                      />
                      <Typography variant="caption" fontWeight={600}>
                        {Math.round((item.actual / item.budgeted) * 100)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.status === 'under_budget' ? 'ضمن الميزانية' : 'تجاوز'}
                      sx={{
                        bgcolor: item.status === 'under_budget' ? '#4CAF5015' : '#F4433615',
                        color: item.status === 'under_budget' ? '#4CAF50' : '#F44336',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 800 }}>الإجمالي</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  {formatCurrency(data.expenses.totalBudgeted)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  {formatCurrency(data.expenses.totalActual)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#4CAF50' }}>
                  {formatCurrency(data.expenses.totalVariance)}
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
};

export default BudgetVariance;
