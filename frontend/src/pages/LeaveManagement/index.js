/**
 * LeaveManagement — Orchestrator
 */

import { gradients, statusColors, assessmentColors } from '../../theme/palette';
import { LEAVE_TYPES, EMPTY_FORM } from './constants';
import { useLeaveManagement } from './useLeaveManagement';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import AddIcon from '@mui/icons-material/Add';
import PendingIcon from '@mui/icons-material/Pending';
import BalanceIcon from '@mui/icons-material/Balance';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { LeaveIcon } from 'utils/iconAliases';

const LeaveManagement = () => {
  const {
    loading,
    isDemo,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    tab,
    setTab,
    dialogOpen,
    setDialogOpen,
    form,
    setForm,
    saving,
    viewItem,
    setViewItem,
    actionDialog,
    setActionDialog,
    actionNote,
    setActionNote,
    actionLoading,
    filtered,
    stats,
    balances,
    getLeaveTypeLabel,
    getLeaveTypeColor,
    getLeaveTypeIcon,
    getDaysDiff,
    formatDays,
    loadLeaves,
    openActionDialog,
    handleAction,
    handleCreateLeave,
    handleExport,
    snack,
    setSnack,
  } = useLeaveManagement();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Gradient Header */}
      <Box sx={{ background: gradients.success, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <VacationIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              إدارة الإجازات
            </Typography>
            <Typography variant="body2">متابعة وإدارة طلبات الإجازات</Typography>
          </Box>
        </Box>
      </Box>

      {/* Title + Actions */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            إدارة الإجازات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة طلبات الإجازات والموافقات ومتابعة الرصيد المتبقي
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {isDemo && (
            <Chip icon={<WarningIcon />} label="بيانات تجريبية" color="warning" size="small" />
          )}
          <Tooltip title="تحديث">
            <IconButton onClick={loadLeaves} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            size="small"
          >
            تصدير CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            size="small"
          >
            طباعة
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setForm(EMPTY_FORM);
              setDialogOpen(true);
            }}
          >
            طلب إجازة جديد
          </Button>
        </Box>
      </Box>

      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          يتم عرض بيانات تجريبية. عند توفر API المتصل بقاعدة البيانات سيتم تحميل البيانات الحقيقية
          تلقائياً.
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الطلبات',
            value: stats.total,
            color: statusColors.primaryBlue,
            icon: <LeaveIcon />,
            sub: `${stats.totalDays} يوم`,
          },
          {
            label: 'قيد المراجعة',
            value: stats.pending,
            color: assessmentColors.moderate,
            icon: <PendingIcon />,
            sub: 'بانتظار القرار',
          },
          {
            label: 'موافق عليها',
            value: stats.approved,
            color: assessmentColors.normal,
            icon: <ApproveIcon />,
            sub: 'تمت الموافقة',
          },
          {
            label: 'مرفوضة',
            value: stats.rejected,
            color: assessmentColors.severe,
            icon: <RejectIcon />,
            sub: 'تم الرفض',
          },
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 3 },
              }}
            >
              <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: `${s.color}15`, color: s.color, width: 48, height: 48 }}>
                  {s.icon}
                </Avatar>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    sx={{ color: s.color, lineHeight: 1.1 }}
                  >
                    {s.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {s.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    display="block"
                    color="text.disabled"
                    sx={{ fontSize: '0.65rem' }}
                  >
                    {s.sub}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Leave Balances */}
      <Paper
        elevation={0}
        sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}
      >
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          <BalanceIcon sx={{ verticalAlign: 'middle', mr: 1, fontSize: 20 }} />
          رصيد الإجازات (تقديري)
        </Typography>
        <Grid container spacing={2}>
          {balances.map((b, i) => (
            <Grid item xs={12} sm={4} key={i}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: `${b.color}40` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {b.label}
                  </Typography>
                  <Chip
                    label={`${b.remaining} يوم متبقي`}
                    size="small"
                    sx={{ bgcolor: `${b.color}15`, color: b.color, fontWeight: 600 }}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (b.used / b.total) * 100)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: `${b.color}15`,
                    '& .MuiLinearProgress-bar': { bgcolor: b.color, borderRadius: 4 },
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    مستخدم: {b.used} يوم
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    من أصل {b.total} يوم
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Tabs + Filters */}
      <Paper
        elevation={0}
        sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setPage(0);
          }}
          sx={{ px: 2, pt: 1, '& .MuiTab-root': { minHeight: 48, fontWeight: 600 } }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={`الكل (${stats.total})`}
            icon={<LeaveIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            label={`قيد المراجعة (${stats.pending})`}
            icon={<PendingIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            label={`موافق عليها (${stats.approved})`}
            icon={<ApproveIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            label={`مرفوضة (${stats.rejected})`}
            icon={<RejectIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
        </Tabs>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                size="small"
                placeholder="بحث بالاسم أو رقم الموظف..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                select
                label="نوع الإجازة"
                value={typeFilter}
                onChange={e => {
                  setTypeFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">الكل</MenuItem>
                {LEAVE_TYPES.map(t => (
                  <MenuItem key={t.value} value={t.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.color }} />{' '}
                      {t.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => {
                  setSearch('');
                  setTypeFilter('');
                  setTab(0);
                }}
              >
                إعادة تعيين
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <LeaveTable
          filtered={filtered}
          page={page}
          setPage={setPage}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setViewItem={setViewItem}
          openActionDialog={openActionDialog}
          getLeaveTypeLabel={getLeaveTypeLabel}
          getLeaveTypeColor={getLeaveTypeColor}
          getLeaveTypeIcon={getLeaveTypeIcon}
          formatDays={formatDays}
        />
      )}

      {/* Dialogs */}
      <NewLeaveDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        form={form}
        setForm={setForm}
        saving={saving}
        handleCreateLeave={handleCreateLeave}
        getDaysDiff={getDaysDiff}
      />

      <ViewDetailDialog
        viewItem={viewItem}
        setViewItem={setViewItem}
        openActionDialog={openActionDialog}
        getLeaveTypeLabel={getLeaveTypeLabel}
        getLeaveTypeColor={getLeaveTypeColor}
        getLeaveTypeIcon={getLeaveTypeIcon}
        formatDays={formatDays}
      />

      <ActionDialog
        actionDialog={actionDialog}
        setActionDialog={setActionDialog}
        actionNote={actionNote}
        setActionNote={setActionNote}
        actionLoading={actionLoading}
        handleAction={handleAction}
        getLeaveTypeLabel={getLeaveTypeLabel}
        formatDays={formatDays}
      />

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LeaveManagement;
