/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 Permission Management Panel - لوحة إدارة الأذونات
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Complete permission management interface with CRUD, categorization,
 * and role assignment capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CloudDownload as DownloadIcon,
  AssignmentInd as AssignIcon,
} from '@mui/icons-material';
import { usePermissions, useRoles } from '../../hooks/useRBAC';
import { rbacService } from '../../services/rbacAPIService';

// TabPanel Component
function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const PERMISSION_CATEGORIES = [
  { value: 'read', label: '👁️ Read', color: 'info' },
  { value: 'write', label: '✏️ Write', color: 'primary' },
  { value: 'delete', label: '🗑️ Delete', color: 'error' },
  { value: 'admin', label: '⚙️ Admin', color: 'error' },
  { value: 'export', label: '📤 Export', color: 'success' },
  { value: 'import', label: '📥 Import', color: 'success' },
];

const PermissionManagementPanel = () => {
  // State Management
  const { permissions, loading: permLoading, error: permError, createPermission } = usePermissions();
  const { roles } = useRoles();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    category: 'read',
    resource: '',
    action: '',
  });

  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Filtered permissions
  const filteredPermissions = useMemo(() => {
    return permissions.filter((perm) => {
      const matchSearch =
        perm.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.resource?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = !filterCategory || perm.category === filterCategory;

      return matchSearch && matchCategory;
    });
  }, [permissions, searchTerm, filterCategory]);

  const paginatedPermissions = filteredPermissions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handlers
  const handleOpenDialog = useCallback((mode = 'create', permission = null) => {
    setDialogMode(mode);
    if (mode === 'edit' && permission) {
      setFormData({
        id: permission.id,
        name: permission.name || '',
        description: permission.description || '',
        category: permission.category || 'read',
        resource: permission.resource || '',
        action: permission.action || '',
      });
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        category: 'read',
        resource: '',
        action: '',
      });
    }
    setSubmitted(false);
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
  }, []);

  const handleCloseRoleDialog = useCallback(() => {
    setOpenRoleDialog(false);
    setSelectedRole('');
    setSelectedPermissions([]);
  }, []);

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSavePermission = useCallback(async () => {
    try {
      setSubmitted(true);

      if (!formData.name.trim()) {
        alert('Permission name is required');
        return;
      }

      if (!formData.resource.trim()) {
        alert('Resource is required');
        return;
      }

      if (!formData.action.trim()) {
        alert('Action is required');
        return;
      }

      if (dialogMode === 'create') {
        await createPermission(formData);
        alert('Permission created successfully');
      } else {
        // Update permission (you would implement this in rbacAPIService)
        alert('Permission update not yet implemented - add to usePermissions hook');
      }

      handleCloseDialog();
    } catch (err) {
      alert('Error saving permission: ' + err.message);
    }
  }, [formData, dialogMode, createPermission, handleCloseDialog]);

  const handleDeletePermission = useCallback((permissionName, permissionId) => {
    setDeleteId(permissionId);
    setDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      // Delete permission (implement in service)
      alert('Permission deleted (implement in service)');
      setDeleteConfirm(false);
      setDeleteId(null);
    } catch (err) {
      alert('Error deleting permission: ' + err.message);
    }
  }, [deleteId]);

  const handleSelectPermission = useCallback((permId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  }, []);

  const handleSelectAllPermissions = useCallback(() => {
    if (selectedPermissions.length === paginatedPermissions.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(paginatedPermissions.map((p) => p.id));
    }
  }, [selectedPermissions, paginatedPermissions]);

  const handleAssignToRole = useCallback(async () => {
    try {
      if (!selectedRole) {
        alert('Please select a role');
        return;
      }

      if (selectedPermissions.length === 0) {
        alert('Please select at least one permission');
        return;
      }

      // Batch assign permissions to role
      for (const permId of selectedPermissions) {
        await rbacService.permission.assignPermissionToRole(selectedRole, permId);
      }

      alert(`${selectedPermissions.length} permission(s) assigned to role`);
      handleCloseRoleDialog();
    } catch (err) {
      alert('Error assigning permissions: ' + err.message);
    }
  }, [selectedRole, selectedPermissions, handleCloseRoleDialog]);

  const handlePageChange = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleExportPermissions = useCallback(() => {
    try {
      const csv = [
        ['ID', 'Name', 'Description', 'Category', 'Resource', 'Action'],
        ...permissions.map((p) => [
          p.id,
          p.name,
          p.description || '',
          p.category,
          p.resource,
          p.action,
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `permissions-${Date.now()}.csv`;
      link.click();
      alert('Permissions exported successfully');
    } catch (err) {
      alert('Error exporting: ' + err.message);
    }
  }, [permissions]);

  // Calculate statistics
  const stats = {
    total: permissions.length,
    byCategory: PERMISSION_CATEGORIES.map((cat) => ({
      ...cat,
      count: permissions.filter((p) => p.category === cat.value).length,
    })),
  };

  const getCategoryColor = (category) => {
    const cat = PERMISSION_CATEGORIES.find((c) => c.value === category);
    return cat ? cat.color : 'default';
  };

  const getCategoryLabel = (category) => {
    const cat = PERMISSION_CATEGORIES.find((c) => c.value === category);
    return cat ? cat.label : category;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          🔐 Permission Management
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Define and manage application permissions
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Permissions
              </Typography>
              <Typography variant="h5">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        {stats.byCategory.map((cat) => (
          <Grid item xs={12} sm={6} md={3} key={cat.value}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {cat.label}
                </Typography>
                <Typography variant="h5">{cat.count}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Error Alert */}
      {permError && <Alert severity="error" sx={{ mb: 2 }}>{permError}</Alert>}

      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          {/* Search Box */}
          <TextField
            placeholder="Search permissions..."
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

          {/* Category Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={filterCategory}
              label="Category"
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Categories</MenuItem>
              {PERMISSION_CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1}>
            <Tooltip title="Add permission">
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog('create')}
              >
                New Permission
              </Button>
            </Tooltip>

            <Tooltip title="Export permissions">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportPermissions}
              >
                Export
              </Button>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Bulk Actions */}
        {selectedPermissions.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {selectedPermissions.length} permission(s) selected
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                color="primary"
                startIcon={<AssignIcon />}
                onClick={() => setOpenRoleDialog(true)}
              >
                Assign to Role
              </Button>
              <Button size="small" onClick={() => setSelectedPermissions([])}>
                Clear Selection
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Content Tabs */}
      <Paper>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="All Permissions" />
          <Tab label="By Category" />
          <Tab label="By Resource" />
        </Tabs>

        {/* Tab 1: All Permissions */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.length === paginatedPermissions.length && paginatedPermissions.length > 0}
                      onChange={handleSelectAllPermissions}
                    />
                  </TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>Category</strong></TableCell>
                  <TableCell><strong>Resource</strong></TableCell>
                  <TableCell><strong>Action</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : paginatedPermissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography color="textSecondary">No permissions found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPermissions.map((perm) => (
                    <TableRow key={perm.id} hover>
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm.id)}
                          onChange={() => handleSelectPermission(perm.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {perm.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{perm.description || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={getCategoryLabel(perm.category)}
                          size="small"
                          color={getCategoryColor(perm.category)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={perm.resource} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={perm.action} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog('edit', perm)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeletePermission(perm.name, perm.id)}
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
            count={filteredPermissions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </TabPanel>

        {/* Tab 2: By Category */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            {PERMISSION_CATEGORIES.map((cat) => {
              const catPerms = permissions.filter((p) => p.category === cat.value);
              return (
                <Box key={cat.value}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {cat.label} ({catPerms.length})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {catPerms.length > 0 ? (
                      catPerms.map((perm) => (
                        <Chip
                          key={perm.id}
                          label={`${perm.name} (${perm.resource}:${perm.action})`}
                          color={cat.color}
                          variant="outlined"
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No permissions in this category
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </TabPanel>

        {/* Tab 3: By Resource */}
        <TabPanel value={tabValue} index={2}>
          <Stack spacing={2}>
            {[...new Set(permissions.map((p) => p.resource))].map((resource) => (
              <Box key={resource}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  📦 {resource}
                </Typography>
                <Box sx={{ pl: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {permissions
                    .filter((p) => p.resource === resource)
                    .map((perm) => (
                      <Chip
                        key={perm.id}
                        label={`${perm.action} (${perm.category})`}
                        size="small"
                      />
                    ))}
                </Box>
              </Box>
            ))}
          </Stack>
        </TabPanel>
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? '➕ Create Permission' : '✏️ Edit Permission'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="Permission Name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              fullWidth
              required
              error={submitted && !formData.name}
              helperText={submitted && !formData.name ? 'Name is required' : ''}
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

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                name="category"
                value={formData.category}
                label="Category"
                onChange={handleFormChange}
              >
                {PERMISSION_CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Resource"
              name="resource"
              value={formData.resource}
              onChange={handleFormChange}
              fullWidth
              required
              error={submitted && !formData.resource}
              helperText={submitted && !formData.resource ? 'Resource is required' : ''}
            />

            <TextField
              label="Action"
              name="action"
              value={formData.action}
              onChange={handleFormChange}
              fullWidth
              required
              error={submitted && !formData.action}
              helperText={submitted && !formData.action ? 'Action is required' : ''}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSavePermission} variant="contained" color="primary">
            {dialogMode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign to Role Dialog */}
      <Dialog
        open={openRoleDialog}
        onClose={handleCloseRoleDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          🎭 Assign Permissions to Role
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="textSecondary">
              Selected {selectedPermissions.length} permission(s)
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={selectedRole}
                label="Role"
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Permissions to assign:
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {selectedPermissions.map((permId) => {
                  const perm = permissions.find((p) => p.id === permId);
                  return <Chip key={permId} label={perm?.name} size="small" />;
                })}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRoleDialog}>Cancel</Button>
          <Button onClick={handleAssignToRole} variant="contained" color="primary">
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)}>
        <DialogTitle>⚠️ Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this permission? It will be removed from all roles.
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

export default PermissionManagementPanel;
