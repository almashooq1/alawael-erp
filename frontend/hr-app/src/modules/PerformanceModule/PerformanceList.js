import React, { useState } from 'react';
import { usePerformance, deletePerformance } from './api';
import PerformanceEditForm from './PerformanceEditForm';
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
import PerformanceForm from './PerformanceForm';
import { useNotification } from '../../context/NotificationContext';
import { useTranslation } from 'react-i18next';

const PerformanceList = ({ onChanged }) => {
  const { performance, loading, error } = usePerformance();
  const [deleting, setDeleting] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const { notify } = useNotification();
  const { t } = useTranslation();

  const handleDelete = async id => {
    if (!window.confirm(t('Delete this evaluation?'))) return;
    setDeleting(id);
    try {
      await deletePerformance(id);
      notify(t('Performance evaluation deleted successfully'), 'success');
      if (onChanged) onChanged();
    } catch (e) {
      notify(e.message || t('Delete failed'), 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div>{t('Loading...')}</div>;
  if (error) return <div>{t('Error loading performance records')}</div>;

  // Filter performance by search
  const filteredPerformance = performance.filter(
    evalr =>
      evalr.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      evalr.period.toLowerCase().includes(search.toLowerCase()) ||
      evalr.comments.toLowerCase().includes(search.toLowerCase())
  );
  const paginatedPerformance = filteredPerformance.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <div>
      <h3>{t('Performance Evaluations')}</h3>
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
      <RequirePermission permission={PERMISSIONS.ADD_PERFORMANCE}>
        <PerformanceForm onSuccess={onChanged} />
      </RequirePermission>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('Employee')}</TableCell>
            <TableCell>{t('Period')}</TableCell>
            <TableCell>{t('Score')}</TableCell>
            <TableCell>{t('Comments')}</TableCell>
            <TableCell>{t('Actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedPerformance.map(evalr => (
            <TableRow key={evalr._id}>
              {editingId === evalr._id ? (
                <TableCell colSpan={5}>
                  <PerformanceEditForm
                    record={evalr}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      if (onChanged) onChanged();
                    }}
                  />
                </TableCell>
              ) : (
                <>
                  <TableCell>{evalr.employeeName}</TableCell>
                  <TableCell>{evalr.period}</TableCell>
                  <TableCell>{evalr.score}</TableCell>
                  <TableCell>{evalr.comments}</TableCell>
                  <TableCell>
                    <RequirePermission permission={PERMISSIONS.EDIT_PERFORMANCE}>
                      <Button
                        onClick={() => setEditingId(evalr._id)}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      >
                        {t('Edit')}
                      </Button>
                    </RequirePermission>
                    <RequirePermission permission={PERMISSIONS.DELETE_PERFORMANCE}>
                      <Button
                        onClick={() => handleDelete(evalr._id)}
                        size="small"
                        color="error"
                        variant="contained"
                        disabled={deleting === evalr._id}
                      >
                        {deleting === evalr._id ? t('Deleting...') : t('Delete')}
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
        count={filteredPerformance.length}
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

export default PerformanceList;
