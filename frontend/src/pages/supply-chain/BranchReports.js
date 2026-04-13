/**
 * 📊 تقارير الفروع — Branch Reports & Cross-Branch Analytics
 * AlAwael ERP — Multi-Branch Dashboard & Performance Comparison
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,  LinearProgress,
  Avatar,
  Divider,  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,} from '@mui/material';
import {
  Assessment as ReportIcon,
  Store as BranchIcon,
  Inventory as InventoryIcon,
  ShoppingCart as PurchaseIcon,
  SwapHoriz as TransferIcon,
  Warehouse as WarehouseIcon,
  Refresh as RefreshIcon,
  EmojiEvents as TopIcon,
  Warning as WarningIcon,
  CompareArrows as CompareIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients, brandColors, surfaceColors } from 'theme/palette';
import {
  branchService,
  warehouseService,
  stockTransferService,
  purchaseRequestService,
} from 'services/branchWarehouseService';

const BranchReports = () => {
  const { showSnackbar: _showSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [_selectedBranch, _setSelectedBranch] = useState('all');
  const [_period, _setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [_branchStats, setBranchStats] = useState({});
  const [_whStats, setWhStats] = useState({});
  const [trStats, setTrStats] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [brData, whData, trData, prData, brSt, whSt, trSt] = await Promise.all([
        branchService.getAll(),
        warehouseService.getAll(),
        stockTransferService.getAll(),
        purchaseRequestService.getAll(),
        branchService.getMockStats(),
        warehouseService.getMockStats(),
        stockTransferService.getMockStats(),
      ]);
      setBranches(brData || branchService.getMockBranches());
      setWarehouses(whData || warehouseService.getMockWarehouses());
      setTransfers(trData || stockTransferService.getMockTransfers());
      setPurchaseRequests(prData || purchaseRequestService.getMockPRs());
      setBranchStats(brSt || {});
      setWhStats(whSt || {});
      setTrStats(trSt || {});
    } catch {
      setBranches(branchService.getMockBranches());
      setWarehouses(warehouseService.getMockWarehouses());
      setTransfers(stockTransferService.getMockTransfers());
      setPurchaseRequests(purchaseRequestService.getMockPRs());
      setBranchStats(branchService.getMockStats());
      setWhStats(warehouseService.getMockStats());
      setTrStats(stockTransferService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Computed branch-level metrics ──
  const branchMetrics = branches.map(br => {
    const brWarehouses = warehouses.filter(w => w.branch === br._id);
    const brTransfersOut = transfers.filter(t => t.fromBranch === br.name);
    const brTransfersIn = transfers.filter(t => t.toBranch === br.name);
    const brPRs = purchaseRequests.filter(pr => pr.branch === br.name);
    return {
      ...br,
      warehouseCount: brWarehouses.length,
      stockValue: brWarehouses.reduce((sum, w) => sum + (w.stockValue || 0), 0),
      totalProducts: brWarehouses.reduce((sum, w) => sum + (w.productsCount || 0), 0),
      lowStockItems: brWarehouses.reduce((sum, w) => sum + (w.lowStockItems || 0), 0),
      occupancyRate:
        brWarehouses.length > 0
          ? Math.round(
              (brWarehouses.reduce((sum, w) => sum + (w.currentOccupancy || 0), 0) /
                brWarehouses.reduce((sum, w) => sum + (w.capacity || 1), 0)) *
                100
            )
          : 0,
      transfersOut: brTransfersOut.length,
      transfersIn: brTransfersIn.length,
      transferValue:
        brTransfersOut.reduce((sum, t) => sum + (t.totalValue || 0), 0) +
        brTransfersIn.reduce((sum, t) => sum + (t.totalValue || 0), 0),
      purchaseRequests: brPRs.length,
      purchaseValue: brPRs.reduce((sum, pr) => sum + (pr.totalEstimated || 0), 0),
      pendingPRs: brPRs.filter(pr => pr.status === 'submitted').length,
    };
  });

  // ── Top-level summary ──
  const totalStockValue = branchMetrics.reduce((s, b) => s + b.stockValue, 0);
  const totalProducts = branchMetrics.reduce((s, b) => s + b.totalProducts, 0);
  const totalLowStock = branchMetrics.reduce((s, b) => s + b.lowStockItems, 0);
  const totalPurchaseValue = branchMetrics.reduce((s, b) => s + b.purchaseValue, 0);
  const topBranch = [...branchMetrics].sort((a, b) => b.stockValue - a.stockValue)[0];
  const _lowStockBranch = [...branchMetrics].sort((a, b) => b.lowStockItems - a.lowStockItems)[0];

  const kpiCards = [
    {
      label: 'إجمالي قيمة المخزون',
      value: `${(totalStockValue / 1000000).toFixed(2)}M ر.س`,
      icon: <InventoryIcon />,
      gradient: gradients.primary,
    },
    {
      label: 'إجمالي المنتجات',
      value: totalProducts.toLocaleString(),
      icon: <WarehouseIcon />,
      gradient: gradients.success || 'linear-gradient(135deg, #43A047 0%, #66BB6A 100%)',
    },
    {
      label: 'أصناف تحت الحد',
      value: totalLowStock,
      icon: <WarningIcon />,
      gradient: gradients.error || 'linear-gradient(135deg, #E53935 0%, #EF5350 100%)',
    },
    {
      label: 'إجمالي المشتريات',
      value: `${(totalPurchaseValue / 1000).toFixed(0)}K ر.س`,
      icon: <PurchaseIcon />,
      gradient: gradients.warning || 'linear-gradient(135deg, #FF8F00 0%, #FFB300 100%)',
    },
    {
      label: 'تحويلات الشهر',
      value: trStats.thisMonth || 7,
      icon: <TransferIcon />,
      gradient: gradients.info || 'linear-gradient(135deg, #1E88E5 0%, #42A5F5 100%)',
    },
    {
      label: 'أفضل فرع',
      value: topBranch?.name?.replace('فرع ', '') || '-',
      icon: <TopIcon />,
      gradient: gradients.secondary || 'linear-gradient(135deg, #7B1FA2 0%, #AB47BC 100%)',
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* ── HEADER ── */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <ReportIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  تقارير الفروع
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  تحليلات شاملة ومقارنات أداء بين جميع الفروع
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={loadData}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                تحديث
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── KPI CARDS ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpiCards.map((kpi, i) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
            <Card sx={{ background: kpi.gradient, color: '#fff', borderRadius: 2 }}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>
                      {kpi.label}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {kpi.value}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>{kpi.icon}</Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── TABS ── */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="مقارنة الفروع" icon={<CompareIcon />} iconPosition="start" />
            <Tab label="تفاصيل المخزون" icon={<InventoryIcon />} iconPosition="start" />
            <Tab label="أداء التحويلات" icon={<TransferIcon />} iconPosition="start" />
            <Tab label="تحليل المشتريات" icon={<PurchaseIcon />} iconPosition="start" />
          </Tabs>
        </Box>
      </Card>

      {/* ═══ TAB 0: BRANCH COMPARISON (Cards) ═══ */}
      {tabValue === 0 && (
        <Grid container spacing={2}>
          {branchMetrics.map(br => (
            <Grid item xs={12} md={6} lg={4} key={br._id}>
              <Card
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: br.status === 'active' ? 'divider' : 'warning.light',
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar
                        sx={{ bgcolor: brandColors?.primary || '#1976d2', width: 40, height: 40 }}
                      >
                        <BranchIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {br.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {br.location?.city} — {br.code}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={br.status === 'active' ? 'نشط' : 'صيانة'}
                      color={br.status === 'active' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Stock Value — highlight */}
                  <Box
                    sx={{
                      bgcolor: surfaceColors?.background || '#f5f5f5',
                      borderRadius: 2,
                      p: 1.5,
                      mb: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      قيمة المخزون
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary">
                      {br.stockValue.toLocaleString()} ر.س
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {br.totalProducts.toLocaleString()} منتج
                    </Typography>
                  </Box>

                  {/* Metrics Grid */}
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Box sx={{ p: 1, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          المستودعات
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {br.warehouseCount}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box
                        sx={{
                          p: 1,
                          bgcolor: br.lowStockItems > 5 ? '#fff3e0' : '#e8f5e9',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          نقص مخزون
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          color={br.lowStockItems > 5 ? 'warning.main' : 'success.main'}
                        >
                          {br.lowStockItems}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 1, bgcolor: '#f3e5f5', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          تحويلات (وارد/صادر)
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {br.transfersIn}/{br.transfersOut}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 1, bgcolor: '#fce4ec', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          طلبات شراء
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {br.purchaseRequests} ({(br.purchaseValue / 1000).toFixed(0)}K)
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Occupancy */}
                  <Box mt={2}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption">نسبة الإشغال</Typography>
                      <Typography variant="caption" fontWeight="bold">
                        {br.occupancyRate}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={br.occupancyRate}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          bgcolor:
                            br.occupancyRate > 85
                              ? '#f44336'
                              : br.occupancyRate > 65
                                ? '#ff9800'
                                : '#4caf50',
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ═══ TAB 1: INVENTORY DETAIL TABLE ═══ */}
      {tabValue === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors?.background || '#fafafa' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>المستودع</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الفرع</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المنتجات</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>قيمة المخزون</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الإشغال</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>نسبة الإشغال</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>نقص</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {warehouses.map(wh => {
                const occupancy =
                  wh.capacity > 0 ? Math.round((wh.currentOccupancy / wh.capacity) * 100) : 0;
                return (
                  <TableRow key={wh._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {wh.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {wh.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{wh.branchName}</TableCell>
                    <TableCell>
                      <Chip
                        label={wh.type === 'main' ? 'رئيسي' : wh.type === 'branch' ? 'فرع' : 'عبور'}
                        color={
                          wh.type === 'main'
                            ? 'primary'
                            : wh.type === 'branch'
                              ? 'success'
                              : 'warning'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{wh.productsCount?.toLocaleString()}</TableCell>
                    <TableCell>{wh.stockValue?.toLocaleString()} ر.س</TableCell>
                    <TableCell>
                      {wh.currentOccupancy?.toLocaleString()} / {wh.capacity?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={occupancy}
                          sx={{
                            width: 60,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              bgcolor:
                                occupancy > 85 ? '#f44336' : occupancy > 65 ? '#ff9800' : '#4caf50',
                            },
                          }}
                        />
                        <Typography variant="caption">{occupancy}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        color={wh.lowStockItems > 5 ? 'warning.main' : 'text.primary'}
                        fontWeight={wh.lowStockItems > 5 ? 'bold' : 'normal'}
                      >
                        {wh.lowStockItems}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={wh.isActive ? 'نشط' : 'غير نشط'}
                        color={wh.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ═══ TAB 2: TRANSFER PERFORMANCE ═══ */}
      {tabValue === 2 && (
        <Grid container spacing={2}>
          {/* Transfer Summary Cards */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {[
                {
                  label: 'إجمالي التحويلات',
                  value: transfers.length,
                  color: '#1976d2',
                  bg: '#e3f2fd',
                },
                {
                  label: 'مكتملة',
                  value: transfers.filter(t => t.status === 'received').length,
                  color: '#2e7d32',
                  bg: '#e8f5e9',
                },
                {
                  label: 'قيد التنفيذ',
                  value: transfers.filter(t => t.status === 'shipped' || t.status === 'pending')
                    .length,
                  color: '#ed6c02',
                  bg: '#fff3e0',
                },
                {
                  label: 'متوسط أيام التوصيل',
                  value: `${trStats.avgTransitDays || 2.8} يوم`,
                  color: '#7b1fa2',
                  bg: '#f3e5f5',
                },
              ].map((item, i) => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Card sx={{ bgcolor: item.bg, borderRadius: 2 }}>
                    <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" sx={{ color: item.color }}>
                        {item.value}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Transfer routes breakdown */}
          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: surfaceColors?.background || '#fafafa' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>رقم التحويل</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المصدر</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الوجهة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الأصناف</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>القيمة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الزمن</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transfers.map(tr => {
                    const days =
                      tr.receivedAt && tr.shippedAt
                        ? Math.ceil(
                            (new Date(tr.receivedAt) - new Date(tr.shippedAt)) / (1000 * 86400)
                          )
                        : '-';
                    return (
                      <TableRow key={tr._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            {tr.transferNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>{tr.fromBranch}</TableCell>
                        <TableCell>{tr.toBranch}</TableCell>
                        <TableCell>
                          {tr.items} صنف ({tr.totalQuantity} وحدة)
                        </TableCell>
                        <TableCell>{tr.totalValue?.toLocaleString()} ر.س</TableCell>
                        <TableCell>
                          <Chip
                            label={
                              tr.status === 'received'
                                ? 'مستلم'
                                : tr.status === 'shipped'
                                  ? 'في الطريق'
                                  : tr.status === 'pending'
                                    ? 'انتظار'
                                    : 'مسودة'
                            }
                            color={
                              tr.status === 'received'
                                ? 'success'
                                : tr.status === 'shipped'
                                  ? 'info'
                                  : tr.status === 'pending'
                                    ? 'warning'
                                    : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{days !== '-' ? `${days} يوم` : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {/* ═══ TAB 3: PURCHASING ANALYSIS ═══ */}
      {tabValue === 3 && (
        <Grid container spacing={2}>
          {/* Per-branch purchasing summary */}
          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: surfaceColors?.background || '#fafafa' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>الفرع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>عدد الطلبات</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>القيمة الإجمالية</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>بانتظار الاعتماد</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>معتمدة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>نسبة من الإجمالي</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {branchMetrics
                    .filter(b => b.purchaseRequests > 0)
                    .sort((a, b) => b.purchaseValue - a.purchaseValue)
                    .map(br => (
                      <TableRow key={br._id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: brandColors?.primary || '#1976d2',
                              }}
                            >
                              <BranchIcon fontSize="small" />
                            </Avatar>
                            <Typography fontWeight="bold">{br.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{br.purchaseRequests}</TableCell>
                        <TableCell>{br.purchaseValue.toLocaleString()} ر.س</TableCell>
                        <TableCell>
                          <Chip
                            label={br.pendingPRs}
                            color={br.pendingPRs > 0 ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {
                            purchaseRequests.filter(
                              pr => pr.branch === br.name && pr.status === 'approved'
                            ).length
                          }
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <LinearProgress
                              variant="determinate"
                              value={
                                totalPurchaseValue > 0
                                  ? (br.purchaseValue / totalPurchaseValue) * 100
                                  : 0
                              }
                              sx={{
                                width: 80,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: '#e0e0e0',
                                '& .MuiLinearProgress-bar': { borderRadius: 3 },
                              }}
                            />
                            <Typography variant="caption">
                              {totalPurchaseValue > 0
                                ? ((br.purchaseValue / totalPurchaseValue) * 100).toFixed(1)
                                : 0}
                              %
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* Purchasing by status breakdown */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {[
                {
                  label: 'مسودات',
                  count: purchaseRequests.filter(pr => pr.status === 'draft').length,
                  value: purchaseRequests
                    .filter(pr => pr.status === 'draft')
                    .reduce((s, p) => s + (p.totalEstimated || 0), 0),
                  color: '#9e9e9e',
                  bg: '#fafafa',
                },
                {
                  label: 'مقدمة',
                  count: purchaseRequests.filter(pr => pr.status === 'submitted').length,
                  value: purchaseRequests
                    .filter(pr => pr.status === 'submitted')
                    .reduce((s, p) => s + (p.totalEstimated || 0), 0),
                  color: '#1976d2',
                  bg: '#e3f2fd',
                },
                {
                  label: 'معتمدة',
                  count: purchaseRequests.filter(pr => pr.status === 'approved').length,
                  value: purchaseRequests
                    .filter(pr => pr.status === 'approved')
                    .reduce((s, p) => s + (p.totalEstimated || 0), 0),
                  color: '#2e7d32',
                  bg: '#e8f5e9',
                },
                {
                  label: 'تم الطلب',
                  count: purchaseRequests.filter(pr => pr.status === 'ordered').length,
                  value: purchaseRequests
                    .filter(pr => pr.status === 'ordered')
                    .reduce((s, p) => s + (p.totalEstimated || 0), 0),
                  color: '#7b1fa2',
                  bg: '#f3e5f5',
                },
                {
                  label: 'مرفوضة',
                  count: purchaseRequests.filter(pr => pr.status === 'rejected').length,
                  value: purchaseRequests
                    .filter(pr => pr.status === 'rejected')
                    .reduce((s, p) => s + (p.totalEstimated || 0), 0),
                  color: '#d32f2f',
                  bg: '#ffebee',
                },
              ].map((item, i) => (
                <Grid item xs={12} sm={6} md={2.4} key={i}>
                  <Card sx={{ bgcolor: item.bg, borderRadius: 2 }}>
                    <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" sx={{ color: item.color }}>
                        {item.count}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(item.value / 1000).toFixed(0)}K ر.س
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default BranchReports;
