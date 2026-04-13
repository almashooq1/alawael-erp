 
import { useState, useEffect } from 'react';
import { getToken } from '../../utils/tokenStorage';


import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const WithholdingTaxPage = () => {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    vendorName: '',
    invoiceNumber: '',
    invoiceAmount: 0,
    taxRate: 5,
    taxType: 'services',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      const [recRes, sumRes] = await Promise.all([
        fetch(`${API}/finance/advanced/withholding-tax`, { headers }),
        fetch(`${API}/finance/advanced/withholding-tax/summary`, { headers }),
      ]);
      const recJson = await recRes.json();
      const sumJson = await sumRes.json();
      if (recJson.success) setRecords(recJson.data);
      if (sumJson.success) setSummary(sumJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/finance/advanced/withholding-tax`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setOpenDialog(false);
        resetForm();
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async id => {
    try {
      await fetch(`${API}/finance/advanced/withholding-tax/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () =>
    setForm({
      vendorName: '',
      invoiceNumber: '',
      invoiceAmount: 0,
      taxRate: 5,
      taxType: 'services',
      description: '',
    });

  const formatCurrency = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(v || 0);

  const taxTypes = [
    { value: 'services', label: 'خدمات' },
    { value: 'rent', label: 'إيجار' },
    { value: 'royalties', label: 'حقوق ملكية' },
    { value: 'dividends', label: 'أرباح موزعة' },
    { value: 'interest', label: 'فوائد' },
    { value: 'other', label: 'أخرى' },
  ];

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            ضريبة الاستقطاع
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Withholding Tax - إدارة ومتابعة ضريبة الاستقطاع
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{
            bgcolor: brandColors.primary,
            borderRadius: 2,
            fontWeight: 700,
            px: 3,
            '&:hover': { bgcolor: brandColors.primaryDark },
          }}
        >
          تسجيل استقطاع جديد
        </Button>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            {
              label: 'إجمالي المبالغ المستقطعة',
              value: formatCurrency(summary.totalWithheld),
              color: '#F44336',
            },
            {
              label: 'المبالغ المدفوعة',
              value: formatCurrency(summary.totalPaid),
              color: '#4CAF50',
            },
            {
              label: 'المبالغ المعلقة',
              value: formatCurrency(summary.totalPending),
              color: '#FF9800',
            },
            {
              label: 'عدد السجلات',
              value: summary.recordCount || records.length,
              color: brandColors.primary,
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
      )}

      {/* Quarterly Summary */}
      {summary?.quarterly && (
        <>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Summarize sx={{ color: brandColors.primary }} /> ملخص ربع سنوي
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            {summary.quarterly.map((q, i) => (
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
                  <Typography variant="subtitle2" fontWeight={700}>
                    {q.quarter}
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight={800}
                    sx={{ color: brandColors.primary, mt: 0.5 }}
                  >
                    {formatCurrency(q.amount)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                    {q.count} سجل
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      )}

      {/* Records Table */}
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>المورد</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>رقم الفاتورة</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  مبلغ الفاتورة
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  نسبة الاستقطاع
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  مبلغ الاستقطاع
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r, idx) => (
                <TableRow key={r._id || idx} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{r.vendorName}</TableCell>
                  <TableCell>{r.invoiceNumber}</TableCell>
                  <TableCell align="right">{formatCurrency(r.invoiceAmount)}</TableCell>
                  <TableCell align="right">{r.taxRate}%</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#F44336' }}>
                    {formatCurrency(r.withheldAmount || (r.invoiceAmount * r.taxRate) / 100)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={taxTypes.find(t => t.value === r.taxType)?.label || r.taxType}
                      sx={{
                        bgcolor: `${brandColors.primary}15`,
                        color: brandColors.primary,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        r.status === 'paid'
                          ? 'مدفوع'
                          : r.status === 'pending'
                            ? 'معلق'
                            : r.status || 'معلق'
                      }
                      sx={{
                        bgcolor: r.status === 'paid' ? '#4CAF5015' : '#FF980015',
                        color: r.status === 'paid' ? '#4CAF50' : '#FF9800',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(r.date || r.createdAt).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="حذف">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(r._id)}
                        sx={{ color: '#F44336' }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    align="center"
                    sx={{ py: 4, color: neutralColors.textSecondary }}
                  >
                    لا توجد سجلات استقطاع - أضف سجل جديد للبدء
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تسجيل استقطاع ضريبي جديد</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="اسم المورد"
              value={form.vendorName}
              onChange={e => setForm({ ...form, vendorName: e.target.value })}
              fullWidth
            />
            <TextField
              label="رقم الفاتورة"
              value={form.invoiceNumber}
              onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="مبلغ الفاتورة"
                type="number"
                value={form.invoiceAmount}
                onChange={e => setForm({ ...form, invoiceAmount: +e.target.value })}
                fullWidth
              />
              <TextField
                label="نسبة الاستقطاع %"
                type="number"
                value={form.taxRate}
                onChange={e => setForm({ ...form, taxRate: +e.target.value })}
                sx={{ width: 160 }}
              />
            </Box>
            <TextField
              select
              label="نوع الاستقطاع"
              value={form.taxType}
              onChange={e => setForm({ ...form, taxType: e.target.value })}
              fullWidth
            >
              {taxTypes.map(t => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="ملاحظات"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            {form.invoiceAmount > 0 && (
              <Card sx={{ bgcolor: '#FFF3E0', borderRadius: 2, p: 1.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  مبلغ الاستقطاع المتوقع:{' '}
                  {formatCurrency((form.invoiceAmount * form.taxRate) / 100)}
                </Typography>
                <Typography variant="body2">
                  صافي المبلغ للمورد:{' '}
                  {formatCurrency(form.invoiceAmount - (form.invoiceAmount * form.taxRate) / 100)}
                </Typography>
              </Card>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.vendorName || !form.invoiceAmount}
            sx={{
              bgcolor: brandColors.primary,
              fontWeight: 700,
              '&:hover': { bgcolor: brandColors.primaryDark },
            }}
          >
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WithholdingTaxPage;
