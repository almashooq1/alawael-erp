import { useState, useEffect, useCallback } from 'react';




import { inventoryService } from 'services/operationsService';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const units = ['قطعة', 'رزمة', 'كيلوغرام', 'لتر', 'صندوق', 'متر', 'طن'];

const InventoryManagement = () => {
  const showSnackbar = useSnackbar();
  const [tab, setTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    costPrice: '',
    sellingPrice: '',
    currentStock: '',
    minStock: '',
    unit: 'قطعة',
    warehouse: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        inventoryService.getProducts({ search }),
        inventoryService.getStats(),
      ]);
      setProducts(Array.isArray(p?.data) ? p.data : inventoryService.getMockProducts());
      setStats(s || inventoryService.getMockStats());
    } catch {
      setProducts(inventoryService.getMockProducts());
      setStats(inventoryService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    try {
      if (editItem) {
        await inventoryService.updateProduct(editItem._id, form);
        showSnackbar('تم تحديث الصنف بنجاح', 'success');
      } else {
        await inventoryService.createProduct(form);
        showSnackbar('تم إضافة الصنف بنجاح', 'success');
      }
      setDialog(false);
      setEditItem(null);
      setForm({
        name: '',
        sku: '',
        category: '',
        costPrice: '',
        sellingPrice: '',
        currentStock: '',
        minStock: '',
        unit: 'قطعة',
        warehouse: '',
      });
      loadData();
    } catch {
      showSnackbar('فشل في حفظ الصنف', 'error');
    }
  };

  const handleEdit = item => {
    setEditItem(item);
    setForm({
      name: item.name,
      sku: item.sku,
      category: item.category || '',
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      currentStock: item.currentStock,
      minStock: item.minStock,
      unit: item.unit || 'قطعة',
      warehouse: item.warehouse || '',
    });
    setDialog(true);
  };

  const handleDelete = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
    await inventoryService.deleteProduct(id);
    showSnackbar('تم حذف الصنف', 'success');
    loadData();
  };

  const lowStockItems = products.filter(p => p.currentStock <= p.minStock);
  const filtered = tab === 1 ? lowStockItems : products;
  const searched = filtered.filter(
    p => !search || p.name?.includes(search) || p.sku?.includes(search)
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <InvIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  إدارة المخزون
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  تتبع الأصناف والمستودعات وحركة المخزون
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
                  sku: '',
                  category: '',
                  costPrice: '',
                  sellingPrice: '',
                  currentStock: '',
                  minStock: '',
                  unit: 'قطعة',
                  warehouse: '',
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
              إضافة صنف
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            {
              label: 'إجمالي الأصناف',
              value: stats.totalProducts,
              icon: <InvIcon />,
              color: brandColors.primary,
            },
            {
              label: 'القيمة الإجمالية',
              value: `${stats.totalValue?.toLocaleString()} ر.س`,
              icon: <TrendIcon />,
              color: statusColors.success,
            },
            {
              label: 'مخزون منخفض',
              value: stats.lowStock,
              icon: <WarnIcon />,
              color: statusColors.warning,
            },
            {
              label: 'نفاد المخزون',
              value: stats.outOfStock,
              icon: <WarnIcon />,
              color: statusColors.error,
            },
            {
              label: 'المستودعات',
              value: stats.warehouses,
              icon: <WhIcon />,
              color: statusColors.info,
            },
            {
              label: 'الفئات',
              value: stats.categories,
              icon: <CatIcon />,
              color: neutralColors.textSecondary,
            },
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
                  <Avatar
                    sx={{
                      mx: 'auto',
                      mb: 1,
                      width: 36,
                      height: 36,
                      bgcolor: `${s.color}15`,
                      color: s.color,
                    }}
                  >
                    {s.icon}
                  </Avatar>
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

      {/* Tabs & Search */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent sx={{ pb: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label={`كل الأصناف (${products.length})`} />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <WarnIcon fontSize="small" color="warning" /> منخفض المخزون (
                    {lowStockItems.length})
                  </Box>
                }
              />
            </Tabs>
            <TextField
              size="small"
              placeholder="بحث بالاسم أو الرمز..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 280 }}
            />
          </Box>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

      {/* Table */}
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.background }}>
                <TableCell sx={{ fontWeight: 700 }}>الرمز</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الصنف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  المخزون الحالي
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  الحد الأدنى
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  سعر التكلفة
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  سعر البيع
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المستودع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {searched.map(p => {
                const isLow = p.currentStock <= p.minStock;
                const isOut = p.currentStock === 0;
                return (
                  <TableRow key={p._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                        {p.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {p.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={p.category || '—'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        fontWeight={700}
                        sx={{
                          color: isOut
                            ? statusColors.error
                            : isLow
                              ? statusColors.warning
                              : statusColors.success,
                        }}
                      >
                        {p.currentStock}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{p.minStock}</TableCell>
                    <TableCell align="left">{p.costPrice?.toLocaleString()}</TableCell>
                    <TableCell align="left">
                      <Typography fontWeight={600}>{p.sellingPrice?.toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{p.warehouse}</Typography>
                    </TableCell>
                    <TableCell>
                      {isOut ? (
                        <Chip label="نفاد" color="error" size="small" />
                      ) : isLow ? (
                        <Chip label="منخفض" color="warning" size="small" />
                      ) : (
                        <Chip label="متوفر" color="success" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => handleEdit(p)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => handleDelete(p._id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {searched.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: neutralColors.textDisabled }}>
                      لا توجد أصناف
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
          {editItem ? 'تعديل صنف' : 'إضافة صنف جديد'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField
                fullWidth
                label="اسم الصنف *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="رمز SKU *"
                value={form.sku}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الفئة"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الوحدة</InputLabel>
                <Select
                  value={form.unit}
                  label="الوحدة"
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                >
                  {units.map(u => (
                    <MenuItem key={u} value={u}>
                      {u}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="سعر التكلفة"
                type="number"
                value={form.costPrice}
                onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))}
                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="سعر البيع"
                type="number"
                value={form.sellingPrice}
                onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))}
                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المخزون الحالي"
                type="number"
                value={form.currentStock}
                onChange={e => setForm(f => ({ ...f, currentStock: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الحد الأدنى"
                type="number"
                value={form.minStock}
                onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="المستودع"
                value={form.warehouse}
                onChange={e => setForm(f => ({ ...f, warehouse: e.target.value }))}
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
            disabled={!form.name || !form.sku}
            sx={{ borderRadius: 2 }}
          >
            {editItem ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InventoryManagement;
