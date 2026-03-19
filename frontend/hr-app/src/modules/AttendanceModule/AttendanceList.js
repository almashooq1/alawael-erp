import React, { useState } from 'react';
import { useAttendance, deleteAttendance } from './api';
import AttendanceEditForm from './AttendanceEditForm';
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
import AttendanceForm from './AttendanceForm';
import { useNotification } from '../../context/NotificationContext';
import { useTranslation } from 'react-i18next';

const AttendanceList = ({ onChanged }) => {
  const { attendance, loading, error } = useAttendance();
  const [deleting, setDeleting] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const { notify } = useNotification();
  const { t } = useTranslation();

  const handleDelete = async id => {
    if (!window.confirm(t('Delete this attendance record?'))) return;
    setDeleting(id);
    try {
      await deleteAttendance(id);
      notify(t('Attendance record deleted successfully'), 'success');
      if (onChanged) onChanged();
    } catch (e) {
      notify(e.message || t('Delete failed'), 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div>{t('Loading...')}</div>;
  if (error) return <div>{t('Error loading attendance records')}</div>;

  // Filter attendance by search
  const filteredAttendance = attendance.filter(
    rec =>
      rec.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      rec.date.toLowerCase().includes(search.toLowerCase()) ||
      rec.status.toLowerCase().includes(search.toLowerCase())
  );
  const paginatedAttendance = filteredAttendance.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <div>
      <h3>{t('Attendance Records')}</h3>
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
      <RequirePermission permission={PERMISSIONS.ADD_ATTENDANCE}>
        <AttendanceForm onSuccess={onChanged} />
      </RequirePermission>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('Employee')}</TableCell>
            <TableCell>{t('Date')}</TableCell>
            <TableCell>{t('Status')}</TableCell>
            <TableCell>{t('Actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedAttendance.map(rec => (
            <TableRow key={rec._id}>
              {editingId === rec._id ? (
                <TableCell colSpan={4}>
                  <AttendanceEditForm
                    record={rec}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      if (onChanged) onChanged();
                    }}
                  />
                </TableCell>
              ) : (
                <>
                  <TableCell>{rec.employeeName}</TableCell>
                  <TableCell>{rec.date}</TableCell>
                  <TableCell>{rec.status}</TableCell>
                  <TableCell>
                    <RequirePermission permission={PERMISSIONS.EDIT_ATTENDANCE}>
                      <Button
                        onClick={() => setEditingId(rec._id)}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      >
                        {t('Edit')}
                      </Button>
                    </RequirePermission>
                    <RequirePermission permission={PERMISSIONS.DELETE_ATTENDANCE}>
                      <Button
                        onClick={() => handleDelete(rec._id)}
                        size="small"
                        color="error"
                        variant="contained"
                        disabled={deleting === rec._id}
                      >
                        {deleting === rec._id ? t('Deleting...') : t('Delete')}
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
        count={filteredAttendance.length}
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

export default AttendanceList;
