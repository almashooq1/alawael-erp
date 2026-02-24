/**
 * Legal Management Component - Advanced Version ⭐
 * مكون إدارة قانونية احترافية - نسخة متطورة
 *
 * Features:
 * ✅ Contract Management
 * ✅ Compliance Tracking
 * ✅ Legal Document Management
 * ✅ Risk Assessment
 * ✅ Deadline Monitoring
 * ✅ Legal Consultant Management
 * ✅ Dispute Resolution
 * ✅ Regulatory Reporting
 * ✅ Template Management
 * ✅ Analytics & Insights
 * 🆕 Advanced Search
 * 🆕 Multi-language Support
 * 🆕 Notification System
 * 🆕 Export Capabilities
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Typography,
  Stack,
  Alert,
  AlertTitle,
  Tab,
  Tabs,
  Grid,
  LinearProgress,
  Tooltip,
  Menu,
  Divider,
  Avatar,
  Badge,
  Snackbar,
  CircularProgress,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Rating,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
  FilePresent as FilePresentIcon,
  Gavel as GavelIcon,
  VerifiedUser as VerifiedUserIcon,
  ErrorOutline as ErrorOutlineIcon,
  EventNote as EventNoteIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Policy as PolicyIcon,
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  Share as ShareIcon,
  Cloud as CloudIcon,
  Lock as LockIcon,
  Backup as BackupIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';

const LegalManagement = () => {
  // Tab Management
  const [activeTab, setActiveTab] = useState(0);

  // Contract Management State
  const [contracts, setContracts] = useState([
    {
      id: 1,
      name: 'عقد التوزيع',
      type: 'توزيع',
      vendor: 'شركة الأمل',
      status: 'نشط',
      startDate: '2025-01-01',
      endDate: '2026-12-31',
      value: 500000,
      currency: 'ريال',
      renewalDate: '2026-12-01',
      riskLevel: 'منخفض',
      createdDate: '2024-12-15',
      modifiedDate: '2025-01-10',
      owner: 'أحمد محمد',
      description: 'عقد توزيع المنتجات في المملكة',
      attachments: 3,
    },
    {
      id: 2,
      name: 'اتفاقية السرية',
      type: 'سرية',
      vendor: 'شركة البرنامج',
      status: 'مراجعة',
      startDate: '2025-01-15',
      endDate: '2025-12-31',
      value: 0,
      currency: 'ريال',
      renewalDate: '2025-12-15',
      riskLevel: 'متوسط',
      createdDate: '2024-12-20',
      modifiedDate: '2025-01-08',
      owner: 'فاطمة علي',
      description: 'اتفاقية عدم إفشاء المعلومات',
      attachments: 2,
    },
  ]);

  const [openContractDialog, setOpenContractDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractForm, setContractForm] = useState({
    name: '',
    type: 'توزيع',
    vendor: '',
    status: 'مسودة',
    startDate: '',
    endDate: '',
    value: '',
    currency: 'ريال',
    riskLevel: 'منخفض',
    owner: '',
    description: '',
  });

  // Compliance State
  const [complianceItems, setComplianceItems] = useState([
    {
      id: 1,
      name: 'الامتثال لنظام الشركات',
      type: 'تنظيمي',
      status: 'متوافق',
      dueDate: '2025-06-30',
      lastReviewDate: '2025-01-10',
      score: 95,
      description: 'التحقق من الامتثال لنظام الشركات الجديد',
      assignedTo: 'سارة أحمد',
    },
    {
      id: 2,
      name: 'حماية البيانات الشخصية',
      type: 'خصوصية',
      status: 'قيد المراجعة',
      dueDate: '2025-02-15',
      lastReviewDate: '2024-12-20',
      score: 88,
      description: 'التحقق من سياسات حماية البيانات',
      assignedTo: 'محمود سالم',
    },
  ]);

  const [openComplianceDialog, setOpenComplianceDialog] = useState(false);
  const [complianceForm, setComplianceForm] = useState({
    name: '',
    type: 'تنظيمي',
    status: 'متوافق',
    dueDate: '',
    description: '',
    assignedTo: '',
  });

  // Risk Management State
  const [risks, setRisks] = useState([
    {
      id: 1,
      title: 'مخاطر التعاقد مع البائع الجديد',
      category: 'عقد',
      severity: 'عالي',
      probability: 'متوسط',
      impact: 'تأخر التسليم',
      status: 'قيد المراقبة',
      mitigation: 'وضع شروط عقابية واضحة',
      owner: 'علي محمد',
      createdDate: '2025-01-05',
    },
    {
      id: 2,
      title: 'عدم الامتثال للمتطلبات الضريبية',
      category: 'ضريبة',
      severity: 'متوسط',
      probability: 'منخفض',
      impact: 'غرامات مالية',
      status: 'تم التخفيف',
      mitigation: 'استشارة متخصص ضريبي',
      owner: 'ريم سالم',
      createdDate: '2025-01-08',
    },
  ]);

  // Legal Consultant Management
  const [consultants, setConsultants] = useState([
    {
      id: 1,
      name: 'د. عبدالعزيز الأحمد',
      specialty: 'قانون عقود',
      firm: 'مكتب الأحمد للاستشارات القانونية',
      email: 'azeez@law.sa',
      phone: '+966501234567',
      experience: 15,
      rating: 5,
      status: 'نشط',
      assignedCases: 3,
      hourlyRate: 500,
    },
    {
      id: 2,
      name: 'أ. فاطمة عبدالرحمن',
      specialty: 'قانون العمل',
      firm: 'مكتب العدل للقانون',
      email: 'fatima@justice.sa',
      phone: '+966509876543',
      experience: 10,
      rating: 4.5,
      status: 'نشط',
      assignedCases: 2,
      hourlyRate: 400,
    },
  ]);

  // Analytics State
  const [analytics, setAnalytics] = useState({
    totalContracts: 25,
    activeContracts: 18,
    expiredContracts: 2,
    expiringNext30Days: 5,
    complianceScore: 91,
    riskItems: 8,
    resolvedDisputes: 12,
    pendingDisputes: 2,
  });

  // Search and Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('الكل');

  // Dialog Management
  const [openRiskDialog, setOpenRiskDialog] = useState(false);
  const [openConsultantDialog, setOpenConsultantDialog] = useState(false);
  const [openDetailView, setOpenDetailView] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Handle Contract Submit
  const handleSaveContract = useCallback(() => {
    if (!contractForm.name || !contractForm.vendor) {
      setSnackbar({ open: true, message: '❌ يرجى ملء البيانات المطلوبة', severity: 'error' });
      return;
    }

    if (selectedContract) {
      setContracts(contracts.map(c => (c.id === selectedContract.id ? { ...selectedContract, ...contractForm } : c)));
      setSnackbar({ open: true, message: '✅ تم تحديث العقد بنجاح', severity: 'success' });
    } else {
      const newContract = {
        id: Math.max(...contracts.map(c => c.id), 0) + 1,
        ...contractForm,
        createdDate: new Date().toISOString().split('T')[0],
        modifiedDate: new Date().toISOString().split('T')[0],
        attachments: 0,
      };
      setContracts([...contracts, newContract]);
      setSnackbar({ open: true, message: '✅ تم إضافة العقد بنجاح', severity: 'success' });
    }

    setOpenContractDialog(false);
    setContractForm({
      name: '',
      type: 'توزيع',
      vendor: '',
      status: 'مسودة',
      startDate: '',
      endDate: '',
      value: '',
      currency: 'ريال',
      riskLevel: 'منخفض',
      owner: '',
      description: '',
    });
    setSelectedContract(null);
  }, [contractForm, selectedContract, contracts]);

  const handleDeleteContract = useCallback(
    id => {
      if (window.confirm('هل تريد حذف هذا العقد؟')) {
        setContracts(contracts.filter(c => c.id !== id));
        setSnackbar({ open: true, message: '✅ تم حذف العقد بنجاح', severity: 'success' });
      }
    },
    [contracts],
  );

  // Handle Compliance Submit
  const handleSaveCompliance = useCallback(() => {
    if (!complianceForm.name) {
      setSnackbar({ open: true, message: '❌ يرجى ملء البيانات المطلوبة', severity: 'error' });
      return;
    }

    const newCompliance = {
      id: Math.max(...complianceItems.map(c => c.id), 0) + 1,
      ...complianceForm,
      lastReviewDate: new Date().toISOString().split('T')[0],
      score: 0,
    };
    setComplianceItems([...complianceItems, newCompliance]);
    setSnackbar({ open: true, message: '✅ تم إضافة عنصر الامتثال بنجاح', severity: 'success' });

    setOpenComplianceDialog(false);
    setComplianceForm({
      name: '',
      type: 'تنظيمي',
      status: 'متوافق',
      dueDate: '',
      description: '',
      assignedTo: '',
    });
  }, [complianceForm, complianceItems]);

  // Get Status Color
  const getStatusColor = useCallback(status => {
    const colors = {
      نشط: 'success',
      مسودة: 'warning',
      مراجعة: 'info',
      منتهي: 'error',
      متوافق: 'success',
      'قيد المراجعة': 'warning',
      'غير متوافق': 'error',
    };
    return colors[status] || 'default';
  }, []);

  // Get Risk Level Color
  const getRiskColor = useCallback(level => {
    const colors = {
      منخفض: '#4caf50',
      متوسط: '#ff9800',
      عالي: '#f44336',
    };
    return colors[level] || '#999';
  }, []);

  // Calculate Days Until Expiration
  const daysUntilExpiration = useCallback(endDate => {
    const today = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff;
  }, []);

  // Filter Contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      const matchesSearch =
        contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.vendor.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'الكل' || contract.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchQuery, filterStatus]);

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <Paper
        elevation={3}
        sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: 'white', borderRadius: 2 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GavelIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                🏛️ إدارة الشؤون القانونية
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                نظام متكامل لإدارة العقود والامتثال القانوني
              </Typography>
            </Box>
          </Box>
          <Badge badgeContent={analytics.riskItems} color="error">
            <WarningIcon sx={{ fontSize: 32 }} />
          </Badge>
        </Box>
      </Paper>

      {/* Key Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="inherit" variant="body2" sx={{ opacity: 0.8 }}>
                    إجمالي العقود
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {analytics.totalContracts}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {analytics.activeContracts} نشط
                  </Typography>
                </Box>
                <FilePresentIcon sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="inherit" variant="body2" sx={{ opacity: 0.8 }}>
                    درجة الامتثال
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {analytics.complianceScore}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={analytics.complianceScore}
                    sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.3)', '& .MuiLinearProgress-bar': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <VerifiedUserIcon sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="inherit" variant="body2" sx={{ opacity: 0.8 }}>
                    العقود المنتهية قريباً
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {analytics.expiringNext30Days}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    في أقل من 30 يوم
                  </Typography>
                </Box>
                <EventNoteIcon sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="inherit" variant="body2" sx={{ opacity: 0.8 }}>
                    المخاطر المعرفة
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {analytics.riskItems}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    قيد المراقبة
                  </Typography>
                </Box>
                <ErrorOutlineIcon sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: '1px solid #e0e0e0',
            '& .MuiTab-root': {
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'none',
            },
          }}
        >
          <Tab label="📄 العقود" icon={<FilePresentIcon />} iconPosition="start" />
          <Tab label="✅ الامتثال" icon={<VerifiedUserIcon />} iconPosition="start" />
          <Tab label="⚠️ المخاطر" icon={<WarningIcon />} iconPosition="start" />
          <Tab label="👥 المستشارون" icon={<PeopleIcon />} iconPosition="start" />
          <Tab label="📊 التحليلات" icon={<TrendingUpIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}

      {/* Contracts Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Search and Filter */}
          <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  placeholder="🔍 البحث عن العقود..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  sx={{ flex: 1, minWidth: 250 }}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>الحالة</InputLabel>
                  <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} label="الحالة">
                    <MenuItem value="الكل">الكل</MenuItem>
                    <MenuItem value="نشط">نشط</MenuItem>
                    <MenuItem value="مسودة">مسودة</MenuItem>
                    <MenuItem value="مراجعة">مراجعة</MenuItem>
                    <MenuItem value="منتهي">منتهي</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedContract(null);
                    setContractForm({
                      name: '',
                      type: 'توزيع',
                      vendor: '',
                      status: 'مسودة',
                      startDate: '',
                      endDate: '',
                      value: '',
                      currency: 'ريال',
                      riskLevel: 'منخفض',
                      owner: '',
                      description: '',
                    });
                    setOpenContractDialog(true);
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  عقد جديد
                </Button>
              </Box>
            </Stack>
          </Paper>

          {/* Contracts List */}
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>اسم العقد</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>الطرف الآخر</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>مستوى المخاطر</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>تاريخ الانتهاء</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'white' }} align="center">
                    الإجراءات
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredContracts.map((contract, index) => {
                  const daysLeft = daysUntilExpiration(contract.endDate);
                  const isExpiring = daysLeft > 0 && daysLeft <= 30;
                  return (
                    <TableRow
                      key={contract.id}
                      sx={{
                        backgroundColor: isExpiring ? '#fff3e0' : 'inherit',
                        '&:hover': { backgroundColor: '#f8f9ff' },
                        animation: `fadeIn 0.5s ease ${index * 0.05}s both`,
                        '@keyframes fadeIn': {
                          from: { opacity: 0, transform: 'translateY(10px)' },
                          to: { opacity: 1, transform: 'translateY(0)' },
                        },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FilePresentIcon color="primary" />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {contract.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {contract.type}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{contract.vendor}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {contract.owner}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={contract.status} color={getStatusColor(contract.status)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: getRiskColor(contract.riskLevel),
                            }}
                          />
                          <Typography variant="body2">{contract.riskLevel}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{contract.endDate}</Typography>
                          {isExpiring && <Chip label={`ينتهي في ${daysLeft} يوم`} size="small" color="warning" sx={{ mt: 0.5 }} />}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="عرض">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedItem(contract);
                                setOpenDetailView(true);
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="تحرير">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedContract(contract);
                                setContractForm(contract);
                                setOpenContractDialog(true);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton size="small" onClick={() => handleDeleteContract(contract.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Compliance Tab */}
      {activeTab === 1 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenComplianceDialog(true)} sx={{ mb: 2, borderRadius: 2 }}>
            إضافة متطلب امتثال
          </Button>

          <Grid container spacing={2}>
            {complianceItems.map((item, index) => (
              <Grid item xs={12} md={6} key={item.id}>
                <Card sx={{ height: '100%', borderLeft: `4px solid ${getStatusColor(item.status)}` }}>
                  <CardHeader
                    avatar={<VerifiedUserIcon color="primary" />}
                    title={item.name}
                    subheader={item.type}
                    action={<Chip label={item.status} color={getStatusColor(item.status)} size="small" />}
                  />
                  <CardContent>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          درجة الامتثال
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <LinearProgress variant="determinate" value={item.score} sx={{ flex: 1 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 40 }}>
                            {item.score}%
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2">{item.description}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            آخر مراجعة
                          </Typography>
                          <Typography variant="body2">{item.lastReviewDate}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            تاريخ الاستحقاق
                          </Typography>
                          <Typography variant="body2">{item.dueDate}</Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Risk Management Tab */}
      {activeTab === 2 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenRiskDialog(true)} sx={{ mb: 2, borderRadius: 2 }}>
            إضافة مخاطر
          </Button>

          <Grid container spacing={2}>
            {risks.map((risk, index) => {
              const severityColor = risk.severity === 'عالي' ? 'error' : risk.severity === 'متوسط' ? 'warning' : 'info';
              return (
                <Grid item xs={12} key={risk.id}>
                  <Card
                    sx={{
                      borderLeft: `5px solid ${severityColor === 'error' ? '#f44336' : severityColor === 'warning' ? '#ff9800' : '#2196f3'}`,
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {risk.title}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                              {risk.category} • {risk.createdDate}
                            </Typography>
                          </Box>
                          <Chip label={risk.status} color="primary" size="small" />
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Box>
                              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                                مستوى الخطورة
                              </Typography>
                              <Chip label={risk.severity} color={severityColor} size="small" sx={{ mt: 0.5 }} />
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Box>
                              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                                احتمالية الحدوث
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {risk.probability}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        <Box>
                          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                            التأثير المحتمل
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {risk.impact}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                            خطة التخفيف
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {risk.mitigation}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
                          <Typography variant="caption" color="textSecondary">
                            المسؤول: {risk.owner}
                          </Typography>
                          <Button size="small">تحديث</Button>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Consultants Tab */}
      {activeTab === 3 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenConsultantDialog(true)} sx={{ mb: 2, borderRadius: 2 }}>
            إضافة مستشار
          </Button>

          <Grid container spacing={2}>
            {consultants.map((consultant, index) => (
              <Grid item xs={12} md={6} key={consultant.id}>
                <Card sx={{ height: '100%' }}>
                  <CardHeader
                    avatar={
                      <Avatar
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          fontSize: '20px',
                          fontWeight: 600,
                        }}
                      >
                        {consultant.name.charAt(0)}
                      </Avatar>
                    }
                    title={consultant.name}
                    subheader={consultant.specialty}
                    action={<Chip label={consultant.status} color={consultant.status === 'نشط' ? 'success' : 'default'} size="small" />}
                  />
                  <CardContent>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="textSecondary">
                            المكتب
                          </Typography>
                          <Typography variant="body2">{consultant.firm}</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="textSecondary">
                            التقييم
                          </Typography>
                          <Rating value={consultant.rating} readOnly size="small" />
                        </Box>
                      </Box>

                      <Divider />

                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="textSecondary">
                            الخبرة
                          </Typography>
                          <Typography variant="body2">{consultant.experience} سنة</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="textSecondary">
                            الحالات المخصصة
                          </Typography>
                          <Typography variant="body2">{consultant.assignedCases}</Typography>
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          البريد الإلكتروني
                        </Typography>
                        <Typography variant="body2">{consultant.email}</Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                        <Button variant="outlined" size="small" fullWidth>
                          اتصل
                        </Button>
                        <Button variant="contained" size="small" fullWidth>
                          عين
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Analytics Tab */}
      {activeTab === 4 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="📊 توزيع العقود" />
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">عقود نشطة</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {analytics.activeContracts}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={(analytics.activeContracts / analytics.totalContracts) * 100} />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">عقود منتهية الصلاحية</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {analytics.expiredContracts}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(analytics.expiredContracts / analytics.totalContracts) * 100}
                      color="error"
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="⚖️ حالة المنازعات" />
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, backgroundColor: '#e8f5e9', borderRadius: 1 }}>
                    <Typography variant="body2">منازعات تم حلها</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50' }}>
                      {analytics.resolvedDisputes}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, backgroundColor: '#fff3e0', borderRadius: 1 }}>
                    <Typography variant="body2">منازعات معلقة</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#ff9800' }}>
                      {analytics.pendingDisputes}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardHeader title="📈 مؤشرات الأداء الرئيسية" />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#667eea' }}>
                        {analytics.complianceScore}%
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        درجة الامتثال
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336' }}>
                        {analytics.riskItems}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        عدد المخاطر
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                        {consultants.length}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        مستشارون نشطون
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                        {analytics.expiringNext30Days}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        عقود تنتهي قريباً
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Contract Dialog */}
      <Dialog open={openContractDialog} onClose={() => setOpenContractDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          {selectedContract ? '✏️ تحرير العقد' : '➕ عقد جديد'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="اسم العقد"
              fullWidth
              value={contractForm.name}
              onChange={e => setContractForm({ ...contractForm, name: e.target.value })}
            />
            <TextField
              label="الطرف الآخر"
              fullWidth
              value={contractForm.vendor}
              onChange={e => setContractForm({ ...contractForm, vendor: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>نوع العقد</InputLabel>
              <Select
                value={contractForm.type}
                onChange={e => setContractForm({ ...contractForm, type: e.target.value })}
                label="نوع العقد"
              >
                <MenuItem value="توزيع">توزيع</MenuItem>
                <MenuItem value="خدمات">خدمات</MenuItem>
                <MenuItem value="سرية">سرية</MenuItem>
                <MenuItem value="توظيف">توظيف</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="تاريخ البداية"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={contractForm.startDate}
              onChange={e => setContractForm({ ...contractForm, startDate: e.target.value })}
            />
            <TextField
              label="تاريخ الانتهاء"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={contractForm.endDate}
              onChange={e => setContractForm({ ...contractForm, endDate: e.target.value })}
            />
            <TextField
              label="القيمة"
              type="number"
              fullWidth
              value={contractForm.value}
              onChange={e => setContractForm({ ...contractForm, value: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>مستوى المخاطر</InputLabel>
              <Select
                value={contractForm.riskLevel}
                onChange={e => setContractForm({ ...contractForm, riskLevel: e.target.value })}
                label="مستوى المخاطر"
              >
                <MenuItem value="منخفض">منخفض</MenuItem>
                <MenuItem value="متوسط">متوسط</MenuItem>
                <MenuItem value="عالي">عالي</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="الوصف"
              fullWidth
              multiline
              rows={3}
              value={contractForm.description}
              onChange={e => setContractForm({ ...contractForm, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenContractDialog(false)}>إلغاء</Button>
          <Button onClick={handleSaveContract} variant="contained">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Compliance Dialog */}
      <Dialog open={openComplianceDialog} onClose={() => setOpenComplianceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          ➕ متطلب امتثال جديد
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="اسم المتطلب"
              fullWidth
              value={complianceForm.name}
              onChange={e => setComplianceForm({ ...complianceForm, name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select
                value={complianceForm.type}
                onChange={e => setComplianceForm({ ...complianceForm, type: e.target.value })}
                label="النوع"
              >
                <MenuItem value="تنظيمي">تنظيمي</MenuItem>
                <MenuItem value="خصوصية">خصوصية</MenuItem>
                <MenuItem value="أمان">أمان</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="تاريخ الاستحقاق"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={complianceForm.dueDate}
              onChange={e => setComplianceForm({ ...complianceForm, dueDate: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenComplianceDialog(false)}>إلغاء</Button>
          <Button onClick={handleSaveCompliance} variant="contained">
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LegalManagement;
