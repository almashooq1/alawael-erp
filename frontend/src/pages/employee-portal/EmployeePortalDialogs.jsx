/**
 * EmployeePortalDialogs — Leave / Request / Payslip detail dialogs
 * Extracted from EmployeePortal.js for maintainability
 */

import { LEAVE_TYPES, REQUEST_TYPES, fmt } from './employeePortalData';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

/* ─── Leave Request Dialog ─── */
export function LeaveDialog({
  open,
  onClose,
  leaveForm,
  setLeaveForm,
  leaveBalances,
  onSubmit,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold' }}>طلب إجازة جديد</DialogTitle>
      <DialogContent dividers>
        <TextField
          select
          fullWidth
          label="نوع الإجازة"
          value={leaveForm.type}
          onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}
          sx={{ mt: 1, mb: 2 }}
        >
          {Object.entries(LEAVE_TYPES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ color: v.color }}>{v.icon}</Box>
                {v.label} ({leaveBalances[k]?.remaining || 0} يوم متبقي)
              </Box>
            </MenuItem>
          ))}
        </TextField>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              type="date"
              label="من"
              value={leaveForm.startDate}
              onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              type="date"
              label="إلى"
              value={leaveForm.endDate}
              onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="السبب"
          value={leaveForm.reason}
          onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={onSubmit} sx={{ borderRadius: 2 }}>
          تقديم الطلب
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── General Request Dialog ─── */
export function RequestDialog({
  open,
  onClose,
  requestForm,
  setRequestForm,
  onSubmit,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold' }}>طلب جديد</DialogTitle>
      <DialogContent dividers>
        <TextField
          select
          fullWidth
          label="نوع الطلب"
          value={requestForm.type}
          onChange={e => setRequestForm({ ...requestForm, type: e.target.value })}
          sx={{ mt: 1, mb: 2 }}
        >
          {Object.entries(REQUEST_TYPES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {v.icon} {v.label}
              </Box>
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="وصف الطلب"
          value={requestForm.description}
          onChange={e => setRequestForm({ ...requestForm, description: e.target.value })}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={onSubmit} sx={{ borderRadius: 2 }}>
          تقديم
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── Payslip Detail Dialog ─── */
export function PayslipDetailDialog({ open, onClose, payslip }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold' }}>
        تفاصيل كشف الراتب — {payslip?.month}
      </DialogTitle>
      {payslip && (
        <DialogContent dividers>
          <Grid container spacing={2}>
            {[
              { label: 'الراتب الأساسي', val: payslip.basic, color: 'text.primary' },
              { label: 'بدل السكن', val: payslip.housing, color: 'info.main' },
              { label: 'بدل النقل', val: payslip.transport, color: 'info.main' },
              { label: 'بدلات أخرى', val: payslip.other || 0, color: 'info.main' },
            ].map((item, i) => (
              <Grid item xs={6} key={i}>
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: item.color }}>
                  {fmt(item.val)} ر.س
                </Typography>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                التأمينات (GOSI)
              </Typography>
              <Typography variant="h6" color="warning.main">
                -{fmt(payslip.gosi || 0)} ر.س
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                خصومات أخرى
              </Typography>
              <Typography variant="h6" color="error.main">
                -{fmt(payslip.deductions)} ر.س
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: 'success.50', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  الصافي المستحق
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.dark">
                  {fmt(payslip.net)} ر.س
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
      )}
      <DialogActions sx={{ p: 2 }}>
        <Button startIcon={<DownloadIcon />}>تحميل PDF</Button>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}
