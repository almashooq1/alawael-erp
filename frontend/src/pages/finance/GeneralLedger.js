import { useState, useEffect, useCallback } from 'react';




import accountingService from 'services/accountingService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const mockLedgerData = {
  accounts: [
    {
      accountCode: '1100',
      accountName: 'النقدية',
      accountType: 'asset',
      openingBalance: 500000,
      entries: [
        {
          date: '2026-01-05',
          ref: 'JE-001',
          description: 'تحصيل إيرادات',
          debit: 150000,
          credit: 0,
          balance: 650000,
        },
        {
          date: '2026-01-10',
          ref: 'JE-003',
          description: 'دفع رواتب',
          debit: 0,
          credit: 85000,
          balance: 565000,
        },
        {
          date: '2026-01-15',
          ref: 'JE-005',
          description: 'تحصيل رسوم',
          debit: 200000,
          credit: 0,
          balance: 765000,
        },
        {
          date: '2026-01-20',
          ref: 'JE-007',
          description: 'دفع موردين',
          debit: 0,
          credit: 120000,
          balance: 645000,
        },
        {
          date: '2026-02-01',
          ref: 'JE-010',
          description: 'تحصيل أقساط',
          debit: 180000,
          credit: 0,
          balance: 825000,
        },
      ],
      closingBalance: 825000,
      totalDebit: 530000,
      totalCredit: 205000,
    },
    {
      accountCode: '1200',
      accountName: 'الذمم المدينة',
      accountType: 'asset',
      openingBalance: 350000,
      entries: [
        {
          date: '2026-01-08',
          ref: 'JE-002',
          description: 'فواتير مبيعات',
          debit: 280000,
          credit: 0,
          balance: 630000,
        },
        {
          date: '2026-01-15',
          ref: 'JE-005',
          description: 'تحصيل عملاء',
          debit: 0,
          credit: 200000,
          balance: 430000,
        },
        {
          date: '2026-02-01',
          ref: 'JE-010',
          description: 'تحصيل أقساط',
          debit: 0,
          credit: 180000,
          balance: 250000,
        },
      ],
      closingBalance: 250000,
      totalDebit: 280000,
      totalCredit: 380000,
    },
    {
      accountCode: '2100',
      accountName: 'الذمم الدائنة',
      accountType: 'liability',
      openingBalance: 220000,
      entries: [
        {
          date: '2026-01-12',
          ref: 'JE-004',
          description: 'فاتورة مورد',
          debit: 0,
          credit: 95000,
          balance: 315000,
        },
        {
          date: '2026-01-20',
          ref: 'JE-007',
          description: 'دفع موردين',
          debit: 120000,
          credit: 0,
          balance: 195000,
        },
      ],
      closingBalance: 195000,
      totalDebit: 120000,
      totalCredit: 95000,
    },
    {
      accountCode: '4100',
      accountName: 'إيرادات الخدمات',
      accountType: 'revenue',
      openingBalance: 0,
      entries: [
        {
          date: '2026-01-05',
          ref: 'JE-001',
          description: 'إيرادات تعليم',
          debit: 0,
          credit: 150000,
          balance: 150000,
        },
        {
          date: '2026-01-08',
          ref: 'JE-002',
          description: 'إيرادات استشارات',
          debit: 0,
          credit: 280000,
          balance: 430000,
        },
        {
          date: '2026-01-18',
          ref: 'JE-006',
          description: 'إيرادات تدريب',
          debit: 0,
          credit: 175000,
          balance: 605000,
        },
      ],
      closingBalance: 605000,
      totalDebit: 0,
      totalCredit: 605000,
    },
    {
      accountCode: '5100',
      accountName: 'مصاريف الرواتب',
      accountType: 'expense',
      openingBalance: 0,
      entries: [
        {
          date: '2026-01-10',
          ref: 'JE-003',
          description: 'رواتب يناير',
          debit: 85000,
          credit: 0,
          balance: 85000,
        },
        {
          date: '2026-02-10',
          ref: 'JE-012',
          description: 'رواتب فبراير',
          debit: 85000,
          credit: 0,
          balance: 170000,
        },
      ],
      closingBalance: 170000,
      totalDebit: 170000,
      totalCredit: 0,
    },
  ],
};

const accountTypeLabelMap = {
  asset: { label: 'أصول', color: 'primary' },
  liability: { label: 'التزامات', color: 'error' },
  equity: { label: 'حقوق ملكية', color: 'info' },
  revenue: { label: 'إيرادات', color: 'success' },
  expense: { label: 'مصروفات', color: 'warning' },
};

