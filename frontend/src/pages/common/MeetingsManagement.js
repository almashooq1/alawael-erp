import React, { useState, useEffect, useCallback } from 'react';
import meetingsService from '../../services/meetings.service';
import { useSocketEvent } from '../../contexts/SocketContext';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Event as MeetingIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  NoteAdd as MinutesIcon,
  People as AttendeesIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors, neutralColors } from '../../theme/palette';
import ConfirmDialog, { useConfirmDialog } from '../../components/common/ConfirmDialog';

const demoMeetings = [
  {
    _id: 'm1',
    title: 'اجتماع الفريق الأسبوعي',
    type: 'recurring',
    date: '2026-02-22',
    time: '09:00',
    duration: 60,
    location: 'قاعة الاجتماعات 1',
    organizer: 'محمد المدير',
    attendeesCount: 8,
    status: 'scheduled',
  },
  {
    _id: 'm2',
    title: 'مراجعة خطة التأهيل',
    type: 'one_time',
    date: '2026-02-23',
    time: '11:00',
    duration: 90,
    location: 'قاعة العروض',
    organizer: 'د. سارة',
    attendeesCount: 5,
    status: 'confirmed',
  },
  {
    _id: 'm3',
    title: 'اجتماع مجلس الإدارة',
    type: 'monthly',
    date: '2026-03-01',
    time: '10:00',
    duration: 120,
    location: 'القاعة الرئيسية',
    organizer: 'المدير العام',
    attendeesCount: 12,
    status: 'scheduled',
  },
  {
    _id: 'm4',
    title: 'تدريب نظام ERP الجديد',
    type: 'one_time',
    date: '2026-02-20',
    time: '14:00',
    duration: 180,
    location: 'قاعة التدريب',
    organizer: 'أحمد IT',
    attendeesCount: 20,
    status: 'completed',
  },
];

const statusMap = {
  scheduled: { label: 'مجدول', color: 'info' },
  confirmed: { label: 'مؤكد', color: 'success' },
  in_progress: { label: 'جارٍ', color: 'warning' },
  completed: { label: 'مكتمل', color: 'default' },
  cancelled: { label: 'ملغى', color: 'error' },
};

