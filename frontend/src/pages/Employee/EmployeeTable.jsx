/**
 * EmployeeTable.jsx — Employee data table with pagination
 * جدول بيانات الموظفين
 */

import { STATUS_MAP } from './employeeManagement.constants';
import { DEPT_COLORS } from '../../constants/departmentColors';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { CopyIcon, ViewIcon } from 'utils/iconAliases';

const EmployeeTable = ({
  loading, filtered, page, rowsPerPage, setPage, setRowsPerPage,
  openView, openEdit, setDeleteTarget, handleCopyId,
}) => {
  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>رقم الموظف</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>المنصب</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>تاريخ التعيين</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الهاتف</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">لا يوجد موظفون مطابقون للبحث</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(emp => {
                const st = STATUS_MAP[emp.status] || STATUS_MAP.active;
                const dc = DEPT_COLORS[emp.department] || '#607d8b';
                return (
                  <TableRow key={emp._id} hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => openView(emp)}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: `${dc}20`, color: dc, width: 38, height: 38, fontSize: 14, fontWeight: 700 }}>
                          {(emp.firstName || '?')[0]}{(emp.lastName || '')[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{emp.firstName} {emp.lastName}</Typography>
                          <Typography variant="caption" color="text.secondary">{emp.email || ''}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={emp.employeeNumber || '—'} size="small" variant="outlined"
                        onClick={e => { e.stopPropagation(); handleCopyId(emp.employeeNumber); }}
                        onDelete={e => { e.stopPropagation(); handleCopyId(emp.employeeNumber); }}
                        deleteIcon={<CopyIcon sx={{ fontSize: '14px !important' }} />} />
                    </TableCell>
                    <TableCell>
                      <Chip label={emp.department || '—'} size="small"
                        sx={{ bgcolor: `${dc}15`, color: dc, fontWeight: 600, borderColor: `${dc}40`, border: '1px solid' }} />
                    </TableCell>
                    <TableCell>{emp.position || '—'}</TableCell>
                    <TableCell><Chip label={st.label} color={st.color} size="small" icon={st.icon} /></TableCell>
                    <TableCell><Typography variant="body2">{emp.joinDate || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" dir="ltr">{emp.phone || '—'}</Typography></TableCell>
                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                      <Tooltip title="عرض"><IconButton size="small" onClick={() => openView(emp)}><ViewIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="تعديل"><IconButton size="small" color="primary" onClick={() => openEdit(emp)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => setDeleteTarget(emp)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={filtered.length} page={page} onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage} onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
        labelRowsPerPage="صفوف لكل صفحة:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
      />
    </Paper>
  );
};

export default EmployeeTable;
