import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Delete,
  Phone,
  Email,
  MoreVert,
  TrendingUp,
  People,
  AttachMoney,
  Assessment,
} from '@mui/icons-material';
import api from '../services/api';
import { toast } from 'react-toastify';

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography color="textSecondary" variant="body2" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color={color}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            borderRadius: 2,
            p: 1.5,
          }}
        >
          <Icon sx={{ color: `${color}.main`, fontSize: 28 }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function CRMPage() {
  const [tabValue, setTabValue] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('customer');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'active',
    source: 'website',
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, [tabValue]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tabValue === 0) {
        const response = await api.get('/crm/customers');
        setCustomers(response.data || []);
      } else {
        const response = await api.get('/crm/leads');
        setLeads(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Demo data fallback
      if (tabValue === 0) {
        setCustomers([
          {
            _id: '1',
            name: 'شركة الأوائل للتطوير',
            email: 'contact@alawael.com',
            phone: '+970-59-1234567',
            company: 'شركة الأوائل',
            status: 'active',
            totalPurchases: 45000,
          },
          {
            _id: '2',
            name: 'مؤسسة النجاح',
            email: 'info@success.ps',
            phone: '+970-59-7654321',
            company: 'مؤسسة النجاح',
            status: 'active',
            totalPurchases: 28000,
          },
        ]);
      } else {
        setLeads([
          {
            _id: '1',
            name: 'محمد أحمد',
            email: 'mohamed@example.com',
            phone: '+970-59-1111111',
            source: 'website',
            status: 'new',
            score: 85,
          },
          {
            _id: '2',
            name: 'سارة خالد',
            email: 'sarah@example.com',
            phone: '+970-59-2222222',
            source: 'referral',
            status: 'contacted',
            score: 72,
          },
        ]);
      }
    }
    setLoading(false);
  };

  const handleOpenDialog = (type) => {
    setDialogType(type);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      status: 'active',
      source: 'website',
    });
  };

  const handleSubmit = async () => {
    try {
      const endpoint = dialogType === 'customer' ? '/crm/customers' : '/crm/leads';
      await api.post(endpoint, formData);
      toast.success(`تم إضافة ${dialogType === 'customer' ? 'العميل' : 'العميل المحتمل'} بنجاح`);
      handleCloseDialog();
      fetchData();
    } catch (error) {
      toast.error('فشلت عملية الإضافة');
    }
  };

  const handleMenuClick = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const filteredData = tabValue === 0
    ? customers.filter((c) =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : leads.filter((l) =>
        l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const stats = [
    {
      title: 'إجمالي العملاء',
      value: customers.length || '156',
      icon: People,
      color: 'primary',
      subtitle: '+12 هذا الشهر',
    },
    {
      title: 'العملاء المحتملون',
      value: leads.length || '43',
      icon: TrendingUp,
      color: 'success',
      subtitle: '+8 جديد',
    },
    {
      title: 'المبيعات (الشهر)',
      value: '₪125,450',
      icon: AttachMoney,
      color: 'warning',
      subtitle: '+18% عن الشهر السابق',
    },
    {
      title: 'معدل التحويل',
      value: '32%',
      icon: Assessment,
      color: 'info',
      subtitle: '+5% تحسن',
    },
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          إدارة علاقات العملاء (CRM)
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog(tabValue === 0 ? 'customer' : 'lead')}
        >
          {tabValue === 0 ? 'إضافة عميل' : 'إضافة عميل محتمل'}
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="العملاء" />
            <Tab label="العملاء المحتملون" />
          </Tabs>
        </Box>

        <TextField
          fullWidth
          placeholder={tabValue === 0 ? 'بحث عن عميل...' : 'بحث عن عميل محتمل...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الاسم</TableCell>
                <TableCell>البريد الإلكتروني</TableCell>
                <TableCell>الهاتف</TableCell>
                {tabValue === 0 ? (
                  <>
                    <TableCell>الشركة</TableCell>
                    <TableCell>المشتريات</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>المصدر</TableCell>
                    <TableCell>النقاط</TableCell>
                  </>
                )}
                <TableCell>الحالة</TableCell>
                <TableCell>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Email fontSize="small" color="action" />
                      {item.email}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Phone fontSize="small" color="action" />
                      {item.phone}
                    </Box>
                  </TableCell>
                  {tabValue === 0 ? (
                    <>
                      <TableCell>{item.company}</TableCell>
                      <TableCell>₪{item.totalPurchases?.toLocaleString() || '0'}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <Chip label={item.source} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.score || 0}
                          size="small"
                          color={item.score >= 70 ? 'success' : 'default'}
                        />
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <Chip
                      label={item.status === 'active' || item.status === 'contacted' ? 'نشط' : 'جديد'}
                      color={item.status === 'active' || item.status === 'contacted' ? 'success' : 'info'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={(e) => handleMenuClick(e, item)}>
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleMenuClose}>
          <Edit fontSize="small" sx={{ mr: 1 }} /> تعديل
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> حذف
        </MenuItem>
      </Menu>

      {/* Add Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'customer' ? 'إضافة عميل جديد' : 'إضافة عميل محتمل'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الاسم الكامل"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="رقم الهاتف"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            {dialogType === 'customer' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="اسم الشركة"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </Grid>
            )}
            {dialogType === 'lead' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="مصدر العميل"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  SelectProps={{ native: true }}
                >
                  <option value="website">الموقع الإلكتروني</option>
                  <option value="referral">إحالة</option>
                  <option value="social">وسائل التواصل</option>
                  <option value="direct">مباشر</option>
                </TextField>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
