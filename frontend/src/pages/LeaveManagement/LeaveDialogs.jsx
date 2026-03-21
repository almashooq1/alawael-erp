/**
 * LeaveManagement — Dialogs (New Leave, View Detail, Approve/Reject)
 */

import { LEAVE_TYPES, LEAVE_TYPE_MAP, STATUS_CONFIG } from './constants';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import TimerIcon from '@mui/icons-material/Timer';
import EditIcon from '@mui/icons-material/Edit';
import { CalendarIcon } from 'utils/iconAliases';

/* ═══ New Leave Request Dialog ═══ */
export const NewLeaveDialog = ({ open, onClose, form, setForm, saving, handleCreateLeave, getDaysDiff }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
    <DialogTitle sx={{ pb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main' }}><AddIcon /></Avatar>
          <Typography variant="h6" fontWeight={700}>طلب إجازة جديد</Typography>
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
    </DialogTitle>
    <Divider />
    <DialogContent sx={{ py: 3 }}>
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <TextField fullWidth label="اسم الموظف *" value={form.employeeName}
            onChange={e => setForm(p => ({ ...p, employeeName: e.target.value }))}
            InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon color="action" /></InputAdornment> }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth select label="نوع الإجازة *" value={form.leaveType}
            onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))}>
            {LEAVE_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: t.color }} />
                  {t.label}
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
                    (حد أقصى {t.maxDays} يوم)
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={6}>
          <TextField fullWidth label="من تاريخ *" type="date" value={form.startDate}
            onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            InputProps={{ startAdornment: <InputAdornment position="start"><CalendarIcon color="action" /></InputAdornment> }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField fullWidth label="إلى تاريخ *" type="date" value={form.endDate}
            onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            InputProps={{ startAdornment: <InputAdornment position="start"><CalendarIcon color="action" /></InputAdornment> }}
          />
        </Grid>
        {form.startDate && form.endDate && getDaysDiff(form.startDate, form.endDate) > 0 && (
          <Grid item xs={12}>
            <Alert severity="info" icon={<TimerIcon />} sx={{ borderRadius: 2 }}>
              مدة الإجازة: <strong>{getDaysDiff(form.startDate, form.endDate)} يوم</strong>
              {LEAVE_TYPE_MAP[form.leaveType] && (
                <> — الحد الأقصى: {LEAVE_TYPE_MAP[form.leaveType].maxDays} يوم</>
              )}
            </Alert>
          </Grid>
        )}
        <Grid item xs={12}>
          <TextField fullWidth multiline rows={3} label="السبب *" value={form.reason}
            onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
            placeholder="يرجى ذكر سبب الإجازة..."
          />
        </Grid>
      </Grid>
    </DialogContent>
    <DialogActions sx={{ p: 2.5 }}>
      <Button onClick={onClose}>إلغاء</Button>
      <Button variant="contained" onClick={handleCreateLeave} disabled={saving}
        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}>
        تقديم الطلب
      </Button>
    </DialogActions>
  </Dialog>
);

