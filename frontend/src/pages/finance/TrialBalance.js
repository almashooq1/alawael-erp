 
import { useState, useEffect } from 'react';
import { getToken } from '../../utils/tokenStorage';




import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const TrialBalance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchTrialBalance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear]);

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/advanced/trial-balance?fiscalYear=${fiscalYear}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('خطأ في جلب ميزان المراجعة:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = amount =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);

  const typeLabels = {
    asset: 'أصول',
    liability: 'خصوم',
    equity: 'حقوق ملكية',
    revenue: 'إيرادات',
    expense: 'مصروفات',
  };
  const typeColors = {
    asset: '#2196F3',
    liability: '#FF5722',
    equity: '#4CAF50',
    revenue: '#009688',
    expense: '#F44336',
  };

  const filteredRows = data?.rows?.filter(r => !filterType || r.accountType === filterType) || [];

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: neutralColors.textPrimary }}>
            ميزان المراجعة
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Trial Balance - السنة المالية {fiscalYear}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
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
          <TextField
            select
            size="small"
            label="نوع الحساب"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            sx={{ width: 150 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(typeLabels).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip title="طباعة">
            <IconButton>
              <Print />
            </IconButton>
          </Tooltip>
          <Tooltip title="تصدير">
            <IconButton>
              <FileDownload />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Balance Status */}
      {data && (
        <Alert
          severity={data.isBalanced ? 'success' : 'error'}
          icon={data.isBalanced ? <CheckCircle /> : <ErrorIcon />}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {data.isBalanced
            ? 'ميزان المراجعة متوازن ✓ - إجمالي المدين يساوي إجمالي الدائن'
            : `ميزان المراجعة غير متوازن! الفرق: ${formatCurrency(data.totals.difference)}`}
        </Alert>
      )}

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي المدين', value: data?.totals?.totalDebit, color: '#2196F3' },
          { label: 'إجمالي الدائن', value: data?.totals?.totalCredit, color: '#FF5722' },
          {
            label: 'عدد الحسابات',
            value: filteredRows.length,
            color: '#4CAF50',
            isCurrency: false,
          },
        ].map((item, i) => (
          <Card
            key={i}
            sx={{
              flex: 1,
              minWidth: 200,
              borderRadius: 2,
              border: `1px solid ${surfaceColors.border}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                {item.label}
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: item.color, mt: 0.5 }}>
                {item.isCurrency === false ? item.value : formatCurrency(item.value || 0)}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Table */}
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>رقم الحساب</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>اسم الحساب</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  مدين
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  دائن
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  الرصيد
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((row, idx) => (
                <TableRow
                  key={idx}
                  hover
                  sx={{ '&:hover': { bgcolor: `${brandColors.primary}08` } }}
                >
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {row.accountCode}
                  </TableCell>
                  <TableCell>{row.accountName}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={typeLabels[row.accountType] || row.accountType}
                      sx={{
                        bgcolor: `${typeColors[row.accountType] || '#999'}15`,
                        color: typeColors[row.accountType] || '#999',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 600, color: row.debit > 0 ? '#2196F3' : 'inherit' }}
                  >
                    {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 600, color: row.credit > 0 ? '#FF5722' : 'inherit' }}
                  >
                    {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {formatCurrency(row.balance)}
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals Row */}
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell colSpan={3} sx={{ fontWeight: 800, fontSize: '1rem' }}>
                  المجموع
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 800, fontSize: '1rem', color: '#2196F3' }}
                >
                  {formatCurrency(data?.totals?.totalDebit || 0)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 800, fontSize: '1rem', color: '#FF5722' }}
                >
                  {formatCurrency(data?.totals?.totalCredit || 0)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem' }}>
                  {formatCurrency(data?.totals?.difference || 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
};

export default TrialBalance;
