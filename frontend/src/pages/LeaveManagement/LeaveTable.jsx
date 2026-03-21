/**
 * LeaveManagement — Table with leave rows + pagination
 */

import { STATUS_CONFIG } from './constants';
import {
  Avatar,
  Box,
  Chip,
  IconButton,
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
import { ViewIcon } from 'utils/iconAliases';

const LeaveTable = ({
  filtered, page, setPage, rowsPerPage, setRowsPerPage,
  setViewItem, openActionDialog,
  getLeaveTypeLabel, getLeaveTypeColor, getLeaveTypeIcon, formatDays,
}) => {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>نوع الإجازة</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>من</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>إلى</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>المدة</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>السبب</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="center">الإجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                <VacationIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">لا توجد طلبات إجازات مطابقة</Typography>
              </TableCell>
            </TableRow>
          ) : (
            filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(leave => {
              const st = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending;
              const ltc = getLeaveTypeColor(leave.leaveType);
              return (
                <TableRow key={leave._id} hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => setViewItem(leave)}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: `${ltc}18`, color: ltc, width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
                        {(leave.employeeName || '?')[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{leave.employeeName || '—'}</Typography>
                        {leave.employeeId && <Typography variant="caption" color="text.secondary">{leave.employeeId}</Typography>}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip icon={getLeaveTypeIcon(leave.leaveType)} label={getLeaveTypeLabel(leave.leaveType)} size="small"
                      sx={{ bgcolor: `${ltc}12`, color: ltc, fontWeight: 600, border: `1px solid ${ltc}30` }} />
                  </TableCell>
                  <TableCell><Typography variant="body2">{leave.startDate || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{leave.endDate || '—'}</Typography></TableCell>
                  <TableCell>
                    <Chip label={formatDays(leave.startDate, leave.endDate)} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary"
                      sx={{ maxWidth: 140, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {leave.reason || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell><Chip label={st.label} color={st.color} size="small" icon={st.icon} /></TableCell>
                  <TableCell align="center" onClick={e => e.stopPropagation()}>
                    <Tooltip title="عرض التفاصيل"><IconButton size="small" onClick={() => setViewItem(leave)}><ViewIcon fontSize="small" /></IconButton></Tooltip>
                    {leave.status === 'pending' && (
                      <>
                        <Tooltip title="موافقة">
                          <IconButton size="small" color="success" onClick={() => openActionDialog(leave, 'approve')}>
                            <ApproveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="رفض">
                          <IconButton size="small" color="error" onClick={() => openActionDialog(leave, 'reject')}>
                            <RejectIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <TablePagination component="div" count={filtered.length} page={page} onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage} onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
        labelRowsPerPage="صفوف لكل صفحة:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
      />
    </TableContainer>
  );
};

export default LeaveTable;
