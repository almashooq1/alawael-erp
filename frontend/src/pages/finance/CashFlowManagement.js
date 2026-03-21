import { useState, useEffect, useCallback } from 'react';




import accountingService from 'services/accountingService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const mockCashFlowData = {
  period: '2026-Q1',
  operating: {
    label: 'الأنشطة التشغيلية',
    items: [
      { label: 'صافي الربح', amount: 420000 },
      { label: 'الاستهلاك والإطفاء', amount: 85000 },
      { label: 'التغير في الذمم المدينة', amount: -120000 },
      { label: 'التغير في المخزون', amount: -35000 },
      { label: 'التغير في الذمم الدائنة', amount: 65000 },
      { label: 'التغير في المصروفات المستحقة', amount: 20000 },
    ],
    total: 435000,
  },
  investing: {
    label: 'الأنشطة الاستثمارية',
    items: [
      { label: 'شراء أصول ثابتة', amount: -250000 },
      { label: 'بيع استثمارات', amount: 80000 },
      { label: 'شراء برمجيات', amount: -45000 },
    ],
    total: -215000,
  },
  financing: {
    label: 'الأنشطة التمويلية',
    items: [
      { label: 'قرض بنكي جديد', amount: 500000 },
      { label: 'سداد أقساط قروض', amount: -180000 },
      { label: 'أرباح موزعة', amount: -100000 },
    ],
    total: 220000,
  },
  openingCash: 1200000,
  netChange: 440000,
  closingCash: 1640000,
  monthlyTrend: [
    { month: 'يناير', operating: 150000, investing: -80000, financing: 70000, net: 140000 },
    { month: 'فبراير', operating: 135000, investing: -95000, financing: 80000, net: 120000 },
    { month: 'مارس', operating: 150000, investing: -40000, financing: 70000, net: 180000 },
  ],
};

