/**
 * UsersToolbar — شريط أدوات البحث والفلترة
 */
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Button,
  Menu,
  Chip,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useState } from 'react';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FileDownload as ExportIcon,
  UploadFile as ImportIcon,
  MoreVert as MoreIcon,
  CheckCircle as ActivateIcon,
  Block as DeactivateIcon,
  LockReset as ResetIcon,
  LockOpen as UnlockIcon,
  ManageAccounts as RoleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { ROLE_OPTIONS, STATUS_OPTIONS, SORT_OPTIONS, BULK_ACTIONS } from './constants';

const UsersToolbar = ({
  search,
  roleFilter,
  statusFilter,
  selectedCount,
  onSearch,
  onRoleFilter,
  onStatusFilter,
  onCreateUser,
  onExport,
  onImport,
  onBulkAction,
  onRefresh,
  onClearSelection,
}) => {
  const [bulkAnchor, setBulkAnchor] = useState(null);
  const [exportAnchor, setExportAnchor] = useState(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  const bulkIcons = {
    activate: <ActivateIcon fontSize="small" />,
    deactivate: <DeactivateIcon fontSize="small" />,
    'reset-password': <ResetIcon fontSize="small" />,
    unlock: <UnlockIcon fontSize="small" />,
    'change-role': <RoleIcon fontSize="small" />,
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Grid container spacing={2} alignItems="center">
          {/* البحث */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="بحث بالاسم أو البريد أو الهاتف..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* فلتر الدور */}
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>الدور</InputLabel>
              <Select
                value={roleFilter}
                label="الدور"
                onChange={(e) => onRoleFilter(e.target.value)}
              >
                <MenuItem value="all">جميع الأدوار</MenuItem>
                {ROLE_OPTIONS.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* فلتر الحالة */}
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select
                value={statusFilter}
                label="الحالة"
                onChange={(e) => onStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* أزرار الإجراءات */}
          <Grid item xs={12} md={5}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
              {/* عمليات جماعية */}
              {selectedCount > 0 && (
                <>
                  <Chip
                    label={`${selectedCount} محدد`}
                    color="primary"
                    size="small"
                    onDelete={onClearSelection}
                    sx={{ mr: 0.5 }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<MoreIcon />}
                    onClick={(e) => setBulkAnchor(e.currentTarget)}
                  >
                    عمليات جماعية
                  </Button>
                  <Menu
                    anchorEl={bulkAnchor}
                    open={Boolean(bulkAnchor)}
                    onClose={() => setBulkAnchor(null)}
                  >
                    {BULK_ACTIONS.map((action) => (
                      <MenuItem
                        key={action.value}
                        onClick={() => {
                          setBulkAnchor(null);
                          if (action.value === 'change-role') {
                            setRoleDialogOpen(true);
                          } else {
                            onBulkAction(action.value);
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {bulkIcons[action.value]}
                          {action.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}

              <Tooltip title="تحديث">
                <IconButton size="small" onClick={onRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              {/* تصدير */}
              <Button
                size="small"
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={(e) => setExportAnchor(e.currentTarget)}
              >
                تصدير
              </Button>
              <Menu
                anchorEl={exportAnchor}
                open={Boolean(exportAnchor)}
                onClose={() => setExportAnchor(null)}
              >
                <MenuItem onClick={() => { setExportAnchor(null); onExport('excel'); }}>
                  تصدير Excel
                </MenuItem>
                <MenuItem onClick={() => { setExportAnchor(null); onExport('csv'); }}>
                  تصدير CSV
                </MenuItem>
              </Menu>

              {/* استيراد */}
              <Button
                size="small"
                variant="outlined"
                color="success"
                component="label"
                startIcon={<ImportIcon />}
              >
                استيراد
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  hidden
                  onChange={onImport}
                  aria-label="استيراد ملف مستخدمين"
                />
              </Button>

              {/* إضافة مستخدم */}
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onCreateUser}
              >
                إضافة مستخدم
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>

      {/* حوار اختيار الدور للعملية الجماعية */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>تغيير دور المستخدمين المحددين</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>الدور الجديد</InputLabel>
            <Select
              value={selectedRole}
              label="الدور الجديد"
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              {ROLE_OPTIONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!selectedRole}
            onClick={() => {
              onBulkAction('change-role', { newRole: selectedRole });
              setRoleDialogOpen(false);
              setSelectedRole('');
            }}
          >
            تغيير
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default UsersToolbar;
