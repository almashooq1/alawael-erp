import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  Timeline as TimelineIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Email as EmailIcon,
} from '@mui/icons-material';

const CRMPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [pipeline, setPipeline] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('view'); // view, edit, create

  // Fetch CRM Data
  useEffect(() => {
    const fetchCRMData = async () => {
      setLoading(true);
      try {
        // Fetch all CRM data in parallel
        const [customersRes, dealsRes, pipelineRes, analyticsRes] = await Promise.all([
          fetchWithFallback('/api/crm/customers'),
          fetchWithFallback('/api/crm/deals'),
          fetchWithFallback('/api/crm/pipeline'),
          fetchWithFallback('/api/crm/analytics'),
        ]);

        setCustomers(customersRes?.data?.customers || []);
        setDeals(dealsRes?.data?.deals || []);
        setPipeline(pipelineRes?.data || null);
        setAnalytics(analyticsRes?.data || null);

        // Calculate KPIs
        if (customersRes?.data?.customers) {
          const kpisData = [
            {
              label: 'إجمالي العملاء',
              value: customersRes.data.customers.length,
              icon: <PeopleIcon />,
              color: '#0f766e',
              trend: '+2',
            },
            {
              label: 'الفرص النشطة',
              value: dealsRes?.data?.deals?.length || 0,
              icon: <ShoppingCartIcon />,
              color: '#7c2d12',
              trend: '+1',
            },
            {
              label: 'إجمالي الفرص',
              value: `${(dealsRes?.data?.statistics?.totalValue / 1000).toFixed(0)}ك ر.س`,
              icon: <TrendingUpIcon />,
              color: '#1e40af',
              trend: '+18%',
            },
            {
              label: 'معدل الإغلاق',
              value: '78%',
              icon: <TimelineIcon />,
              color: '#16a34a',
              trend: '+3%',
            },
          ];
          setKpis(kpisData);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching CRM data:', err);
        setError('حدث خطأ في تحميل بيانات CRM');
      } finally {
        setLoading(false);
      }
    };

    fetchCRMData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper function for API calls with fallback
  const fetchWithFallback = async url => {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch');

      return await response.json();
    } catch (error) {
      console.log(`Fallback for ${url}`);
      return getMockData(url);
    }
  };

  // Mock data fallback
  const getMockData = url => {
    if (url.includes('customers')) {
      return {
        data: {
          customers: [
            { id: 'cust_001', name: 'شركة ABC', email: 'info@abc.com', status: 'عميل نشط', tier: 'ذهبي' },
            { id: 'cust_002', name: 'شركة XYZ', email: 'info@xyz.com', status: 'عميل نشط', tier: 'بلاتيني' },
          ],
        },
      };
    }
    return {};
  };

  // Tab Change Handler
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Dialog Handlers
  const openEditDialog = customer => {
    setSelectedCustomer(customer);
    setDialogMode('edit');
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setSelectedCustomer(null);
  };

  // Loading State
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Error Alert */}
      {error && <Alert severity="error">{error}</Alert>}

      {/* KPIs Row */}
      <Grid container spacing={2}>
        {kpis.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ p: 2, borderRadius: 2, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    {kpi.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                    {kpi.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: kpi.color, fontWeight: 600 }}>
                    {kpi.trend}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '50%',
                    background: kpi.color,
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {kpi.icon}
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs Navigation */}
      <Card sx={{ borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: '#f5f7fa',
            '& .MuiTab-root': { textTransform: 'none', fontSize: '1rem' },
          }}
        >
          <Tab label="📊 لوحة التحكم" />
          <Tab label="👥 العملاء" />
          <Tab label="🛍️ الفرص" />
          <Tab label="📈 خط الأنابيب" />
          <Tab label="📉 التحليلات" />
        </Tabs>

        {/* Tab Content */}
        <CardContent sx={{ p: 3 }}>
          {/* Dashboard Tab */}
          {activeTab === 0 && <DashboardTab deals={deals} customers={customers} />}

          {/* Customers Tab */}
          {activeTab === 1 && (
            <CustomersTab
              customers={customers}
              onEdit={openEditDialog}
              onAdd={() => {
                setDialogMode('create');
                setOpenDialog(true);
              }}
            />
          )}

          {/* Deals Tab */}
          {activeTab === 2 && <DealsTab deals={deals} />}

          {/* Pipeline Tab */}
          {activeTab === 3 && <PipelineTab pipeline={pipeline} />}

          {/* Analytics Tab */}
          {activeTab === 4 && <AnalyticsTab analytics={analytics} />}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditCustomerDialog open={openDialog} mode={dialogMode} customer={selectedCustomer} onClose={closeDialog} />
    </Box>
  );
};

