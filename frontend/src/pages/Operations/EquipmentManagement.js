import { useState, useEffect, useCallback } from 'react';

import { equipmentService } from 'services/operationsService';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import { ViewIcon } from 'utils/iconAliases';

const statusConfig = {
  operational: { label: 'تشغيلي', color: 'success', icon: <OkIcon fontSize="small" /> },
  maintenance: { label: 'قيد الصيانة', color: 'warning', icon: <MaintIcon fontSize="small" /> },
  standby: { label: 'احتياطي', color: 'info', icon: <StandbyIcon fontSize="small" /> },
  retired: { label: 'متقاعد', color: 'default' },
  broken: { label: 'معطل', color: 'error', icon: <WarnIcon fontSize="small" /> },
};

const categories = [
  'تكييف',
  'طابعات',
  'حواسيب',
  'كهرباء',
  'أمن',
  'مصاعد',
  'أثاث',
  'مركبات',
  'معدات طبية',
  'شبكات',
  'أخرى',
];

const EquipmentManagement = () => {
  const showSnackbar = useSnackbar();
  const [equipment, setEquipment] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialog, setDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    name: '',
    equipmentId: '',
    category: '',
    department: '',
    location: '',
    status: 'operational',
    value: '',
    purchaseDate: '',
    warranty: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [e, s] = await Promise.all([
        equipmentService.getAll({ search, status: statusFilter }),
        equipmentService.getStats(),
      ]);
      setEquipment(Array.isArray(e?.data) ? e.data : equipmentService.getMockEquipment());
      setStats(s || equipmentService.getMockStats());
    } catch {
      setEquipment(equipmentService.getMockEquipment());
      setStats(equipmentService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    try {
      if (editItem) {
        await equipmentService.update(editItem._id, form);
        showSnackbar('تم تحديث المعدة بنجاح', 'success');
      } else {
        await equipmentService.create(form);
        showSnackbar('تم إضافة المعدة بنجاح', 'success');
      }
      setDialog(false);
      setEditItem(null);
      loadData();
    } catch {
      showSnackbar('فشل في حفظ المعدة', 'error');
    }
  };

  const handleEdit = item => {
    setEditItem(item);
    setForm({
      name: item.name,
      equipmentId: item.equipmentId,
      category: item.category,
      department: item.department,
      location: item.location,
      status: item.status,
      value: item.value,
      purchaseDate: item.purchaseDate || '',
      warranty: item.warranty || '',
    });
    setDialog(true);
  };

  const filtered = equipment.filter(e => {
    if (statusFilter && e.status !== statusFilter) return false;
    if (search && !e.name?.includes(search) && !e.equipmentId?.includes(search)) return false;
    return true;
  });

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <EqIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  إدارة المعدات والأصول
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  تتبع المعدات والصيانة والأعطال
                </Typography>
              </Box>
            </Box>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => {
                setEditItem(null);
                setForm({
                  name: '',
                  equipmentId: '',
                  category: '',
                  department: '',
                  location: '',
                  status: 'operational',
                  value: '',
                  purchaseDate: '',
                  warranty: '',
                });
                setDialog(true);
              }}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                borderRadius: 2,
              }}
            >
              إضافة معدة
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'إجمالي المعدات', value: stats.total, color: brandColors.primary },
            { label: 'تشغيلي', value: stats.operational, color: statusColors.success },
            { label: 'قيد الصيانة', value: stats.maintenance, color: statusColors.warning },
            { label: 'احتياطي', value: stats.standby, color: statusColors.info },
            {
              label: 'القيمة الإجمالية',
              value: `${stats.totalValue?.toLocaleString()} ر.س`,
              color: brandColors.primary,
            },
            { label: 'صيانة قادمة', value: stats.upcomingMaintenance, color: statusColors.error },
          ].map((s, i) => (
            <Grid item xs={2} key={i}>
              <Card
                sx={{
                  borderRadius: 2.5,
                  border: `1px solid ${surfaceColors.border}`,
                  textAlign: 'center',
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h6" fontWeight={800} sx={{ color: s.color }}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Search & Filter */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث بالاسم أو الرقم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={statusFilter}
              label="الحالة"
              onChange={e => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(statusConfig).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary, ml: 'auto' }}>
            عرض {filtered.length} من {equipment.length} معدة
          </Typography>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

      {/* Table */}
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.background }}>
                <TableCell sx={{ fontWeight: 700 }}>رقم المعدة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الموقع</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  القيمة
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>آخر صيانة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الصيانة القادمة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(eq => (
                <TableRow key={eq._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                      {eq.equipmentId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {eq.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={eq.category} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{eq.department}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{eq.location}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography fontWeight={600}>{eq.value?.toLocaleString()} ر.س</Typography>
                  </TableCell>
                  <TableCell>{eq.lastMaintenance}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        color:
                          new Date(eq.nextMaintenance) < new Date()
                            ? statusColors.error
                            : neutralColors.text,
                      }}
                    >
                      {eq.nextMaintenance}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusConfig[eq.status]?.label || eq.status}
                      color={statusConfig[eq.status]?.color || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="عرض">
                      <IconButton size="small" onClick={() => setViewDialog(eq)}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تعديل">
                      <IconButton size="small" onClick={() => handleEdit(eq)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: neutralColors.textDisabled }}>
                      لا توجد معدات
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          {editItem ? 'تعديل معدة' : 'إضافة معدة جديدة'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField
                fullWidth
                label="اسم المعدة *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="رقم المعدة *"
                value={form.equipmentId}
                onChange={e => setForm(f => ({ ...f, equipmentId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الفئة</InputLabel>
                <Select
                  value={form.category}
                  label="الفئة"
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {categories.map(c => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="القسم"
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الموقع"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="القيمة"
                type="number"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={form.status}
                  label="الحالة"
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  {Object.entries(statusConfig).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="تاريخ الشراء"
                type="date"
                value={form.purchaseDate}
                onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="انتهاء الضمان"
                type="date"
                value={form.warranty}
                onChange={e => setForm(f => ({ ...f, warranty: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.name}
            sx={{ borderRadius: 2 }}
          >
            {editItem ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={!!viewDialog}
        onClose={() => setViewDialog(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          تفاصيل المعدة
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          {viewDialog && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  رقم المعدة
                </Typography>
                <Typography fontWeight={700}>{viewDialog.equipmentId}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الاسم
                </Typography>
                <Typography fontWeight={700}>{viewDialog.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الفئة
                </Typography>
                <Typography fontWeight={600}>{viewDialog.category}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  القسم
                </Typography>
                <Typography fontWeight={600}>{viewDialog.department}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الموقع
                </Typography>
                <Typography fontWeight={600}>{viewDialog.location}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  القيمة
                </Typography>
                <Typography fontWeight={700} sx={{ color: brandColors.primary }}>
                  {viewDialog.value?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  تاريخ الشراء
                </Typography>
                <Typography>{viewDialog.purchaseDate}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  انتهاء الضمان
                </Typography>
                <Typography>{viewDialog.warranty}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  آخر صيانة
                </Typography>
                <Typography>{viewDialog.lastMaintenance}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الصيانة القادمة
                </Typography>
                <Typography
                  sx={{
                    color:
                      new Date(viewDialog.nextMaintenance) < new Date()
                        ? statusColors.error
                        : 'inherit',
                  }}
                >
                  {viewDialog.nextMaintenance}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Chip
                  label={statusConfig[viewDialog.status]?.label}
                  color={statusConfig[viewDialog.status]?.color}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewDialog(null)} variant="contained" sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EquipmentManagement;
