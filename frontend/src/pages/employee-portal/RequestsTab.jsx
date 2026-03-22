/**
 * RequestsTab — Employee portal requests listing + table
 * Extracted from EmployeePortal.js for maintainability
 */
import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { REQUEST_TYPES, STATUS_MAP } from './employeePortalData';

export default function RequestsTab({ requests, onOpenDialog }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          طلباتي ({requests.length})
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onOpenDialog}
          sx={{ borderRadius: 2 }}
        >
          طلب جديد
        </Button>
      </Box>
      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              {['النوع', 'الوصف', 'التاريخ', 'الحالة'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 'bold' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا توجد طلبات
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              requests.map(r => {
                const rt = REQUEST_TYPES[r.type];
                const st = STATUS_MAP[r.status];
                return (
                  <TableRow key={r._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {rt?.icon}
                        <Typography variant="body2">{rt?.label || r.type}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell>{r.createdAt}</TableCell>
                    <TableCell>
                      <Chip
                        icon={st?.icon}
                        label={st?.label || r.status}
                        size="small"
                        color={st?.color || 'default'}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
