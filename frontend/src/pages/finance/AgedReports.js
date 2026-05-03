import { useState, useEffect } from 'react';
import { getToken } from '../../utils/tokenStorage';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import { Timer, TrendingDown } from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const AgedReports = () => {
  const [receivablesData, setReceivablesData] = useState(null);
  const [payablesData, setPayablesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, payRes] = await Promise.all([
        fetch(`${API}/finance/advanced/aged-receivables`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API}/finance/advanced/aged-payables`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);
      const recJson = await recRes.json();
      const payJson = await payRes.json();
      if (recJson.success) setReceivablesData(recJson.data);
      if (payJson.success) setPayablesData(payJson.data);
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

  const bucketColors = {
    current: '#4CAF50',
    '1-30': '#FF9800',
    '31-60': '#FF5722',
    '61-90': '#E91E63',
    '90+': '#F44336',
  };
  const bucketLabels = {
    current: 'جاري',
    '1-30': '1-30 يوم',
    '31-60': '31-60 يوم',
    '61-90': '61-90 يوم',
    '90+': 'أكثر من 90 يوم',
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  const activeData = tab === 0 ? receivablesData : payablesData;
  const summary = activeData?.summary || {};
  const details = activeData?.details || [];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          تقارير أعمار الذمم
        </Typography>
        <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
          Aged Reports - تحليل أعمار الذمم المدينة والدائنة
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="الذمم المدينة (Receivables)" icon={<TrendingDown />} iconPosition="start" />
        <Tab label="الذمم الدائنة (Payables)" icon={<Timer />} iconPosition="start" />
      </Tabs>

      {/* Aging Buckets */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'جاري (لم يستحق)', value: summary.current, color: '#4CAF50' },
          { label: '1-30 يوم', value: summary.days30, color: '#FF9800' },
          { label: '31-60 يوم', value: summary.days60, color: '#FF5722' },
          { label: '61-90 يوم', value: summary.days90, color: '#E91E63' },
          { label: 'أكثر من 90 يوم', value: summary.over90, color: '#F44336' },
          { label: 'الإجمالي', value: summary.total, color: brandColors.primary },
        ].map((item, i) => (
          <Card
            key={i}
            sx={{
              flex: 1,
              minWidth: 150,
              borderRadius: 2,
              border: `1px solid ${surfaceColors.border}`,
              borderTop: `3px solid ${item.color}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                {item.label}
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: item.color, mt: 0.5 }}>
                {formatCurrency(item.value)}
              </Typography>
              {summary.total > 0 && item.value && i < 5 && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.round((item.value / summary.total) * 100)}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': { bgcolor: item.color },
                    }}
                  />
                  <Typography variant="caption">
                    {Math.round((item.value / summary.total) * 100)}%
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Details Table */}
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>
                  {tab === 0 ? 'رقم الفاتورة' : 'المرجع'}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{tab === 0 ? 'العميل' : 'المورد'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ الاستحقاق</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  المبلغ المستحق
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  أيام التأخير
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفئة العمرية</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {details.map((item, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {item.invoiceNumber || item.reference}
                  </TableCell>
                  <TableCell>{item.customerName || item.supplierName}</TableCell>
                  <TableCell>{item.dueDate?.slice(0, 10)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {formatCurrency(item.outstanding || item.amount)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={`${item.daysPastDue} يوم`}
                      sx={{
                        bgcolor:
                          item.daysPastDue > 60
                            ? '#F4433615'
                            : item.daysPastDue > 30
                              ? '#FF572215'
                              : '#4CAF5015',
                        color:
                          item.daysPastDue > 60
                            ? '#F44336'
                            : item.daysPastDue > 30
                              ? '#FF5722'
                              : '#4CAF50',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={bucketLabels[item.bucket] || item.bucket}
                      sx={{
                        bgcolor: `${bucketColors[item.bucket] || '#999'}15`,
                        color: bucketColors[item.bucket] || '#999',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
};

export default AgedReports;
