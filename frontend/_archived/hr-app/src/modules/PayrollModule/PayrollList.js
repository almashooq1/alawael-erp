import React, { useState } from 'react';
import { usePayroll, deletePayroll } from './api';
import PayrollEditForm from './PayrollEditForm';
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
import PayrollForm from './PayrollForm';
import { useNotification } from '../../context/NotificationContext';
import { useTranslation } from 'react-i18next';

const PayrollList = ({ onChanged }) => {
  const { payroll, loading, error } = usePayroll();
  const [deleting, setDeleting] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const { notify } = useNotification();
  const { t } = useTranslation();

  const handleDelete = async id => {
    if (!window.confirm(t('Delete this payroll record?'))) return;
    setDeleting(id);
    try {
      await deletePayroll(id);
      notify(t('Payroll record deleted successfully'), 'success');
      if (onChanged) onChanged();
    } catch (e) {
      notify(e.message || t('Delete failed'), 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div>{t('Loading...')}</div>;
  if (error) return <div>{t('Error loading payroll records')}</div>;

  // Filter payroll by search
  const filteredPayroll = payroll.filter(
    pay =>
      pay.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      pay.month.toLowerCase().includes(search.toLowerCase()) ||
      pay.status.toLowerCase().includes(search.toLowerCase())
  );
  const paginatedPayroll = filteredPayroll.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <div>
      <h3>{t('Payroll Records')}</h3>
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
      <RequirePermission permission={PERMISSIONS.ADD_PAYROLL}>
        <PayrollForm onSuccess={onChanged} />
      </RequirePermission>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('Employee')}</TableCell>
            <TableCell>{t('Month')}</TableCell>
            <TableCell>{t('Amount')}</TableCell>
            <TableCell>{t('Status')}</TableCell>
            <TableCell>{t('Actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedPayroll.map(pay => (
            <TableRow key={pay._id}>
              {editingId === pay._id ? (
                <TableCell colSpan={5}>
                  <PayrollEditForm
                    record={pay}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      if (onChanged) onChanged();
                    }}
                  />
                </TableCell>
              ) : (
                <>
                  <TableCell>{pay.employeeName}</TableCell>
                  <TableCell>{pay.month}</TableCell>
                  <TableCell>{pay.amount}</TableCell>
                  <TableCell>{pay.status}</TableCell>
                  <TableCell>
                    <RequirePermission permission={PERMISSIONS.EDIT_PAYROLL}>
                      <Button
                        onClick={() => setEditingId(pay._id)}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      >
                        {t('Edit')}
                      </Button>
                    </RequirePermission>
                    <RequirePermission permission={PERMISSIONS.DELETE_PAYROLL}>
                      <Button
                        onClick={() => handleDelete(pay._id)}
                        size="small"
                        color="error"
                        variant="contained"
                        disabled={deleting === pay._id}
                      >
                        {deleting === pay._id ? t('Deleting...') : t('Delete')}
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
        count={filteredPayroll.length}
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

export default PayrollList;
