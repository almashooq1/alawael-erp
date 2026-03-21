/**
 * FleetTable.jsx
 * جدول بيانات الأسطول حسب التبويب النشط
 */
import {
  Paper,
} from '@mui/material';
import { TABS } from './fleetManagement.constants';
import {
  Box,
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

// ─── Column definitions per tab ─────────────────────────────
const COLUMNS = {
  vehicles: [
    { key: 'name', label: 'اسم المركبة' },
    { key: 'plate', label: 'رقم اللوحة' },
    { key: 'type', label: 'النوع' },
    { key: 'status', label: 'الحالة' },
    { key: 'km', label: 'الكيلومترات' },
  ],
  drivers: [
    { key: 'name', label: 'اسم السائق' },
    { key: 'license', label: 'رقم الرخصة' },
    { key: 'phone', label: 'الهاتف' },
    { key: 'status', label: 'الحالة' },
    { key: 'vehicle', label: 'المركبة المخصصة' },
  ],
  maintenance: [
    { key: 'vehicle', label: 'المركبة' },
    { key: 'type', label: 'نوع الصيانة' },
    { key: 'date', label: 'التاريخ' },
    { key: 'status', label: 'الحالة' },
    { key: 'cost', label: 'التكلفة (ر.س)' },
  ],
  fuel: [
    { key: 'vehicle', label: 'المركبة' },
    { key: 'liters', label: 'اللترات' },
    { key: 'cost', label: 'التكلفة (ر.س)' },
    { key: 'date', label: 'التاريخ' },
    { key: 'station', label: 'المحطة' },
  ],
  gps: [
    { key: 'vehicle', label: 'المركبة' },
    { key: 'lat', label: 'خط العرض' },
    { key: 'lng', label: 'خط الطول' },
    { key: 'speed', label: 'السرعة (كم/س)' },
    { key: 'lastUpdate', label: 'آخر تحديث' },
  ],
};

// ─── Status chip helper ─────────────────────────────────────
const STATUS_MAP = {
  active: { label: 'نشط', color: 'success' },
  inactive: { label: 'غير نشط', color: 'default' },
  maintenance: { label: 'صيانة', color: 'warning' },
  on_leave: { label: 'في إجازة', color: 'info' },
  pending: { label: 'قيد الانتظار', color: 'warning' },
  completed: { label: 'مكتمل', color: 'success' },
};

const renderCell = (row, col) => {
  const value = row[col.key];
  if (col.key === 'status' && STATUS_MAP[value]) {
    return <Chip label={STATUS_MAP[value].label} color={STATUS_MAP[value].color} size="small" />;
  }
  if (col.key === 'km' || col.key === 'cost' || col.key === 'liters') {
    return typeof value === 'number' ? value.toLocaleString('ar-SA') : value;
  }
  return value ?? '—';
};

const FleetTable = ({ activeTab, data, openEdit, handleDelete }) => {
  const tabKey = TABS[activeTab]?.key;
  const columns = COLUMNS[tabKey] || [];
  const rows = data[tabKey] || [];
  const isGps = tabKey === 'gps';

  if (!rows.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">
          لا توجد بيانات لعرضها
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ direction: 'rtl' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            {columns.map((col) => (
              <TableCell key={col.key} sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                {col.label}
              </TableCell>
            ))}
            {!isGps && (
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', width: 120 }}>
                الإجراءات
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              {columns.map((col) => (
                <TableCell key={col.key} sx={{ textAlign: 'right' }}>
                  {renderCell(row, col)}
                </TableCell>
              ))}
              {!isGps && (
                <TableCell sx={{ textAlign: 'center' }}>
                  <Tooltip title="تعديل">
                    <IconButton size="small" color="primary" onClick={() => openEdit(tabKey, row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error" onClick={() => handleDelete(tabKey, row)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default FleetTable;
