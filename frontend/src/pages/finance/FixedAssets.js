 
import { useState, useEffect, useCallback } from 'react';




import accountingService from 'services/accountingService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const categoryConfig = {
  land: { label: 'أراضي', icon: '🏞️' },
  buildings: { label: 'مباني', icon: '🏢' },
  vehicles: { label: 'مركبات', icon: '🚗' },
  equipment: { label: 'معدات', icon: '⚙️' },
  furniture: { label: 'أثاث', icon: '🪑' },
  computers: { label: 'حاسبات', icon: '💻' },
  software: { label: 'برمجيات', icon: '📀' },
  tools: { label: 'أدوات', icon: '🔧' },
  machinery: { label: 'آلات', icon: '🏭' },
  other: { label: 'أخرى', icon: '📦' },
};

const statusConfig = {
  active: { label: 'نشط', color: 'success' },
  maintenance: { label: 'تحت الصيانة', color: 'warning' },
  disposed: { label: 'معدوم', color: 'error' },
  reserved: { label: 'محجوز', color: 'info' },
};

const mockAssets = [
  {
    _id: 'fa1',
    code: 'FA-0001',
    name: 'مبنى الإدارة الرئيسي',
    category: 'buildings',
    location: 'المقر الرئيسي',
    department: 'الإدارة',
    responsiblePerson: 'أحمد محمد',
    purchaseDate: '2020-01-15',
    purchasePrice: 2500000,
    currentValue: 2125000,
    depreciationRate: 5,
    accumulatedDepreciation: 375000,
    usefulLife: 30,
    status: 'active',
  },
  {
    _id: 'fa2',
    code: 'FA-0002',
    name: 'سيارة تويوتا كامري 2023',
    category: 'vehicles',
    location: 'موقف السيارات',
    department: 'النقل',
    responsiblePerson: 'خالد عمر',
    purchaseDate: '2023-03-20',
    purchasePrice: 120000,
    currentValue: 84000,
    depreciationRate: 15,
    accumulatedDepreciation: 36000,
    usefulLife: 8,
    status: 'active',
  },
  {
    _id: 'fa3',
    code: 'FA-0003',
    name: 'خادم Dell PowerEdge',
    category: 'computers',
    location: 'غرفة الخوادم',
    department: 'تقنية المعلومات',
    responsiblePerson: 'نورة سعيد',
    purchaseDate: '2022-06-01',
    purchasePrice: 45000,
    currentValue: 27000,
    depreciationRate: 20,
    accumulatedDepreciation: 18000,
    usefulLife: 5,
    status: 'active',
  },
  {
    _id: 'fa4',
    code: 'FA-0004',
    name: 'أثاث مكتبي - الطابق الثالث',
    category: 'furniture',
    location: 'الطابق الثالث',
    department: 'الإدارة',
    responsiblePerson: 'فاطمة أحمد',
    purchaseDate: '2021-09-10',
    purchasePrice: 35000,
    currentValue: 24500,
    depreciationRate: 10,
    accumulatedDepreciation: 10500,
    usefulLife: 10,
    status: 'active',
  },
  {
    _id: 'fa5',
    code: 'FA-0005',
    name: 'نظام ERP - ترخيص',
    category: 'software',
    location: 'سحابي',
    department: 'تقنية المعلومات',
    responsiblePerson: 'نورة سعيد',
    purchaseDate: '2023-01-01',
    purchasePrice: 80000,
    currentValue: 48000,
    depreciationRate: 20,
    accumulatedDepreciation: 32000,
    usefulLife: 5,
    status: 'active',
  },
  {
    _id: 'fa6',
    code: 'FA-0006',
    name: 'مولد كهربائي 500KVA',
    category: 'equipment',
    location: 'المقر الرئيسي',
    department: 'الصيانة',
    responsiblePerson: 'محمد علي',
    purchaseDate: '2019-05-15',
    purchasePrice: 150000,
    currentValue: 75000,
    depreciationRate: 10,
    accumulatedDepreciation: 75000,
    usefulLife: 15,
    status: 'maintenance',
  },
];