export default function MeetingsManagement() {
  const [confirmState, showConfirm] = useConfirmDialog();
  const [meetings, setMeetings] = useState([]);
  const [tab, setTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [minutesDialogOpen, setMinutesDialogOpen] = useState(false);
  const [minutesText, setMinutesText] = useState('');
  const [minutesMeetingId, setMinutesMeetingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '',
    duration: 60,
    location: '',
    agenda: '',
  });
  const showSnackbar = useSnackbar();

  // ─── Real-time meeting events via Socket.IO ────────────────────────
  const handleMeetingUpdate = useCallback(
    data => {
      if (data?.meeting) {
        setMeetings(prev =>
          prev.map(m => (m._id === data.meeting._id ? { ...m, ...data.meeting } : m))
        );
        showSnackbar(`تحديث اجتماع: ${data.meeting.title}`, 'info');
      }
    },
    [showSnackbar]
  );
  const handleRsvpUpdate = useCallback(data => {
    if (data?.meetingId) {
      setMeetings(prev =>
        prev.map(m => {
          if (m._id === data.meetingId && data.attendeesCount != null) {
            return { ...m, attendeesCount: data.attendeesCount };
          }
          return m;
        })
      );
    }
  }, []);
  useSocketEvent('meeting:updated', handleMeetingUpdate);
  useSocketEvent('meeting:rsvp', handleRsvpUpdate);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await meetingsService.getAll();
        setMeetings(res.data || []);
      } catch {
        setMeetings(demoMeetings);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    if (!form.title || !form.date || !form.time) {
      showSnackbar('العنوان والتاريخ والوقت مطلوبة', 'warning');
      return;
    }
    try {
      const res = await meetingsService.create(form);
      setMeetings(prev => [
        ...prev,
        res.data || {
          ...form,
          _id: Date.now().toString(),
          type: 'one_time',
          organizer: 'أنا',
          attendeesCount: 0,
          status: 'scheduled',
        },
      ]);
      showSnackbar('تم إنشاء الاجتماع بنجاح', 'success');
    } catch {
      setMeetings(prev => [
        ...prev,
        {
          ...form,
          _id: Date.now().toString(),
          type: 'one_time',
          organizer: 'أنا',
          attendeesCount: 0,
          status: 'scheduled',
        },
      ]);
      showSnackbar('تم إنشاء الاجتماع محلياً - لم يتصل بالخادم', 'warning');
    }
    setDialogOpen(false);
    setForm({ title: '', date: '', time: '', duration: 60, location: '', agenda: '' });
  };

  const handleDelete = id => {
    showConfirm({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف هذا الاجتماع؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          await meetingsService.delete(id);
          setMeetings(prev => prev.filter(m => m._id !== id));
          showSnackbar('تم حذف الاجتماع', 'success');
        } catch {
          setMeetings(prev => prev.filter(m => m._id !== id));
          showSnackbar('تم الحذف محلياً - لم يتصل بالخادم', 'warning');
        }
      },
    });
  };

  const filtered =
    tab === 0
      ? meetings
      : tab === 1
        ? meetings.filter(m => ['scheduled', 'confirmed'].includes(m.status))
        : meetings.filter(m => m.status === 'completed');

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <MeetingIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              إدارة الاجتماعات
            </Typography>
            <Typography variant="body2">جدولة وتوثيق الاجتماعات</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          <MeetingIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          إدارة الاجتماعات
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          اجتماع جديد
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الاجتماعات', value: meetings.length, color: statusColors.primaryBlue },
          {
            label: 'قادمة',
            value: meetings.filter(m => ['scheduled', 'confirmed'].includes(m.status)).length,
            color: statusColors.successDeep,
          },
          {
            label: 'مكتملة',
            value: meetings.filter(m => m.status === 'completed').length,
            color: neutralColors.textDisabled,
          },
          {
            label: 'إجمالي الحضور',
            value: meetings.reduce((s, m) => s + m.attendeesCount, 0),
            color: statusColors.purple,
          },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: s.color, fontWeight: 'bold' }}>
                  {s.value}
                </Typography>
                <Typography color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="الكل" />
          <Tab label="قادمة" />
          <Tab label="مكتملة" />
        </Tabs>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>العنوان</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>الوقت</TableCell>
              <TableCell>المدة</TableCell>
              <TableCell>المكان</TableCell>
              <TableCell>المنظم</TableCell>
              <TableCell>الحضور</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(m => (
              <TableRow key={m._id}>
                <TableCell sx={{ fontWeight: 'bold' }}>{m.title}</TableCell>
                <TableCell>{m.date}</TableCell>
                <TableCell>{m.time}</TableCell>
                <TableCell>{m.duration} دقيقة</TableCell>
                <TableCell>{m.location}</TableCell>
                <TableCell>{m.organizer}</TableCell>
                <TableCell>
                  <Chip icon={<AttendeesIcon />} label={m.attendeesCount} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={statusMap[m.status]?.label}
                    color={statusMap[m.status]?.color}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="محضر">
                    <IconButton
                      aria-label="إضافة محضر"
                      size="small"
                      color="primary"
                      onClick={() => {
                        setMinutesMeetingId(m._id);
                        setMinutesText('');
                        setMinutesDialogOpen(true);
                      }}
                    >
                      <MinutesIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تعديل">
                    <IconButton
                      aria-label="تعديل الاجتماع"
                      size="small"
                      onClick={() => {
                        setForm({
                          title: m.title,
                          date: m.date,
                          time: m.time,
                          duration: m.duration,
                          location: m.location,
                          agenda: m.agenda || '',
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton
                      aria-label="حذف"
                      size="small"
                      color="error"
                      onClick={() => handleDelete(m._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>اجتماع جديد</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="عنوان الاجتماع"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="التاريخ"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الوقت"
                type="time"
                InputLabelProps={{ shrink: true }}
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
              />
            </Grid>
          </Grid>
          <TextField
            fullWidth
            label="المدة (دقيقة)"
            type="number"
            value={form.duration}
            onChange={e => setForm({ ...form, duration: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="المكان"
            value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="جدول الأعمال"
            value={form.agenda}
            onChange={e => setForm({ ...form, agenda: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog {...confirmState} />

      {/* Minutes Dialog */}
      <Dialog
        open={minutesDialogOpen}
        onClose={() => setMinutesDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إضافة محضر الاجتماع</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="محضر الاجتماع"
            value={minutesText}
            onChange={e => setMinutesText(e.target.value)}
            sx={{ mt: 2 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMinutesDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!minutesText.trim()}
            onClick={async () => {
              try {
                await meetingsService.saveMinutes(minutesMeetingId, { content: minutesText });
                showSnackbar('تم حفظ المحضر', 'success');
                setMinutesDialogOpen(false);
              } catch {
                showSnackbar('خطأ في حفظ المحضر', 'error');
              }
            }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
