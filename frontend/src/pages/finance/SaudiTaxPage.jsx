/**
 * Saudi Tax Management Page — إدارة الضرائب السعودية (ZATCA)
 * AlAwael ERP
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,} from '@mui/material';


import saudiTaxService from '../../services/saudiTaxService';

const STATUS_MAP = {
  DRAFT: { label: 'مسودة', color: 'default' },
  FILED: { label: 'مقدم', color: 'info' },
  PAID: { label: 'مدفوع', color: 'success' },
  OVERDUE: { label: 'متأخر', color: 'error' },
  SUBMITTED: { label: 'مرسل', color: 'info' },
  APPROVED: { label: 'معتمد', color: 'success' },
  AMENDED: { label: 'معدل', color: 'warning' },
};

const getStatusChip = status => {
  const cfg = STATUS_MAP[status] || { label: status, color: 'default' };
  return <Chip label={cfg.label} color={cfg.color} size="small" />;
};

export default function SaudiTaxPage() {
  const [tab, setTab] = useState(0); // 0=VAT, 1=Filings, 2=WHT, 3=Stats
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Zakat Calculator Dialog ────────────────────────────────────────────
  const [zakatDialog, setZakatDialog] = useState(false);
  const [zakatForm, setZakatForm] = useState({
    totalAssets: '',
    totalLiabilities: '',
    exemptAssets: '',
  });
  const [zakatResult, setZakatResult] = useState(null);

  // ── Fetch Data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 0) {
        const res = await saudiTaxService.vat.getAll();
        setData(res.data?.data || res.data || []);
      } else if (tab === 1) {
        const res = await saudiTaxService.filings.getAll();
        setData(res.data?.data || res.data || []);
      } else if (tab === 2) {
        const res = await saudiTaxService.withholding.getAll();
        setData(res.data?.data || res.data || []);
      } else if (tab === 3) {
        const [statsRes, deadlinesRes] = await Promise.all([
          saudiTaxService.getStatistics(),
          saudiTaxService.getUpcomingDeadlines(),
        ]);
        setStats(statsRes.data?.data || statsRes.data);
        setDeadlines(deadlinesRes.data?.data || deadlinesRes.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Zakat Calculate ────────────────────────────────────────────────────
  const handleZakatCalc = async () => {
    try {
      const res = await saudiTaxService.calculateZakat({
        totalAssets: Number(zakatForm.totalAssets),
        totalLiabilities: Number(zakatForm.totalLiabilities),
        exemptAssets: Number(zakatForm.exemptAssets),
      });
      setZakatResult(res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في حساب الزكاة');
    }
  };

  // ── Table columns per tab ──────────────────────────────────────────────
  const renderTable = () => {
    if (tab === 3) return renderStatsTab();

    const columns =
      tab === 0
        ? ['رقم الإقرار', 'الفترة', 'المبيعات', 'الضريبة المستحقة', 'الحالة']
        : tab === 1
          ? ['رقم الإقرار', 'السنة الضريبية', 'النوع', 'المبلغ', 'الحالة']
          : ['الرقم المرجعي', 'المورد', 'المبلغ', 'نسبة الاستقطاع', 'الحالة'];

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map(col => (
                <TableCell key={col}>{col}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    لا توجد بيانات
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map(item => (
                <TableRow key={item._id} hover>
                  {tab === 0 && (
                    <>
                      <TableCell>{item.returnNumber || '—'}</TableCell>
                      <TableCell>{item.period || '—'}</TableCell>
                      <TableCell>
                        {item.totalSales?.toLocaleString('ar-SA')} ر.س
                      </TableCell>
                      <TableCell>
                        {item.vatDue?.toLocaleString('ar-SA')} ر.س
                      </TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                    </>
                  )}
                  {tab === 1 && (
                    <>
                      <TableCell>{item.filingNumber || '—'}</TableCell>
                      <TableCell>{item.taxYear || '—'}</TableCell>
                      <TableCell>{item.filingType || '—'}</TableCell>
                      <TableCell>
                        {item.totalAmount?.toLocaleString('ar-SA')} ر.س
                      </TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                    </>
                  )}
                  {tab === 2 && (
                    <>
                      <TableCell>{item.referenceNumber || '—'}</TableCell>
                      <TableCell>{item.vendorName || '—'}</TableCell>
                      <TableCell>
                        {item.amount?.toLocaleString('ar-SA')} ر.س
                      </TableCell>
                      <TableCell>{item.withholdingRate}%</TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderStatsTab = () => (
    <Grid container spacing={3}>
      {stats && (
        <>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              ملخص الضرائب
            </Typography>
          </Grid>
          {Object.entries(stats).map(([key, value]) => (
            <Grid item xs={6} md={3} key={key}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold">
                    {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {key}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </>
      )}
      {deadlines.length > 0 && (
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            <DeadlineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            المواعيد النهائية القادمة
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>النوع</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الوصف</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deadlines.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell>{d.type || '—'}</TableCell>
                    <TableCell>
                      {d.dueDate
                        ? new Date(d.dueDate).toLocaleDateString('ar-SA')
                        : '—'}
                    </TableCell>
                    <TableCell>{d.description || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      )}
    </Grid>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TaxIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold">
            إدارة الضرائب السعودية
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<CalcIcon />}
            onClick={() => setZakatDialog(true)}
            variant="outlined"
          >
            حاسبة الزكاة
          </Button>
          <Button startIcon={<RefreshIcon />} onClick={fetchData} variant="outlined" size="small">
            تحديث
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<VatIcon />} label="ضريبة القيمة المضافة" iconPosition="start" />
        <Tab icon={<FilingIcon />} label="الإقرارات الضريبية" iconPosition="start" />
        <Tab label="ضريبة الاستقطاع" />
        <Tab label="الإحصائيات" />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {renderTable()}

      {/* Zakat Calculator Dialog */}
      <Dialog open={zakatDialog} onClose={() => setZakatDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>حاسبة الزكاة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="إجمالي الأصول (ر.س)"
              type="number"
              value={zakatForm.totalAssets}
              onChange={e => setZakatForm(f => ({ ...f, totalAssets: e.target.value }))}
              fullWidth
            />
            <TextField
              label="إجمالي الالتزامات (ر.س)"
              type="number"
              value={zakatForm.totalLiabilities}
              onChange={e => setZakatForm(f => ({ ...f, totalLiabilities: e.target.value }))}
              fullWidth
            />
            <TextField
              label="الأصول المعفاة (ر.س)"
              type="number"
              value={zakatForm.exemptAssets}
              onChange={e => setZakatForm(f => ({ ...f, exemptAssets: e.target.value }))}
              fullWidth
            />
            <Button variant="contained" onClick={handleZakatCalc}>
              حساب الزكاة
            </Button>
            {zakatResult && (
              <Alert severity="info">
                <strong>الوعاء الزكوي:</strong>{' '}
                {zakatResult.zakatBase?.toLocaleString('ar-SA')} ر.س
                <br />
                <strong>مبلغ الزكاة المستحق:</strong>{' '}
                {zakatResult.zakatDue?.toLocaleString('ar-SA')} ر.س
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setZakatDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
