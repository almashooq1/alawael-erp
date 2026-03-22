/**
 * DataTable – generic table for all EducationRehab tabs.
 */
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { surfaceColors } from '../../theme/palette';
import { statusColors, colMap, tabs } from './constants';

const DataTable = ({ data, activeTab, onEdit, onDelete }) => {
  const key = tabs[activeTab]?.key;
  const items = Array.isArray(data[key]) ? data[key] : [];
  const { cols, headers } = colMap[key] || { cols: [], headers: [] };

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
            {headers.map((h, i) => (
              <TableCell key={i} sx={{ fontWeight: 'bold' }}>
                {h}
              </TableCell>
            ))}
            <TableCell sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={cols.length + 1} align="center">
                لا توجد بيانات
              </TableCell>
            </TableRow>
          ) : (
            items.map((row, idx) => (
              <TableRow key={row._id || idx} hover>
                {cols.map((col, i) => (
                  <TableCell key={i}>
                    {col === 'status' ? (
                      <Chip
                        label={row[col]}
                        size="small"
                        color={statusColors[row[col]] || 'default'}
                      />
                    ) : (
                      row[col]
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <Tooltip title="تعديل">
                    <IconButton
                      aria-label="تعديل"
                      size="small"
                      color="primary"
                      onClick={() => onEdit(key, row)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton
                      aria-label="إجراء"
                      size="small"
                      color="error"
                      onClick={() => onDelete(key, row._id)}
                    >
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
};

export default React.memo(DataTable);
