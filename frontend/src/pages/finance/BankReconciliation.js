import { useState, useEffect } from 'react';




import { surfaceColors, neutralColors, brandColors, statusColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const BankReconciliation = () => {
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    bankName: '',
    periodStart: '',
    periodEnd: '',
    bankStatementBalance: '',
    bookBalance: '',
  });

  useEffect(() => {
    fetchReconciliations();
  }, []);

  const fetchReconciliations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/advanced/bank-reconciliation`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (json.success) setReconciliations(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/finance/advanced/bank-reconciliation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...form,
          bankStatementBalance: Number(form.bankStatementBalance),
          bookBalance: Number(form.bookBalance),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setReconciliations(prev => [json.data, ...prev]);
        setOpenDialog(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoMatch = async id => {
    try {
      const res = await fetch(`${API}/finance/advanced/bank-reconciliation/${id}/auto-match`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (json.success)
        alert(`تمت المطابقة: ${json.data.matched} عملية مطابقة، ${json.data.unmatched} غير مطابقة`);
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = amount =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount || 0);

  const statusConfig = {
    completed: { label: 'مكتمل', color: statusColors.success },
    in_progress: { label: 'قيد التنفيذ', color: statusColors.warning },
    draft: { label: 'مسودة', color: neutralColors.textSecondary },
  };

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
            التسوية البنكية
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Bank Reconciliation - مطابقة كشف الحساب البنكي مع الدفاتر
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{ bgcolor: brandColors.primary, borderRadius: 2, fontWeight: 700 }}
        >
          تسوية جديدة
        </Button>
      </Box>

      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>رقم التسوية</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>البنك</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفترة</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  رصيد البنك
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  رصيد الدفاتر
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  الفرق
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>مطابقة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reconciliations.map((recon, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {recon.reconciliationNumber}
                  </TableCell>
                  <TableCell>{recon.bankName}</TableCell>
                  <TableCell>
                    {recon.periodStart?.slice(0, 10)} → {recon.periodEnd?.slice(0, 10)}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(recon.bankStatementBalance)}</TableCell>
                  <TableCell align="right">{formatCurrency(recon.bookBalance)}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                      color: recon.difference === 0 ? statusColors.success : statusColors.error,
                    }}
                  >
                    {formatCurrency(recon.difference)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={statusConfig[recon.status]?.label || recon.status}
                      sx={{
                        bgcolor: `${statusConfig[recon.status]?.color || '#999'}20`,
                        color: statusConfig[recon.status]?.color,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Typography variant="caption" color="success.main">
                        {recon.autoMatchCount || 0} تلقائي
                      </Typography>
                      <Typography variant="caption"> / </Typography>
                      <Typography variant="caption" color="warning.main">
                        {recon.unmatchedCount || 0} غير مطابق
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="مطابقة تلقائية">
                        <IconButton size="small" onClick={() => handleAutoMatch(recon._id)}>
                          <AutoFixHigh fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="عرض التفاصيل">
                        <IconButton size="small">
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {recon.status !== 'completed' && (
                        <Tooltip title="إكمال واعتماد">
                          <IconButton size="small" color="success">
                            <DoneAll fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إنشاء تسوية بنكية جديدة</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="اسم البنك"
            fullWidth
            value={form.bankName}
            onChange={e => setForm({ ...form, bankName: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="بداية الفترة"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.periodStart}
              onChange={e => setForm({ ...form, periodStart: e.target.value })}
            />
            <TextField
              label="نهاية الفترة"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.periodEnd}
              onChange={e => setForm({ ...form, periodEnd: e.target.value })}
            />
          </Box>
          <TextField
            label="رصيد كشف حساب البنك"
            type="number"
            fullWidth
            value={form.bankStatementBalance}
            onChange={e => setForm({ ...form, bankStatementBalance: e.target.value })}
          />
          <TextField
            label="رصيد الدفاتر"
            type="number"
            fullWidth
            value={form.bookBalance}
            onChange={e => setForm({ ...form, bookBalance: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ bgcolor: brandColors.primary }}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BankReconciliation;
