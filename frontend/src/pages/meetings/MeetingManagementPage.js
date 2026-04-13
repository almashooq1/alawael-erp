/**
 * Meeting Management Page — صفحة إدارة الاجتماعات
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import meetingsService from '../../services/meetings.service';

const DEMO_MEETINGS = [
  {
    _id: '1',
    title: 'اجتماع مجلس الإدارة الشهري',
    type: 'board',
    date: '2026-03-25',
    time: '10:00',
    location: 'قاعة المجلس',
    status: 'scheduled',
    attendees: [
      { name: 'أحمد المحمد', role: 'رئيس', rsvp: 'accepted' },
      { name: 'سارة العلي', role: 'عضو', rsvp: 'accepted' },
      { name: 'خالد السعيد', role: 'عضو', rsvp: 'pending' },
    ],
    agenda: ['مراجعة الأداء الربعي', 'خطة التوسع', 'الموافقة على الميزانية'],
    decisions: [],
  },
  {
    _id: '2',
    title: 'اجتماع فريق التأهيل',
    type: 'department',
    date: '2026-03-20',
    time: '09:00',
    location: 'قاعة التأهيل',
    status: 'completed',
    attendees: [
      { name: 'د. فاطمة الراشد', role: 'رئيس القسم', rsvp: 'accepted' },
      { name: 'نورة الحربي', role: 'معالج', rsvp: 'accepted' },
    ],
    agenda: ['تحديث البروتوكولات', 'حالات جديدة'],
    decisions: ['اعتماد بروتوكول العلاج الوظيفي المحدث', 'تعيين معالج إضافي'],
  },
  {
    _id: '3',
    title: 'اجتماع لجنة المشتريات',
    type: 'project',
    date: '2026-03-22',
    time: '14:00',
    location: 'غرفة الاجتماعات 2',
    status: 'scheduled',
    attendees: [
      { name: 'محمد العمري', role: 'رئيس اللجنة', rsvp: 'accepted' },
      { name: 'عبدالله الشهري', role: 'عضو', rsvp: 'declined' },
    ],
    agenda: ['مراجعة العروض', 'الموافقة على أوامر الشراء'],
    decisions: [],
  },
  {
    _id: '4',
    title: 'اجتماع طوارئ — السلامة المهنية',
    type: 'emergency',
    date: '2026-03-18',
    time: '08:00',
    location: 'مكتب المدير العام',
    status: 'completed',
    attendees: [
      { name: 'المدير العام', rsvp: 'accepted' },
      { name: 'مسؤول السلامة', rsvp: 'accepted' },
    ],
    agenda: ['مراجعة حادثة الأمس', 'إجراءات تصحيحية'],
    decisions: ['تحديث خطة الإخلاء', 'تدريب فوري للموظفين'],
  },
  {
    _id: '5',
    title: 'ورشة تدريب — التوثيق الإلكتروني',
    type: 'training',
    date: '2026-03-28',
    time: '11:00',
    location: 'قاعة التدريب',
    status: 'scheduled',
    attendees: [],
    agenda: ['التعريف بالنظام', 'تطبيق عملي'],
    decisions: [],
  },
];

const TYPE_CONFIG = {
  board: { label: 'مجلس إدارة', color: '#1a237e' },
  department: { label: 'قسم', color: '#2196F3' },
  project: { label: 'مشروع', color: '#FF9800' },
  training: { label: 'تدريب', color: '#4CAF50' },
  review: { label: 'مراجعة', color: '#9C27B0' },
  emergency: { label: 'طوارئ', color: '#F44336' },
  other: { label: 'أخرى', color: '#607D8B' },
};
const STATUS_CONFIG = {
  scheduled: { label: 'مجدول', color: 'info' },
  in_progress: { label: 'جارٍ', color: 'warning' },
  completed: { label: 'مكتمل', color: 'success' },
  cancelled: { label: 'ملغى', color: 'error' },
};
const RSVP_CONFIG = {
  accepted: { label: 'مقبول', color: 'success' },
  declined: { label: 'مرفوض', color: 'error' },
  pending: { label: 'معلق', color: 'warning' },
};

export default function MeetingManagementPage() {
  const [tab, setTab] = useState(0);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [_isDemo, setIsDemo] = useState(false);
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [minutesDialog, setMinutesDialog] = useState({ open: false, meeting: null });
  const [form, setForm] = useState({});
  const [minutesForm, setMinutesForm] = useState('');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await meetingsService.getAll();
      if (res?.data?.data?.length) {
        setMeetings(res.data.data);
        setIsDemo(false);
      } else {
        setMeetings(DEMO_MEETINGS);
        setIsDemo(true);
      }
    } catch {
      setMeetings(DEMO_MEETINGS);
      setIsDemo(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.data?._id) await meetingsService.update(dialog.data._id, form);
      else await meetingsService.create(form);
      setDialog({ open: false, data: null });
      setForm({});
      fetchData();
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    }
  };

  const handleSaveMinutes = async () => {
    try {
      await meetingsService.saveMinutes(minutesDialog.meeting._id, { content: minutesForm });
      setMinutesDialog({ open: false, meeting: null });
      fetchData();
    } catch {
      setError('حدث خطأ في حفظ المحضر');
    }
  };

  const openDialog = (data = null) => {
    setDialog({ open: true, data });
    setForm(data || {});
    setError('');
  };

  const scheduled = meetings.filter(m => m.status === 'scheduled');
  const completed = meetings.filter(m => m.status === 'completed');
  const filtered = tab === 0 ? meetings : tab === 1 ? scheduled : completed;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #00695c 0%, #00897b 50%, #26a69a 100%)',
          color: '#fff',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <MeetingIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  إدارة الاجتماعات
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  جدولة الاجتماعات ومتابعة القرارات والمحاضر
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
                اجتماع جديد
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
            label: 'إجمالي الاجتماعات',
            value: meetings.length,
            icon: <MeetingIcon />,
            color: '#00695c',
          },
          {
            label: 'اجتماعات مجدولة',
            value: scheduled.length,
            icon: <CalendarIcon />,
            color: '#2196F3',
          },
          { label: 'مكتملة', value: completed.length, icon: <RSVPIcon />, color: '#4CAF50' },
          {
            label: 'القرارات المتخذة',
            value: meetings.reduce((s, m) => s + (m.decisions?.length || 0), 0),
            icon: <MinutesIcon />,
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
        <Tab
          label={`جميع الاجتماعات (${meetings.length})`}
          icon={<MeetingIcon />}
          iconPosition="start"
        />
        <Tab label={`القادمة (${scheduled.length})`} icon={<CalendarIcon />} iconPosition="start" />
        <Tab label={`المكتملة (${completed.length})`} icon={<RSVPIcon />} iconPosition="start" />
      </Tabs>

      {/* Table */}
      <Card sx={{ borderRadius: 2 }}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 700 }}>الاجتماع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الوقت</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المكان</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحضور</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>القرارات</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(m => (
                <TableRow key={m._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {m.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={TYPE_CONFIG[m.type]?.label || m.type}
                      sx={{
                        bgcolor: (TYPE_CONFIG[m.type]?.color || '#666') + '22',
                        color: TYPE_CONFIG[m.type]?.color,
                      }}
                    />
                  </TableCell>
                  <TableCell>{m.date}</TableCell>
                  <TableCell>{m.time}</TableCell>
                  <TableCell>{m.location}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={-1}>
                      {(m.attendees || []).slice(0, 3).map((a, i) => (
                        <Chip
                          key={i}
                          size="small"
                          label={RSVP_CONFIG[a.rsvp]?.label}
                          color={RSVP_CONFIG[a.rsvp]?.color}
                          sx={{ fontSize: 10 }}
                        />
                      ))}
                      {(m.attendees?.length || 0) > 3 && (
                        <Chip size="small" label={`+${m.attendees.length - 3}`} />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={STATUS_CONFIG[m.status]?.label}
                      color={STATUS_CONFIG[m.status]?.color}
                    />
                  </TableCell>
                  <TableCell>{m.decisions?.length || 0}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => openDialog(m)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setMinutesDialog({ open: true, meeting: m });
                          setMinutesForm('');
                        }}
                      >
                        <MinutesIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{dialog.data?._id ? 'تعديل اجتماع' : 'اجتماع جديد'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="عنوان الاجتماع"
              value={form.title || ''}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            />
            <TextField
              fullWidth
              select
              label="نوع الاجتماع"
              value={form.type || ''}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            >
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </TextField>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="التاريخ"
                  InputLabelProps={{ shrink: true }}
                  value={form.date || ''}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="الوقت"
                  InputLabelProps={{ shrink: true }}
                  value={form.startTime || ''}
                  onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="المكان"
              value={form.location || ''}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
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

      {/* Minutes Dialog */}
      <Dialog
        open={minutesDialog.open}
        onClose={() => setMinutesDialog({ open: false, meeting: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>محضر اجتماع: {minutesDialog.meeting?.title}</DialogTitle>
        <DialogContent dividers>
          {minutesDialog.meeting?.decisions?.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                القرارات السابقة:
              </Typography>
              {minutesDialog.meeting.decisions.map((d, i) => (
                <Chip
                  key={i}
                  label={d}
                  sx={{ m: 0.5 }}
                  icon={<RSVPIcon />}
                  color="success"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={8}
            label="محضر الاجتماع"
            value={minutesForm}
            onChange={e => setMinutesForm(e.target.value)}
            placeholder="اكتب محضر الاجتماع هنا..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setMinutesDialog({ open: false, meeting: null })}>إلغاء</Button>
          <Button variant="contained" onClick={handleSaveMinutes}>
            حفظ المحضر
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