/* ═══ View Detail Dialog ═══ */
export const ViewDetailDialog = ({
  viewItem, setViewItem, openActionDialog,
  getLeaveTypeLabel, getLeaveTypeColor, getLeaveTypeIcon, formatDays,
}) => {
  if (!viewItem) return null;
  const st = STATUS_CONFIG[viewItem.status] || STATUS_CONFIG.pending;
  const ltc = getLeaveTypeColor(viewItem.leaveType);

  return (
    <Dialog open={!!viewItem} onClose={() => setViewItem(null)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      {/* Header with colored bar */}
      <Box sx={{ bgcolor: `${ltc}15`, p: 3, position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: `${ltc}25`, color: ltc, width: 52, height: 52, fontSize: 20, fontWeight: 700 }}>
              {(viewItem.employeeName || '?')[0]}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>{viewItem.employeeName}</Typography>
              <Chip icon={getLeaveTypeIcon(viewItem.leaveType)} label={getLeaveTypeLabel(viewItem.leaveType)}
                size="small" sx={{ bgcolor: `${ltc}20`, color: ltc, fontWeight: 600, mt: 0.5 }} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {viewItem.status === 'pending' && (
              <Tooltip title="تعديل"><IconButton size="small"><EditIcon fontSize="small" /></IconButton></Tooltip>
            )}
            <IconButton onClick={() => setViewItem(null)}><CloseIcon /></IconButton>
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ py: 3 }}>
        <Grid container spacing={2.5}>
          {[
            { label: 'من تاريخ', value: viewItem.startDate, icon: <CalendarIcon color="action" sx={{ fontSize: 18 }} /> },
            { label: 'إلى تاريخ', value: viewItem.endDate, icon: <CalendarIcon color="action" sx={{ fontSize: 18 }} /> },
            { label: 'المدة', value: formatDays(viewItem.startDate, viewItem.endDate), icon: <TimerIcon color="action" sx={{ fontSize: 18 }} /> },
            { label: 'الحالة', value: <Chip label={st.label} color={st.color} size="small" icon={st.icon} />, raw: true },
          ].map((item, i) => (
            <Grid item xs={6} key={i}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                {item.icon}
                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              </Box>
              {item.raw ? item.value : <Typography variant="body1" fontWeight={600}>{item.value || '—'}</Typography>}
            </Grid>
          ))}
          <Grid item xs={12}><Divider sx={{ my: 0.5 }} /></Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">السبب</Typography>
            <Paper variant="outlined" sx={{ p: 2, mt: 0.5, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="body2">{viewItem.reason || 'لم يتم تحديد سبب'}</Typography>
            </Paper>
          </Grid>
          {viewItem.managerNote && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">ملاحظة المدير</Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 0.5, borderRadius: 2, bgcolor: 'warning.lighter' }}>
                <Typography variant="body2">{viewItem.managerNote}</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      {viewItem.status === 'pending' && (
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setViewItem(null)}>إغلاق</Button>
          <Button variant="outlined" color="error" startIcon={<RejectIcon />}
            onClick={() => { setViewItem(null); openActionDialog(viewItem, 'reject'); }}>رفض</Button>
          <Button variant="contained" color="success" startIcon={<ApproveIcon />}
            onClick={() => { setViewItem(null); openActionDialog(viewItem, 'approve'); }}>موافقة</Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

/* ═══ Approve / Reject Dialog ═══ */
export const ActionDialog = ({
  actionDialog, setActionDialog, actionNote, setActionNote,
  actionLoading, handleAction,
  getLeaveTypeLabel, formatDays,
}) => (
  <Dialog open={!!actionDialog} onClose={() => setActionDialog(null)} maxWidth="xs" fullWidth
    PaperProps={{ sx: { borderRadius: 3 } }}>
    {actionDialog && (
      <>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{
              bgcolor: actionDialog.action === 'approve' ? 'success.lighter' : 'error.lighter',
              color: actionDialog.action === 'approve' ? 'success.main' : 'error.main',
            }}>
              {actionDialog.action === 'approve' ? <ApproveIcon /> : <RejectIcon />}
            </Avatar>
            <Typography variant="h6" fontWeight={700}>
              {actionDialog.action === 'approve' ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity={actionDialog.action === 'approve' ? 'success' : 'warning'} sx={{ mb: 2, borderRadius: 2 }}>
            {actionDialog.action === 'approve'
              ? `الموافقة على إجازة ${actionDialog.leave.employeeName} (${getLeaveTypeLabel(actionDialog.leave.leaveType)})`
              : `رفض إجازة ${actionDialog.leave.employeeName} (${getLeaveTypeLabel(actionDialog.leave.leaveType)})`}
            <br />
            <Typography variant="caption">
              {actionDialog.leave.startDate} → {actionDialog.leave.endDate} ({formatDays(actionDialog.leave.startDate, actionDialog.leave.endDate)})
            </Typography>
          </Alert>
          <TextField fullWidth multiline rows={3} label="ملاحظة (اختياري)" value={actionNote}
            onChange={e => setActionNote(e.target.value)}
            placeholder={actionDialog.action === 'approve' ? 'أي ملاحظات للموظف...' : 'يرجى ذكر سبب الرفض...'}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setActionDialog(null)}>إلغاء</Button>
          <Button variant="contained"
            color={actionDialog.action === 'approve' ? 'success' : 'error'}
            startIcon={actionLoading ? <CircularProgress size={18} color="inherit" /> :
              (actionDialog.action === 'approve' ? <ApproveIcon /> : <RejectIcon />)}
            onClick={handleAction} disabled={!!actionLoading}>
            {actionDialog.action === 'approve' ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
          </Button>
        </DialogActions>
      </>
    )}
  </Dialog>
);
