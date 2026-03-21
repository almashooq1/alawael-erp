/**
 * 🛒 مشتريات الفروع — Branch Purchasing Management
 * AlAwael ERP — Multi-Branch Purchase Requests, Receipts & Contracts
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';

import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients, surfaceColors } from 'theme/palette';
import {
  purchaseRequestService,
  purchaseReceiptService,
  vendorContractService,
  branchService,
} from 'services/branchWarehouseService';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PendingIcon from '@mui/icons-material/Pending';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SearchIcon from '@mui/icons-material/Search';
import { ViewIcon } from 'utils/iconAliases';

const prStatusConfig = {
  draft: { label: 'مسودة', color: 'default' },
  submitted: { label: 'مقدم', color: 'info' },
  approved: { label: 'معتمد', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
  ordered: { label: 'تم الطلب', color: 'primary' },
};
const priorityConfig = {
  urgent: { label: 'عاجل', color: 'error' },
  high: { label: 'عالي', color: 'warning' },
  medium: { label: 'متوسط', color: 'info' },
  low: { label: 'منخفض', color: 'default' },
};
const receiptStatusConfig = {
  complete: { label: 'مكتمل', color: 'success' },
  partial: { label: 'جزئي', color: 'warning' },
  pending: { label: 'قيد الانتظار', color: 'info' },
};
const contractStatusConfig = {
  active: { label: 'نشط', color: 'success' },
  expiring_soon: { label: 'قرب الانتهاء', color: 'warning' },
  expired: { label: 'منتهي', color: 'error' },
};

const BranchPurchasing = () => {
  const { showSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [requests, setRequests] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [prDialogOpen, setPrDialogOpen] = useState(false);
  const [editingPR, setEditingPR] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState(null);

  const [prForm, setPrForm] = useState({
    branch: '',
    department: '',
    requiredDate: '',
    priority: 'medium',
    notes: '',
    items: [
      { product: '', description: '', quantity: 1, unit: 'حبة', estimatedPrice: 0, notes: '' },
    ],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prData, rcData, ctData, brData, prStats] = await Promise.all([
        purchaseRequestService.getAll(),
        purchaseReceiptService.getAll(),
        vendorContractService.getAll(),
        branchService.getAll(),
        purchaseRequestService.getMockStats(),
      ]);
      setRequests(prData || purchaseRequestService.getMockPRs());
      setReceipts(rcData || purchaseReceiptService.getMockReceipts());
      setContracts(ctData || vendorContractService.getMockContracts());
      setBranches(brData || branchService.getMockBranches());
      setStats(prStats || {});
    } catch {
      setRequests(purchaseRequestService.getMockPRs());
      setReceipts(purchaseReceiptService.getMockReceipts());
      setContracts(vendorContractService.getMockContracts());
      setBranches(branchService.getMockBranches());
      setStats(purchaseRequestService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered lists
  const filteredRequests = requests.filter(pr => {
    const s = search.toLowerCase();
    const matchSearch =
      pr.requestNumber?.toLowerCase().includes(s) ||
      pr.branch?.toLowerCase().includes(s) ||
      pr.department?.toLowerCase().includes(s) ||
      pr.requestedBy?.toLowerCase().includes(s);
    const matchBranch = branchFilter === 'all' || pr.branch === branchFilter;
    const matchStatus = statusFilter === 'all' || pr.status === statusFilter;
    return matchSearch && matchBranch && matchStatus;
  });

  const filteredReceipts = receipts.filter(rc => {
    const s = search.toLowerCase();
    const matchSearch =
      rc.receiptNumber?.toLowerCase().includes(s) ||
      rc.vendor?.toLowerCase().includes(s) ||
      rc.warehouse?.toLowerCase().includes(s);
    const matchBranch = branchFilter === 'all' || rc.branch === branchFilter;
    return matchSearch && matchBranch;
  });

  const filteredContracts = contracts.filter(ct => {
    const s = search.toLowerCase();
    return (
      ct.contractNumber?.toLowerCase().includes(s) ||
      ct.vendor?.toLowerCase().includes(s) ||
      ct.category?.toLowerCase().includes(s)
    );
  });

  // Actions
  const handleSavePR = async () => {
    try {
      if (editingPR) {
        await purchaseRequestService.update(editingPR._id, prForm);
      } else {
        await purchaseRequestService.create(prForm);
      }
      showSnackbar(editingPR ? 'تم تحديث طلب الشراء' : 'تم إنشاء طلب الشراء بنجاح', 'success');
      setPrDialogOpen(false);
      setEditingPR(null);
      resetPrForm();
      loadData();
    } catch {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleSubmitPR = async id => {
    try {
      await purchaseRequestService.submit(id);
      showSnackbar('تم تقديم الطلب', 'success');
      loadData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };
  const handleApprovePR = async id => {
    try {
      await purchaseRequestService.approve(id);
      showSnackbar('تم اعتماد الطلب', 'success');
      loadData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };
  const handleRejectPR = async id => {
    try {
      await purchaseRequestService.reject(id, { reason: 'مرفوض من الإدارة' });
      showSnackbar('تم رفض الطلب', 'warning');
      loadData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const resetPrForm = () =>
    setPrForm({
      branch: '',
      department: '',
      requiredDate: '',
      priority: 'medium',
      notes: '',
      items: [
        { product: '', description: '', quantity: 1, unit: 'حبة', estimatedPrice: 0, notes: '' },
      ],
    });
  const addItem = () =>
    setPrForm({
      ...prForm,
      items: [
        ...prForm.items,
        { product: '', description: '', quantity: 1, unit: 'حبة', estimatedPrice: 0, notes: '' },
      ],
    });
  const removeItem = idx =>
    setPrForm({ ...prForm, items: prForm.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, val) => {
    const items = [...prForm.items];
    items[idx] = { ...items[idx], [field]: val };
    setPrForm({ ...prForm, items });
  };

  const branchNames = [...new Set(requests.map(r => r.branch))];

  const kpiCards = [
    {
      label: 'إجمالي الطلبات',
      value: stats.total || 56,
      icon: <RequestIcon />,
      gradient: gradients.primary,
    },
    {
      label: 'مسودات',
      value: stats.draft || 8,
      icon: <EditIcon />,
      gradient: gradients.info || 'linear-gradient(135deg, #1E88E5 0%, #42A5F5 100%)',
    },
    {
      label: 'بانتظار الاعتماد',
      value: stats.submitted || 15,
      icon: <PendingIcon />,
      gradient: gradients.warning || 'linear-gradient(135deg, #FF8F00 0%, #FFB300 100%)',
    },
    {
      label: 'معتمدة',
      value: stats.approved || 20,
      icon: <ApproveIcon />,
      gradient: gradients.success || 'linear-gradient(135deg, #43A047 0%, #66BB6A 100%)',
    },
    {
      label: 'عاجلة مفتوحة',
      value: stats.urgentPending || 4,
      icon: <UrgentIcon />,
      gradient: gradients.error || 'linear-gradient(135deg, #E53935 0%, #EF5350 100%)',
    },
    {
      label: 'القيمة التقديرية',
      value: `${((stats.totalEstimated || 890000) / 1000).toFixed(0)}K ر.س`,
      icon: <PurchaseIcon />,
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
                <PurchaseIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  مشتريات الفروع
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  إدارة طلبات الشراء والاستلام والعقود لجميع الفروع
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingPR(null);
                  resetPrForm();
                  setPrDialogOpen(true);
                }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                طلب شراء جديد
              </Button>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={loadData}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
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

      {/* ── TABS + FILTERS ── */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => {
              setTabValue(v);
              setSearch('');
              setStatusFilter('all');
            }}
          >
            <Tab label="طلبات الشراء" icon={<RequestIcon />} iconPosition="start" />
            <Tab label="سندات الاستلام" icon={<ReceiptIcon />} iconPosition="start" />
            <Tab label="العقود" icon={<ContractIcon />} iconPosition="start" />
          </Tabs>
        </Box>
        <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 220 }}
          />
          {tabValue < 2 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>الفرع</InputLabel>
              <Select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                label="الفرع"
              >
                <MenuItem value="all">جميع الفروع</MenuItem>
                {branchNames.map(bn => (
                  <MenuItem key={bn} value={bn}>
                    {bn}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {tabValue === 0 && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>الحالة</InputLabel>
              <Select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                label="الحالة"
              >
                <MenuItem value="all">الكل</MenuItem>
                {Object.entries(prStatusConfig).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Card>

      {/* ═══ TAB 0: PURCHASE REQUESTS ═══ */}
      {tabValue === 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors?.background || '#fafafa' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>رقم الطلب</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الفرع</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>القسم</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>مقدم الطلب</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الأصناف</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>القيمة التقديرية</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الأولوية</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.map(pr => (
                <TableRow key={pr._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {pr.requestNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={pr.branch} size="small" variant="outlined" icon={<BranchIcon />} />
                  </TableCell>
                  <TableCell>{pr.department}</TableCell>
                  <TableCell>{pr.requestedBy}</TableCell>
                  <TableCell>{pr.date}</TableCell>
                  <TableCell>{pr.items} أصناف</TableCell>
                  <TableCell>{pr.totalEstimated?.toLocaleString()} ر.س</TableCell>
                  <TableCell>
                    <Chip
                      label={priorityConfig[pr.priority]?.label}
                      color={priorityConfig[pr.priority]?.color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={prStatusConfig[pr.status]?.label}
                      color={prStatusConfig[pr.status]?.color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      <Tooltip title="عرض">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedPR(pr);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {pr.status === 'draft' && (
                        <Tooltip title="تقديم">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSubmitPR(pr._id)}
                          >
                            <SubmitIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {pr.status === 'submitted' && (
                        <>
                          <Tooltip title="اعتماد">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApprovePR(pr._id)}
                            >
                              <ApproveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="رفض">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRejectPR(pr._id)}
                            >
                              <RejectIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredRequests.length === 0 && !loading && (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">لا توجد طلبات شراء</Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {/* ═══ TAB 1: PURCHASE RECEIPTS ═══ */}
      {tabValue === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors?.background || '#fafafa' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>رقم السند</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>أمر الشراء</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المورد</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المستودع</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الفرع</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المبلغ</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الفحص</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReceipts.map(rc => (
                <TableRow key={rc._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {rc.receiptNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>{rc.purchaseOrder}</TableCell>
                  <TableCell>{rc.vendor}</TableCell>
                  <TableCell>{rc.warehouse}</TableCell>
                  <TableCell>
                    <Chip label={rc.branch} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{rc.date}</TableCell>
                  <TableCell>{rc.totalAmount?.toLocaleString()} ر.س</TableCell>
                  <TableCell>
                    <Chip
                      label={receiptStatusConfig[rc.status]?.label}
                      color={receiptStatusConfig[rc.status]?.color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={rc.qualityCheck === 'passed' ? 'ناجح' : 'قيد الفحص'}
                      color={rc.qualityCheck === 'passed' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredReceipts.length === 0 && !loading && (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">لا توجد سندات استلام</Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {/* ═══ TAB 2: CONTRACTS ═══ */}
      {tabValue === 2 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors?.background || '#fafafa' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>رقم العقد</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المورد</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الفئة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>بداية العقد</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>نهاية العقد</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>القيمة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>تجديد تلقائي</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredContracts.map(ct => (
                <TableRow
                  key={ct._id}
                  hover
                  sx={ct.status === 'expiring_soon' ? { bgcolor: '#fff8e1' } : {}}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {ct.contractNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>{ct.vendor}</TableCell>
                  <TableCell>{ct.category}</TableCell>
                  <TableCell>{ct.type === 'annual' ? 'سنوي' : ct.type}</TableCell>
                  <TableCell>{ct.startDate}</TableCell>
                  <TableCell>{ct.endDate}</TableCell>
                  <TableCell>{ct.value?.toLocaleString()} ر.س</TableCell>
                  <TableCell>
                    <Chip
                      label={contractStatusConfig[ct.status]?.label}
                      color={contractStatusConfig[ct.status]?.color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {ct.autoRenew ? (
                      <Chip label="نعم" color="success" size="small" />
                    ) : (
                      <Chip label="لا" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredContracts.length === 0 && !loading && (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">لا توجد عقود</Typography>
            </Box>
          )}
        </TableContainer>
      )}

      {/* ═══ CREATE/EDIT PR DIALOG ═══ */}
      <Dialog open={prDialogOpen} onClose={() => setPrDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingPR ? 'تعديل طلب شراء' : 'طلب شراء جديد'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الفرع</InputLabel>
                <Select
                  value={prForm.branch}
                  onChange={e => setPrForm({ ...prForm, branch: e.target.value })}
                  label="الفرع"
                >
                  {branches.map(b => (
                    <MenuItem key={b._id} value={b.name}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="القسم"
                value={prForm.department}
                onChange={e => setPrForm({ ...prForm, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="التاريخ المطلوب"
                value={prForm.requiredDate}
                onChange={e => setPrForm({ ...prForm, requiredDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={prForm.priority}
                  onChange={e => setPrForm({ ...prForm, priority: e.target.value })}
                  label="الأولوية"
                >
                  <MenuItem value="low">منخفض</MenuItem>
                  <MenuItem value="medium">متوسط</MenuItem>
                  <MenuItem value="high">عالي</MenuItem>
                  <MenuItem value="urgent">عاجل</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Chip label="الأصناف المطلوبة" />
              </Divider>
            </Grid>

            {prForm.items.map((item, idx) => (
              <React.Fragment key={idx}>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label={`الصنف ${idx + 1}`}
                    value={item.product}
                    onChange={e => updateItem(idx, 'product', e.target.value)}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="الوصف"
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="الكمية"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="السعر التقديري"
                    value={item.estimatedPrice}
                    onChange={e => updateItem(idx, 'estimatedPrice', Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={2} display="flex" alignItems="center" gap={0.5}>
                  <TextField
                    fullWidth
                    label="الوحدة"
                    value={item.unit}
                    onChange={e => updateItem(idx, 'unit', e.target.value)}
                  />
                  {prForm.items.length > 1 && (
                    <IconButton color="error" size="small" onClick={() => removeItem(idx)}>
                      <RejectIcon fontSize="small" />
                    </IconButton>
                  )}
                </Grid>
              </React.Fragment>
            ))}

            <Grid item xs={12}>
              <Button size="small" startIcon={<AddIcon />} onClick={addItem}>
                إضافة صنف
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={prForm.notes}
                onChange={e => setPrForm({ ...prForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSavePR}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ PR DETAIL DIALOG ═══ */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تفاصيل طلب الشراء — {selectedPR?.requestNumber}</DialogTitle>
        <DialogContent>
          {selectedPR && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  الفرع
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedPR.branch}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  القسم
                </Typography>
                <Typography variant="body1">{selectedPR.department}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  مقدم الطلب
                </Typography>
                <Typography variant="body1">{selectedPR.requestedBy}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  الأولوية
                </Typography>
                <Chip
                  label={priorityConfig[selectedPR.priority]?.label}
                  color={priorityConfig[selectedPR.priority]?.color}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  تاريخ الطلب
                </Typography>
                <Typography variant="body1">{selectedPR.date}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  التاريخ المطلوب
                </Typography>
                <Typography variant="body1">{selectedPR.requiredDate}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  عدد الأصناف
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedPR.items}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  القيمة التقديرية
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedPR.totalEstimated?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  الحالة
                </Typography>
                <Box>
                  <Chip
                    label={prStatusConfig[selectedPR.status]?.label}
                    color={prStatusConfig[selectedPR.status]?.color}
                    size="small"
                  />
                </Box>
              </Grid>
              {selectedPR.approvedBy && (
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    معتمد بواسطة
                  </Typography>
                  <Typography variant="body1">{selectedPR.approvedBy}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>إغلاق</Button>
          {selectedPR?.status === 'draft' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<SubmitIcon />}
              onClick={() => {
                handleSubmitPR(selectedPR._id);
                setDetailDialogOpen(false);
              }}
            >
              تقديم
            </Button>
          )}
          {selectedPR?.status === 'submitted' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={() => {
                handleApprovePR(selectedPR._id);
                setDetailDialogOpen(false);
              }}
            >
              اعتماد
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BranchPurchasing;
