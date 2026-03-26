/**
 * EmployeeManagement.jsx — Thin orchestrator
 * 880 → ~120 lines | Sub-files: Employee/
 */
import {
  Container, Typography, Grid, Paper, Box, Button, TextField, Card, CardContent,
  Chip, Avatar, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, MenuItem, Alert, Snackbar, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, FilterList as FilterIcon,
  PersonOff as InactiveIcon, CheckCircle as ActiveIcon, Download as DownloadIcon,
  Delete as DeleteIcon, CalendarMonth as CalendarIcon,
  Business as DeptIcon, Warning as WarningIcon, Refresh as RefreshIcon,
  Groups as PeopleIcon,
} from '@mui/icons-material';
import { gradients } from '../../theme/palette';
import { DEPARTMENTS, STATUS_MAP, STAT_CARDS } from './Employee/employeeManagement.constants';
import useEmployeeManagement from './Employee/useEmployeeManagement';
import EmployeeTable from './Employee/EmployeeTable';
import EmployeeFormDialog from './Employee/EmployeeFormDialog';

/* ─── Icon map for stat cards ─── */
const STAT_ICONS = [<PeopleIcon />, <ActiveIcon />, <CalendarIcon />, <InactiveIcon />, <DeptIcon />];

const EmployeeManagement = () => {
  const h = useEmployeeManagement();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Gradient Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PeopleIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>إدارة الموظفين</Typography>
            <Typography variant="body2">إضافة وتعديل بيانات الموظفين</Typography>
          </Box>
        </Box>
      </Box>

      {/* Title + Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>إدارة الموظفين</Typography>
          <Typography variant="body2" color="text.secondary">تسجيل وإدارة بيانات الموظفين والعقود والمعلومات الوظيفية</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {h.isDemo && <Chip icon={<WarningIcon />} label="بيانات تجريبية" color="warning" size="small" />}
          <Tooltip title="تحديث"><IconButton onClick={h.loadEmployees} disabled={h.loading}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={h.handleExport} size="small">تصدير</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={h.openAdd}>تسجيل موظف جديد</Button>
        </Box>
      </Box>

      {h.isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          يتم عرض بيانات تجريبية. عند توفر API المتصل بقاعدة البيانات سيتم تحميل البيانات الحقيقية تلقائياً.
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {STAT_CARDS(h.stats).map((s, i) => (
          <Grid item xs={6} sm={4} md key={i}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: `${s.color}18`, color: s.color, width: 42, height: 42 }}>{STAT_ICONS[i]}</Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700} sx={{ color: s.color, lineHeight: 1.1 }}>{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" placeholder="بحث بالاسم، الرقم، الهاتف أو البريد..."
              value={h.search} onChange={e => { h.setSearch(e.target.value); h.setPage(0); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" select label="القسم" value={h.deptFilter} onChange={e => { h.setDeptFilter(e.target.value); h.setPage(0); }}>
              <MenuItem value="">الكل</MenuItem>
              {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" select label="الحالة" value={h.statusFilter} onChange={e => { h.setStatusFilter(e.target.value); h.setPage(0); }}>
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button fullWidth size="small" startIcon={<FilterIcon />}
              onClick={() => { h.setSearch(''); h.setDeptFilter(''); h.setStatusFilter(''); }}>إعادة تعيين</Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <EmployeeTable
        loading={h.loading} filtered={h.filtered} page={h.page} rowsPerPage={h.rowsPerPage}
        setPage={h.setPage} setRowsPerPage={h.setRowsPerPage}
        openView={h.openView} openEdit={h.openEdit}
        setDeleteTarget={h.setDeleteTarget} handleCopyId={h.handleCopyId}
      />

      {/* Form Dialog (add / edit / view) */}
      <EmployeeFormDialog
        dialogOpen={h.dialogOpen} setDialogOpen={h.setDialogOpen}
        dialogMode={h.dialogMode} setDialogMode={h.setDialogMode}
        form={h.form} setField={h.setField} positionsList={h.positionsList}
        activeStep={h.activeStep} setActiveStep={h.setActiveStep}
        errors={h.errors} setErrors={h.setErrors}
        touched={h.touched} setTouched={h.setTouched}
        saving={h.saving} handleNext={h.handleNext} handleBack={h.handleBack}
        handleSave={h.handleSave} handlePrint={h.handlePrint}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!h.deleteTarget} onClose={() => h.setDeleteTarget(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'error.lighter', color: 'error.main' }}><DeleteIcon /></Avatar>
            <Typography variant="h6" fontWeight={700}>تأكيد الحذف</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            هل أنت متأكد من حذف الموظف <strong>{h.deleteTarget?.firstName} {h.deleteTarget?.lastName}</strong>
            ({h.deleteTarget?.employeeId})؟
            <br />لا يمكن التراجع عن هذا الإجراء.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => h.setDeleteTarget(null)}>إلغاء</Button>
          <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={h.handleDelete}>حذف نهائي</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={h.snack.open} autoHideDuration={4000} onClose={() => h.setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={h.snack.severity} onClose={() => h.setSnack(s => ({ ...s, open: false }))} variant="filled" sx={{ width: '100%' }}>
          {h.snack.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EmployeeManagement;
