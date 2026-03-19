/**
 * حوارات جدول المستفيدين
 * BeneficiariesDialogs – filter dialog, export dialog, row-action menu, snackbar
 */

import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Button,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import { Delete, Download, Edit, Star, Visibility } from '@mui/icons-material';
import ConfirmDialog from 'components/common/ConfirmDialog';

// ─── Filter Dialog ────────────────────────────────────────
export const FilterDialog = ({ open, onClose, filters, setFilters, applyFilters }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>الفلاتر المتقدمة</DialogTitle>
    <DialogContent>
      <Stack spacing={3} sx={{ mt: 2 }}>
        <FormControl fullWidth>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={filters.status}
            label="الحالة"
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="active">نشط</MenuItem>
            <MenuItem value="pending">قيد الانتظار</MenuItem>
            <MenuItem value="inactive">غير نشط</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>نوع الإعاقة</InputLabel>
          <Select
            value={filters.category}
            label="نوع الإعاقة"
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="physical">إعاقة حركية</MenuItem>
            <MenuItem value="mental">إعاقة ذهنية</MenuItem>
            <MenuItem value="sensory">إعاقة حسية</MenuItem>
            <MenuItem value="multiple">إعاقات متعددة</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>الجنس</InputLabel>
          <Select
            value={filters.gender}
            label="الجنس"
            onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="male">ذكر</MenuItem>
            <MenuItem value="female">أنثى</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>الفئة العمرية</InputLabel>
          <Select
            value={filters.ageRange}
            label="الفئة العمرية"
            onChange={(e) => setFilters({ ...filters, ageRange: e.target.value })}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="0-5">0-5 سنوات</MenuItem>
            <MenuItem value="6-12">6-12 سنة</MenuItem>
            <MenuItem value="13-18">13-18 سنة</MenuItem>
            <MenuItem value="19-100">19+ سنة</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>إلغاء</Button>
      <Button
        variant="contained"
        onClick={() => {
          applyFilters();
          onClose();
        }}
      >
        تطبيق
      </Button>
    </DialogActions>
  </Dialog>
);

// ─── Export Dialog ─────────────────────────────────────────
export const ExportDialog = ({ open, onClose, handleExport }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>تصدير البيانات</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Button variant="outlined" startIcon={<Download />} onClick={() => handleExport('Excel')}>
          تصدير إلى Excel
        </Button>
        <Button variant="outlined" startIcon={<Download />} onClick={() => handleExport('PDF')}>
          تصدير إلى PDF
        </Button>
        <Button variant="outlined" startIcon={<Download />} onClick={() => handleExport('CSV')}>
          تصدير إلى CSV
        </Button>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>إلغاء</Button>
    </DialogActions>
  </Dialog>
);

// ─── Row Action Menu ──────────────────────────────────────
export const RowActionMenu = ({ anchorEl, onClose, handleRowAction, selectedRowAction }) => (
  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
    <MenuItem onClick={() => handleRowAction('view', selectedRowAction)}>
      <ListItemIcon>
        <Visibility fontSize="small" />
      </ListItemIcon>
      <ListItemText>عرض التفاصيل</ListItemText>
    </MenuItem>
    <MenuItem onClick={() => handleRowAction('edit', selectedRowAction)}>
      <ListItemIcon>
        <Edit fontSize="small" />
      </ListItemIcon>
      <ListItemText>تعديل</ListItemText>
    </MenuItem>
    <MenuItem onClick={() => handleRowAction('favorite', selectedRowAction)}>
      <ListItemIcon>
        <Star fontSize="small" />
      </ListItemIcon>
      <ListItemText>إضافة للمفضلة</ListItemText>
    </MenuItem>
    <Divider />
    <MenuItem onClick={() => handleRowAction('delete', selectedRowAction)}>
      <ListItemIcon>
        <Delete fontSize="small" color="error" />
      </ListItemIcon>
      <ListItemText sx={{ color: 'error.main' }}>حذف</ListItemText>
    </MenuItem>
  </Menu>
);

// ─── Snackbar + ConfirmDialog bundle ─────────────────────
export const BeneficiariesSnackbar = ({ snackbar, setSnackbar }) => (
  <Snackbar
    open={snackbar.open}
    autoHideDuration={3000}
    onClose={() => setSnackbar({ ...snackbar, open: false })}
  >
    <Alert
      onClose={() => setSnackbar({ ...snackbar, open: false })}
      severity={snackbar.severity}
      sx={{ width: '100%' }}
    >
      {snackbar.message}
    </Alert>
  </Snackbar>
);

export const BeneficiariesConfirmDialog = ({ confirmState }) => (
  <ConfirmDialog {...confirmState} />
);
