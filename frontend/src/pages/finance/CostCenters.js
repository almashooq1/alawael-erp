import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
} from '@mui/material';
import {
  AccountTree as CostCenterIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  ExpandMore,
  ExpandLess,
  } from '@mui/icons-material';
import accountingService from 'services/accountingService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

/* ─── mock data ─── */
const mockCostCenters = [
  {
    _id: 'cc1',
    code: 'CC-001',
    name: 'الإدارة العامة',
    nameEn: 'General Admin',
    type: 'cost',
    category: 'administrative',
    level: 1,
    status: 'active',
    budget: 500000,
    actual: 380000,
    manager: 'أحمد محمد',
    children: [
      {
        _id: 'cc1a',
        code: 'CC-001-01',
        name: 'الموارد البشرية',
        type: 'cost',
        category: 'administrative',
        level: 2,
        budget: 200000,
        actual: 165000,
        status: 'active',
      },
      {
        _id: 'cc1b',
        code: 'CC-001-02',
        name: 'تقنية المعلومات',
        type: 'cost',
        category: 'support',
        level: 2,
        budget: 180000,
        actual: 150000,
        status: 'active',
      },
    ],
  },
  {
    _id: 'cc2',
    code: 'CC-002',
    name: 'التعليم والتدريب',
    nameEn: 'Education & Training',
    type: 'revenue',
    category: 'service',
    level: 1,
    status: 'active',
    budget: 800000,
    actual: 620000,
    manager: 'فاطمة أحمد',
    children: [
      {
        _id: 'cc2a',
        code: 'CC-002-01',
        name: 'برامج التأهيل',
        type: 'revenue',
        category: 'service',
        level: 2,
        budget: 450000,
        actual: 380000,
        status: 'active',
      },
      {
        _id: 'cc2b',
        code: 'CC-002-02',
        name: 'الدورات التخصصية',
        type: 'revenue',
        category: 'service',
        level: 2,
        budget: 250000,
        actual: 180000,
        status: 'active',
      },
    ],
  },
  {
    _id: 'cc3',
    code: 'CC-003',
    name: 'الخدمات الطبية',
    nameEn: 'Medical Services',
    type: 'profit',
    category: 'production',
    level: 1,
    status: 'active',
    budget: 1200000,
    actual: 950000,
    manager: 'د. سارة علي',
    children: [],
  },
  {
    _id: 'cc4',
    code: 'CC-004',
    name: 'التسويق والعلاقات',
    nameEn: 'Marketing & PR',
    type: 'cost',
    category: 'marketing',
    level: 1,
    status: 'active',
    budget: 300000,
    actual: 280000,
    manager: 'خالد عمر',
    children: [],
  },
  {
    _id: 'cc5',
    code: 'CC-005',
    name: 'البحث والتطوير',
    nameEn: 'R&D',
    type: 'investment',
    category: 'research',
    level: 1,
    status: 'active',
    budget: 400000,
    actual: 180000,
    manager: 'نورة سعيد',
    children: [],
  },
];

const typeConfig = {
  revenue: { label: 'إيراد', color: 'success' },
  cost: { label: 'تكلفة', color: 'error' },
  profit: { label: 'ربح', color: 'info' },
  investment: { label: 'استثمار', color: 'primary' },
};
const categoryLabels = {
  production: 'إنتاج',
  service: 'خدمي',
  administrative: 'إداري',
  marketing: 'تسويق',
  research: 'بحث وتطوير',
  support: 'دعم',
};