const GeneralLedger = () => {
  const _showSnackbar = useSnackbar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-12-31');

  const loadData = useCallback(async () => {
    try {
      const result = await accountingService.getGeneralLedger({ dateFrom, dateTo });
      setData(result && result.accounts ? result : mockLedgerData);
    } catch (err) {
      logger.error('GeneralLedger error:', err);
      setData(mockLedgerData);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const accounts = data?.accounts || [];
  const filtered = accounts.filter(a => {
    const typeMatch = filterType === 'all' || a.accountType === filterType;
    const searchMatch =
      !searchText || a.accountCode?.includes(searchText) || a.accountName?.includes(searchText);
    return typeMatch && searchMatch;
  });

  const totalDebitAll = accounts.reduce((s, a) => s + (a.totalDebit || 0), 0);
  const totalCreditAll = accounts.reduce((s, a) => s + (a.totalCredit || 0), 0);

  if (loading)
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل الأستاذ العام...
        </Typography>
      </Container>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <LedgerIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  الأستاذ العام
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  دفتر الأستاذ العام — جميع الحسابات والحركات
                </Typography>
              </Box>
            </Box>
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
        </CardContent>
      </Card>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'عدد الحسابات', value: accounts.length, color: brandColors.primary },
          {
            label: 'إجمالي المدين',
            value: `${totalDebitAll.toLocaleString()} ر.س`,
            color: statusColors.error,
          },
          {
            label: 'إجمالي الدائن',
            value: `${totalCreditAll.toLocaleString()} ر.س`,
            color: statusColors.success,
          },
          {
            label: 'الميزان',
            value: totalDebitAll === totalCreditAll ? '✓ متوازن' : '✗ غير متوازن',
            color: totalDebitAll === totalCreditAll ? statusColors.success : statusColors.error,
          },
        ].map((s, i) => (
          <Grid item xs={3} key={i}>
            <Card
              sx={{
                borderRadius: 2.5,
                border: `1px solid ${surfaceColors.border}`,
                textAlign: 'center',
              }}
            >
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>
                  {s.value}
                </Typography>
                <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="بحث بالكود أو الاسم..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            sx={{ flex: 1, minWidth: 180 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: neutralColors.textDisabled }} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>نوع الحساب</InputLabel>
            <Select
              value={filterType}
              label="نوع الحساب"
              onChange={e => setFilterType(e.target.value)}
            >
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="asset">أصول</MenuItem>
              <MenuItem value="liability">التزامات</MenuItem>
              <MenuItem value="equity">حقوق ملكية</MenuItem>
              <MenuItem value="revenue">إيرادات</MenuItem>
              <MenuItem value="expense">مصروفات</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="date"
            label="من"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <TextField
            size="small"
            type="date"
            label="إلى"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
        </CardContent>
      </Card>

      {/* Accounts List */}
      {selectedAccount ? (
        <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
          <CardContent>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {selectedAccount.accountCode} — {selectedAccount.accountName}
                </Typography>
                <Chip
                  label={accountTypeLabelMap[selectedAccount.accountType]?.label}
                  color={accountTypeLabelMap[selectedAccount.accountType]?.color}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Button
                variant="outlined"
                onClick={() => setSelectedAccount(null)}
                sx={{ borderRadius: 2 }}
              >
                العودة لجميع الحسابات
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: surfaceColors.background }}>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المرجع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>البيان</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      مدين
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      دائن
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      الرصيد
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow sx={{ bgcolor: 'rgba(25,118,210,0.04)' }}>
                    <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
                      الرصيد الافتتاحي
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell align="left">
                      <Typography fontWeight={700}>
                        {selectedAccount.openingBalance?.toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {selectedAccount.entries?.map((entry, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ color: brandColors.primary }}
                        >
                          {entry.ref}
                        </Typography>
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell
                        align="left"
                        sx={{ color: entry.debit > 0 ? statusColors.error : 'inherit' }}
                      >
                        {entry.debit > 0 ? entry.debit.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell
                        align="left"
                        sx={{ color: entry.credit > 0 ? statusColors.success : 'inherit' }}
                      >
                        {entry.credit > 0 ? entry.credit.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell align="left">
                        <Typography fontWeight={600}>{entry.balance?.toLocaleString()}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: surfaceColors.background }}>
                    <TableCell colSpan={3} sx={{ fontWeight: 800, fontSize: 14 }}>
                      الإجمالي والرصيد الختامي
                    </TableCell>
                    <TableCell align="left">
                      <Typography fontWeight={800} sx={{ color: statusColors.error }}>
                        {selectedAccount.totalDebit?.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography fontWeight={800} sx={{ color: statusColors.success }}>
                        {selectedAccount.totalCredit?.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography fontWeight={800} sx={{ color: brandColors.primary }}>
                        {selectedAccount.closingBalance?.toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.background }}>
                  <TableCell sx={{ fontWeight: 700 }}>كود الحساب</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>اسم الحساب</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="left">
                    الرصيد الافتتاحي
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="left">
                    إجمالي المدين
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="left">
                    إجمالي الدائن
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="left">
                    الرصيد الختامي
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحركات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(account => (
                  <TableRow
                    key={account.accountCode}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setSelectedAccount(account)}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: brandColors.primary }}
                      >
                        {account.accountCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {account.accountName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={accountTypeLabelMap[account.accountType]?.label}
                        color={accountTypeLabelMap[account.accountType]?.color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="left">{account.openingBalance?.toLocaleString()}</TableCell>
                    <TableCell align="left">
                      <Typography sx={{ color: statusColors.error }}>
                        {account.totalDebit?.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography sx={{ color: statusColors.success }}>
                        {account.totalCredit?.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography fontWeight={700}>
                        {account.closingBalance?.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={account.entries?.length || 0} size="small" variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography sx={{ color: neutralColors.textDisabled }}>
                        لا توجد حسابات مطابقة
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Container>
  );
};

export default GeneralLedger;
