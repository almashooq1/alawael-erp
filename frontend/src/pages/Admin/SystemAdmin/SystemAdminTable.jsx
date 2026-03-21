

/* ------------------------------------------------------------------ */
/*  Column definitions per tab key                                     */
/* ------------------------------------------------------------------ */
import {
  Box,
  Chip,
  IconButton,
  Paper,
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
const COLUMNS = {
  inventory:     [
    { key: 'id', label: '#' },
    { key: 'name', label: 'الصنف' },
    { key: 'qty', label: 'الكمية' },
    { key: 'status', label: 'الحالة' },
  ],
  ecommerce:     [
    { key: 'id', label: '#' },
    { key: 'name', label: 'المنتج' },
    { key: 'price', label: 'السعر' },
    { key: 'status', label: 'الحالة' },
  ],
  templates:     [
    { key: 'id', label: '#' },
    { key: 'name', label: 'اسم النموذج' },
    { key: 'category', label: 'الفئة' },
    { key: 'status', label: 'الحالة' },
  ],
  approvals:     [
    { key: 'id', label: '#' },
    { key: 'title', label: 'الطلب' },
    { key: 'requester', label: 'مقدّم الطلب' },
    { key: 'status', label: 'الحالة' },
  ],
  notifications: [
    { key: 'id', label: '#' },
    { key: 'title', label: 'التنبيه' },
    { key: 'channel', label: 'القناة' },
    { key: 'status', label: 'الحالة' },
  ],
  rbac:          [
    { key: 'id', label: '#' },
    { key: 'role', label: 'الدور' },
    { key: 'users', label: 'المستخدمون' },
    { key: 'permissions', label: 'الصلاحيات' },
  ],
  civilDefense:  [
    { key: 'id', label: '#' },
    { key: 'permit', label: 'الرخصة' },
    { key: 'expiry', label: 'تاريخ الانتهاء' },
    { key: 'status', label: 'الحالة' },
  ],
  qiwa:          [
    { key: 'id', label: '#' },
    { key: 'name', label: 'العقد' },
    { key: 'type', label: 'النوع' },
    { key: 'status', label: 'الحالة' },
  ],
};

/* ------------------------------------------------------------------ */
/*  Status chip helper                                                 */
/* ------------------------------------------------------------------ */
const statusColor = (status) => {
  if (!status) return 'default';
  const s = status.trim();
  if (['متوفر', 'نشط', 'مفعّل', 'معتمد', 'سارية', 'فعّال'].includes(s)) return 'success';
  if (['منخفض', 'قاربت الانتهاء', 'قيد المراجعة'].includes(s)) return 'warning';
  if (['معلّق', 'منتهي'].includes(s)) return 'error';
  return 'default';
};

/* ------------------------------------------------------------------ */
/*  SystemAdminTable                                                   */
/* ------------------------------------------------------------------ */
const SystemAdminTable = ({ activeTab, tabs = [], data = {}, openEdit, handleDelete }) => {
  const columns = COLUMNS[activeTab] || [];
  const rows    = data[activeTab] || [];
  const tabMeta = tabs.find((t) => t.key === activeTab);

  return (
    <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
      {/* title */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {tabMeta?.icon}
        <Typography variant="subtitle1" fontWeight={700}>
          {tabMeta?.label ?? activeTab}
        </Typography>
        <Chip label={rows.length} size="small" sx={{ ml: 'auto' }} />
      </Box>

      <TableContainer sx={{ maxHeight: 480 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} sx={{ fontWeight: 700, bgcolor: 'grey.100' }}>
                  {col.label}
                </TableCell>
              ))}
              <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.100', textAlign: 'center' }}>
                إجراءات
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا توجد بيانات</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.key === 'status' ? (
                        <Chip
                          label={row[col.key]}
                          size="small"
                          color={statusColor(row[col.key])}
                          variant="outlined"
                        />
                      ) : (
                        row[col.key] ?? '—'
                      )}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Tooltip title="تعديل">
                      <IconButton size="small" color="primary" onClick={() => openEdit(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default SystemAdminTable;
