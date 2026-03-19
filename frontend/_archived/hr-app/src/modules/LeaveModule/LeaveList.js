import React, { useState } from 'react';
import { useLeaves, deleteLeave } from './api';
import LeaveEditForm from './LeaveEditForm';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Button from '@mui/material/Button';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import RequirePermission from '../../context/RequirePermission';
import { PERMISSIONS } from '../../context/roles';
import LeaveForm from './LeaveForm';
import { useNotification } from '../../context/NotificationContext';
import { useTranslation } from 'react-i18next';

const LeaveList = ({ onChanged }) => {
  const { leaves, loading, error } = useLeaves();
  const [deleting, setDeleting] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const { notify } = useNotification();
  const { t } = useTranslation();

  const handleDelete = async id => {
    if (!window.confirm(t('Delete this leave?'))) return;
    setDeleting(id);
    try {
      await deleteLeave(id);
      notify(t('Leave record deleted successfully'), 'success');
      if (onChanged) onChanged();
    } catch (e) {
      notify(e.message || t('Delete failed'), 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div>{t('Loading...')}</div>;
  if (error) return <div>{t('Error loading leave records')}</div>;

  // Filter leaves by search
  const filteredLeaves = leaves.filter(
    leave =>
      leave.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      leave.type.toLowerCase().includes(search.toLowerCase()) ||
      leave.status.toLowerCase().includes(search.toLowerCase())
  );
  const paginatedLeaves = filteredLeaves.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <div>
      <h3>{t('Leave Records')}</h3>
      <TextField
        label={t('Search')}
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setPage(0);
        }}
        size="small"
        sx={{ mb: 2 }}
      />
      <RequirePermission permission={PERMISSIONS.ADD_LEAVE}>
        <LeaveForm onSuccess={onChanged} />
      </RequirePermission>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('Employee')}</TableCell>
            <TableCell>{t('Type')}</TableCell>
            <TableCell>{t('From')}</TableCell>
            <TableCell>{t('To')}</TableCell>
            <TableCell>{t('Status')}</TableCell>
            <TableCell>{t('Actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedLeaves.map(leave => (
            <TableRow key={leave._id}>
              {editingId === leave._id ? (
                <TableCell colSpan={6}>
                  <LeaveEditForm
                    leave={leave}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      if (onChanged) onChanged();
                    }}
                  />
                </TableCell>
              ) : (
                <>
                  <TableCell>{leave.employeeName}</TableCell>
                  <TableCell>{leave.type}</TableCell>
                  <TableCell>{leave.from}</TableCell>
                  <TableCell>{leave.to}</TableCell>
                  <TableCell>{leave.status}</TableCell>
                  <TableCell>
                    <RequirePermission permission={PERMISSIONS.EDIT_LEAVE}>
                      <Button
                        onClick={() => setEditingId(leave._id)}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      >
                        {t('Edit')}
                      </Button>
                    </RequirePermission>
                    <RequirePermission permission={PERMISSIONS.DELETE_LEAVE}>
                      <Button
                        onClick={() => handleDelete(leave._id)}
                        size="small"
                        color="error"
                        variant="contained"
                        disabled={deleting === leave._id}
                      >
                        {deleting === leave._id ? t('Deleting...') : t('Delete')}
                      </Button>
                    </RequirePermission>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={filteredLeaves.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={e => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </div>
  );
};

export default LeaveList;