const CashFlowManagement = () => {
  const showSnackbar = useSnackbar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('2026-Q1');

  const loadData = useCallback(async () => {
    try {
      const result = await accountingService.getCashFlow({ period });
      setData(result || mockCashFlowData);
    } catch (err) {
      logger.error('CashFlow error:', err);
      setData(mockCashFlowData);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !data)
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل التدفقات النقدية...
        </Typography>
      </Container>
    );

  const sections = [data.operating, data.investing, data.financing];
  const sectionColors = [statusColors.success, statusColors.warning, statusColors.info];
  const sectionIcons = ['📊', '📈', '🏦'];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <CashIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  التدفقات النقدية
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  قائمة التدفقات النقدية — تشغيلية واستثمارية وتمويلية
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>الفترة</InputLabel>
                <Select
                  value={period}
                  label="الفترة"
                  onChange={e => setPeriod(e.target.value)}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  <MenuItem value="2026-Q1">الربع الأول 2026</MenuItem>
                  <MenuItem value="2026-Q2">الربع الثاني 2026</MenuItem>
                  <MenuItem value="2025-Q4">الربع الرابع 2025</MenuItem>
                </Select>
              </FormControl>
              <Button
                startIcon={<PrintIcon />}
                variant="contained"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  borderRadius: 2,
                }}
              >
                طباعة
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'الرصيد الافتتاحي',
            value: `${data.openingCash?.toLocaleString()} ر.س`,
            icon: <BankIcon />,
            color: brandColors.primary,
          },
          {
            label: 'صافي التغير',
            value: `${data.netChange > 0 ? '+' : ''}${data.netChange?.toLocaleString()} ر.س`,
            icon: data.netChange >= 0 ? <TUpIcon /> : <TDownIcon />,
            color: data.netChange >= 0 ? statusColors.success : statusColors.error,
          },
          {
            label: 'الرصيد الختامي',
            value: `${data.closingCash?.toLocaleString()} ر.س`,
            icon: <BankIcon />,
            color: statusColors.info,
          },
        ].map((s, i) => (
          <Grid item xs={4} key={i}>
            <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
              <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: `${s.color}15`, color: s.color }}>{s.icon}</Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>
                    {s.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                    {s.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Activity Sections */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {sections.map((section, idx) => (
          <Grid item xs={12} key={idx}>
            <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <span>{sectionIcons[idx]}</span> {section.label}
                  <Chip
                    label={`${section.total >= 0 ? '+' : ''}${section.total?.toLocaleString()} ر.س`}
                    color={section.total >= 0 ? 'success' : 'error'}
                    size="small"
                    sx={{ ml: 'auto', fontWeight: 700 }}
                  />
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      {section.items?.map((item, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontWeight: 600, py: 1.5 }}>{item.label}</TableCell>
                          <TableCell align="left" sx={{ width: 180 }}>
                            <Typography
                              fontWeight={700}
                              sx={{
                                color: item.amount >= 0 ? statusColors.success : statusColors.error,
                              }}
                            >
                              {item.amount >= 0 ? '+' : ''}
                              {item.amount?.toLocaleString()} ر.س
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: surfaceColors.background }}>
                        <TableCell sx={{ fontWeight: 800, fontSize: 15 }}>
                          إجمالي {section.label}
                        </TableCell>
                        <TableCell align="left">
                          <Typography
                            fontWeight={800}
                            fontSize={15}
                            sx={{
                              color: section.total >= 0 ? statusColors.success : statusColors.error,
                            }}
                          >
                            {section.total >= 0 ? '+' : ''}
                            {section.total?.toLocaleString()} ر.س
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Net Cash Flow Summary */}
      <Card
        sx={{
          borderRadius: 3,
          border: `2px solid ${brandColors.primary}`,
          background: `linear-gradient(135deg, rgba(25,118,210,0.03), rgba(25,118,210,0.08))`,
        }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 2, textAlign: 'center' }}>
            ملخص التدفقات النقدية — {data.period}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>الرصيد الافتتاحي</TableCell>
                <TableCell align="left">
                  <Typography fontWeight={700} fontSize={15}>
                    {data.openingCash?.toLocaleString()} ر.س
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, pl: 4 }}>+ صافي الأنشطة التشغيلية</TableCell>
                <TableCell align="left">
                  <Typography fontWeight={600} sx={{ color: statusColors.success }}>
                    +{data.operating?.total?.toLocaleString()} ر.س
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, pl: 4 }}>
                  {data.investing?.total >= 0 ? '+' : '−'} صافي الأنشطة الاستثمارية
                </TableCell>
                <TableCell align="left">
                  <Typography
                    fontWeight={600}
                    sx={{
                      color: data.investing?.total >= 0 ? statusColors.success : statusColors.error,
                    }}
                  >
                    {data.investing?.total?.toLocaleString()} ر.س
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, pl: 4 }}>+ صافي الأنشطة التمويلية</TableCell>
                <TableCell align="left">
                  <Typography fontWeight={600} sx={{ color: statusColors.info }}>
                    +{data.financing?.total?.toLocaleString()} ر.س
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: `${brandColors.primary}10` }}>
                <TableCell sx={{ fontWeight: 800, fontSize: 18 }}>صافي التغير في النقدية</TableCell>
                <TableCell align="left">
                  <Typography
                    fontWeight={800}
                    fontSize={18}
                    sx={{ color: data.netChange >= 0 ? statusColors.success : statusColors.error }}
                  >
                    {data.netChange >= 0 ? '+' : ''}
                    {data.netChange?.toLocaleString()} ر.س
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: `${brandColors.primary}15` }}>
                <TableCell sx={{ fontWeight: 800, fontSize: 18 }}>الرصيد الختامي</TableCell>
                <TableCell align="left">
                  <Typography fontWeight={800} fontSize={18} sx={{ color: brandColors.primary }}>
                    {data.closingCash?.toLocaleString()} ر.س
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      {data.monthlyTrend?.length > 0 && (
        <Card sx={{ mt: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              الاتجاه الشهري
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: surfaceColors.background }}>
                    <TableCell sx={{ fontWeight: 700 }}>الشهر</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      تشغيلي
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      استثماري
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      تمويلي
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      الصافي
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.monthlyTrend.map((m, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{m.month}</TableCell>
                      <TableCell align="left">
                        <Typography sx={{ color: statusColors.success }}>
                          +{m.operating?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography sx={{ color: statusColors.error }}>
                          {m.investing?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography sx={{ color: statusColors.info }}>
                          +{m.financing?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography
                          fontWeight={700}
                          sx={{ color: m.net >= 0 ? statusColors.success : statusColors.error }}
                        >
                          {m.net >= 0 ? '+' : ''}
                          {m.net?.toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default CashFlowManagement;
