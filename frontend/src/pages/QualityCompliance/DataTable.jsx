import React from 'react';
import {
  Paper,
} from '@mui/material';
import { statusColors } from './constants';
import {
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const DataTable = ({ items, cols, headers, onEdit, onDelete }) => (
  <TableContainer component={Paper} sx={{ mt: 2 }}>
    <Table>
      <TableHead>
        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
          {headers.map((h, i) => (
            <TableCell key={i} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
          ))}
          <TableCell sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={cols.length + 1} align="center">لا توجد بيانات</TableCell>
          </TableRow>
        ) : (
          items.map((row, idx) => (
            <TableRow key={row._id || idx} hover>
              {cols.map((col, i) => (
                <TableCell key={i}>
                  {col === 'status' || col === 'priority' ? (
                    <Chip label={row[col]} size="small" color={statusColors[row[col]] || 'default'} />
                  ) : col === 'complianceRate' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={row[col]}
                        sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        color={row[col] >= 80 ? 'success' : row[col] >= 60 ? 'warning' : 'error'}
                      />
                      <Typography variant="body2">{row[col]}%</Typography>
                    </Box>
                  ) : (
                    row[col]
                  )}
                </TableCell>
              ))}
              <TableCell>
                <Tooltip title="تعديل">
                  <IconButton aria-label="تعديل" size="small" color="primary" onClick={() => onEdit(row)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="حذف">
                  <IconButton aria-label="إجراء" size="small" color="error" onClick={() => onDelete(row._id)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

export default React.memo(DataTable);