// ============================================
// 📊 Dashboard Tab Component
// ============================================

const DashboardTab = ({ deals, customers }) => {
  return (
    <Grid container spacing={3}>
      {/* Recent Deals */}
      <Grid item xs={12} md={8}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              🔥 آخر الفرص
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                    <TableCell>
                      <strong>الفرصة</strong>
                    </TableCell>
                    <TableCell>
                      <strong>العميل</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>القيمة</strong>
                    </TableCell>
                    <TableCell>
                      <strong>المرحلة</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deals.slice(0, 5).map((deal, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{deal.title}</TableCell>
                      <TableCell>{deal.customerName}</TableCell>
                      <TableCell align="right">{deal.value.toLocaleString('ar-SA')} ر.س</TableCell>
                      <TableCell>
                        <Chip label={deal.stage} size="small" color={deal.stage === 'الاتفاقية' ? 'success' : 'default'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Customers */}
      <Grid item xs={12} md={4}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              👑 أفضل العملاء
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {customers
                .sort((a, b) => b.totalValue - a.totalValue)
                .slice(0, 5)
                .map((customer, idx) => (
                  <Box key={idx} sx={{ p: 1.5, bgcolor: '#f5f7fa', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {customer.name}
                      </Typography>
                      <Chip label={customer.tier} size="small" variant="outlined" />
                    </Box>
                    <LinearProgress variant="determinate" value={(customer.totalValue / 600000) * 100} sx={{ mt: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      {customer.totalValue.toLocaleString('ar-SA')} ر.س
                    </Typography>
                  </Box>
                ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// ============================================
// 👥 Customers Tab Component
// ============================================

const CustomersTab = ({ customers, onEdit, onAdd }) => {
  const [selectedTier, setSelectedTier] = useState('الكل');

  const filteredCustomers = selectedTier === 'الكل' ? customers : customers.filter(c => c.tier === selectedTier);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>التصنيف</InputLabel>
          <Select value={selectedTier} label="التصنيف" onChange={e => setSelectedTier(e.target.value)}>
            <MenuItem value="الكل">الكل</MenuItem>
            <MenuItem value="بلاتيني">بلاتيني</MenuItem>
            <MenuItem value="ذهبي">ذهبي</MenuItem>
            <MenuItem value="فضي">فضي</MenuItem>
            <MenuItem value="برونزي">برونزي</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          عميل جديد
        </Button>
      </Box>

      {/* Customers Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f7fa' }}>
              <TableCell>
                <strong>الاسم</strong>
              </TableCell>
              <TableCell>
                <strong>البريد الإلكتروني</strong>
              </TableCell>
              <TableCell>
                <strong>الصناعة</strong>
              </TableCell>
              <TableCell>
                <strong>التصنيف</strong>
              </TableCell>
              <TableCell align="right">
                <strong>إجمالي القيمة</strong>
              </TableCell>
              <TableCell align="center">
                <strong>الإجراءات</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCustomers.map(customer => (
              <TableRow key={customer.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{customer.name}</TableCell>
                <TableCell>
                  <Tooltip title={customer.email}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmailIcon sx={{ fontSize: 16 }} />
                      {customer.email.substring(0, 20)}...
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell>{customer.industry}</TableCell>
                <TableCell>
                  <Chip
                    label={customer.tier}
                    size="small"
                    color={customer.tier === 'بلاتيني' ? 'primary' : customer.tier === 'ذهبي' ? 'warning' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">{customer.totalValue.toLocaleString('ar-SA')} ر.س</TableCell>
                <TableCell align="center">
                  <Tooltip title="تعديل">
                    <IconButton size="small" color="primary" onClick={() => onEdit(customer)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// ============================================
// 🛍️ Deals Tab Component
// ============================================

const DealsTab = ({ deals }) => {
  const [selectedStage, setSelectedStage] = useState('الكل');

  const filteredDeals = selectedStage === 'الكل' ? deals : deals.filter(d => d.stage === selectedStage);

  const stages = ['الكل', 'التأهيل', 'الاتصال الأول', 'العرض', 'التفاوض', 'الاتفاقية'];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Stage Filter Chips */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {stages.map(stage => (
          <Chip
            key={stage}
            label={stage}
            onClick={() => setSelectedStage(stage)}
            color={selectedStage === stage ? 'primary' : 'default'}
            variant={selectedStage === stage ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {/* Deals Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f7fa' }}>
              <TableCell>
                <strong>الفرصة</strong>
              </TableCell>
              <TableCell>
                <strong>العميل</strong>
              </TableCell>
              <TableCell align="right">
                <strong>القيمة</strong>
              </TableCell>
              <TableCell>
                <strong>المرحلة</strong>
              </TableCell>
              <TableCell align="center">
                <strong>الاحتمال</strong>
              </TableCell>
              <TableCell>
                <strong>تاريخ الإغلاق</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDeals.map(deal => (
              <TableRow key={deal.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{deal.title}</TableCell>
                <TableCell>{deal.customerName}</TableCell>
                <TableCell align="right">{deal.value.toLocaleString('ar-SA')} ر.س</TableCell>
                <TableCell>
                  <Chip label={deal.stage} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1, height: 6, bgcolor: '#e0e0e0', borderRadius: 3 }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${deal.probability}%`,
                          bgcolor: deal.probability > 80 ? '#4caf50' : '#ff9800',
                          borderRadius: 3,
                        }}
                      />
                    </Box>
                    <Typography variant="caption">{deal.probability}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>{deal.expectedCloseDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// ============================================
// 📈 Pipeline Tab Component
// ============================================

const PipelineTab = ({ pipeline }) => {
  if (!pipeline || !pipeline.pipeline) return <Typography>جاري التحميل...</Typography>;

  return (
    <Grid container spacing={2}>
      {pipeline.pipeline.map((stage, idx) => (
        <Grid item xs={12} sm={6} md={4} key={idx}>
          <Card sx={{ borderRadius: 2, border: '2px solid #e0e0e0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {stage.name}
                </Typography>
                <Chip label={`${stage.count} فرصة`} size="small" color="primary" />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  القيمة الإجمالية
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f766e' }}>
                  {stage.value.toLocaleString('ar-SA')} ر.س
                </Typography>
              </Box>

              <LinearProgress variant="determinate" value={(stage.value / (pipeline.summary.totalValue || 1)) * 100} />

              {stage.deals && stage.deals.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    أمثلة:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                    {stage.deals.slice(0, 2).map((deal, didx) => (
                      <Typography key={didx} variant="caption">
                        • {deal.title}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// ============================================
// 📉 Analytics Tab Component
// ============================================

const AnalyticsTab = ({ analytics }) => {
  if (!analytics) return <Typography>جاري التحميل...</Typography>;

  return (
    <Grid container spacing={3}>
      {/* Sales by Stage Chart */}
      <Grid item xs={12} md={6}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              المبيعات حسب المرحلة
            </Typography>
            {analytics.salesByStage?.map((item, idx) => (
              <Box key={idx} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">{item.stage}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.value.toLocaleString('ar-SA')} ر.س
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(item.value / (analytics.salesByStage?.reduce((s, x) => s + x.value, 0) || 1)) * 100}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {/* Trends */}
      <Grid item xs={12} md={6}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              الاتجاهات
            </Typography>
            <Grid container spacing={1}>
              {analytics.trends &&
                Object.entries(analytics.trends).map(([key, value]) => (
                  <Grid item xs={6} key={key}>
                    <Box sx={{ p: 1.5, bgcolor: '#f5f7fa', borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {key}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                        {value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// ============================================
// ✏️ Edit Dialog Component
// ============================================

const EditCustomerDialog = ({ open, mode, customer, onClose }) => {
  const [formData, setFormData] = useState(customer || {});

  useEffect(() => {
    setFormData(customer || {});
  }, [customer]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    console.log('Saving customer:', formData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'إضافة عميل جديد' : 'تعديل بيانات العميل'}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField fullWidth label="اسم الشركة" name="name" value={formData.name || ''} onChange={handleChange} margin="normal" />
        <TextField
          fullWidth
          label="البريد الإلكتروني"
          name="email"
          type="email"
          value={formData.email || ''}
          onChange={handleChange}
          margin="normal"
        />
        <TextField fullWidth label="رقم الهاتف" name="phone" value={formData.phone || ''} onChange={handleChange} margin="normal" />
        <FormControl fullWidth margin="normal">
          <InputLabel>التصنيف</InputLabel>
          <Select name="tier" value={formData.tier || ''} label="التصنيف" onChange={handleChange}>
            <MenuItem value="بلاتيني">بلاتيني</MenuItem>
            <MenuItem value="ذهبي">ذهبي</MenuItem>
            <MenuItem value="فضي">فضي</MenuItem>
            <MenuItem value="برونزي">برونزي</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button onClick={handleSave} variant="contained">
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CRMPage;
