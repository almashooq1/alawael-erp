/**
 * OperationsTable — Renders the data table for the active tab
 */
import { Paper,
} from '@mui/material';
import { OP_STATUS_COLORS, COL_MAP } from './constants';
import {
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const OperationsTable = ({ activeTab, tabs, data, openEdit, handleDelete }) => {
  const key = tabs[activeTab]?.key;
  const items = Array.isArray(data[key]) ? data[key] : [];
  const { cols, headers } = COL_MAP[key] || { cols: [], headers: [] };

  return (
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
                    {col === 'status' ? (
                      <Chip label={row[col]} size="small" color={OP_STATUS_COLORS[row[col]] || 'default'} />
                    ) : (
                      row[col]
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <Tooltip title="تعديل">
                    <IconButton aria-label="تعديل" size="small" color="primary" onClick={() => openEdit(key, row)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton aria-label="إجراء" size="small" color="error" onClick={() => handleDelete(key, row._id)}>
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

export default OperationsTable;
