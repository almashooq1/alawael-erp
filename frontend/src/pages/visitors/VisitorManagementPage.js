/**
 * Visitor Management Page — صفحة إدارة الزوار
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Avatar,
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
  TextField,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Stack,
  Alert,
  Badge,
} from '@mui/material';
import {
  People as VisitorIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Login as CheckInIcon,
  Logout as CheckOutIcon,
  Edit as EditIcon,
  Today as TodayIcon,
  Badge as BadgeIcon,
  DirectionsCar as CarIcon,
} from '@mui/icons-material';
import visitorsService from '../../services/visitors.service';

const DEMO_VISITORS = [
  {
    _id: '1',
    visitorName: 'محمد أحمد العتيبي',
    idNumber: '1087654321',
    phone: '0551234567',
    purpose: 'زيارة مريض',
    host: 'د. فاطمة الراشد',
    department: 'التأهيل',
    status: 'inside',
    checkInTime: '2026-03-19T09:30:00',
    badge: 'V-001',
    vehiclePlate: 'أ ب ج 1234',
  },
  {
    _id: '2',
    visitorName: 'سارة خالد المطيري',
    idNumber: '1098765432',
    phone: '0559876543',
    purpose: 'اجتماع عمل',
    host: 'أحمد المحمد',
    department: 'الإدارة',
    status: 'inside',
    checkInTime: '2026-03-19T10:00:00',
    badge: 'V-002',
    vehiclePlate: null,
  },
  {
    _id: '3',
    visitorName: 'عبدالله فهد الشمري',
    idNumber: '1076543210',
    phone: '0543217654',
    purpose: 'مقابلة توظيف',
    host: 'خالد السعيد',
    department: 'الموارد البشرية',
    status: 'checked_out',
    checkInTime: '2026-03-19T08:00:00',
    checkOutTime: '2026-03-19T09:45:00',
    badge: 'V-003',
    vehiclePlate: 'د هـ و 5678',
  },
  {
    _id: '4',
    visitorName: 'نورة سعد الحربي',
    idNumber: '1065432109',
    phone: '0567891234',
    purpose: 'تسليم مستندات',
    host: 'محمد العمري',
    department: 'المالية',
    status: 'expected',
    badge: null,
    vehiclePlate: null,
  },
  {
    _id: '5',
    visitorName: 'فهد ناصر الدوسري',
    idNumber: '1054321098',
    phone: '0571234567',
    purpose: 'صيانة أجهزة',
    host: 'مسؤول تقنية المعلومات',
    department: 'تقنية المعلومات',
    status: 'expected',
    badge: null,
    vehiclePlate: 'ح ط ي 9012',
  },
];

const STATUS_CONFIG = {
  expected: { label: 'متوقع', color: 'info' },
  inside: { label: 'داخل المبنى', color: 'success' },
  checked_out: { label: 'غادر', color: 'default' },
  cancelled: { label: 'ملغى', color: 'warning' },
  no_show: { label: 'لم يحضر', color: 'error' },
  blacklisted: { label: 'محظور', color: 'error' },
};

export default function VisitorManagementPage() {
  const [tab, setTab] = useState(0);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await visitorsService.getAll();
      setVisitors(res?.data?.data?.length ? res.data.data : DEMO_VISITORS);
    } catch {
      setVisitors(DEMO_VISITORS);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.data?._id) await visitorsService.update(dialog.data._id, form);
      else await visitorsService.register(form);
      setDialog({ open: false, data: null });
      setForm({});
      fetchData();
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    }
  };

  const handleCheckIn = async id => {
    try {
      await visitorsService.checkIn(id);
      fetchData();
    } catch {
      setError('فشل تسجيل الدخول');
    }
  };

  const handleCheckOut = async id => {
    try {
      await visitorsService.checkOut(id);
      fetchData();
    } catch {
      setError('فشل تسجيل الخروج');
    }
  };

  const openDialog = (data = null) => {
    setDialog({ open: true, data });
    setForm(data || {});
    setError('');
  };

  const inside = visitors.filter(v => v.status === 'inside');
  const expected = visitors.filter(v => v.status === 'expected');
  const checkedOut = visitors.filter(v => v.status === 'checked_out');
  const filtered = tab === 0 ? visitors : tab === 1 ? inside : tab === 2 ? expected : checkedOut;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #4a148c 0%, #6a1b9a 50%, #8e24aa 100%)',
          color: '#fff',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <VisitorIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  إدارة الزوار
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  تسجيل وتتبع الزوار — الدخول والخروج والأمن
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => openDialog()}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  borderRadius: 2,
                }}
              >
                زائر جديد
              </Button>
              <IconButton sx={{ color: '#fff' }} onClick={fetchData}>
                <RefreshIcon />
              </IconButton>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الزوار اليوم',
            value: visitors.length,
            icon: <VisitorIcon />,
            color: '#4a148c',
          },
          {
            label: 'داخل المبنى الآن',
            value: inside.length,
            icon: <BadgeIcon />,
            color: '#4CAF50',
          },
          { label: 'متوقع وصولهم', value: expected.length, icon: <TodayIcon />, color: '#2196F3' },
          { label: 'غادروا', value: checkedOut.length, icon: <CheckOutIcon />, color: '#757575' },
        ].map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ borderRadius: 2.5, textAlign: 'center' }}>
              <CardContent sx={{ py: 2 }}>
                <Avatar
                  sx={{
                    mx: 'auto',
                    mb: 1,
                    bgcolor: s.color + '22',
                    color: s.color,
                    width: 44,
                    height: 44,
                  }}
                >
                  {s.icon}
                </Avatar>
                <Typography variant="h5" fontWeight={700}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, bgcolor: '#fff', borderRadius: 2, boxShadow: 1 }}
      >
        <Tab label={`الكل (${visitors.length})`} />
        <Tab
          label={
            <Badge badgeContent={inside.length} color="success">
              داخل المبنى
            </Badge>
          }
        />
        <Tab label={`متوقع (${expected.length})`} />
        <Tab label={`غادروا (${checkedOut.length})`} />
      </Tabs>

      {/* Table */}
      <Card sx={{ borderRadius: 2 }}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>رقم الهوية</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الغرض</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المستضيف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>البطاقة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المركبة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(v => (
                <TableRow key={v._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {v.visitorName}
                    </Typography>
                  </TableCell>
                  <TableCell>{v.idNumber}</TableCell>
                  <TableCell>{v.purpose}</TableCell>
                  <TableCell>{v.host}</TableCell>
                  <TableCell>{v.department}</TableCell>
                  <TableCell>{v.badge || '—'}</TableCell>
                  <TableCell>
                    {v.vehiclePlate ? (
                      <Chip
                        size="small"
                        icon={<CarIcon />}
                        label={v.vehiclePlate}
                        variant="outlined"
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={STATUS_CONFIG[v.status]?.label}
                      color={STATUS_CONFIG[v.status]?.color}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {v.status === 'expected' && (
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleCheckIn(v._id)}
                          title="تسجيل دخول"
                        >
                          <CheckInIcon fontSize="small" />
                        </IconButton>
                      )}
                      {v.status === 'inside' && (
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => handleCheckOut(v._id)}
                          title="تسجيل خروج"
                        >
                          <CheckOutIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton size="small" onClick={() => openDialog(v)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Dialog */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{dialog.data?._id ? 'تعديل بيانات زائر' : 'تسجيل زائر جديد'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="اسم الزائر"
              value={form.visitorName || ''}
              onChange={e => setForm(p => ({ ...p, visitorName: e.target.value }))}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="رقم الهوية"
                  value={form.idNumber || ''}
                  onChange={e => setForm(p => ({ ...p, idNumber: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="الهاتف"
                  value={form.phone || ''}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="غرض الزيارة"
              value={form.purpose || ''}
              onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="المستضيف"
                  value={form.host || ''}
                  onChange={e => setForm(p => ({ ...p, host: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="القسم"
                  value={form.department || ''}
                  onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="لوحة المركبة (اختياري)"
              value={form.vehiclePlate || ''}
              onChange={e => setForm(p => ({ ...p, vehiclePlate: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialog({ open: false, data: null })}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
