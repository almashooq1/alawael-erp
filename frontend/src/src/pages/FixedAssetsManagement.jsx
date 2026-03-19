import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Build,
  TrendingDown,
  Description,
  Search,
  FilterList,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

/**
 * 🏭 إدارة الأصول الثابتة
 * ==========================
 * 
 * المميزات:
 * - عرض جميع الأصول الثابتة
 * - إضافة/تعديل/حذف الأصول
 * - تسجيل الإهلاك
 * - تسجيل الصيانة
 * - التخلص من الأصول
 * - عرض التقارير
 */

const FixedAssetsManagement = () => {
  // الحالة
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalAssets, setTotalAssets] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // نوافذ الحوار
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('add'); // add, edit, view, depreciate, maintenance, dispose
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [formData, setFormData] = useState({});

  // الفئات
  const categories = [
    { value: 'land', label: 'أراضي' },
    { value: 'buildings', label: 'مباني' },
    { value: 'machinery', label: 'معدات' },
    { value: 'vehicles', label: 'مركبات' },
    { value: 'furniture', label: 'أثاث' },
    { value: 'computers', label: 'أجهزة كمبيوتر' },
    { value: 'tools', label: 'أدوات' },
    { value: 'office-equipment', label: 'معدات مكتبية' },
  ];

  // طرق الإهلاك
  const depreciationMethods = [
    { value: 'straight-line', label: 'القسط الثابت' },
    { value: 'declining-balance', label: 'القسط المتناقص' },
    { value: 'sum-of-years', label: 'مجموع أرقام السنوات' },
    { value: 'units-of-production', label: 'وحدات الإنتاج' },
  ];

  // حالات الأصل
  const statuses = [
    { value: 'active', label: 'نشط', color: 'success' },
    { value: 'inactive', label: 'غير نشط', color: 'default' },
    { value: 'under-maintenance', label: 'تحت الصيانة', color: 'warning' },
    { value: 'disposed', label: 'تم التخلص', color: 'error' },
  ];

  // جلب الأصول
  useEffect(() => {
    fetchAssets();
  }, [page, rowsPerPage, searchTerm, filterCategory, filterStatus]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
      };

      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterStatus !== 'all') params.status = filterStatus;

      const response = await axios.get('/api/accounting/fixed-assets', { params });
      setAssets(response.data.data);
      setTotalAssets(response.data.total || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching assets:', error);
      setLoading(false);
    }
  };

  // فتح نافذة الحوار
  const handleOpenDialog = (type, asset = null) => {
    setDialogType(type);
    setSelectedAsset(asset);
    
    if (type === 'add') {
      setFormData({
        name: '',
        nameEn: '',
        code: '',
        category: 'machinery',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseCost: '',
        salvageValue: '',
        usefulLife: '',
        depreciationMethod: 'straight-line',
        location: '',
        notes: '',
      });
    } else if (type === 'edit' && asset) {
      setFormData({
        name: asset.name,
        nameEn: asset.nameEn || '',
        category: asset.category,
        purchaseCost: asset.purchaseCost,
        salvageValue: asset.salvageValue,
        usefulLife: asset.usefulLife,
        depreciationMethod: asset.depreciationMethod,
        location: asset.location || '',
        notes: asset.notes || '',
      });
    } else if (type === 'depreciate' && asset) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: asset.calculateAnnualDepreciation ? asset.calculateAnnualDepreciation() : 0,
      });
    } else if (type === 'maintenance' && asset) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'preventive',
        description: '',
        cost: '',
        performedBy: '',
        parts: '',
      });
    } else if (type === 'dispose' && asset) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        reason: '',
        salePrice: 0,
        notes: '',
      });
    }
    
    setOpenDialog(true);
  };

  // إغلاق نافذة الحوار
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedAsset(null);
    setFormData({});
  };

  // حفظ الأصل
  const handleSaveAsset = async () => {
    try {
      if (dialogType === 'add') {
        await axios.post('/api/accounting/fixed-assets', formData);
      } else if (dialogType === 'edit') {
        await axios.put(`/api/accounting/fixed-assets/${selectedAsset._id}`, formData);
      } else if (dialogType === 'depreciate') {
        await axios.post(`/api/accounting/fixed-assets/${selectedAsset._id}/depreciation`, formData);
      } else if (dialogType === 'maintenance') {
        await axios.post(`/api/accounting/fixed-assets/${selectedAsset._id}/maintenance`, formData);
      } else if (dialogType === 'dispose') {
        await axios.post(`/api/accounting/fixed-assets/${selectedAsset._id}/dispose`, formData);
      }
      
      handleCloseDialog();
      fetchAssets();
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  // حذف الأصل
  const handleDeleteAsset = async (assetId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الأصل؟')) {
      try {
        await axios.delete(`/api/accounting/fixed-assets/${assetId}`);
        fetchAssets();
      } catch (error) {
        console.error('Error deleting asset:', error);
        alert('حدث خطأ أثناء الحذف');
      }
    }
  };

  // عرض النموذج حسب النوع
  const renderDialogContent = () => {
    if (dialogType === 'view' && selectedAsset) {
      return (
        <Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">الرمز</Typography>
              <Typography variant="body1">{selectedAsset.code}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">الاسم</Typography>
              <Typography variant="body1">{selectedAsset.name}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">الفئة</Typography>
              <Typography variant="body1">{selectedAsset.category}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">تاريخ الشراء</Typography>
              <Typography variant="body1">
                {format(new Date(selectedAsset.purchaseDate), 'yyyy-MM-dd')}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">التكلفة الأصلية</Typography>
              <Typography variant="body1">
                {selectedAsset.purchaseCost?.toLocaleString('ar-SA')} ر.س
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">القيمة الدفترية</Typography>
              <Typography variant="body1">
                {selectedAsset.bookValue?.toLocaleString('ar-SA')} ر.س
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">طريقة الإهلاك</Typography>
              <Typography variant="body1">{selectedAsset.depreciationMethod}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">الحالة</Typography>
              <Chip
                label={selectedAsset.status}
                color={statuses.find(s => s.value === selectedAsset.status)?.color}
                size="small"
              />
            </Grid>
          </Grid>
        </Box>
      );
    }

    if (dialogType === 'add' || dialogType === 'edit') {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="الاسم"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="الاسم بالإنجليزية"
              value={formData.nameEn || ''}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
            />
          </Grid>
          {dialogType === 'add' && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الرمز"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </Grid>
          )}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="الفئة"
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {dialogType === 'add' && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="تاريخ الشراء"
                type="date"
                value={formData.purchaseDate || ''}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="التكلفة الأصلية"
              type="number"
              value={formData.purchaseCost || ''}
              onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="قيمة الإنقاذ"
              type="number"
              value={formData.salvageValue || ''}
              onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="العمر الإنتاجي (سنوات)"
              type="number"
              value={formData.usefulLife || ''}
              onChange={(e) => setFormData({ ...formData, usefulLife: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>طريقة الإهلاك</InputLabel>
              <Select
                value={formData.depreciationMethod || ''}
                onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value })}
                label="طريقة الإهلاك"
              >
                {depreciationMethods.map((method) => (
                  <MenuItem key={method.value} value={method.value}>
                    {method.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="الموقع"
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="ملاحظات"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Grid>
        </Grid>
      );
    }

    if (dialogType === 'depreciate') {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Alert severity="info">
              سيتم تسجيل إهلاك للأصل {selectedAsset?.name}
            </Alert>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="التاريخ"
              type="date"
              value={formData.date || ''}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="قيمة الإهلاك"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </Grid>
        </Grid>
      );
    }

    if (dialogType === 'maintenance') {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="التاريخ"
              type="date"
              value={formData.date || ''}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>نوع الصيانة</InputLabel>
              <Select
                value={formData.type || ''}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="نوع الصيانة"
              >
                <MenuItem value="preventive">وقائية</MenuItem>
                <MenuItem value="corrective">إصلاحية</MenuItem>
                <MenuItem value="emergency">طارئة</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="الوصف"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="التكلفة"
              type="number"
              value={formData.cost || ''}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="المنفذ"
              value={formData.performedBy || ''}
              onChange={(e) => setFormData({ ...formData, performedBy: e.target.value })}
            />
          </Grid>
        </Grid>
      );
    }

    if (dialogType === 'dispose') {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Alert severity="warning">
              سيتم التخلص من الأصل {selectedAsset?.name}
            </Alert>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="التاريخ"
              type="date"
              value={formData.date || ''}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="سعر البيع"
              type="number"
              value={formData.salePrice || ''}
              onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="السبب"
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="ملاحظات"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Grid>
        </Grid>
      );
    }

    return null;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* العنوان */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          🏭 إدارة الأصول الثابتة
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog('add')}
        >
          إضافة أصل جديد
        </Button>
      </Box>

      {/* البحث والفلترة */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="البحث بالاسم أو الرمز..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                label="الفئة"
              >
                <MenuItem value="all">الكل</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>الحالة</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="الحالة"
              >
                <MenuItem value="all">الكل</MenuItem>
                {statuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* جدول الأصول */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الرمز</TableCell>
              <TableCell>الاسم</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell align="right">التكلفة الأصلية</TableCell>
              <TableCell align="right">القيمة الدفترية</TableCell>
              <TableCell>طريقة الإهلاك</TableCell>
              <TableCell align="center">الحالة</TableCell>
              <TableCell align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset._id}>
                <TableCell>{asset.code}</TableCell>
                <TableCell>{asset.name}</TableCell>
                <TableCell>{asset.category}</TableCell>
                <TableCell align="right">
                  {asset.purchaseCost?.toLocaleString('ar-SA')} ر.س
                </TableCell>
                <TableCell align="right">
                  {asset.bookValue?.toLocaleString('ar-SA')} ر.س
                </TableCell>
                <TableCell>{asset.depreciationMethod}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={asset.status}
                    color={statuses.find(s => s.value === asset.status)?.color}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="عرض">
                    <IconButton size="small" onClick={() => handleOpenDialog('view', asset)}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تعديل">
                    <IconButton size="small" onClick={() => handleOpenDialog('edit', asset)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="إهلاك">
                    <IconButton size="small" onClick={() => handleOpenDialog('depreciate', asset)}>
                      <TrendingDown />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="صيانة">
                    <IconButton size="small" onClick={() => handleOpenDialog('maintenance', asset)}>
                      <Build />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton size="small" onClick={() => handleDeleteAsset(asset._id)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalAssets}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* نافذة الحوار */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogType === 'add' && 'إضافة أصل جديد'}
          {dialogType === 'edit' && 'تعديل الأصل'}
          {dialogType === 'view' && 'تفاصيل الأصل'}
          {dialogType === 'depreciate' && 'تسجيل إهلاك'}
          {dialogType === 'maintenance' && 'تسجيل صيانة'}
          {dialogType === 'dispose' && 'التخلص من الأصل'}
        </DialogTitle>
        <DialogContent>{renderDialogContent()}</DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          {dialogType !== 'view' && (
            <Button variant="contained" onClick={handleSaveAsset}>
              حفظ
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FixedAssetsManagement;
