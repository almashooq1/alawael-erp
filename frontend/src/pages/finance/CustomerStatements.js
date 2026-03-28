import { useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
  Button,
  TextField,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  AccountBalance,
  Receipt,
  Print,
  Download,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const CustomerStatements = () => {
  const [transactions, setTransactions] = useState([]);
  const [parties, setParties] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [partyType, setPartyType] = useState('customer');
  const [selectedParty, setSelectedParty] = useState('');
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  const headers = { Authorization: `Bearer ${getToken()}` };

  // Fetch parties
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${API}/finance/extended/customer-statements/parties?partyType=${partyType}`,
          { headers }
        );
        const json = await res.json();
        if (json.success) setParties(json.data);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [partyType]);

  const fetchStatement = useCallback(async () => {
    if (!selectedParty) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        partyType,
        partyId: selectedParty,
        startDate: dateFrom,
        endDate: dateTo,
      });
      const res = await fetch(`${API}/finance/extended/customer-statements?${params}`, { headers });
      const json = await res.json();
      if (json.success) {
        setTransactions(json.data.transactions || json.data);
        setSummary(json.data.summary || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [partyType, selectedParty, dateFrom, dateTo]);

  const fc = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(v || 0);

  const partyLabel = partyType === 'customer' ? 'العميل' : 'المورد';
  const partyName = parties.find(p => (p._id || p.id) === selectedParty)?.name || selectedParty;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          كشوف حساب {partyType === 'customer' ? 'العملاء' : 'الموردين'}
        </Typography>
        <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
          {partyType === 'customer' ? 'Customer' : 'Vendor'} Statements - عرض تفصيلي لحركات الحساب
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              select
              label="نوع الطرف"
              value={partyType}
              onChange={e => {
                setPartyType(e.target.value);
                setSelectedParty('');
              }}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="customer">عميل</MenuItem>
              <MenuItem value="vendor">مورد</MenuItem>
            </TextField>
            <TextField
              select
              label={`اختر ${partyLabel}`}
              value={selectedParty}
              onChange={e => setSelectedParty(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              {parties.map(p => (
                <MenuItem key={p._id || p.id} value={p._id || p.id}>
                  {p.name} {p.code ? `(${p.code})` : ''}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="من تاريخ"
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="إلى تاريخ"
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button
              variant="contained"
              onClick={fetchStatement}
              disabled={!selectedParty}
              sx={{
                bgcolor: brandColors.primary,
                fontWeight: 700,
                px: 3,
                height: 56,
                borderRadius: 2,
                '&:hover': { bgcolor: brandColors.primaryDark },
              }}
            >
              عرض الكشف
            </Button>
          </Box>
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && transactions.length > 0 && (
        <>
          {/* Summary */}
          {summary && (
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              {[
                {
                  label: 'الرصيد الافتتاحي',
                  value: fc(summary.openingBalance),
                  color: '#607D8B',
                  icon: <AccountBalance />,
                },
                {
                  label: 'إجمالي المدين',
                  value: fc(summary.totalDebit),
                  color: '#F44336',
                  icon: <TrendingDown />,
                },
                {
                  label: 'إجمالي الدائن',
                  value: fc(summary.totalCredit),
                  color: '#4CAF50',
                  icon: <TrendingUp />,
                },
                {
                  label: 'الرصيد الختامي',
                  value: fc(summary.closingBalance),
                  color: summary.closingBalance >= 0 ? '#4CAF50' : '#F44336',
                  icon: <Receipt />,
                },
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
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Box sx={{ color: item.color, mb: 0.5 }}>{item.icon}</Box>
                    <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                      {item.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ color: item.color }}>
                      {item.value}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* Statement Header */}
          <Card
            sx={{
              mb: 0,
              borderRadius: '12px 12px 0 0',
              border: `1px solid ${surfaceColors.border}`,
              borderBottom: 'none',
            }}
          >
            <CardContent
              sx={{
                py: 1.5,
                px: 2.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  كشف حساب: {partyName}
                </Typography>
                <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                  من {new Date(dateFrom).toLocaleDateString('ar-SA')} إلى{' '}
                  {new Date(dateTo).toLocaleDateString('ar-SA')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  startIcon={<Print />}
                  variant="outlined"
                  onClick={() => window.print()}
                  sx={{ borderRadius: 2 }}
                >
                  طباعة
                </Button>
                <Button
                  size="small"
                  startIcon={<Download />}
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                >
                  تصدير PDF
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Transaction Table */}
          <Card sx={{ borderRadius: '0 0 12px 12px', border: `1px solid ${surfaceColors.border}` }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: surfaceColors.card }}>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المرجع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الوصف</TableCell>
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
                  {transactions.map((tx, idx) => (
                    <TableRow key={tx._id || idx} hover>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{new Date(tx.date).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {tx.reference || '-'}
                      </TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: tx.debit > 0 ? '#F44336' : 'transparent', fontWeight: 700 }}
                      >
                        {tx.debit > 0 ? fc(tx.debit) : '-'}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: tx.credit > 0 ? '#4CAF50' : 'transparent', fontWeight: 700 }}
                      >
                        {tx.credit > 0 ? fc(tx.credit) : '-'}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 800,
                          color: (tx.runningBalance || tx.balance) >= 0 ? '#4CAF50' : '#F44336',
                        }}
                      >
                        {fc(tx.runningBalance || tx.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Totals Row */}
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, gap: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                  إجمالي المدين
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#F44336' }}>
                  {fc(transactions.reduce((s, t) => s + (t.debit || 0), 0))}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                  إجمالي الدائن
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#4CAF50' }}>
                  {fc(transactions.reduce((s, t) => s + (t.credit || 0), 0))}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                  الرصيد الختامي
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: brandColors.primary }}>
                  {transactions.length > 0
                    ? fc(
                        transactions[transactions.length - 1].runningBalance ||
                          transactions[transactions.length - 1].balance
                      )
                    : fc(0)}
                </Typography>
              </Box>
            </Box>
          </Card>
        </>
      )}

      {!loading && !selectedParty && (
        <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <AccountBalance sx={{ fontSize: 56, color: neutralColors.textSecondary, mb: 2 }} />
            <Typography variant="h6" sx={{ color: neutralColors.textSecondary }}>
              اختر {partyLabel} لعرض كشف الحساب
            </Typography>
            <Typography variant="body2" sx={{ color: neutralColors.textDisabled, mt: 1 }}>
              يمكنك اختيار الفترة الزمنية المطلوبة ثم الضغط على "عرض الكشف"
            </Typography>
          </CardContent>
        </Card>
      )}

      {!loading && selectedParty && transactions.length === 0 && (
        <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Receipt sx={{ fontSize: 48, color: neutralColors.textSecondary, mb: 2 }} />
            <Typography variant="h6" sx={{ color: neutralColors.textSecondary }}>
              لا توجد حركات في الفترة المحددة
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default CustomerStatements;
