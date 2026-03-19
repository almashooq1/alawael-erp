/**
 * UserRoleManager Component
 * Phase 13 - Week 1: Admin UI for Role Management
 * Allows admins to view and modify user roles
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Shield as ShieldIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useRBAC, ROLES } from '../../contexts/RBACContext';

export const UserRoleManager = () => {
  const { hasPermission, user } = useRBAC();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [reason, setReason] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/api/users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setUsers(response.data.users || []);
    } catch (err) {
      setError('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (userToEdit) => {
    setEditingUser(userToEdit);
    setSelectedRole(userToEdit.role);
    setReason('');
    setDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for role change');
      return;
    }

    try {
      setError(null);

      await axios.put(
        `/api/users/${editingUser.id}/role`,
        {
          role: selectedRole,
          reason: reason.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setSuccess(`Successfully updated role for ${editingUser.email}`);
      setDialogOpen(false);
      setEditingUser(null);
      setReason('');

      // Reload users
      await loadUsers();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update role: ' + err.message);
    }
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setReason('');
    setError(null);
  };

  const getRoleColor = (role) => {
    const colors = {
      ADMIN: 'error',
      QUALITY_MANAGER: 'warning',
      TEAM_LEAD: 'info',
      ANALYST: 'primary',
      VIEWER: 'default',
      GUEST: 'default',
    };
    return colors[role] || 'default';
  };

  // Check permission
  if (!hasPermission('manage:users')) {
    return (
      <Box p={3}>
        <Alert severity="error">
          You don't have permission to manage user roles.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <ShieldIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h5" component="h2">
              User Role Management
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Current Role</TableCell>
                  <TableCell>Role Level</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((userRow) => (
                  <TableRow key={userRow.id}>
                    <TableCell>{userRow.email}</TableCell>
                    <TableCell>{userRow.name || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={userRow.role}
                        color={getRoleColor(userRow.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{ROLES[userRow.role]?.level || 0}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditClick(userRow)}
                        disabled={userRow.id === user?.id}
                      >
                        Edit Role
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {users.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">No users found</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={dialogOpen} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Change User Role</DialogTitle>
        <DialogContent>
          <Box pt={1}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              User: {editingUser?.email}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current Role: {editingUser?.role}
            </Typography>

            <Select
              fullWidth
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              sx={{ mt: 2, mb: 2 }}
            >
              {Object.keys(ROLES).map((role) => (
                <MenuItem key={role} value={role}>
                  {role} (Level {ROLES[role].level})
                </MenuItem>
              ))}
            </Select>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason for change (required)"
              placeholder="Explain why you're changing this user's role..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveRole}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!reason.trim() || selectedRole === editingUser?.role}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserRoleManager;
