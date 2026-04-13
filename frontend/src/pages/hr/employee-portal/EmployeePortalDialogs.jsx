


/* ══════════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════════ */

const LEAVE_TYPES = [
  { value: 'annual', label: 'سنوية' },
  { value: 'sick', label: 'مرضية' },
  { value: 'emergency', label: 'طارئة' },
  { value: 'personal', label: 'شخصية' },
];

const REQUEST_TYPES = [
  { value: 'salary_certificate', label: 'شهادة راتب' },
  { value: 'letter', label: 'خطاب تعريف' },
  { value: 'vacation_settlement', label: 'تسوية إجازة' },
  { value: 'experience_certificate', label: 'شهادة خبرة' },
];

const MONTH_NAMES = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const fmt = (v) => Number(v || 0).toLocaleString('ar-SA');

/* ══════════════════════════════════════════════════════════
   LeaveDialog
   ══════════════════════════════════════════════════════════ */

export function LeaveDialog({
  open,
  onClose,
  leaveForm = {},
  setLeaveForm,
  leaveBalances = {},
  onSubmit,
}) {
  const handleChange = (field) => (e) =>
    setLeaveForm?.((prev) => ({ ...prev, [field]: e.target.value }));

  const selectedBal = leaveBalances[leaveForm.type] || {};

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>طلب إجازة جديدة</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Leave Type */}
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع الإجازة</InputLabel>
              <Select
                value={leaveForm.type || ''}
                label="نوع الإجازة"
                onChange={handleChange('type')}
              >
                {LEAVE_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedBal.remaining !== null && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                الرصيد المتبقي: {selectedBal.remaining} يوم من {selectedBal.total}
              </Typography>
            )}
          </Grid>

          {/* Start Date */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              size="small"
              label="من تاريخ"
              type="date"
              value={leaveForm.startDate || ''}
              onChange={handleChange('startDate')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* End Date */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              size="small"
              label="إلى تاريخ"
              type="date"
              value={leaveForm.endDate || ''}
              onChange={handleChange('endDate')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Reason */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="السبب"
              multiline
              minRows={3}
              value={leaveForm.reason || ''}
              onChange={handleChange('reason')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={onSubmit}>
          إرسال الطلب
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════
   RequestDialog
   ══════════════════════════════════════════════════════════ */

export function RequestDialog({
  open,
  onClose,
  requestForm = {},
  setRequestForm,
  onSubmit,
}) {
  const handleChange = (field) => (e) =>
    setRequestForm?.((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>طلب جديد</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Request Type */}
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع الطلب</InputLabel>
              <Select
                value={requestForm.type || ''}
                label="نوع الطلب"
                onChange={handleChange('type')}
              >
                {REQUEST_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="الوصف / التفاصيل"
              multiline
              minRows={3}
              value={requestForm.description || ''}
              onChange={handleChange('description')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={onSubmit}>
          إرسال
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════
   PayslipDetailDialog
   ══════════════════════════════════════════════════════════ */

export function PayslipDetailDialog({ open, onClose, payslip }) {
  if (!payslip) return null;

  const rows = [
    { label: 'الراتب الأساسي', value: fmt(payslip.basic), color: 'text.primary' },
    { label: 'البدلات', value: `+${fmt(payslip.allowances)}`, color: 'success.main' },
    { label: 'الخصومات', value: `-${fmt(payslip.deductions)}`, color: 'error.main' },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        تفاصيل كشف الراتب — {MONTH_NAMES[payslip.month] || payslip.month}{' '}
        {payslip.year}
      </DialogTitle>
      <DialogContent dividers>
        {rows.map((r, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
            }}
          >
            <Typography variant="body2">{r.label}</Typography>
            <Typography variant="body2" fontWeight={600} sx={{ color: r.color }}>
              {r.value} ر.س
            </Typography>
          </Box>
        ))}

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            صافي الراتب
          </Typography>
          <Typography variant="subtitle1" fontWeight={700} color="primary">
            {fmt(payslip.net)} ر.س
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button variant="contained" onClick={onClose}>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}
