/**
 * Facility Management Page — إدارة المرافق
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';

import facilityService from '../../services/facility.service';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import RoomIcon from '@mui/icons-material/Room';
import EditIcon from '@mui/icons-material/Edit';

const DEMO_ROOMS = [
  {
    _id: '1',
    name: 'قاعة الاجتماعات الرئيسية',
    type: 'meeting_room',
    capacity: 30,
    floor: 'الطابق الأول',
    status: 'available',
    equipment: ['بروجكتر', 'سبورة ذكية', 'نظام صوت'],
  },
  {
    _id: '2',
    name: 'غرفة العلاج الطبيعي 1',
    type: 'therapy_room',
    capacity: 5,
    floor: 'الطابق الأرضي',
    status: 'occupied',
    equipment: ['أجهزة علاج طبيعي', 'سرير علاجي'],
  },
  {
    _id: '3',
    name: 'الفصل الدراسي A',
    type: 'classroom',
    capacity: 15,
    floor: 'الطابق الثاني',
    status: 'available',
    equipment: ['سبورة', 'شاشة عرض', 'مكيف'],
  },
  {
    _id: '4',
    name: 'غرفة النطق والتخاطب',
    type: 'therapy_room',
    capacity: 3,
    floor: 'الطابق الأول',
    status: 'under_maintenance',
    equipment: ['أجهزة صوتية', 'مرآة'],
  },
  {
    _id: '5',
    name: 'قاعة التدريب',
    type: 'training_hall',
    capacity: 50,
    floor: 'الطابق الأرضي',
    status: 'available',
    equipment: ['بروجكتر', 'نظام صوت', 'ميكروفون'],
  },
  {
    _id: '6',
    name: 'مختبر الحاسب',
    type: 'lab',
    capacity: 20,
    floor: 'الطابق الثاني',
    status: 'occupied',
    equipment: ['20 حاسب', 'طابعة', 'سبورة ذكية'],
  },
];

const DEMO_MAINTENANCE = [
  {
    _id: '1',
    title: 'صيانة مكيفات الطابق الثاني',
    type: 'hvac',
    room: 'الطابق الثاني — عام',
    priority: 'high',
    status: 'in_progress',
    requestedBy: 'أ. خالد',
    assignedTo: 'شركة التبريد',
    createdAt: '2026-03-15',
    description: 'أعطال متكررة في المكيفات',
  },
  {
    _id: '2',
    title: 'إصلاح أنبوب مياه',
    type: 'plumbing',
    room: 'دورة المياه — الطابق الأول',
    priority: 'high',
    status: 'open',
    requestedBy: 'أ. فهد',
    assignedTo: null,
    createdAt: '2026-03-18',
    description: 'تسرب مياه في دورة المياه',
  },
  {
    _id: '3',
    title: 'استبدال إضاءة',
    type: 'electrical',
    room: 'الممر الرئيسي',
    priority: 'low',
    status: 'completed',
    requestedBy: 'أ. سارة',
    assignedTo: 'فريق الصيانة الداخلي',
    createdAt: '2026-03-10',
    completedAt: '2026-03-12',
    description: 'إضاءة ضعيفة في الممر',
  },
  {
    _id: '4',
    title: 'صيانة دورية — مصعد',
    type: 'general',
    room: 'المصعد الرئيسي',
    priority: 'medium',
    status: 'scheduled',
    requestedBy: 'النظام',
    assignedTo: 'شركة المصاعد',
    createdAt: '2026-03-17',
    description: 'صيانة دورية نصف سنوية',
  },
];

const DEMO_BOOKINGS = [
  {
    _id: '1',
    room: 'قاعة الاجتماعات الرئيسية',
    bookedBy: 'أ. أحمد المحمد',
    date: '2026-03-20',
    startTime: '09:00',
    endTime: '11:00',
    purpose: 'اجتماع مجلس الإدارة',
    status: 'confirmed',
  },
  {
    _id: '2',
    room: 'قاعة التدريب',
    bookedBy: 'أ. سارة المطيري',
    date: '2026-03-20',
    startTime: '13:00',
    endTime: '16:00',
    purpose: 'ورشة تدريبية — الموارد البشرية',
    status: 'confirmed',
  },
  {
    _id: '3',
    room: 'الفصل الدراسي A',
    bookedBy: 'أ. خالد العمري',
    date: '2026-03-21',
    startTime: '08:00',
    endTime: '12:00',
    purpose: 'حصص دراسية',
    status: 'pending',
  },
];

const ROOM_STATUS = {
  available: { label: 'متاح', color: 'success' },
  occupied: { label: 'مشغول', color: 'warning' },
  under_maintenance: { label: 'صيانة', color: 'error' },
  reserved: { label: 'محجوز', color: 'info' },
  closed: { label: 'مغلق', color: 'default' },
};
const MAINT_STATUS = {
  open: { label: 'مفتوح', color: 'info' },
  in_progress: { label: 'قيد التنفيذ', color: 'warning' },
  scheduled: { label: 'مجدول', color: 'primary' },
  completed: { label: 'منتهي', color: 'success' },
};
const PRIORITY_CONFIG = {
  high: { label: 'عالية', color: 'error' },
  medium: { label: 'متوسطة', color: 'warning' },
  low: { label: 'منخفضة', color: 'info' },
};
const ROOM_TYPES = {
  meeting_room: 'قاعة اجتماعات',
  therapy_room: 'غرفة علاج',
  classroom: 'فصل دراسي',
  training_hall: 'قاعة تدريب',
  lab: 'مختبر',
  office: 'مكتب',
};

export default function FacilityManagementPage() {
  const [tab, setTab] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [dialog, setDialog] = useState({ open: false, type: '', data: null });
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, mRes, bRes] = await Promise.all([
        facilityService.getRooms(),
        facilityService.getMaintenanceRequests(),
        facilityService.getBookings(),
      ]);
      setRooms(rRes?.data?.data?.length ? rRes.data.data : DEMO_ROOMS);
      setMaintenance(mRes?.data?.data?.length ? mRes.data.data : DEMO_MAINTENANCE);
      setBookings(bRes?.data?.data?.length ? bRes.data.data : DEMO_BOOKINGS);
      const anyDemo =
        !rRes?.data?.data?.length || !mRes?.data?.data?.length || !bRes?.data?.data?.length;
      setIsDemo(anyDemo);
    } catch {
      setRooms(DEMO_ROOMS);
      setMaintenance(DEMO_MAINTENANCE);
      setBookings(DEMO_BOOKINGS);
      setIsDemo(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.type === 'room') {
        if (dialog.data?._id) await facilityService.updateRoom(dialog.data._id, form);
        else await facilityService.createRoom(form);
      } else if (dialog.type === 'maintenance') {
        if (dialog.data?._id) await facilityService.updateMaintenanceRequest(dialog.data._id, form);
        else await facilityService.createMaintenanceRequest(form);
      } else {
        if (dialog.data?._id) await facilityService.updateBooking(dialog.data._id, form);
        else await facilityService.createBooking(form);
      }
      setDialog({ open: false, type: '', data: null });
      setForm({});
      fetchData();
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    }
  };

  const availableRooms = rooms.filter(r => r.status === 'available').length;
  const openMaintenance = maintenance.filter(
    m => m.status === 'open' || m.status === 'in_progress'
  ).length;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {isDemo && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          البيانات المعروضة تجريبية — سيتم استبدالها تلقائياً عند توفر بيانات حقيقية من الخادم
        </Alert>
      )}
      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #004d40 0%, #00695c 50%, #00897b 100%)',
          color: '#fff',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <FacilityIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  إدارة المرافق
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  الغرف والقاعات — الحجوزات — طلبات الصيانة
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => {
                  setDialog({
                    open: true,
                    type: tab === 0 ? 'room' : tab === 1 ? 'booking' : 'maintenance',
                    data: null,
                  });
                  setForm({});
                }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  borderRadius: 2,
                }}
              >
                {tab === 0 ? 'غرفة جديدة' : tab === 1 ? 'حجز جديد' : 'طلب صيانة'}
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
          { label: 'إجمالي المرافق', value: rooms.length, icon: <RoomIcon />, color: '#004d40' },
          { label: 'المتاحة', value: availableRooms, icon: <AvailableIcon />, color: '#4CAF50' },
          {
            label: 'الحجوزات اليوم',
            value: bookings.length,
            icon: <BookingIcon />,
            color: '#1565c0',
          },
          {
            label: 'طلبات صيانة نشطة',
            value: openMaintenance,
            icon: <MaintenanceIcon />,
            color: '#FF9800',
          },
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
        <Tab label={`المرافق (${rooms.length})`} />
        <Tab label={`الحجوزات (${bookings.length})`} />
        <Tab
          label={
            <Badge badgeContent={openMaintenance} color="warning">
              الصيانة
            </Badge>
          }
        />
      </Tabs>

      {/* Tab 0: Rooms */}
      {tab === 0 && (
        <Grid container spacing={2}>
          {rooms.map(room => (
            <Grid item xs={12} sm={6} md={4} key={room._id}>
              <Card sx={{ borderRadius: 2.5, transition: '0.2s', '&:hover': { boxShadow: 6 } }}>
                <Box
                  sx={{
                    height: 6,
                    background:
                      room.status === 'available'
                        ? 'linear-gradient(90deg,#4CAF50,#81C784)'
                        : room.status === 'maintenance'
                          ? 'linear-gradient(90deg,#f44336,#ef5350)'
                          : 'linear-gradient(90deg,#FF9800,#FFB74D)',
                  }}
                />
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="start">
                    <Typography variant="subtitle1" fontWeight={700}>
                      {room.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={ROOM_STATUS[room.status]?.label}
                      color={ROOM_STATUS[room.status]?.color}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1 }}>
                    <Chip
                      size="small"
                      label={ROOM_TYPES[room.type] || room.type}
                      variant="outlined"
                    />
                    <Chip size="small" label={`${room.capacity} شخص`} variant="outlined" />
                    <Chip size="small" label={room.floor} variant="outlined" />
                  </Stack>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {room.equipment?.map((eq, i) => (
                      <Chip
                        key={i}
                        size="small"
                        label={eq}
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    ))}
                  </Stack>
                  <Box sx={{ mt: 2, textAlign: 'left' }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDialog({ open: true, type: 'room', data: room });
                        setForm(room);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 1: Bookings */}
      {tab === 1 && (
        <Card sx={{ borderRadius: 2 }}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 700 }}>القاعة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحاجز</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الوقت</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الغرض</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map(b => (
                  <TableRow key={b._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {b.room}
                      </Typography>
                    </TableCell>
                    <TableCell>{b.bookedBy}</TableCell>
                    <TableCell>{new Date(b.date).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      {b.startTime} — {b.endTime}
                    </TableCell>
                    <TableCell>{b.purpose}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={b.status === 'confirmed' ? 'مؤكد' : 'بانتظار'}
                        color={b.status === 'confirmed' ? 'success' : 'warning'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Tab 2: Maintenance */}
      {tab === 2 && (
        <Card sx={{ borderRadius: 2 }}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الموقع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الأولوية</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>محول إلى</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {maintenance.map(m => (
                  <TableRow key={m._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {m.title}
                      </Typography>
                    </TableCell>
                    <TableCell>{m.room}</TableCell>
                    <TableCell>{m.type}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={PRIORITY_CONFIG[m.priority]?.label}
                        color={PRIORITY_CONFIG[m.priority]?.color}
                      />
                    </TableCell>
                    <TableCell>{m.assignedTo || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={MAINT_STATUS[m.status]?.label}
                        color={MAINT_STATUS[m.status]?.color}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setDialog({ open: true, type: 'maintenance', data: m });
                          setForm(m);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Dialog */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, type: '', data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialog.data?._id
            ? 'تعديل'
            : dialog.type === 'room'
              ? 'إضافة غرفة'
              : dialog.type === 'booking'
                ? 'حجز جديد'
                : 'طلب صيانة جديد'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialog.type === 'room' && (
              <>
                <TextField
                  fullWidth
                  label="اسم الغرفة / القاعة"
                  value={form.name || ''}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="النوع"
                      value={form.type || ''}
                      onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    >
                      {Object.entries(ROOM_TYPES).map(([k, v]) => (
                        <MenuItem key={k} value={k}>
                          {v}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="السعة"
                      type="number"
                      value={form.capacity || ''}
                      onChange={e => setForm(p => ({ ...p, capacity: +e.target.value }))}
                    />
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  label="الطابق"
                  value={form.floor || ''}
                  onChange={e => setForm(p => ({ ...p, floor: e.target.value }))}
                />
              </>
            )}
            {dialog.type === 'booking' && (
              <>
                <TextField
                  fullWidth
                  select
                  label="القاعة"
                  value={form.room || ''}
                  onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                >
                  {rooms.map(r => (
                    <MenuItem key={r._id} value={r._id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  label="التاريخ"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.date || ''}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="من"
                      type="time"
                      InputLabelProps={{ shrink: true }}
                      value={form.startTime || ''}
                      onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="إلى"
                      type="time"
                      InputLabelProps={{ shrink: true }}
                      value={form.endTime || ''}
                      onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                    />
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  label="الغرض"
                  value={form.purpose || ''}
                  onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
                />
              </>
            )}
            {dialog.type === 'maintenance' && (
              <>
                <TextField
                  fullWidth
                  label="عنوان الطلب"
                  value={form.title || ''}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
                <TextField
                  fullWidth
                  label="الموقع / الغرفة"
                  value={form.room || ''}
                  onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="النوع"
                      value={form.type || 'general'}
                      onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    >
                      <MenuItem value="hvac">تكييف</MenuItem>
                      <MenuItem value="plumbing">سباكة</MenuItem>
                      <MenuItem value="electrical">كهرباء</MenuItem>
                      <MenuItem value="general">عام</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="الأولوية"
                      value={form.priority || 'medium'}
                      onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    >
                      <MenuItem value="high">عالية</MenuItem>
                      <MenuItem value="medium">متوسطة</MenuItem>
                      <MenuItem value="low">منخفضة</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  label="الوصف"
                  multiline
                  rows={2}
                  value={form.description || ''}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialog({ open: false, type: '', data: null })}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
