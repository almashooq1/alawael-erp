/**
 * 💝 لوحة إدارة التبرعات والرعاية — Donations & Sponsorship Dashboard
 * AlAwael ERP
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Button,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  campaignsService,
  donorsService,
  donationsListService,
  donationsReportsService,
  MOCK_CAMPAIGNS,
  MOCK_DONORS,
  MOCK_DONATIONS,
  MOCK_DONATIONS_DASHBOARD,
} from 'services/donationsService';
import { useSnackbar } from 'contexts/SnackbarContext';

const COLORS = ['#E91E63', '#9C27B0', '#3F51B5', '#009688', '#FF9800', '#795548'];
const formatCurrency = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v);
const campaignCategories = [
  'كفالة تعليمية',
  'بنية تحتية',
  'أجهزة مساعدة',
  'زكاة',
  'مناسبات',
  'تعليم',
  'صحة',
  'أخرى',
];
const _donorTypes = ['فرد', 'شركة', 'مؤسسة خيرية'];
const paymentTypes = ['تحويل بنكي', 'شيك', 'نقدي', 'بطاقة ائتمان'];

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

const EMPTY_CAMPAIGN = {
  name: '',
  description: '',
  targetAmount: 0,
  category: '',
  startDate: '',
  endDate: '',
  status: 'نشطة',
};
const EMPTY_DONATION = { donorId: '', campaignId: '', amount: 0, type: 'تحويل بنكي', notes: '' };

export default function DonationsDashboard() {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(MOCK_DONATIONS_DASHBOARD);
  const [campaigns, setCampaigns] = useState([]);
  const [donors, setDonors] = useState([]);
  const [donations, setDonations] = useState([]);
  const [search, setSearch] = useState('');
  const [_page, _setPage] = useState(0);
  const [_rowsPerPage, _setRowsPerPage] = useState(10);
  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN);
  const [donationFormOpen, setDonationFormOpen] = useState(false);
  const [donationForm, setDonationForm] = useState(EMPTY_DONATION);
  const [selected, setSelected] = useState(null);
  const [_detailOpen, _setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, c, dn, dl] = await Promise.all([
        donationsReportsService.getDashboardStats(),
        campaignsService.getAll(),
        donorsService.getAll(),
        donationsListService.getAll(),
      ]);
      setDashboard(d || MOCK_DONATIONS_DASHBOARD);
      setCampaigns(c || MOCK_CAMPAIGNS);
      setDonors(dn || MOCK_DONORS);
      setDonations(dl || MOCK_DONATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = [
    { label: 'إجمالي التبرعات', value: formatCurrency(dashboard.totalDonations), color: '#E91E63' },
    {
      label: 'تبرعات هذا الشهر',
      value: formatCurrency(dashboard.donationsThisMonth),
      color: '#9C27B0',
    },
    { label: 'عدد المتبرعين', value: dashboard.totalDonors, color: '#3F51B5' },
    { label: 'حملات نشطة', value: dashboard.activeCampaigns, color: '#009688' },
    { label: 'متوسط التبرع', value: formatCurrency(dashboard.avgDonation), color: '#FF9800' },
  ];

  const handleSaveCampaign = async () => {
    if (!campaignForm.name || !campaignForm.category) {
      showSnackbar('يرجى إدخال اسم الحملة والفئة', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (selected?._id) {
        await campaignsService.update(selected._id, campaignForm);
        setCampaigns(prev =>
          prev.map(c => (c._id === selected._id ? { ...c, ...campaignForm } : c))
        );
        showSnackbar('تم تحديث الحملة', 'success');
      } else {
        const nc = {
          ...campaignForm,
          _id: `camp-${Date.now()}`,
          collectedAmount: 0,
          donorsCount: 0,
          createdBy: 'النظام',
        };
        const res = await campaignsService.create(campaignForm);
        setCampaigns(prev => [res || nc, ...prev]);
        showSnackbar('تم إنشاء الحملة', 'success');
      }
      setCampaignFormOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDonation = async () => {
    if (!donationForm.donorId || !donationForm.campaignId || !donationForm.amount) {
      showSnackbar('يرجى إكمال جميع الحقول المطلوبة', 'warning');
      return;
    }
    setLoading(true);
    try {
      const donor = donors.find(d => d._id === donationForm.donorId);
      const campaign = campaigns.find(c => c._id === donationForm.campaignId);
      const nd = {
        ...donationForm,
        _id: `don-${Date.now()}`,
        donorName: donor?.name,
        campaignName: campaign?.name,
        date: new Date().toISOString().split('T')[0],
        receiptNo: `RCP-${Date.now()}`,
        status: 'مؤكد',
      };
      await donationsListService.create(donationForm);
      setDonations(prev => [nd, ...prev]);
      showSnackbar('تم تسجيل التبرع', 'success');
      setDonationFormOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!deleteTarget) return;
    await campaignsService.remove(deleteTarget._id);
    setCampaigns(prev => prev.filter(c => c._id !== deleteTarget._id));
    showSnackbar('تم حذف الحملة', 'info');
    setDeleteOpen(false);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #AD1457 0%, #880E4F 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <CardContent
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              💝 إدارة التبرعات والرعاية
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
              إدارة الحملات والمتبرعين والتقارير المالية
            </Typography>
          </Box>
          <Box>
            <Tooltip title="تحديث">
              <IconButton onClick={load} sx={{ color: 'white', mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDonationFormOpen(true)}
              sx={{ bgcolor: 'white', color: '#880E4F', mr: 1, '&:hover': { bgcolor: '#FCE4EC' } }}
            >
              تسجيل تبرع
            </Button>
            <Button
              variant="outlined"
              startIcon={<CampaignIcon />}
              onClick={() => {
                setCampaignForm(EMPTY_CAMPAIGN);
                setSelected(null);
                setCampaignFormOpen(true);
              }}
              sx={{ borderColor: 'white', color: 'white' }}
            >
              حملة جديدة
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid item xs={6} md key={i}>
            <Card sx={{ borderRadius: 2, borderTop: `3px solid ${k.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                <Typography variant="h5" fontWeight={700} color={k.color}>
                  {k.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {k.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600 } }}
        >
          <Tab label="نظرة عامة" />
          <Tab label="الحملات" />
          <Tab label="المتبرعون" />
          <Tab label="سجل التبرعات" />
        </Tabs>

        {/* Overview */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  اتجاه التبرعات الشهري
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboard.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis />
                    <RTooltip formatter={(v, n) => (n === 'المبلغ' ? formatCurrency(v) : v)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name="المبلغ"
                      stroke="#E91E63"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="donors"
                      name="المتبرعين"
                      stroke="#3F51B5"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  التوزيع حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboard.categoryDistribution}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {dashboard.categoryDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip formatter={v => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  نوع المتبرعين
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboard.donorTypes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis />
                    <RTooltip formatter={v => formatCurrency(v)} />
                    <Bar dataKey="amount" name="المبلغ" fill="#9C27B0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  طرق الدفع
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboard.paymentMethods} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" fontSize={11} width={90} />
                    <RTooltip formatter={v => formatCurrency(v)} />
                    <Bar dataKey="amount" name="المبلغ" fill="#009688" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Campaigns */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {campaigns.map(c => {
                const pct = c.targetAmount
                  ? Math.round((c.collectedAmount / c.targetAmount) * 100)
                  : 0;
                return (
                  <Grid item xs={12} md={6} key={c._id}>
                    <Card sx={{ borderRadius: 2, p: 2, position: 'relative' }}>
                      <Chip
                        size="small"
                        label={c.status}
                        color={
                          c.status === 'نشطة'
                            ? 'success'
                            : c.status === 'مكتملة'
                              ? 'info'
                              : 'default'
                        }
                        sx={{ position: 'absolute', top: 12, left: 12 }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mb: 1 }}>
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setCampaignForm({ ...c });
                              setSelected(c);
                              setCampaignFormOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setDeleteTarget(c);
                              setDeleteOpen(true);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Typography variant="h6" fontWeight={700}>
                        {c.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {c.description}
                      </Typography>
                      <Chip size="small" label={c.category} variant="outlined" sx={{ mb: 1.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {formatCurrency(c.collectedAmount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          من {formatCurrency(c.targetAmount)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(pct, 100)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          mb: 1,
                          bgcolor: '#E0E0E0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: pct >= 100 ? '#43A047' : pct >= 60 ? '#1E88E5' : '#FB8C00',
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          {pct}% محقق
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.donorsCount} متبرع
                        </Typography>
                      </Box>
                      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          📅 {c.startDate} → {c.endDate}
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </TabPanel>

        {/* Donors */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 2 }}>
            <Paper
              sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
            >
              <TextField
                size="small"
                placeholder="بحث في المتبرعين..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{ minWidth: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Paper>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>المتبرع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>إجمالي التبرعات</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>عدد التبرعات</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>آخر تبرع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {donors
                    .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()))
                    .map(d => (
                      <TableRow key={d._id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{ bgcolor: '#E91E6322', color: '#E91E63', width: 32, height: 32 }}
                            >
                              {d.name[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {d.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {d.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={d.type} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="#E91E63">
                            {formatCurrency(d.totalDonations)}
                          </Typography>
                        </TableCell>
                        <TableCell>{d.donationsCount}</TableCell>
                        <TableCell>{d.lastDonation}</TableCell>
                        <TableCell>
                          <Chip size="small" label={d.status} color="success" />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Donations Log */}
        <TabPanel value={tab} index={3}>
          <Box sx={{ p: 2 }}>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>رقم الإيصال</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المتبرع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحملة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المبلغ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>طريقة الدفع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {donations.map(d => (
                    <TableRow key={d._id} hover>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">
                          {d.receiptNo}
                        </Typography>
                      </TableCell>
                      <TableCell>{d.donorName}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{d.campaignName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="#E91E63">
                          {formatCurrency(d.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={d.type} variant="outlined" />
                      </TableCell>
                      <TableCell>{d.date}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={d.status}
                          color={d.status === 'مؤكد' ? 'success' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>
      </Paper>

      {/* Campaign Form */}
      <Dialog
        open={campaignFormOpen}
        onClose={() => setCampaignFormOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {selected ? 'تعديل الحملة' : 'حملة جديدة'}
          <IconButton onClick={() => setCampaignFormOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="اسم الحملة"
                value={campaignForm.name}
                onChange={e => setCampaignForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="الفئة"
                value={campaignForm.category}
                onChange={e => setCampaignForm(p => ({ ...p, category: e.target.value }))}
                required
              >
                {campaignCategories.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="الوصف"
                value={campaignForm.description}
                onChange={e => setCampaignForm(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="المبلغ المستهدف"
                value={campaignForm.targetAmount}
                onChange={e => setCampaignForm(p => ({ ...p, targetAmount: +e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ البداية"
                value={campaignForm.startDate}
                onChange={e => setCampaignForm(p => ({ ...p, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ النهاية"
                value={campaignForm.endDate}
                onChange={e => setCampaignForm(p => ({ ...p, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSaveCampaign}>
            {selected ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Donation Form */}
      <Dialog
        open={donationFormOpen}
        onClose={() => setDonationFormOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          تسجيل تبرع جديد
          <IconButton onClick={() => setDonationFormOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="المتبرع"
                value={donationForm.donorId}
                onChange={e => setDonationForm(p => ({ ...p, donorId: e.target.value }))}
                required
              >
                {donors.map(d => (
                  <MenuItem key={d._id} value={d._id}>
                    {d.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="الحملة"
                value={donationForm.campaignId}
                onChange={e => setDonationForm(p => ({ ...p, campaignId: e.target.value }))}
                required
              >
                {campaigns
                  .filter(c => c.status === 'نشطة')
                  .map(c => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.name}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="المبلغ (ريال)"
                value={donationForm.amount}
                onChange={e => setDonationForm(p => ({ ...p, amount: +e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="طريقة الدفع"
                value={donationForm.type}
                onChange={e => setDonationForm(p => ({ ...p, type: e.target.value }))}
              >
                {paymentTypes.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={donationForm.notes}
                onChange={e => setDonationForm(p => ({ ...p, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDonationFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="secondary" onClick={handleSaveDonation}>
            تسجيل التبرع
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف "{deleteTarget?.name}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDeleteCampaign}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
