/**
 * FleetTable.jsx — Dynamic table for the active fleet entity tab
 * جدول بيانات الأسطول الديناميكي
 */
import { Paper,
} from '@mui/material';
import { STATUS_CHIP_COLORS, TABS, COLUMNS, HEADERS } from './fleetManagement.constants';
import { surfaceColors } from '../../theme/palette';
import {
  Chip,
  IconButton,
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

const FleetTable = ({ activeTab, data, openEdit, handleDelete }) => {
  const currentKey = TABS[activeTab]?.key;
  const currentData = Array.isArray(data[currentKey]) ? data[currentKey] : [];

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
            {(HEADERS[currentKey] || []).map((h, i) => (
              <TableCell key={i} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
            ))}
            {currentKey !== 'gps' && <TableCell sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {currentData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center">
                <Typography color="text.secondary" sx={{ py: 3 }}>لا توجد بيانات</Typography>
              </TableCell>
            </TableRow>
          ) : (
            currentData.map((row, idx) => (
              <TableRow key={row._id || idx} hover>
                {(COLUMNS[currentKey] || []).map((col, i) => (
                  <TableCell key={i}>
                    {col === 'status' ? (
                      <Chip label={row[col]} size="small" color={STATUS_CHIP_COLORS[row[col]] || 'default'} />
                    ) : (
                      row[col]
                    )}
                  </TableCell>
                ))}
                {currentKey !== 'gps' && (
                  <TableCell>
                    <Tooltip title="تعديل">
                      <IconButton aria-label="إجراء" size="small" color="primary" onClick={() => openEdit(currentKey, row)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton aria-label="إجراء" size="small" color="error" onClick={() => handleDelete(currentKey, row._id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default FleetTable;
