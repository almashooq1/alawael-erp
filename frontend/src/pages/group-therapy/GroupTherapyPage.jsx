/**
 * GroupTherapyPage — إدارة العلاج الجماعي
 * Manages group therapy programs, sessions, participants, and analytics.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  IconButton,
  Tabs,
  Tab,
  Avatar,
  AvatarGroup,
  Tooltip,
  Divider,
  Stack,
  Badge,
  CircularProgress,
  Collapse,
} from '@mui/material';
import {
  Groups as GroupsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  BarChart as BarChartIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  EventNote as EventNoteIcon,
  Pending as PendingIcon,
  CheckCircle as CheckCircleIcon,
  PlayCircle as PlayCircleIcon,
  Psychology as PsychologyIcon,
  Work as WorkIcon,
  SportsEsports as SportsEsportsIcon,
  Diversity3 as Diversity3Icon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarMonth as CalendarMonthIcon,
  FaceRetouchingNatural as FaceRetouchingNaturalIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import groupTherapyService from 'services/groupTherapyService';

// ── Constants ──────────────────────────────────────────────────────────────────
const PROGRAM_TYPES = {
  SOCIAL: { label: 'اجتماعي', color: '#6366f1', icon: <Diversity3Icon fontSize="small" /> },
  VOCATIONAL: { label: 'مهني', color: '#10b981', icon: <WorkIcon fontSize="small" /> },
  BEHAVIORAL: { label: 'سلوكي', color: '#f59e0b', icon: <PsychologyIcon fontSize="small" /> },
  RECREATIONAL: { label: 'ترفيهي', color: '#ec4899', icon: <SportsEsportsIcon fontSize="small" /> },
};

const PROGRAM_STATUS = {
  ACTIVE: { label: 'نشط', color: 'success' },
  PLANNED: { label: 'مخطط', color: 'info' },
  COMPLETED: { label: 'مكتمل', color: 'default' },
};

const DAYS_AR = {
  Monday: 'الاثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
  Friday: 'الجمعة',
  Saturday: 'السبت',
  Sunday: 'الأحد',
};

const ATTENDANCE_STATUS = {
  PRESENT: { label: 'حاضر', color: '#10b981' },
  ABSENT: { label: 'غائب', color: '#ef4444' },
  EXCUSED: { label: 'معذور', color: '#f59e0b' },
};

// ── KPI Card Component ─────────────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon, color, loading }) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
        border: `1px solid ${color}33`,
        height: '100%',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="text.secondary" mb={0.5}>
              {title}
            </Typography>
            {loading ? (
              <CircularProgress size={24} sx={{ color }} />
            ) : (
              <Typography variant="h4" fontWeight={700} sx={{ color }}>
                {value}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}22`, color, width: 48, height: 48 }}>{icon}</Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Program Type Badge ─────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const cfg = PROGRAM_TYPES[type] || {
    label: type,
    color: '#94a3b8',
    icon: <GroupsIcon fontSize="small" />,
  };
  return (
    <Chip
      icon={cfg.icon}
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: `${cfg.color}22`,
        color: cfg.color,
        border: `1px solid ${cfg.color}44`,
        fontWeight: 600,
        '& .MuiChip-icon': { color: cfg.color },
      }}
    />
  );
}

// ── Program Form Dialog ────────────────────────────────────────────────────────
const DAYS_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EMPTY_FORM = {
  name: '',
  type: 'SOCIAL',
  status: 'PLANNED',
  targets: '',
  scheduleDays: [],
  scheduleTime: '',
};

function ProgramFormDialog({ open, onClose, program, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (program) {
      setForm({
        name: program.name || '',
        type: program.type || 'SOCIAL',
        status: program.status || 'ACTIVE',
        targets: (program.targets || []).join('\n'),
        scheduleDays: program.schedule?.days || [],
        scheduleTime: program.schedule?.time || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [program, open]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('اسم البرنامج مطلوب');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        status: form.status,
        targets: form.targets
          .split('\n')
          .map(t => t.trim())
          .filter(Boolean),
        schedule: { days: form.scheduleDays, time: form.scheduleTime },
      };
      if (program?._id) {
        await groupTherapyService.update(program._id, payload);
      } else {
        await groupTherapyService.create(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {program ? 'تعديل البرنامج' : 'إضافة برنامج جديد'}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2}>
          <TextField
            label="اسم البرنامج"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            fullWidth
            required
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>النوع</InputLabel>
                <Select
                  value={form.type}
                  label="النوع"
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                >
                  {Object.entries(PROGRAM_TYPES).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={form.status}
                  label="الحالة"
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  {Object.entries(PROGRAM_STATUS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <FormControl fullWidth>
            <InputLabel>أيام الجلسات</InputLabel>
            <Select
              multiple
              value={form.scheduleDays}
              label="أيام الجلسات"
              onChange={e => setForm(f => ({ ...f, scheduleDays: e.target.value }))}
              renderValue={selected => selected.map(d => DAYS_AR[d] || d).join('، ')}
            >
              {DAYS_OPTIONS.map(d => (
                <MenuItem key={d} value={d}>
                  {DAYS_AR[d]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="وقت الجلسة"
            type="time"
            value={form.scheduleTime}
            onChange={e => setForm(f => ({ ...f, scheduleTime: e.target.value }))}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="الأهداف العامة (سطر لكل هدف)"
            value={form.targets}
            onChange={e => setForm(f => ({ ...f, targets: e.target.value }))}
            fullWidth
            multiline
            rows={3}
            placeholder="تحسين التواصل الاجتماعي&#10;تطوير مهارات التعاون&#10;..."
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          إلغاء
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Session Log Dialog ─────────────────────────────────────────────────────────
const EMPTY_SESSION = { date: '', topic: '', activities: '' };

function SessionLogDialog({ open, onClose, program, onSaved }) {
  const [form, setForm] = useState(EMPTY_SESSION);
  const [attendance, setAttendance] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && program) {
      setForm({ ...EMPTY_SESSION, date: new Date().toISOString().slice(0, 10) });
      setAttendance(
        (program.students || []).map(s => ({
          student: s._id || s,
          name: s.name || 'مشارك',
          status: 'PRESENT',
          notes: '',
        }))
      );
    }
    setError('');
  }, [open, program]);

  const handleSave = async () => {
    if (!form.date) {
      setError('التاريخ مطلوب');
      return;
    }
    setSaving(true);
    try {
      await groupTherapyService.logSession(program._id, {
        date: form.date,
        topic: form.topic,
        activities: form.activities
          .split('\n')
          .map(a => a.trim())
          .filter(Boolean),
        attendance: attendance.map(a => ({ student: a.student, status: a.status, notes: a.notes })),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>تسجيل جلسة جديدة</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="التاريخ"
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="موضوع الجلسة"
                value={form.topic}
                onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                fullWidth
              />
            </Grid>
          </Grid>
          <TextField
            label="الأنشطة (سطر لكل نشاط)"
            value={form.activities}
            onChange={e => setForm(f => ({ ...f, activities: e.target.value }))}
            fullWidth
            multiline
            rows={2}
          />
          {attendance.length > 0 && (
            <Box>
              <Typography variant="subtitle2" mb={1} fontWeight={600}>
                الحضور والغياب
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>المشارك</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell>ملاحظة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendance.map((a, idx) => (
                      <TableRow key={a.student}>
                        <TableCell>{a.name}</TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            value={a.status}
                            onChange={e =>
                              setAttendance(prev =>
                                prev.map((x, i) =>
                                  i === idx ? { ...x, status: e.target.value } : x
                                )
                              )
                            }
                          >
                            {Object.entries(ATTENDANCE_STATUS).map(([k, v]) => (
                              <MenuItem key={k} value={k}>
                                {v.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={a.notes}
                            onChange={e =>
                              setAttendance(prev =>
                                prev.map((x, i) =>
                                  i === idx ? { ...x, notes: e.target.value } : x
                                )
                              )
                            }
                            placeholder="اختياري"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          إلغاء
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'حفظ الجلسة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Program Detail Panel ───────────────────────────────────────────────────────
function ProgramDetailPanel({ program, onClose, onEdit, onSessionLogged }) {
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!program?._id) return;
    setLoadingSessions(true);
    try {
      const res = await groupTherapyService.getSessions(program._id);
      setSessions((res.data?.data || []).slice().reverse());
    } catch (_e) {
      // non-fatal
    } finally {
      setLoadingSessions(false);
    }
  }, [program?._id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  if (!program) return null;
  const type = PROGRAM_TYPES[program.type] || { label: program.type, color: '#94a3b8' };

  return (
    <Card sx={{ borderRadius: 3, border: `2px solid ${type.color}44` }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: `${type.color}22`, color: type.color, width: 44, height: 44 }}>
              {type.icon || <GroupsIcon />}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {program.name}
              </Typography>
              <Box display="flex" gap={1} mt={0.5}>
                <TypeBadge type={program.type} />
                <Chip
                  size="small"
                  label={PROGRAM_STATUS[program.status]?.label || program.status}
                  color={PROGRAM_STATUS[program.status]?.color || 'default'}
                />
              </Box>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title="تعديل">
              <IconButton onClick={onEdit} size="small">
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="إغلاق">
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Schedule & Supervisor */}
        <Grid container spacing={2} mb={2}>
          {program.schedule?.days?.length > 0 && (
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarMonthIcon fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    الجدول
                  </Typography>
                  <Typography variant="body2">
                    {program.schedule.days.map(d => DAYS_AR[d] || d).join('، ')}
                    {program.schedule.time ? ` — ${program.schedule.time}` : ''}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}
          {program.supervisor && (
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <PersonIcon fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    المشرف
                  </Typography>
                  <Typography variant="body2">
                    {program.supervisor?.name || program.supervisor}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>

        {/* Targets */}
        {program.targets?.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              الأهداف العامة
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {program.targets.map((t, i) => (
                <Chip key={i} label={t} size="small" variant="outlined" />
              ))}
            </Stack>
          </Box>
        )}

        {/* Students */}
        <Box mb={2}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle2" fontWeight={600}>
              المشاركون ({program.students?.length || 0})
            </Typography>
          </Box>
          {program.students?.length > 0 ? (
            <AvatarGroup max={8} sx={{ justifyContent: 'flex-start' }}>
              {program.students.map((s, i) => (
                <Tooltip key={i} title={s?.name || 'مشارك'}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>
                    {(s?.name || 'م')[0]}
                  </Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>
          ) : (
            <Typography variant="body2" color="text.secondary">
              لا يوجد مشاركون بعد
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Sessions */}
        <Box>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={1}
            sx={{ cursor: 'pointer' }}
            onClick={() => setExpanded(e => !e)}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              الجلسات ({sessions.length})
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Button
                size="small"
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={e => {
                  e.stopPropagation();
                  setSessionDialogOpen(true);
                }}
              >
                جلسة جديدة
              </Button>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </Box>
          </Box>
          <Collapse in={expanded}>
            {loadingSessions ? (
              <LinearProgress />
            ) : sessions.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                لم تُسجَّل أي جلسات بعد
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>التاريخ</TableCell>
                      <TableCell>الموضوع</TableCell>
                      <TableCell>الحضور</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessions.slice(0, 10).map((s, i) => {
                      const present = (s.attendance || []).filter(
                        a => a.status === 'PRESENT'
                      ).length;
                      const total = (s.attendance || []).length;
                      return (
                        <TableRow key={i} hover>
                          <TableCell>{new Date(s.date).toLocaleDateString('ar-SA')}</TableCell>
                          <TableCell>{s.topic || '—'}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Typography variant="body2">
                                {present}/{total}
                              </Typography>
                              {total > 0 && (
                                <LinearProgress
                                  variant="determinate"
                                  value={(present / total) * 100}
                                  sx={{ width: 60, borderRadius: 1 }}
                                  color={present / total >= 0.8 ? 'success' : 'warning'}
                                />
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Collapse>
        </Box>
      </CardContent>

      <SessionLogDialog
        open={sessionDialogOpen}
        onClose={() => setSessionDialogOpen(false)}
        program={program}
        onSaved={() => {
          loadSessions();
          if (onSessionLogged) onSessionLogged();
        }}
      />
    </Card>
  );
}

// ── Dashboard Tab ──────────────────────────────────────────────────────────────
function DashboardTab({ programs, loading }) {
  const active = programs.filter(p => p.status === 'ACTIVE').length;
  const planned = programs.filter(p => p.status === 'PLANNED').length;
  const completed = programs.filter(p => p.status === 'COMPLETED').length;
  const totalParticipants = programs.reduce((acc, p) => acc + (p.students?.length || 0), 0);
  const totalSessions = programs.reduce((acc, p) => acc + (p.sessions?.length || 0), 0);

  const typeData = Object.entries(PROGRAM_TYPES)
    .map(([k, v]) => ({
      name: v.label,
      value: programs.filter(p => p.type === k).length,
      color: v.color,
    }))
    .filter(d => d.value > 0);

  const statusData = [
    { name: 'نشط', value: active, fill: '#10b981' },
    { name: 'مخطط', value: planned, fill: '#3b82f6' },
    { name: 'مكتمل', value: completed, fill: '#94a3b8' },
  ].filter(d => d.value > 0);

  const recentPrograms = programs
    .filter(p => p.status === 'ACTIVE')
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <Box>
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={6} sm={3}>
          <KpiCard
            title="البرامج النشطة"
            value={active}
            icon={<PlayCircleIcon />}
            color="#10b981"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard
            title="إجمالي المشاركين"
            value={totalParticipants}
            icon={<PersonIcon />}
            color="#6366f1"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard
            title="الجلسات المسجلة"
            value={totalSessions}
            icon={<EventNoteIcon />}
            color="#f59e0b"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard
            title="البرامج المخططة"
            value={planned}
            icon={<PendingIcon />}
            color="#3b82f6"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* Type Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                توزيع البرامج حسب النوع
              </Typography>
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {typeData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" height={200}>
                  <Typography color="text.secondary">لا توجد بيانات</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Status Bar Chart */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                حالة البرامج
              </Typography>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <RechartTooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" height={200}>
                  <Typography color="text.secondary">لا توجد بيانات</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Active Programs */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                البرامج النشطة الأخيرة
              </Typography>
              {recentPrograms.length === 0 ? (
                <Alert severity="info">لا توجد برامج نشطة حالياً</Alert>
              ) : (
                <Stack spacing={1.5}>
                  {recentPrograms.map(p => (
                    <Box
                      key={p._id}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: `${PROGRAM_TYPES[p.type]?.color || '#94a3b8'}22`,
                            color: PROGRAM_TYPES[p.type]?.color || '#94a3b8',
                            fontSize: 14,
                          }}
                        >
                          {(p.name || 'ب')[0]}
                        </Avatar>
                        <Box>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            noWrap
                            sx={{ maxWidth: 160 }}
                          >
                            {p.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.students?.length || 0} مشارك
                          </Typography>
                        </Box>
                      </Box>
                      <TypeBadge type={p.type} />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// ── Programs Tab ───────────────────────────────────────────────────────────────
function ProgramsTab({ programs, loading, onRefresh, onSelect, selectedId }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [deleting, setDeleting] = useState(null);

  const filtered = programs.filter(
    p =>
      (filterType === 'ALL' || p.type === filterType) &&
      (filterStatus === 'ALL' || p.status === filterStatus)
  );

  const handleEdit = p => {
    setEditingProgram(p);
    setFormOpen(true);
  };

  const handleDelete = async p => {
    if (!window.confirm(`هل أنت متأكد من حذف برنامج "${p.name}"؟`)) return;
    setDeleting(p._id);
    try {
      await groupTherapyService.remove(p._id);
      onRefresh();
    } catch (_e) {
      // non-fatal
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Box>
      {/* Toolbar */}
      <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>النوع</InputLabel>
          <Select value={filterType} label="النوع" onChange={e => setFilterType(e.target.value)}>
            <MenuItem value="ALL">الكل</MenuItem>
            {Object.entries(PROGRAM_TYPES).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={filterStatus}
            label="الحالة"
            onChange={e => setFilterStatus(e.target.value)}
          >
            <MenuItem value="ALL">الكل</MenuItem>
            {Object.entries(PROGRAM_STATUS).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box flex={1} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingProgram(null);
            setFormOpen(true);
          }}
        >
          إضافة برنامج
        </Button>
      </Box>

      {loading ? (
        <LinearProgress />
      ) : filtered.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          لا توجد برامج تطابق الفلتر المحدد
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(p => {
            const type = PROGRAM_TYPES[p.type] || { color: '#94a3b8' };
            const isSelected = selectedId === p._id;
            return (
              <Grid item xs={12} sm={6} lg={4} key={p._id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    border: `2px solid ${isSelected ? type.color : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { boxShadow: 4, borderColor: `${type.color}88` },
                  }}
                  onClick={() => onSelect(p)}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box
                      display="flex"
                      alignItems="flex-start"
                      justifyContent="space-between"
                      mb={1.5}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: `${type.color}22`,
                            color: type.color,
                            fontSize: 14,
                          }}
                        >
                          {(p.name || 'ب')[0]}
                        </Avatar>
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          noWrap
                          sx={{ maxWidth: 160 }}
                        >
                          {p.name}
                        </Typography>
                      </Box>
                      <Box display="flex" gap={0.5}>
                        <IconButton
                          size="small"
                          onClick={e => {
                            e.stopPropagation();
                            handleEdit(p);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={deleting === p._id}
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(p);
                          }}
                        >
                          {deleting === p._id ? (
                            <CircularProgress size={14} />
                          ) : (
                            <DeleteIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Box>
                    </Box>

                    <Box display="flex" gap={1} flexWrap="wrap" mb={1.5}>
                      <TypeBadge type={p.type} />
                      <Chip
                        size="small"
                        label={PROGRAM_STATUS[p.status]?.label || p.status}
                        color={PROGRAM_STATUS[p.status]?.color || 'default'}
                      />
                    </Box>

                    <Divider sx={{ mb: 1.5 }} />

                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {p.students?.length || 0} مشارك
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <EventNoteIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {p.sessions?.length || 0} جلسة
                          </Typography>
                        </Box>
                      </Grid>
                      {p.schedule?.days?.length > 0 && (
                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {p.schedule.days.map(d => DAYS_AR[d] || d).join('، ')}
                              {p.schedule.time ? ` — ${p.schedule.time}` : ''}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <ProgramFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProgram(null);
        }}
        program={editingProgram}
        onSaved={onRefresh}
      />
    </Box>
  );
}

// ── Sessions Tab ───────────────────────────────────────────────────────────────
function SessionsTab({ programs }) {
  const allSessions = [];
  programs.forEach(p => {
    (p.sessions || []).forEach(s => {
      allSessions.push({ ...s, programName: p.name, programType: p.type });
    });
  });
  allSessions.sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" mb={2}>
        إجمالي الجلسات المسجلة: {allSessions.length}
      </Typography>
      {allSessions.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          لم تُسجَّل أي جلسات بعد
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>التاريخ</TableCell>
                <TableCell>البرنامج</TableCell>
                <TableCell>الموضوع</TableCell>
                <TableCell>الحضور</TableCell>
                <TableCell>الأنشطة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allSessions.slice(0, 50).map((s, i) => {
                const present = (s.attendance || []).filter(a => a.status === 'PRESENT').length;
                const total = (s.attendance || []).length;
                const pct = total > 0 ? Math.round((present / total) * 100) : null;
                return (
                  <TableRow key={i} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(s.date).toLocaleDateString('ar-SA')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <TypeBadge type={s.programType} />
                        <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                          {s.programName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{s.topic || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      {total > 0 ? (
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            size="small"
                            label={`${present}/${total}`}
                            color={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error'}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {pct}%
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {(s.activities || []).length > 0 ? (
                        <Tooltip title={(s.activities || []).join(' ، ')}>
                          <Chip
                            size="small"
                            label={`${s.activities.length} أنشطة`}
                            variant="outlined"
                          />
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

// ── Participants Tab ───────────────────────────────────────────────────────────
function ParticipantsTab({ programs }) {
  const participantMap = {};
  programs.forEach(p => {
    (p.students || []).forEach(s => {
      const id = s._id || s;
      const name = s.name || 'مشارك';
      if (!participantMap[id]) {
        participantMap[id] = { id, name, programs: [], totalSessions: 0, presentSessions: 0 };
      }
      participantMap[id].programs.push({ name: p.name, type: p.type });

      (p.sessions || []).forEach(sess => {
        const record = (sess.attendance || []).find(a => {
          const sid = typeof a.student === 'object' ? a.student?._id : a.student;
          return String(sid) === String(id);
        });
        if (record) {
          participantMap[id].totalSessions++;
          if (record.status === 'PRESENT') participantMap[id].presentSessions++;
        }
      });
    });
  });

  const participants = Object.values(participantMap);

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" mb={2}>
        إجمالي المشاركين: {participants.length}
      </Typography>
      {participants.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          لا يوجد مشاركون مسجلون
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>المشارك</TableCell>
                <TableCell>البرامج</TableCell>
                <TableCell>الجلسات</TableCell>
                <TableCell>نسبة الحضور</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {participants.map(p => {
                const pct =
                  p.totalSessions > 0
                    ? Math.round((p.presentSessions / p.totalSessions) * 100)
                    : null;
                return (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>{p.name[0]}</Avatar>
                        <Typography variant="body2" fontWeight={600}>
                          {p.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5} flexWrap="wrap">
                        {p.programs.map((pr, i) => (
                          <TypeBadge key={i} type={pr.type} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {p.presentSessions} / {p.totalSessions}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {pct !== null ? (
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{ width: 80, borderRadius: 1 }}
                            color={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error'}
                          />
                          <Typography variant="caption" fontWeight={600}>
                            {pct}%
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 0, label: 'لوحة التحكم', icon: <BarChartIcon /> },
  { id: 1, label: 'البرامج', icon: <GroupsIcon /> },
  { id: 2, label: 'الجلسات', icon: <EventNoteIcon /> },
  { id: 3, label: 'المشاركون', icon: <PersonIcon /> },
];

export default function GroupTherapyPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProgram, setSelectedProgram] = useState(null);

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await groupTherapyService.getAll({ limit: 100 });
      setPrograms(res.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const handleSelectProgram = async p => {
    // Load full program detail (with populated students & sessions)
    try {
      const res = await groupTherapyService.getById(p._id);
      setSelectedProgram(res.data?.data || p);
    } catch (_e) {
      setSelectedProgram(p);
    }
    setActiveTab(1);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ width: 52, height: 52, bgcolor: '#6366f122', color: '#6366f1' }}>
            <Diversity3Icon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              إدارة العلاج الجماعي
            </Typography>
            <Typography variant="body2" color="text.secondary">
              برامج العلاج الجماعي — اجتماعي · مهني · سلوكي · ترفيهي
            </Typography>
          </Box>
        </Box>
        <Badge badgeContent={programs.filter(p => p.status === 'ACTIVE').length} color="success">
          <Chip label="نشط" color="success" variant="outlined" />
        </Badge>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => {
            setActiveTab(v);
            if (v !== 1) setSelectedProgram(null);
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map(t => (
            <Tab
              key={t.id}
              icon={t.icon}
              iconPosition="start"
              label={t.label}
              sx={{ fontWeight: 600, minHeight: 48 }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && <DashboardTab programs={programs} loading={loading} />}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={selectedProgram ? 7 : 12}>
            <ProgramsTab
              programs={programs}
              loading={loading}
              onRefresh={loadPrograms}
              onSelect={handleSelectProgram}
              selectedId={selectedProgram?._id}
            />
          </Grid>
          {selectedProgram && (
            <Grid item xs={12} md={5}>
              <ProgramDetailPanel
                program={selectedProgram}
                onClose={() => setSelectedProgram(null)}
                onEdit={() => {
                  /* handled inside ProgramsTab */
                }}
                onSessionLogged={loadPrograms}
              />
            </Grid>
          )}
        </Grid>
      )}

      {activeTab === 2 && <SessionsTab programs={programs} />}

      {activeTab === 3 && <ParticipantsTab programs={programs} />}
    </Container>
  );
}
