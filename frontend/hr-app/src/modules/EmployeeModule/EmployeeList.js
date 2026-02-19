import React, { useState } from 'react';
import { useEmployees, deleteEmployee } from './api';
import { useTranslation } from 'react-i18next';
import EmployeeEditForm from './EmployeeEditForm';
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
import EmployeeForm from './EmployeeForm';
import { useNotification } from '../../context/NotificationContext';

const EmployeeList = ({ onChanged }) => {
  const { employees, loading, error } = useEmployees();
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const { notify } = useNotification();

  const handleDelete = async id => {
    if (!window.confirm('Delete this employee?')) return;
    setDeleting(id);
    try {
      await deleteEmployee(id);
      notify('Employee deleted successfully', 'success');
      if (onChanged) onChanged();
    } catch (e) {
      notify(e.message || 'Delete failed', 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div>{t('Loading...')}</div>;
  if (error) return <div>{t('Error loading employees')}</div>;

  // Filter employees by search
  const filteredEmployees = employees.filter(
    emp =>
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.position.toLowerCase().includes(search.toLowerCase())
  );
  const paginatedEmployees = filteredEmployees.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <div>
      <h3>{t('Employee List')}</h3>
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
      <RequirePermission permission={PERMISSIONS.ADD_EMPLOYEES}>
        <EmployeeForm onSuccess={onChanged} />
      </RequirePermission>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('Name')}</TableCell>
            <TableCell>{t('Email')}</TableCell>
            <TableCell>{t('Position')}</TableCell>
            <TableCell>{t('Actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedEmployees.map(emp => (
            <TableRow key={emp._id}>
              {editingId === emp._id ? (
                <TableCell colSpan={4}>
                  <EmployeeEditForm
                    employee={emp}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      if (onChanged) onChanged();
                    }}
                  />
                </TableCell>
              ) : (
                <>
                  <TableCell>{emp.name}</TableCell>
                  <TableCell>{emp.email}</TableCell>
                  <TableCell>{emp.position}</TableCell>
                  <TableCell>
                    <RequirePermission permission={PERMISSIONS.EDIT_EMPLOYEES}>
                      <Button
                        onClick={() => setEditingId(emp._id)}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      >
                        {t('Edit')}
                      </Button>
                    </RequirePermission>
                    <RequirePermission permission={PERMISSIONS.DELETE_EMPLOYEES}>
                      <Button
                        onClick={() => handleDelete(emp._id)}
                        size="small"
                        color="error"
                        variant="contained"
                        disabled={deleting === emp._id}
                      >
                        {deleting === emp._id ? t('Deleting...') : t('Delete')}
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
        count={filteredEmployees.length}
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

export default EmployeeList;
