 
import { useState, useEffect } from 'react';
import { getToken } from '../../utils/tokenStorage';


import { surfaceColors, neutralColors, brandColors, statusColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const CreditDebitNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0); // 0 = all, 1 = credit, 2 = debit
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    type: 'credit',
    partyType: 'customer',
    partyName: '',
    reason: 'return',
    originalInvoiceNumber: '',
    items: [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }],
  });

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/advanced/credit-notes`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setNotes(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const items = form.items.map(i => ({ ...i, amount: i.quantity * i.unitPrice }));
      const res = await fetch(`${API}/finance/advanced/credit-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ...form, items }),
      });
      const json = await res.json();
      if (json.success) {
        setNotes(prev => [json.data, ...prev]);
        setOpenDialog(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async id => {
    try {
      await fetch(`${API}/finance/advanced/credit-notes/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchNotes();
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(v || 0);

  const filteredNotes =
    tab === 0
      ? notes
      : tab === 1
        ? notes.filter(n => n.type === 'credit')
        : notes.filter(n => n.type === 'debit');

  const statusConfig = {
    draft: { label: 'مسودة', color: neutralColors.textSecondary },
    pending: { label: 'بانتظار الاعتماد', color: statusColors.warning },
    approved: { label: 'معتمد', color: statusColors.success },
    applied: { label: 'تم التطبيق', color: brandColors.primary },
    cancelled: { label: 'ملغي', color: statusColors.error },
  };

  const reasonLabels = {
    return: 'إرجاع بضاعة',
    discount: 'خصم',
    pricing_error: 'خطأ في التسعير',
    service_issue: 'مشكلة في الخدمة',
    quality_issue: 'مشكلة جودة',
    overcharge: 'مبلغ زائد',
    other: 'أخرى',
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
            إشعارات الدائن والمدين
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Credit & Debit Notes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<NoteAdd />}
          onClick={() => setOpenDialog(true)}
          sx={{ bgcolor: brandColors.primary, borderRadius: 2, fontWeight: 700 }}
        >
          إشعار جديد
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`الكل (${notes.length})`} />
        <Tab label={`إشعارات دائنة (${notes.filter(n => n.type === 'credit').length})`} />
        <Tab label={`إشعارات مدينة (${notes.filter(n => n.type === 'debit').length})`} />
      </Tabs>

      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>رقم الإشعار</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الطرف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>السبب</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  المبلغ
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفاتورة الأصلية</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredNotes.map((note, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {note.noteNumber}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={note.type === 'credit' ? 'إشعار دائن' : 'إشعار مدين'}
                      sx={{
                        bgcolor: note.type === 'credit' ? '#4CAF5015' : '#FF572215',
                        color: note.type === 'credit' ? '#4CAF50' : '#FF5722',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {note.partyName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                        {note.partyType === 'customer' ? 'عميل' : 'مورد'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{reasonLabels[note.reason] || note.reason}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {formatCurrency(note.totalAmount)}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {note.originalInvoiceNumber || '-'}
                  </TableCell>
                  <TableCell>{note.issueDate?.slice(0, 10)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={statusConfig[note.status]?.label || note.status}
                      sx={{
                        bgcolor: `${statusConfig[note.status]?.color || '#999'}20`,
                        color: statusConfig[note.status]?.color,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="عرض">
                        <IconButton size="small">
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {(note.status === 'draft' || note.status === 'pending') && (
                        <Tooltip title="اعتماد">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprove(note._id)}
                          >
                            <Check fontSize="small" />
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
        <DialogTitle sx={{ fontWeight: 700 }}>إنشاء إشعار جديد</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              label="نوع الإشعار"
              fullWidth
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
            >
              <MenuItem value="credit">إشعار دائن</MenuItem>
              <MenuItem value="debit">إشعار مدين</MenuItem>
            </TextField>
            <TextField
              select
              label="نوع الطرف"
              fullWidth
              value={form.partyType}
              onChange={e => setForm({ ...form, partyType: e.target.value })}
            >
              <MenuItem value="customer">عميل</MenuItem>
              <MenuItem value="supplier">مورد</MenuItem>
            </TextField>
          </Box>
          <TextField
            label="اسم الطرف"
            fullWidth
            value={form.partyName}
            onChange={e => setForm({ ...form, partyName: e.target.value })}
          />
          <TextField
            select
            label="السبب"
            fullWidth
            value={form.reason}
            onChange={e => setForm({ ...form, reason: e.target.value })}
          >
            {Object.entries(reasonLabels).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="رقم الفاتورة الأصلية"
            fullWidth
            value={form.originalInvoiceNumber}
            onChange={e => setForm({ ...form, originalInvoiceNumber: e.target.value })}
          />
          <Typography variant="subtitle2" fontWeight={700}>
            البنود:
          </Typography>
          {form.items.map((item, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="الوصف"
                size="small"
                sx={{ flex: 2 }}
                value={item.description}
                onChange={e => {
                  const items = [...form.items];
                  items[idx].description = e.target.value;
                  setForm({ ...form, items });
                }}
              />
              <TextField
                label="الكمية"
                type="number"
                size="small"
                sx={{ width: 80 }}
                value={item.quantity}
                onChange={e => {
                  const items = [...form.items];
                  items[idx].quantity = Number(e.target.value);
                  setForm({ ...form, items });
                }}
              />
              <TextField
                label="السعر"
                type="number"
                size="small"
                sx={{ width: 120 }}
                value={item.unitPrice}
                onChange={e => {
                  const items = [...form.items];
                  items[idx].unitPrice = Number(e.target.value);
                  setForm({ ...form, items });
                }}
              />
            </Box>
          ))}
          <Button
            size="small"
            onClick={() =>
              setForm({
                ...form,
                items: [...form.items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }],
              })
            }
          >
            + إضافة بند
          </Button>
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

export default CreditDebitNotes;
