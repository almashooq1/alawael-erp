/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 👥 User Role Assignment Panel - لوحة إسناد الأدوار للمستخدمين
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Complete user role assignment interface with permission matrix,
 * user activity tracking, and bulk operations
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CloudDownload as DownloadIcon,
  Edit as EditIcon,
  Psychology as PermissionIcon,
} from '@mui/icons-material';
import { useUserRoles, useRoles, usePermissions } from '../../hooks/useRBAC';
import { rbacService } from '../../services/rbacAPIService';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const UserRoleAssignmentPanel = () => {
  // State Management
  const { roles } = useRoles();
  const { permissions } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openPermDialog, setOpenPermDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);

  // Sample users data - in real app, this would come from API
  const [users, setUsers] = useState([
    {
      id: 'user-1',
      name: 'Ahmed Hassan',
      email: 'ahmed.hassan@company.com',
      roles: ['role-1', 'role-2'],
      status: 'active',
      lastLogin: '2024-02-18T10:30:00',
      department: 'Finance',
    },
    {
      id: 'user-2',
      name: 'Fatima Al-Zahra',
      email: 'fatima.alzahra@company.com',
      roles: ['role-3'],
      status: 'active',
      lastLogin: '2024-02-17T14:15:00',
      department: 'HR',
    },
    {
      id: 'user-3',
      name: 'Mohammed Salem',
      email: 'mohammed.salem@company.com',
      roles: ['role-2', 'role-3'],
      status: 'inactive',
      lastLogin: '2024-02-10T09:00:00',
      department: 'Operations',
    },
  ]);

  // Form states
  const [formData, setFormData] = useState({
    userId: '',
    userName: '',
    email: '',
    selectedRoles: [],
    department: '',
  });

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedUserForPerm, setSelectedUserForPerm] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchSearch =
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRole = !filterRole || user.roles?.includes(filterRole);

      return matchSearch && matchRole;
    });
  }, [users, searchTerm, filterRole]);

  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handlers
  const handleOpenDialog = useCallback((user = null) => {
    if (user) {
      setFormData({
        userId: user.id,
        userName: user.name,
        email: user.email,
        selectedRoles: user.roles || [],
        department: user.department || '',
      });
    } else {
      setFormData({
        userId: '',
        userName: '',
        email: '',
        selectedRoles: [],
        department: '',
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
      [name]: value,
    }));
  }, []);

  const handleRoleToggle = useCallback((roleId) => {
    setFormData((prev) => {
      const roles = prev.selectedRoles || [];
      if (roles.includes(roleId)) {
        return {
          ...prev,
          selectedRoles: roles.filter((r) => r !== roleId),
        };
      } else {
        return {
          ...prev,
          selectedRoles: [...roles, roleId],
        };
      }
    });
  }, []);

  const handleSaveUserRoles = useCallback(async () => {
    try {
      setSubmitted(true);

      if (!formData.userName.trim()) {
        alert('User name is required');
        return;
      }

      if (!formData.email.trim()) {
        alert('Email is required');
        return;
      }

      // Batch assign roles to user
      const userId = formData.userId || `user-${Date.now()}`;
      for (const roleId of formData.selectedRoles) {
        await rbacService.userRole.assignRoleToUser(userId, roleId);
      }

      // Update local state
      setUsers((prev) => {
        const existing = prev.find((u) => u.id === userId);
        if (existing) {
          return prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  name: formData.userName,
                  email: formData.email,
                  roles: formData.selectedRoles,
                  department: formData.department,
                }
              : u
          );
        } else {
          return [
            ...prev,
            {
              id: userId,
              name: formData.userName,
              email: formData.email,
              roles: formData.selectedRoles,
              department: formData.department,
              status: 'active',
              lastLogin: new Date().toISOString(),
            },
          ];
        }
      });

      alert('User roles updated successfully');
      handleCloseDialog();
    } catch (err) {
      alert('Error updating user roles: ' + err.message);
    }
  }, [formData, handleCloseDialog]);

  const handleDeleteUser = useCallback((userId) => {
    setDeleteUserId(userId);
    setDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    try {
      setUsers((prev) => prev.filter((u) => u.id !== deleteUserId));
      setDeleteConfirm(false);
      setDeleteUserId(null);
      alert('User deleted successfully');
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  }, [deleteUserId]);

  const handleSelectUser = useCallback((userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map((u) => u.id));
    }
  }, [selectedUsers, paginatedUsers]);

  const handleBulkRoleAssign = useCallback(async () => {
    const roleId = window.prompt('Enter role ID to assign to selected users:');
    if (!roleId) return;

    try {
      for (const userId of selectedUsers) {
        await rbacService.userRole.assignRoleToUser(userId, roleId);
      }
      alert(`Role assigned to ${selectedUsers.length} user(s)`);
      setSelectedUsers([]);
    } catch (err) {
      alert('Error assigning role: ' + err.message);
    }
  }, [selectedUsers]);

  const handlePageChange = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleViewPermissions = useCallback((user) => {
    setSelectedUserForPerm(user);
    setOpenPermDialog(true);
  }, []);

  const handleExportUsers = useCallback(() => {
    try {
      const csv = [
        ['ID', 'Name', 'Email', 'Department', 'Roles', 'Status', 'Last Login'],
        ...users.map((u) => [
          u.id,
          u.name,
          u.email,
          u.department,
          (u.roles || []).join(';'),
          u.status,
          new Date(u.lastLogin).toISOString(),
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-${Date.now()}.csv`;
      link.click();
      alert('Users exported successfully');
    } catch (err) {
      alert('Error exporting: ' + err.message);
    }
  }, [users]);

  // Calculate statistics
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === 'active').length,
    avgRolesPerUser: users.length > 0
      ? (users.reduce((sum, u) => sum + (u.roles?.length || 0), 0) / users.length).toFixed(1)
      : 0,
    totalRoleAssignments: users.reduce((sum, u) => sum + (u.roles?.length || 0), 0),
  };

  // Get user permissions
  const getUserPermissions = useCallback((user) => {
    const userPerms = new Set();
    user.roles?.forEach((roleId) => {
      const role = roles.find((r) => r.id === roleId);
      if (role?.permissions) {
        role.permissions.forEach((perm) => userPerms.add(perm));
      }
    });
    return Array.from(userPerms);
  }, [roles]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          👥 User Role Assignment
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Manage user roles and permissions
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h5">{stats.totalUsers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Users
              </Typography>
              <Typography variant="h5">{stats.activeUsers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Roles/User
              </Typography>
              <Typography variant="h5">{stats.avgRolesPerUser}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Assignments
              </Typography>
              <Typography variant="h5">{stats.totalRoleAssignments}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          {/* Search Box */}
          <TextField
            placeholder="Search users..."
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

          {/* Role Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>By Role</InputLabel>
            <Select
              value={filterRole}
              label="By Role"
              onChange={(e) => {
                setFilterRole(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Roles</MenuItem>
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1}>
            <Tooltip title="Add user">
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                New User
              </Button>
            </Tooltip>

            <Tooltip title="Export users">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportUsers}
              >
                Export
              </Button>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {selectedUsers.length} user(s) selected
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" color="primary" onClick={handleBulkRoleAssign}>
                Assign Role to All
              </Button>
              <Button size="small" onClick={() => setSelectedUsers([])}>
                Clear Selection
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Content Tabs */}
      <Paper>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="All Users" />
          <Tab label="By Department" />
          <Tab label="Activity" />
        </Tabs>

        {/* Tab 1: All Users */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Department</strong></TableCell>
                  <TableCell align="center"><strong>Roles</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Last Login</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                      <Typography color="textSecondary">No users found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {user.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${(user.roles || []).length} roles`}
                          size="small"
                          color={user.roles?.length > 0 ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.status}
                          size="small"
                          color={user.status === 'active' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(user.lastLogin).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Manage Roles">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(user)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Permissions">
                          <IconButton
                            size="small"
                            onClick={() => handleViewPermissions(user)}
                            color="info"
                          >
                            <PermissionIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteUser(user.id)}
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
            count={filteredUsers.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </TabPanel>

        {/* Tab 2: By Department */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            {[...new Set(users.map((u) => u.department))].map((dept) => {
              const deptUsers = users.filter((u) => u.department === dept);
              return (
                <Box key={dept}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {dept} ({deptUsers.length})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {deptUsers.map((user) => (
                      <Card key={user.id} sx={{ minWidth: 250 }}>
                        <CardContent>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {user.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {user.email}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            {(user.roles || []).map((roleId) => {
                              const role = roles.find((r) => r.id === roleId);
                              return (
                                <Chip
                                  key={roleId}
                                  label={role?.name || roleId}
                                  size="small"
                                  sx={{ mr: 0.5, mt: 0.5 }}
                                />
                              );
                            })}
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </TabPanel>

        {/* Tab 3: Activity */}
        <TabPanel value={tabValue} index={2}>
          <Stack spacing={2}>
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="start">
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {user.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {user.email}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption">
                        Last Login:
                      </Typography>
                      <Typography variant="body2">
                        {new Date(user.lastLogin).toLocaleString()}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </TabPanel>
      </Paper>

      {/* Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          ➕ Assign Roles to User
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="User Name"
              name="userName"
              value={formData.userName}
              onChange={handleFormChange}
              fullWidth
              required
              error={submitted && !formData.userName}
            />

            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleFormChange}
              fullWidth
              required
              error={submitted && !formData.email}
            />

            <TextField
              label="Department"
              name="department"
              value={formData.department}
              onChange={handleFormChange}
              fullWidth
            />

            {/* Role Selection */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Select Roles:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {roles.map((role) => (
                  <FormControlLabel
                    key={role.id}
                    control={
                      <Checkbox
                        checked={formData.selectedRoles.includes(role.id)}
                        onChange={() => handleRoleToggle(role.id)}
                      />
                    }
                    label={`${role.name} (Level ${role.level})`}
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveUserRoles} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permission View Dialog */}
      <Dialog open={openPermDialog} onClose={() => setOpenPermDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          🔐 User Permissions - {selectedUserForPerm?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedUserForPerm && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Assigned Roles:
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {(selectedUserForPerm.roles || []).map((roleId) => {
                    const role = roles.find((r) => r.id === roleId);
                    return (
                      <Chip
                        key={roleId}
                        label={role?.name || roleId}
                        color="primary"
                      />
                    );
                  })}
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Inherited Permissions:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {getUserPermissions(selectedUserForPerm).map((permId) => {
                    const perm = permissions.find((p) => p.id === permId);
                    return (
                      <Chip
                        key={permId}
                        label={perm?.name || permId}
                        color="success"
                        variant="outlined"
                      />
                    );
                  })}
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPermDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)}>
        <DialogTitle>⚠️ Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this user and all their role assignments?
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

export default UserRoleAssignmentPanel;
