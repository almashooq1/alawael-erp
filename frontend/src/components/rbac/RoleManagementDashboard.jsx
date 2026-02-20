/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎭 Role Management Dashboard - لوحة التحكم في إدارة الأدوار
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Complete role management interface with CRUD operations, permissions,
 * hierarchy visualization, and bulk operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Tabs,
  Tab,
  MultiSelect,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CloudDownload as DownloadIcon,
  CloudUpload as UploadIcon,
  MoreVert as MoreIcon,
  VisibilityOutlined as ViewIcon,
} from '@mui/icons-material';
import { useRoles, usePermissions } from '../../hooks/useRBAC';
import { rbacService } from '../../services/rbacAPIService';

// TabPanel Component
function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const RoleManagementDashboard = () => {
  // State Management
  const { roles, loading, error, createRole, updateRole, deleteRole, fetchRoles } = useRoles();
  const { permissions } = usePermissions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // create or edit
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    level: 5,
    parentRoleId: null,
    permissions: [],
  });
  
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  // Filtered roles
  const filteredRoles = roles.filter((role) =>
    role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedRoles = filteredRoles.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handlers
  const handleOpenDialog = useCallback((mode = 'create', role = null) => {
    setDialogMode(mode);
    if (mode === 'edit' && role) {
      setFormData({
        id: role.id,
        name: role.name || '',
        description: role.description || '',
        level: role.level || 5,
        parentRoleId: role.parentRoleId || null,
        permissions: role.permissions || [],
      });
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        level: 5,
        parentRoleId: null,
        permissions: [],
      });
    }
    setSubmitted(false);
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
  }, []);

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'level' ? parseInt(value) : value,
    }));
  }, []);

  const handlePermissionToggle = useCallback((permissionId) => {
    setFormData((prev) => {
      const permissions = prev.permissions || [];
      if (permissions.includes(permissionId)) {
        return {
          ...prev,
          permissions: permissions.filter((p) => p !== permissionId),
        };
      } else {
        return {
          ...prev,
          permissions: [...permissions, permissionId],
        };
      }
    });
  }, []);

  const handleSaveRole = useCallback(async () => {
    try {
      setSubmitted(true);
      
      if (!formData.name.trim()) {
        alert('Please enter role name');
        return;
      }

      if (dialogMode === 'create') {
        await createRole(formData);
        alert('Role created successfully');
      } else {
        await updateRole(formData.id, formData);
        alert('Role updated successfully');
      }
      
      handleCloseDialog();
      await fetchRoles();
    } catch (err) {
      alert('Error saving role: ' + err.message);
    }
  }, [formData, dialogMode, createRole, updateRole, fetchRoles, handleCloseDialog]);

  const handleDeleteRole = useCallback((roleName, roleId) => {
    setDeleteId(roleId);
    setDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteRole(deleteId);
      alert('Role deleted successfully');
      setDeleteConfirm(false);
      setDeleteId(null);
      await fetchRoles();
    } catch (err) {
      alert('Error deleting role: ' + err.message);
    }
  }, [deleteId, deleteRole, fetchRoles]);

  const handleSelectRole = useCallback((roleId) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedRoles.length === paginatedRoles.length) {
      setSelectedRoles([]);
    } else {
      setSelectedRoles(paginatedRoles.map((r) => r.id));
    }
  }, [selectedRoles, paginatedRoles]);

  const handlePageChange = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const data = await rbacService.system.exportRBACData('json');
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = Windows.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rbac-export-${Date.now()}.json`;
      link.click();
      alert('Data exported successfully');
    } catch (err) {
      alert('Error exporting data: ' + err.message);
    }
  }, []);

  // Calculate statistics
  const stats = {
    totalRoles: roles.length,
    totalPermissions: permissions.length,
    avgRoleLevel: roles.length > 0 ? (roles.reduce((sum, r) => sum + (r.level || 0), 0) / roles.length).toFixed(1) : 0,
    rolesWithParent: roles.filter((r) => r.parentRoleId).length,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          🎭 Role Management
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Manage roles, permissions, and access control
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Roles
              </Typography>
              <Typography variant="h5">{stats.totalRoles}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Permissions
              </Typography>
              <Typography variant="h5">{stats.totalPermissions}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Role Level
              </Typography>
              <Typography variant="h5">{stats.avgRoleLevel}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Role Hierarchy
              </Typography>
              <Typography variant="h5">{stats.rolesWithParent}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          {/* Search Box */}
          <TextField
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            size="small"
            sx={{ flex: 1, minWidth: 200 }}
          />

          {/* Action Buttons */}
          <Stack direction="row" spacing={1}>
            <Tooltip title="Add new role">
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog('create')}
              >
                New Role
              </Button>
            </Tooltip>

            <Tooltip title="Export data">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
              >
                Export
              </Button>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Bulk Actions */}
        {selectedRoles.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {selectedRoles.length} role(s) selected
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" color="error" onClick={() => {
                if (window.confirm('Delete selected roles?')) {
                  selectedRoles.forEach((roleId) => {
                    deleteRole(roleId).catch((err) => console.error(err));
                  });
                  setSelectedRoles([]);
                }
              }}>
                Delete Selected
              </Button>
              <Button size="small" onClick={() => setSelectedRoles([])}>
                Clear Selection
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="All Roles" />
          <Tab label="Hierarchy" />
          <Tab label="Permissions" />
        </Tabs>

        {/* Tab 1: All Roles Table */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedRoles.length === paginatedRoles.length && paginatedRoles.length > 0}
                      indeterminate={selectedRoles.length > 0 && selectedRoles.length < paginatedRoles.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell align="center"><strong>Level</strong></TableCell>
                  <TableCell><strong>Parent Role</strong></TableCell>
                  <TableCell align="center"><strong>Permissions</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : paginatedRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography color="textSecondary">No roles found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRoles.map((role) => (
                    <TableRow key={role.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedRoles.includes(role.id)}
                          onChange={() => handleSelectRole(role.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {role.name}
                          </Typography>
                          {role.level === 1 && <Chip label="Admin" size="small" color="error" />}
                          {role.level === 2 && <Chip label="Manager" size="small" color="warning" />}
                          {role.level >= 3 && role.level <= 4 && <Chip label="User" size="small" color="info" />}
                        </Stack>
                      </TableCell>
                      <TableCell>{role.description || '-'}</TableCell>
                      <TableCell align="center">
                        <Chip label={`Level ${role.level}`} size="small" />
                      </TableCell>
                      <TableCell>
                        {role.parentRoleId ? (
                          <Typography variant="body2">{role.parentRoleId}</Typography>
                        ) : (
                          <Typography variant="body2" color="textSecondary">None</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${(role.permissions || []).length} perms`}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog('edit', role)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteRole(role.name, role.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredRoles.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </TabPanel>

        {/* Tab 2: Hierarchy View */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Role Hierarchy Tree
          </Typography>
          <Box sx={{ pl: 2 }}>
            {roles
              .filter((r) => !r.parentRoleId)
              .map((role) => (
                <Box key={role.id} sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    📦 {role.name} (Level {role.level})
                  </Typography>
                  {roles
                    .filter((r) => r.parentRoleId === role.id)
                    .map((child) => (
                      <Typography key={child.id} variant="body2" sx={{ pl: 2, color: 'textSecondary' }}>
                        └─ {child.name} (Level {child.level})
                      </Typography>
                    ))}
                </Box>
              ))}
          </Box>
        </TabPanel>

        {/* Tab 3: Permissions Distribution */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Permissions by Role
          </Typography>
          {roles.map((role) => (
            <Box key={role.id} sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                {role.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {(role.permissions || []).length > 0 ? (
                  (role.permissions || []).map((permId) => (
                    <Chip key={permId} label={permId} size="small" />
                  ))
                ) : (
                  <Typography variant="caption" color="textSecondary">
                    No permissions assigned
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </TabPanel>
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? '➕ Create New Role' : '✏️ Edit Role'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="Role Name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              fullWidth
              required
              error={submitted && !formData.name}
              helperText={submitted && !formData.name ? 'Role name is required' : ''}
            />

            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              fullWidth
              multiline
              rows={3}
            />

            <TextField
              label="Level (1=Admin, 5=User)"
              name="level"
              type="number"
              value={formData.level}
              onChange={handleFormChange}
              inputProps={{ min: 1, max: 10 }}
              fullWidth
            />

            <TextField
              label="Parent Role ID (Optional)"
              name="parentRoleId"
              value={formData.parentRoleId}
              onChange={handleFormChange}
              fullWidth
              select
              SelectProps={{ native: true }}
            >
              <option value="">None</option>
              {roles
                .filter((r) => r.id !== formData.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </TextField>

            {/* Permissions Selection */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Assign Permissions:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', maxHeight: 200, overflowY: 'auto' }}>
                {permissions.map((perm) => (
                  <FormControlLabel
                    key={perm.id}
                    control={
                      <Checkbox
                        checked={formData.permissions.includes(perm.id)}
                        onChange={() => handlePermissionToggle(perm.id)}
                      />
                    }
                    label={perm.name}
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveRole} variant="contained" color="primary">
            {dialogMode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)}>
        <DialogTitle>⚠️ Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this role? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoleManagementDashboard;