const CostCenters = () => {
  const showSnackbar = useSnackbar();
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [createDialog, setCreateDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [newCenter, setNewCenter] = useState({
    code: '',
    name: '',
    nameEn: '',
    type: 'cost',
    category: 'administrative',
    budget: '',
  });

  const loadData = useCallback(async () => {
    try {
      const data = await accountingService.getCostCenters();
      setCenters(Array.isArray(data) && data.length > 0 ? data : mockCostCenters);
    } catch (err) {
      logger.error('CostCenters error:', err);
      setCenters(mockCostCenters);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const filtered = centers.filter(
    c =>
      (filterType === 'all' || c.type === filterType) &&
      (!searchText || c.code?.includes(searchText) || c.name?.includes(searchText))
  );

  const totalBudget = centers.reduce((s, c) => s + (c.budget || 0), 0);
  const totalActual = centers.reduce((s, c) => s + (c.actual || 0), 0);

  const handleCreate = async () => {
    if (!newCenter.code || !newCenter.name) {
      showSnackbar('يرجى ملء الحقول المطلوبة', 'error');
      return;
    }
    try {
      const created = await accountingService.createCostCenter({
        ...newCenter,
        budget: Number(newCenter.budget) || 0,
      });
      setCenters(prev => [
        ...prev,
        created || {
          ...newCenter,
          _id: Date.now().toString(),
          budget: Number(newCenter.budget) || 0,
          actual: 0,
          status: 'active',
          children: [],
        },
      ]);
      showSnackbar('تم إنشاء مركز التكلفة بنجاح', 'success');
      setCreateDialog(false);
      setNewCenter({
        code: '',
        name: '',
        nameEn: '',
        type: 'cost',
        category: 'administrative',
        budget: '',
      });
    } catch {
      showSnackbar('فشل إنشاء مركز التكلفة', 'error');
    }
  };

  const getUtilColor = pct =>
    pct >= 90 ? statusColors.error : pct >= 70 ? statusColors.warning : statusColors.success;

  if (loading)
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل مراكز التكلفة...
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
                <CostCenterIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  مراكز التكلفة
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  إدارة وتخصيص مراكز التكلفة والتحليل المالي
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
              مركز جديد
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي المراكز',
            value: centers.length,
            sub: `${centers.filter(c => c.children?.length).length} مراكز رئيسية`,
            color: brandColors.primary,
          },
          {
            label: 'إجمالي الموازنات',
            value: `${totalBudget.toLocaleString()} ر.س`,
            color: statusColors.info,
          },
          {
            label: 'إجمالي المنفق',
            value: `${totalActual.toLocaleString()} ر.س`,
            color: statusColors.warning,
          },
          {
            label: 'نسبة الاستخدام',
            value: `${totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0}%`,
            color: getUtilColor(totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0),
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

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
            <InputLabel>النوع</InputLabel>
            <Select value={filterType} label="النوع" onChange={e => setFilterType(e.target.value)}>
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="revenue">إيراد</MenuItem>
              <MenuItem value="cost">تكلفة</MenuItem>
              <MenuItem value="profit">ربح</MenuItem>
              <MenuItem value="investment">استثمار</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Cost Centers Table */}
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.background }}>
                <TableCell sx={{ fontWeight: 700, width: 40 }} />
                <TableCell sx={{ fontWeight: 700 }}>الكود</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>اسم المركز</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التصنيف</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  الموازنة
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  المنفق
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الاستخدام</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(center => {
                const util = center.budget > 0 ? (center.actual / center.budget) * 100 : 0;
                return (
                  <React.Fragment key={center._id}>
                    <TableRow hover>
                      <TableCell sx={{ py: 1 }}>
                        {center.children?.length > 0 && (
                          <IconButton size="small" onClick={() => toggleExpand(center._id)}>
                            {expanded[center._id] ? (
                              <ExpandLess fontSize="small" />
                            ) : (
                              <ExpandMore fontSize="small" />
                            )}
                          </IconButton>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ color: brandColors.primary }}
                        >
                          {center.code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {center.name}
                        </Typography>
                        {center.manager && (
                          <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                            {center.manager}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={typeConfig[center.type]?.label || center.type}
                          color={typeConfig[center.type]?.color || 'default'}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {categoryLabels[center.category] || center.category}
                        </Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography variant="body2" fontWeight={600}>
                          {center.budget?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography variant="body2" fontWeight={600}>
                          {center.actual?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(util, 100)}
                            sx={{
                              flex: 1,
                              height: 6,
                              borderRadius: 3,
                              bgcolor: neutralColors.divider,
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getUtilColor(util),
                                borderRadius: 3,
                              },
                            }}
                          />
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            sx={{ color: getUtilColor(util), minWidth: 34 }}
                          >
                            {util.toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="عرض">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedCenter(center);
                              setViewDialog(true);
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    {/* Children */}
                    {center.children?.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ py: 0, border: 0 }}>
                          <Collapse in={expanded[center._id]} timeout="auto">
                            <Table size="small">
                              <TableBody>
                                {center.children.map(child => {
                                  const childUtil =
                                    child.budget > 0 ? (child.actual / child.budget) * 100 : 0;
                                  return (
                                    <TableRow
                                      key={child._id}
                                      sx={{ bgcolor: surfaceColors.background }}
                                    >
                                      <TableCell sx={{ width: 40 }} />
                                      <TableCell>
                                        <Typography
                                          variant="body2"
                                          sx={{ pl: 2, color: brandColors.primary }}
                                        >
                                          {child.code}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2">{child.name}</Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          label={typeConfig[child.type]?.label}
                                          color={typeConfig[child.type]?.color}
                                          size="small"
                                          variant="outlined"
                                        />
                                      </TableCell>
                                      <TableCell>{categoryLabels[child.category]}</TableCell>
                                      <TableCell align="left">
                                        {child.budget?.toLocaleString()}
                                      </TableCell>
                                      <TableCell align="left">
                                        {child.actual?.toLocaleString()}
                                      </TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <LinearProgress
                                            variant="determinate"
                                            value={Math.min(childUtil, 100)}
                                            sx={{
                                              flex: 1,
                                              height: 4,
                                              borderRadius: 2,
                                              bgcolor: neutralColors.divider,
                                              '& .MuiLinearProgress-bar': {
                                                bgcolor: getUtilColor(childUtil),
                                              },
                                            }}
                                          />
                                          <Typography variant="caption" sx={{ minWidth: 30 }}>
                                            {childUtil.toFixed(0)}%
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell />
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: neutralColors.textDisabled }}>
                      لا توجد مراكز تكلفة مطابقة
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
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CostCenterIcon /> تفاصيل مركز التكلفة
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          {selectedCenter && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الكود
                </Typography>
                <Typography fontWeight={700}>{selectedCenter.code}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الاسم
                </Typography>
                <Typography fontWeight={700}>{selectedCenter.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  النوع
                </Typography>
                <Chip
                  label={typeConfig[selectedCenter.type]?.label}
                  color={typeConfig[selectedCenter.type]?.color}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  التصنيف
                </Typography>
                <Typography fontWeight={600}>{categoryLabels[selectedCenter.category]}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الموازنة
                </Typography>
                <Typography fontWeight={700} sx={{ color: statusColors.info }}>
                  {selectedCenter.budget?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  المنفق
                </Typography>
                <Typography fontWeight={700} sx={{ color: statusColors.warning }}>
                  {selectedCenter.actual?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  المسؤول
                </Typography>
                <Typography fontWeight={600}>{selectedCenter.manager || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الفروع
                </Typography>
                <Typography fontWeight={600}>
                  {selectedCenter.children?.length || 0} مراكز فرعية
                </Typography>
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
            <AddIcon /> إنشاء مركز تكلفة جديد
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الكود *"
                value={newCenter.code}
                onChange={e => setNewCenter({ ...newCenter, code: e.target.value })}
                placeholder="CC-006"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم *"
                value={newCenter.name}
                onChange={e => setNewCenter({ ...newCenter, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (إنجليزي)"
                value={newCenter.nameEn}
                onChange={e => setNewCenter({ ...newCenter, nameEn: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>النوع</InputLabel>
                <Select
                  value={newCenter.type}
                  label="النوع"
                  onChange={e => setNewCenter({ ...newCenter, type: e.target.value })}
                >
                  <MenuItem value="revenue">إيراد</MenuItem>
                  <MenuItem value="cost">تكلفة</MenuItem>
                  <MenuItem value="profit">ربح</MenuItem>
                  <MenuItem value="investment">استثمار</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>التصنيف</InputLabel>
                <Select
                  value={newCenter.category}
                  label="التصنيف"
                  onChange={e => setNewCenter({ ...newCenter, category: e.target.value })}
                >
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الموازنة"
                type="number"
                value={newCenter.budget}
                onChange={e => setNewCenter({ ...newCenter, budget: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
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
            disabled={!newCenter.code || !newCenter.name}
            sx={{ borderRadius: 2 }}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CostCenters;
