/**
 * قائمة أوامر الشراء — Purchase Orders List
 */
import { useState, useEffect, useCallback } from 'react';


import { getPurchaseOrders, createPurchaseOrder } from '../../services/procurement.service';

const statusOptions = [
  { value: 'draft', label: 'مسودة', color: 'default' },
  { value: 'sent', label: 'مرسل', color: 'info' },
  { value: 'confirmed', label: 'مؤكد', color: 'primary' },
  { value: 'partial', label: 'جزئي', color: 'warning' },
  { value: 'received', label: 'مستلم', color: 'success' },
  { value: 'cancelled', label: 'ملغي', color: 'error' },
];

const paymentOptions = [
  { value: 'unpaid', label: 'غير مدفوع', color: 'error' },
  { value: 'partial', label: 'جزئي', color: 'warning' },
  { value: 'paid', label: 'مدفوع', color: 'success' },
];

const emptyForm = { vendorName: '', status: 'draft', total: '', notes: '' };

export default function PurchaseOrdersList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(10);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getPurchaseOrders({ page: page + 1, limit: rpp });
    setRows(r.data || []);
    setLoading(false);
  }, [page, rpp]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    await createPurchaseOrder({ vendor: { name: form.vendorName }, status: form.status, total: Number(form.total) || 0, notes: form.notes });
    setOpen(false); setForm(emptyForm); load();
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">أوامر الشراء</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(emptyForm); setOpen(true); }}>أمر شراء جديد</Button>
        </Box>
      </Box>

      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>رقم الأمر</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>المورد</TableCell>
                  <TableCell>الإجمالي</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>حالة الدفع</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{r.orderNumber}</TableCell>
                    <TableCell>{r.date ? new Date(r.date).toLocaleDateString('ar-SA') : '—'}</TableCell>
                    <TableCell>{r.vendor?.name}</TableCell>
                    <TableCell>{(r.total || 0).toLocaleString()} ر.س</TableCell>
                    <TableCell>
                      <Chip size="small" label={statusOptions.find((o) => o.value === r.status)?.label || r.status} color={statusOptions.find((o) => o.value === r.status)?.color || 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={paymentOptions.find((o) => o.value === r.paymentStatus)?.label || r.paymentStatus} color={paymentOptions.find((o) => o.value === r.paymentStatus)?.color || 'default'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination component="div" count={-1} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rpp} onRowsPerPageChange={(e) => { setRpp(+e.target.value); setPage(0); }} labelRowsPerPage="عدد الصفوف:" />
          </>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>أمر شراء جديد</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="اسم المورد" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} fullWidth required />
          <TextField select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField label="الإجمالي (ر.س)" type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
          <TextField label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