const FixedAssets = () => {
  const showSnackbar = useSnackbar();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [_filterStatus, _setFilterStatus] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [viewDialog, setViewDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [newAsset, setNewAsset] = useState({
    code: '',
    name: '',
    category: 'equipment',
    location: '',
    department: '',
    responsiblePerson: '',
    purchasePrice: '',
    depreciationRate: 10,
    usefulLife: 10,
  });

  const loadData = useCallback(async () => {
    try {
      const data = await accountingService.getFixedAssets();
      setAssets(Array.isArray(data) && data.length > 0 ? data : mockAssets);
    } catch (err) {
      logger.error('FixedAssets error:', err);
      setAssets(mockAssets);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tabStatuses = ['all', 'active', 'maintenance', 'disposed'];
  const filtered = assets.filter(a => {
    const statusMatch = tabStatuses[tabValue] === 'all' || a.status === tabStatuses[tabValue];
    const catMatch = filterCat === 'all' || a.category === filterCat;
    const searchMatch = !searchText || a.code?.includes(searchText) || a.name?.includes(searchText);
    return statusMatch && catMatch && searchMatch;
  });

  const totalValue = assets.reduce((s, a) => s + (a.purchasePrice || 0), 0);
  const totalCurrent = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
  const totalDeprec = assets.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0);

  const handleCreate = async () => {
    if (!newAsset.code || !newAsset.name) {
      showSnackbar('يرجى ملء الحقول المطلوبة', 'error');
      return;
    }
    const price = Number(newAsset.purchasePrice) || 0;
    try {
      const created = await accountingService.createFixedAsset({
        ...newAsset,
        purchasePrice: price,
        currentValue: price,
      });
      setAssets(prev => [
        ...prev,
        created || {
          ...newAsset,
          _id: Date.now().toString(),
          purchasePrice: price,
          currentValue: price,
          accumulatedDepreciation: 0,
          purchaseDate: new Date().toISOString().slice(0, 10),
          status: 'active',
        },
      ]);
    } catch {
      /* fallback: local add */
      setAssets(prev => [
        ...prev,
        {
          ...newAsset,
          _id: Date.now().toString(),
          purchasePrice: price,
          currentValue: price,
          accumulatedDepreciation: 0,
          purchaseDate: new Date().toISOString().slice(0, 10),
          status: 'active',
        },
      ]);
    }
    showSnackbar('تم إضافة الأصل الثابت بنجاح', 'success');
    setCreateDialog(false);
    setNewAsset({
      code: '',
      name: '',
      category: 'equipment',
      location: '',
      department: '',
      responsiblePerson: '',
      purchasePrice: '',
      depreciationRate: 10,
      usefulLife: 10,
    });
  };

  if (loading)
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل الأصول الثابتة...
        </Typography>
      </Container>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <AssetIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  الأصول الثابتة
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  إدارة الأصول والاستهلاك والتقييم
                </Typography>
              </Box>
            </Box>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setCreateDialog(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                borderRadius: 2,
              }}
            >
              أصل جديد
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الأصول',
            value: assets.length,
            sub: 'أصل ثابت',
            color: brandColors.primary,
          },
          {
            label: 'القيمة الأصلية',
            value: `${totalValue.toLocaleString()} ر.س`,
            color: statusColors.info,
          },
          {
            label: 'القيمة الحالية',
            value: `${totalCurrent.toLocaleString()} ر.س`,
            color: statusColors.success,
          },
          {
            label: 'مجمع الاستهلاك',
            value: `${totalDeprec.toLocaleString()} ر.س`,
            color: statusColors.error,
          },
        ].map((s, i) => (
          <Grid item xs={3} key={i}>
            <Card
              sx={{
                borderRadius: 2.5,
                border: `1px solid ${surfaceColors.border}`,
                textAlign: 'center',
              }}
            >
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>
                  {s.value}
                </Typography>
                <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                  {s.label}
                </Typography>
                {s.sub && (
                  <Typography variant="caption" sx={{ color: neutralColors.textDisabled }}>
                    {s.sub}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs & Filters */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ px: 2, pt: 1 }}>
          <Tab label={`الكل (${assets.length})`} />
          <Tab label={`نشط (${assets.filter(a => a.status === 'active').length})`} />
          <Tab label={`صيانة (${assets.filter(a => a.status === 'maintenance').length})`} />
          <Tab label={`معدوم (${assets.filter(a => a.status === 'disposed').length})`} />
        </Tabs>
        <CardContent
          sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', pt: 1 }}
        >
          <TextField
            size="small"
            placeholder="بحث بالكود أو الاسم..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: neutralColors.textDisabled }} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>الفئة</InputLabel>
            <Select value={filterCat} label="الفئة" onChange={e => setFilterCat(e.target.value)}>
              <MenuItem value="all">الكل</MenuItem>
              {Object.entries(categoryConfig).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.icon} {v.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Table */}
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.background }}>
                <TableCell sx={{ fontWeight: 700 }}>الكود</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الأصل</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الموقع</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  القيمة الأصلية
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  القيمة الحالية
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الاستهلاك السنوي</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(asset => {
                const depPct =
                  asset.purchasePrice > 0
                    ? (asset.accumulatedDepreciation / asset.purchasePrice) * 100
                    : 0;
                return (
                  <TableRow key={asset._id} hover>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ color: brandColors.primary }}
                      >
                        {asset.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {asset.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                        {asset.responsiblePerson}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span>{categoryConfig[asset.category]?.icon}</span>
                        <Typography variant="body2">
                          {categoryConfig[asset.category]?.label}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{asset.location}</Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography variant="body2">
                        {asset.purchasePrice?.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: statusColors.success }}
                      >
                        {asset.currentValue?.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(depPct, 100)}
                          sx={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: neutralColors.divider,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: depPct > 80 ? statusColors.error : statusColors.info,
                            },
                          }}
                        />
                        <Typography variant="caption" fontWeight={600} sx={{ minWidth: 30 }}>
                          {depPct.toFixed(0)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusConfig[asset.status]?.label}
                        color={statusConfig[asset.status]?.color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="عرض">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedAsset(asset);
                            setViewDialog(true);
                          }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: neutralColors.textDisabled }}>
                      لا توجد أصول مطابقة
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* View Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssetIcon /> تفاصيل الأصل الثابت
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          {selectedAsset && (
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  الكود
                </Typography>
                <Typography fontWeight={700}>{selectedAsset.code}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  الاسم
                </Typography>
                <Typography fontWeight={700}>{selectedAsset.name}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  الفئة
                </Typography>
                <Typography fontWeight={600}>
                  {categoryConfig[selectedAsset.category]?.icon}{' '}
                  {categoryConfig[selectedAsset.category]?.label}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  الموقع
                </Typography>
                <Typography>{selectedAsset.location}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  القسم
                </Typography>
                <Typography>{selectedAsset.department}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  المسؤول
                </Typography>
                <Typography>{selectedAsset.responsiblePerson}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  تاريخ الشراء
                </Typography>
                <Typography fontWeight={600}>{selectedAsset.purchaseDate}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  القيمة الأصلية
                </Typography>
                <Typography fontWeight={700} sx={{ color: statusColors.info }}>
                  {selectedAsset.purchasePrice?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  القيمة الحالية
                </Typography>
                <Typography fontWeight={700} sx={{ color: statusColors.success }}>
                  {selectedAsset.currentValue?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  معدل الاستهلاك
                </Typography>
                <Typography fontWeight={600}>{selectedAsset.depreciationRate}% سنوياً</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  مجمع الاستهلاك
                </Typography>
                <Typography fontWeight={700} sx={{ color: statusColors.error }}>
                  {selectedAsset.accumulatedDepreciation?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  العمر الافتراضي
                </Typography>
                <Typography fontWeight={600}>{selectedAsset.usefulLife} سنة</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  نسبة الاستهلاك الإجمالية
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(
                    selectedAsset.purchasePrice > 0
                      ? (selectedAsset.accumulatedDepreciation / selectedAsset.purchasePrice) * 100
                      : 0,
                    100
                  )}
                  sx={{ height: 10, borderRadius: 5, bgcolor: neutralColors.divider }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewDialog(false)} variant="contained" sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Dialog */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon /> إضافة أصل ثابت جديد
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الكود *"
                value={newAsset.code}
                onChange={e => setNewAsset({ ...newAsset, code: e.target.value })}
                placeholder="FA-0007"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="اسم الأصل *"
                value={newAsset.name}
                onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الفئة</InputLabel>
                <Select
                  value={newAsset.category}
                  label="الفئة"
                  onChange={e => setNewAsset({ ...newAsset, category: e.target.value })}
                >
                  {Object.entries(categoryConfig).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.icon} {v.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الموقع"
                value={newAsset.location}
                onChange={e => setNewAsset({ ...newAsset, location: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="القسم"
                value={newAsset.department}
                onChange={e => setNewAsset({ ...newAsset, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المسؤول"
                value={newAsset.responsiblePerson}
                onChange={e => setNewAsset({ ...newAsset, responsiblePerson: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="قيمة الشراء"
                type="number"
                value={newAsset.purchasePrice}
                onChange={e => setNewAsset({ ...newAsset, purchasePrice: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="معدل الاستهلاك %"
                type="number"
                value={newAsset.depreciationRate}
                onChange={e => setNewAsset({ ...newAsset, depreciationRate: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="العمر الافتراضي"
                type="number"
                value={newAsset.usefulLife}
                onChange={e => setNewAsset({ ...newAsset, usefulLife: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">سنة</InputAdornment> }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialog(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newAsset.code || !newAsset.name}
            sx={{ borderRadius: 2 }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FixedAssets;
