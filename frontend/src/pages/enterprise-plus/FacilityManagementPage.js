/**
 * Facility & Real Estate Management — إدارة المرافق والعقارات
 * Facilities, Space Bookings, Lease Contracts, Utility Readings
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  IconButton,
  Chip,
  Avatar,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  MenuItem,
  Tab,
  Tabs,
  Card,
  CardContent,
  LinearProgress,
  Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BuildingIcon,
  MeetingRoom as RoomIcon,
  Description as LeaseIcon,
  ElectricBolt as UtilityIcon,
  Close as CloseIcon,
  LocationOn as LocationIcon,
  CheckCircle as ActiveIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import * as svc from '../../services/enterpriseProPlus.service';

const FACILITY_TYPES = {
  building: 'مبنى',
  floor: 'طابق',
  wing: 'جناح',
  room: 'غرفة',
  parking: 'موقف',
  outdoor: 'خارجي',
  warehouse: 'مستودع',
  lab: 'مختبر',
};
const FACILITY_STATUSES = {
  active: 'نشط',
  under_maintenance: 'تحت الصيانة',
  closed: 'مغلق',
  planned: 'مخطط',
};
const BOOKING_PURPOSES = {
  meeting: 'اجتماع',
  training: 'تدريب',
  event: 'فعالية',
  interview: 'مقابلة',
  workshop: 'ورشة عمل',
  other: 'أخرى',
};
const LEASE_TYPES = { lease: 'إيجار', rent: 'استئجار', own: 'ملكية', sublease: 'تأجير فرعي' };
const UTILITY_TYPES = {
  electricity: 'كهرباء',
  water: 'مياه',
  gas: 'غاز',
  internet: 'إنترنت',
  hvac: 'تكييف',
  sewage: 'صرف صحي',
};
const UTILITY_COLORS = {
  electricity: '#ffc107',
  water: '#2196f3',
  gas: '#ff5722',
  internet: '#9c27b0',
  hvac: '#00bcd4',
  sewage: '#795548',
};

export default function FacilityManagementPage() {
  const showSnackbar = useSnackbar();
  const [tab, setTab] = useState(0);
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [leases, setLeases] = useState([]);
  const [utilities, setUtilities] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [facilityDialog, setFacilityDialog] = useState(false);
  const [bookingDialog, setBookingDialog] = useState(false);
  const [leaseDialog, setLeaseDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [f, b, l, u, s] = await Promise.all([
        svc.getFacilities().then(r => r.data?.data || []),
        svc.getSpaceBookings().then(r => r.data?.data || []),
        svc.getLeaseContracts().then(r => r.data?.data || []),
        svc.getUtilityReadings().then(r => r.data?.data || []),
        svc.getFacilityStatistics().then(r => r.data?.data || {}),
      ]);
      setFacilities(f);
      setBookings(b);
      setLeases(l);
      setUtilities(u);
      setStats(s);
    } catch {
      showSnackbar('خطأ في تحميل البيانات', 'error');
    }
    setLoading(false);
  }, [showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveFacility = async formData => {
    try {
      if (editItem?._id) {
        await svc.updateFacility(editItem._id, formData);
        showSnackbar('تم التحديث', 'success');
      } else {
        await svc.createFacility(formData);
        showSnackbar('تم الإنشاء', 'success');
      }
      setFacilityDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleDeleteFacility = async id => {
    try {
      await svc.deleteFacility(id);
      showSnackbar('تم الحذف', 'success');
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleSaveBooking = async formData => {
    try {
      if (editItem?._id) {
        await svc.updateSpaceBooking(editItem._id, formData);
      } else {
        await svc.createSpaceBooking(formData);
      }
      showSnackbar('تم الحفظ', 'success');
      setBookingDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleSaveLease = async formData => {
    try {
      if (editItem?._id) {
        await svc.updateLeaseContract(editItem._id, formData);
      } else {
        await svc.createLeaseContract(formData);
      }
      showSnackbar('تم الحفظ', 'success');
      setLeaseDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const statCards = [
    {
      label: 'إجمالي المرافق',
      value: stats.totalFacilities || 0,
      color: '#1976d2',
      icon: <BuildingIcon />,
    },
    { label: 'مرافق نشطة', value: stats.active || 0, color: '#2e7d32', icon: <ActiveIcon /> },
    {
      label: 'تحت الصيانة',
      value: stats.underMaintenance || 0,
      color: '#ed6c02',
      icon: <RoomIcon />,
    },
    {
      label: 'عقود إيجار نشطة',
      value: stats.activeLeases || 0,
      color: '#9c27b0',
      icon: <LeaseIcon />,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        إدارة المرافق والعقارات
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        إدارة المباني والحجوزات وعقود الإيجار والمرافق المتكاملة
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRight: `4px solid ${s.color}`,
              }}
            >
              <Avatar sx={{ bgcolor: alpha(s.color, 0.12), color: s.color }}>{s.icon}</Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="المرافق" icon={<BuildingIcon />} iconPosition="start" />
        <Tab label="حجز المساحات" icon={<RoomIcon />} iconPosition="start" />
        <Tab label="عقود الإيجار" icon={<LeaseIcon />} iconPosition="start" />
        <Tab label="استهلاك المرافق" icon={<UtilityIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Facilities */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setFacilityDialog(true);
              }}
            >
              مرفق جديد
            </Button>
          </Box>
          <Grid container spacing={2}>
            {facilities.map(f => (
              <Grid item xs={12} md={6} lg={4} key={f._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {f.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={FACILITY_STATUSES[f.status] || f.status}
                        color={
                          f.status === 'active'
                            ? 'success'
                            : f.status === 'under_maintenance'
                              ? 'warning'
                              : 'default'
                        }
                      />
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<BuildingIcon />}
                        label={FACILITY_TYPES[f.type] || f.type}
                      />
                      {f.capacity && (
                        <Chip size="small" variant="outlined" label={`سعة: ${f.capacity}`} />
                      )}
                      {f.area?.value && (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${f.area.value} ${f.area.unit}`}
                        />
                      )}
                    </Stack>
                    {f.address?.city && (
                      <Typography variant="body2" color="text.secondary">
                        <LocationIcon sx={{ fontSize: 14, mr: 0.5 }} />
                        {f.address.city}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditItem(f);
                          setFacilityDialog(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteFacility(f._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {facilities.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">لا توجد مرافق مسجلة</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Tab 1: Space Bookings */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setBookingDialog(true);
              }}
            >
              حجز جديد
            </Button>
          </Box>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>العنوان</TableCell>
                  <TableCell>المرفق</TableCell>
                  <TableCell>الغرض</TableCell>
                  <TableCell>من</TableCell>
                  <TableCell>إلى</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map(b => (
                  <TableRow key={b._id} hover>
                    <TableCell>{b.title}</TableCell>
                    <TableCell>{b.facility?.name || '-'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={BOOKING_PURPOSES[b.purpose] || b.purpose} />
                    </TableCell>
                    <TableCell>
                      {b.startTime ? new Date(b.startTime).toLocaleDateString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell>
                      {b.endTime ? new Date(b.endTime).toLocaleDateString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          b.status === 'confirmed'
                            ? 'مؤكد'
                            : b.status === 'pending'
                              ? 'معلق'
                              : b.status
                        }
                        color={b.status === 'confirmed' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditItem(b);
                          setBookingDialog(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {bookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      لا توجد حجوزات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Tab 2: Leases */}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setLeaseDialog(true);
              }}
            >
              عقد جديد
            </Button>
          </Box>
          <Grid container spacing={2}>
            {leases.map(l => (
              <Grid item xs={12} md={6} key={l._id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRight: `4px solid ${l.status === 'active' ? '#4caf50' : l.status === 'expired' ? '#f44336' : '#ff9800'}`,
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight={600}>
                      {l.propertyName}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1 }}>
                      <Chip size="small" label={LEASE_TYPES[l.type] || l.type} />
                      <Chip
                        size="small"
                        label={
                          l.status === 'active'
                            ? 'نشط'
                            : l.status === 'expired'
                              ? 'منتهي'
                              : l.status
                        }
                        color={l.status === 'active' ? 'success' : 'error'}
                      />
                    </Stack>
                    {l.monthlyRent?.amount && (
                      <Typography variant="body2">
                        الإيجار الشهري: {l.monthlyRent.amount.toLocaleString()}{' '}
                        {l.monthlyRent.currency}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      من {l.startDate ? new Date(l.startDate).toLocaleDateString('ar-SA') : '-'} إلى{' '}
                      {l.endDate ? new Date(l.endDate).toLocaleDateString('ar-SA') : '-'}
                    </Typography>
                    {l.landlord?.name && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        المؤجر: {l.landlord.name}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditItem(l);
                          setLeaseDialog(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {leases.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">لا توجد عقود</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Tab 3: Utility Readings */}
      {tab === 3 && (
        <Box>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>المرفق</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>القراءة</TableCell>
                  <TableCell>الاستهلاك</TableCell>
                  <TableCell>التكلفة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {utilities.map(u => (
                  <TableRow key={u._id} hover>
                    <TableCell>{u.facility?.name || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={UTILITY_TYPES[u.type] || u.type}
                        sx={{
                          bgcolor: alpha(UTILITY_COLORS[u.type] || '#999', 0.15),
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {u.readingDate ? new Date(u.readingDate).toLocaleDateString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell>{u.currentReading}</TableCell>
                    <TableCell>{u.consumption || '-'}</TableCell>
                    <TableCell>
                      {u.cost?.amount
                        ? `${u.cost.amount.toLocaleString()} ${u.cost.currency}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {utilities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      لا توجد قراءات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Facility Dialog */}
      <Dialog
        open={facilityDialog}
        onClose={() => {
          setFacilityDialog(false);
          setEditItem(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editItem ? 'تعديل المرفق' : 'مرفق جديد'}
          <IconButton
            onClick={() => {
              setFacilityDialog(false);
              setEditItem(null);
            }}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <FacilityForm initial={editItem} onSave={handleSaveFacility} />
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog
        open={bookingDialog}
        onClose={() => {
          setBookingDialog(false);
          setEditItem(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editItem ? 'تعديل الحجز' : 'حجز جديد'}
          <IconButton
            onClick={() => {
              setBookingDialog(false);
              setEditItem(null);
            }}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <BookingForm initial={editItem} facilities={facilities} onSave={handleSaveBooking} />
        </DialogContent>
      </Dialog>

      {/* Lease Dialog */}
      <Dialog
        open={leaseDialog}
        onClose={() => {
          setLeaseDialog(false);
          setEditItem(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editItem ? 'تعديل العقد' : 'عقد جديد'}
          <IconButton
            onClick={() => {
              setLeaseDialog(false);
              setEditItem(null);
            }}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <LeaseForm initial={editItem} onSave={handleSaveLease} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function FacilityForm({ initial, onSave }) {
  const [form, setForm] = useState({ name: '', type: 'building', capacity: '', status: 'active' });
  useEffect(() => {
    if (initial)
      setForm({
        name: initial.name || '',
        type: initial.type || 'building',
        capacity: initial.capacity || '',
        status: initial.status || 'active',
      });
  }, [initial]);
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField fullWidth label="اسم المرفق" value={form.name} onChange={ch('name')} required />
      </Grid>
      <Grid item xs={4}>
        <TextField select fullWidth label="النوع" value={form.type} onChange={ch('type')}>
          {Object.entries(FACILITY_TYPES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          type="number"
          label="السعة"
          value={form.capacity}
          onChange={ch('capacity')}
        />
      </Grid>
      <Grid item xs={4}>
        <TextField select fullWidth label="الحالة" value={form.status} onChange={ch('status')}>
          {Object.entries(FACILITY_STATUSES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" fullWidth onClick={() => onSave(form)}>
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}

function BookingForm({ initial, facilities, onSave }) {
  const [form, setForm] = useState({
    title: '',
    facility: '',
    purpose: 'meeting',
    startTime: '',
    endTime: '',
  });
  useEffect(() => {
    if (initial)
      setForm({
        title: initial.title || '',
        facility: initial.facility?._id || initial.facility || '',
        purpose: initial.purpose || 'meeting',
        startTime: initial.startTime?.slice(0, 16) || '',
        endTime: initial.endTime?.slice(0, 16) || '',
      });
  }, [initial]);
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="عنوان الحجز"
          value={form.title}
          onChange={ch('title')}
          required
        />
      </Grid>
      <Grid item xs={6}>
        <TextField select fullWidth label="المرفق" value={form.facility} onChange={ch('facility')}>
          {facilities.map(f => (
            <MenuItem key={f._id} value={f._id}>
              {f.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={6}>
        <TextField select fullWidth label="الغرض" value={form.purpose} onChange={ch('purpose')}>
          {Object.entries(BOOKING_PURPOSES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={6}>
        <TextField
          fullWidth
          type="datetime-local"
          label="البداية"
          value={form.startTime}
          onChange={ch('startTime')}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          fullWidth
          type="datetime-local"
          label="النهاية"
          value={form.endTime}
          onChange={ch('endTime')}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" fullWidth onClick={() => onSave(form)}>
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}

function LeaseForm({ initial, onSave }) {
  const [form, setForm] = useState({
    propertyName: '',
    type: 'lease',
    startDate: '',
    endDate: '',
    status: 'active',
  });
  useEffect(() => {
    if (initial)
      setForm({
        propertyName: initial.propertyName || '',
        type: initial.type || 'lease',
        startDate: initial.startDate?.slice(0, 10) || '',
        endDate: initial.endDate?.slice(0, 10) || '',
        status: initial.status || 'active',
      });
  }, [initial]);
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="اسم العقار"
          value={form.propertyName}
          onChange={ch('propertyName')}
          required
        />
      </Grid>
      <Grid item xs={6}>
        <TextField select fullWidth label="النوع" value={form.type} onChange={ch('type')}>
          {Object.entries(LEASE_TYPES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={6}>
        <TextField select fullWidth label="الحالة" value={form.status} onChange={ch('status')}>
          <MenuItem value="active">نشط</MenuItem>
          <MenuItem value="expired">منتهي</MenuItem>
          <MenuItem value="terminated">ملغي</MenuItem>
          <MenuItem value="pending_renewal">يحتاج تجديد</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={6}>
        <TextField
          fullWidth
          type="date"
          label="تاريخ البداية"
          value={form.startDate}
          onChange={ch('startDate')}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          fullWidth
          type="date"
          label="تاريخ النهاية"
          value={form.endDate}
          onChange={ch('endDate')}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" fullWidth onClick={() => onSave(form)}>
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}
