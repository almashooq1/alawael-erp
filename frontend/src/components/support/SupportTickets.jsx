import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
} from '@mui/material';
import { Add as AddIcon, Reply as ReplyIcon, Close as CloseIcon } from '@mui/icons-material';
import { fetchTickets, closeTicket } from '../../store/slices/supportSlice';

const SupportTickets = () => {
  const dispatch = useDispatch();
  const { tickets, loading, error } = useSelector((state) => state.support);

  useEffect(() => {
    dispatch(fetchTickets());
  }, [dispatch]);

  const handleClose = (ticketId) => {
    dispatch(closeTicket(ticketId));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      open: 'error',
      pending: 'warning',
      resolved: 'success',
      closed: 'default',
    };
    return colors[status] || 'default';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">تذاكر الدعم الفني</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />}>
          تذكرة جديدة
        </Button>
      </Box>

      {error && <Typography color="error">{error}</Typography>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>رقم التذكرة</TableCell>
              <TableCell>العنوان</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الأولوية</TableCell>
              <TableCell>تاريخ الإنشاء</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>{ticket.id}</TableCell>
                <TableCell>{ticket.title}</TableCell>
                <TableCell>
                  <Chip
                    label={ticket.status}
                    color={getStatusColor(ticket.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={ticket.priority}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(ticket.createdAt).toLocaleDateString('ar-SA')}
                </TableCell>
                <TableCell>
                  <Button size="small" startIcon={<ReplyIcon />} sx={{ mr: 1 }}>
                    رد
                  </Button>
                  {ticket.status !== 'closed' && (
                    <Button
                      size="small"
                      color="success"
                      startIcon={<CloseIcon />}
                      onClick={() => handleClose(ticket.id)}
                    >
                      إغلاق
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SupportTickets;
