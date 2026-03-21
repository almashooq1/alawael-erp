/**
 * SessionsTable — Search, filters, table, pagination, and quick actions
 * Now supports cancel / attendance / no-show + backend-aligned status & type fields
 */
import { Paper,
} from '@mui/material';

import {
  SESSION_TYPES, STATUS_MAP, STATUS_FILTER_OPTIONS,
  getTypeColor, getSessionType, formatDate, formatTime,
} from './constants';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterList from '@mui/icons-material/FilterList';
import EventIcon from '@mui/icons-material/Event';
import AddIcon from '@mui/icons-material/Add';
import CalendarToday from '@mui/icons-material/CalendarToday';
import Person from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const SessionsTable = ({
  filtered, loading, totalCount, search, setSearch,
  filterType, setFilterType, filterStatus, setFilterStatus,
  showFilters, setShowFilters, page, setPage,
  rowsPerPage, setRowsPerPage,
  handleOpenCreate, handleOpenEdit, setDeleteTarget,
  handleCancel, handleMarkAttendance, handleMarkNoShow,
}) => (
  <>
    {/* ── Search & Filters ── */}
    <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="بحث بالاسم أو النوع..."
            size="small"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 400 }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            فلاتر
          </Button>
        </Stack>

        <Collapse in={showFilters}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <TextField
              select label="نوع الجلسة" size="small"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">الكل</MenuItem>
              {SESSION_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select label="الحالة" size="small"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
              sx={{ minWidth: 180 }}
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
            <Button
              size="small"
              onClick={() => { setFilterType(''); setFilterStatus(''); setSearch(''); setPage(0); }}
            >
              مسح الفلاتر
            </Button>
          </Stack>
        </Collapse>
      </CardContent>
    </Card>

    {/* ── Sessions Table ── */}
    <Card elevation={2} sx={{ borderRadius: 3 }}>
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>الجلسة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الوقت</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>المشاركون</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [0, 1, 2, 3, 4].map((i) => (
                <TableRow key={i}>
                  {[0, 1, 2, 3, 4, 5, 6].map((j) => (
                    <TableCell key={j}><Skeleton /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <EventIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">لا توجد جلسات</Typography>
                  <Button variant="outlined" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={handleOpenCreate}>
                    إضافة جلسة جديدة
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((session) => {
                const sType = getSessionType(session);
                const statusInfo = STATUS_MAP[session.status] || STATUS_MAP.SCHEDULED;
                const isActive = session.status === 'SCHEDULED' || session.status === 'CONFIRMED';
                return (
                  <TableRow key={session._id || session.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar sx={{ bgcolor: getTypeColor(sType), width: 36, height: 36 }}>
                          <LocalHospital fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{session.title}</Typography>
                          {session.createdBy?.name && (
                            <Typography variant="caption" color="text.secondary">
                              بواسطة: {session.createdBy.name}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sType}
                        size="small"
                        sx={{ bgcolor: getTypeColor(sType) + '22', color: getTypeColor(sType), fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <CalendarToday fontSize="small" color="action" />
                        <Typography variant="body2">{formatDate(session.date || session.startTime)}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <AccessTime fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatTime(session.startTime)} – {formatTime(session.endTime)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {Array.isArray(session.participants) && session.participants.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {session.participants.slice(0, 2).map((p, idx) => (
                            <Chip key={idx} icon={<Person />} label={p.name || p} size="small" variant="outlined" />
                          ))}
                          {session.participants.length > 2 && (
                            <Chip label={`+${session.participants.length - 2}`} size="small" />
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={statusInfo.label} color={statusInfo.color} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {/* Attendance (only for active sessions) */}
                        {isActive && handleMarkAttendance && (
                          <Tooltip title="تسجيل حضور">
                            <IconButton
                              size="small" color="success"
                              onClick={() => handleMarkAttendance(session._id || session.id)}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {/* No-show (only for active sessions) */}
                        {isActive && handleMarkNoShow && (
                          <Tooltip title="لم يحضر">
                            <IconButton
                              size="small" color="warning"
                              onClick={() => handleMarkNoShow(session._id || session.id)}
                            >
                              <NoShowIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {/* Cancel (only for active sessions) */}
                        {isActive && handleCancel && (
                          <Tooltip title="إلغاء">
                            <IconButton
                              size="small" color="error"
                              onClick={() => handleCancel(session._id || session.id)}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="تعديل">
                          <IconButton size="small" color="primary" onClick={() => handleOpenEdit(session)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget(session)}>
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
        count={totalCount}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="صفوف لكل صفحة:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count !== -1 ? count : `أكثر من ${to}`}`}
      />
    </Card>
  </>
);

export default SessionsTable;
