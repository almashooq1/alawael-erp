import { useState, useEffect } from 'react';
import eInvoicingService from '../../services/eInvoicing.service';
import {
  Paper,
} from '@mui/material';


import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors } from '../../theme/palette';

const demoInvoices = [
  {
    _id: 'inv1',
    invoiceNumber: 'INV-2026-0001',
    type: 'standard',
    customer: 'مؤسسة الأمل',
    amount: 45000,
    vat: 6750,
    total: 51750,
    status: 'issued',
    zatcaStatus: 'reported',
    issueDate: '2026-02-01',
    dueDate: '2026-03-01',
  },
  {
    _id: 'inv2',
    invoiceNumber: 'INV-2026-0002',
    type: 'simplified',
    customer: 'نقداً',
    amount: 1500,
    vat: 225,
    total: 1725,
    status: 'paid',
    zatcaStatus: 'cleared',
    issueDate: '2026-02-15',
    dueDate: '2026-02-15',
  },
  {
    _id: 'inv3',
    invoiceNumber: 'CN-2026-0001',
    type: 'credit_note',
    customer: 'مؤسسة الأمل',
    amount: -5000,
    vat: -750,
    total: -5750,
    status: 'issued',
    zatcaStatus: 'reported',
    issueDate: '2026-02-18',
    dueDate: '2026-02-18',
  },
  {
    _id: 'inv4',
    invoiceNumber: 'INV-2026-0003',
    type: 'standard',
    customer: 'شركة التأمين',
    amount: 120000,
    vat: 18000,
    total: 138000,
    status: 'overdue',
    zatcaStatus: 'reported',
    issueDate: '2026-01-10',
    dueDate: '2026-02-10',
  },
];

const demoStats = {
  total: 320,
  issued: 245,
  paid: 198,
  overdue: 22,
  totalAmount: 4560000,
  totalVat: 684000,
};
const statusMap = {
  draft: { label: 'مسودة', color: 'default' },
  issued: { label: 'صادرة', color: 'info' },
  paid: { label: 'مدفوعة', color: 'success' },
  overdue: { label: 'متأخرة', color: 'error' },
  cancelled: { label: 'ملغاة', color: 'default' },
};
const typeMap = {
  standard: 'فاتورة ضريبية',
  simplified: 'فاتورة مبسطة',
  credit_note: 'إشعار دائن',
  debit_note: 'إشعار مدين',
};
const zatcaMap = {
  reported: { label: 'مُبلّغة', color: 'success' },
  cleared: { label: 'مُعتمدة', color: 'primary' },
  pending: { label: 'معلقة', color: 'warning' },
  rejected: { label: 'مرفوضة', color: 'error' },
};

export default function EInvoicing() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(demoStats);
  const [tab, setTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ type: 'standard', customer: '', amount: '', items: '' });
  const showSnackbar = useSnackbar();

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await eInvoicingService.getAll();
        setInvoices(res.data || []);
        const statsRes = await eInvoicingService.getStats();
        setStats(statsRes.data || demoStats);
      } catch {
        setInvoices(demoInvoices);
        setStats(demoStats);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    if (!form.customer || !form.amount) {
      showSnackbar('العميل والمبلغ مطلوبان', 'warning');
      return;
    }
    const amount = +form.amount;
    const vat = amount * 0.15;
    const payload = { ...form, amount, vat, total: amount + vat };
    try {
      const res = await eInvoicingService.create(payload);
      setInvoices(prev => [
        ...prev,
        res.data || {
          ...payload,
          _id: Date.now().toString(),
          invoiceNumber: `INV-${Date.now()}`,
          status: 'draft',
          zatcaStatus: 'pending',
          issueDate: new Date().toISOString().slice(0, 10),
          dueDate: '',
        },
      ]);
      showSnackbar('تم إنشاء الفاتورة بنجاح', 'success');
    } catch {
      setInvoices(prev => [
        ...prev,
        {
          ...payload,
          _id: Date.now().toString(),
          invoiceNumber: `INV-${Date.now()}`,
          status: 'draft',
          zatcaStatus: 'pending',
          issueDate: new Date().toISOString().slice(0, 10),
          dueDate: '',
        },
      ]);
      showSnackbar('تم إنشاء الفاتورة محلياً - لم يتصل بالخادم', 'warning');
    }
    setDialogOpen(false);
    setForm({ type: 'standard', customer: '', amount: '', items: '' });
  };

  const filtered =
    tab === 0
      ? invoices
      : tab === 1
        ? invoices.filter(i => i.status === 'issued')
        : tab === 2
          ? invoices.filter(i => i.status === 'paid')
          : invoices.filter(i => i.status === 'overdue');

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ background: gradients.success, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <InvoiceIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              الفوترة الإلكترونية
            </Typography>
            <Typography variant="body2">إدارة الفواتير والربط مع زاتكا</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          فاتورة جديدة
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الفواتير', value: stats.total, color: statusColors.primaryBlue },
          { label: 'مدفوعة', value: stats.paid, color: statusColors.successDeep },
          { label: 'متأخرة', value: stats.overdue, color: statusColors.errorDark },
          {
            label: 'إجمالي المبالغ',
            value: `${(stats.totalAmount / 1000000).toFixed(1)}M ر.س`,
            color: statusColors.purple,
          },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: s.color, fontWeight: 'bold' }}>
                  {s.value}
                </Typography>
                <Typography color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="الكل" />
          <Tab label="صادرة" />
          <Tab label="مدفوعة" />
          <Tab label="متأخرة" />
        </Tabs>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>رقم الفاتورة</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>العميل</TableCell>
              <TableCell>المبلغ</TableCell>
              <TableCell>الضريبة</TableCell>
              <TableCell>الإجمالي</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>ZATCA</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(inv => (
              <TableRow key={inv._id}>
                <TableCell>{inv.invoiceNumber}</TableCell>
                <TableCell>{typeMap[inv.type] || inv.type}</TableCell>
                <TableCell>{inv.customer}</TableCell>
                <TableCell>{Number(inv.amount).toLocaleString()} ر.س</TableCell>
                <TableCell>{Number(inv.vat).toLocaleString()} ر.س</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {Number(inv.total).toLocaleString()} ر.س
                </TableCell>
                <TableCell>
                  <Chip
                    label={statusMap[inv.status]?.label}
                    color={statusMap[inv.status]?.color}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={zatcaMap[inv.zatcaStatus]?.label}
                    color={zatcaMap[inv.zatcaStatus]?.color}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="رمز QR">
                    <IconButton aria-label="إجراء" size="small">
                      <QrIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تحميل PDF">
                    <IconButton aria-label="إجراء" size="small">
                      <PdfIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="إرسال ZATCA">
                    <IconButton aria-label="إرسال" size="small" color="primary">
                      <SendIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>فاتورة إلكترونية جديدة</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="النوع"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          >
            {Object.entries(typeMap).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="العميل"
            value={form.customer}
            onChange={e => setForm({ ...form, customer: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="المبلغ قبل الضريبة (ر.س)"
            type="number"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            sx={{ mb: 2 }}
          />
          {form.amount && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              الضريبة (15%): {(+form.amount * 0.15).toLocaleString()} ر.س | الإجمالي:{' '}
              {(+form.amount * 1.15).toLocaleString()} ر.س
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
