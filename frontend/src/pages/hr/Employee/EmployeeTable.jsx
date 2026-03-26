/**
 * EmployeeTable – paginated table for employee list.
 */
import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Paper, Avatar, Chip, IconButton, Tooltip,
  Skeleton, Typography, Box, Stack,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { STATUS_MAP } from './employeeManagement.constants';

/* ── helpers ── */
const stringToColor = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  let color = '#';
  for (let i = 0; i < 3; i++) color += (`00${((hash >> (i * 8)) & 0xff).toString(16)}`).slice(-2);
  return color;
};

const initials = (first = '', last = '') =>
  `${first.charAt(0)}${last.charAt(0)}`.trim() || '؟';

/* ── skeleton rows ── */
const SkeletonRows = ({ count = 5 }) =>
  Array.from({ length: count }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 6 }).map((__, j) => (
        <TableCell key={j}><Skeleton variant="text" /></TableCell>
      ))}
    </TableRow>
  ));

/* ── component ── */
export default function EmployeeTable({
  loading, filtered, page, rowsPerPage,
  setPage, setRowsPerPage,
  openView, openEdit, setDeleteTarget, handleCopyId,
}) {
  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }} elevation={0} variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الرقم الوظيفي</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <SkeletonRows count={rowsPerPage} />
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">لا توجد نتائج</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paged.map((emp) => {
                const st = STATUS_MAP[emp.status] || { label: emp.status, color: '#999' };
                return (
                  <TableRow
                    key={emp._id}
                    hover
                    sx={{ '&:last-child td': { borderBottom: 0 } }}
                  >
                    {/* Name + Avatar */}
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar
                          sx={{
                            bgcolor: stringToColor(`${emp.firstName}${emp.lastName}`),
                            width: 36, height: 36, fontSize: 14,
                          }}
                        >
                          {initials(emp.firstName, emp.lastName)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {emp.firstName} {emp.lastName}
                          </Typography>
                          {emp.position && (
                            <Typography variant="caption" color="text.secondary">
                              {emp.position}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* Emp number */}
                    <TableCell>
                      <Typography variant="body2" dir="ltr">{emp.employeeId}</Typography>
                    </TableCell>

                    {/* Department */}
                    <TableCell>
                      <Typography variant="body2">{emp.department}</Typography>
                    </TableCell>

                    {/* Status chip */}
                    <TableCell>
                      <Chip
                        label={st.label}
                        size="small"
                        sx={{
                          bgcolor: `${st.color}18`,
                          color: st.color,
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      />
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center">
                      <Stack direction="row" justifyContent="center" spacing={0.5}>
                        <Tooltip title="عرض">
                          <IconButton size="small" color="info" onClick={() => openView(emp)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton size="small" color="primary" onClick={() => openEdit(emp)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="نسخ الرقم">
                          <IconButton size="small" onClick={() => handleCopyId(emp)}>
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget(emp)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[5, 10, 25]}
        labelRowsPerPage="عدد الصفوف:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
        sx={{ direction: 'ltr', '.MuiTablePagination-actions': { mr: 2 } }}
      />
    </Paper>
  );
}
