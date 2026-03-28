/**
 * Complaints Management Page — إدارة الشكاوى والمقترحات
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
  MenuItem,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Stack,
  Alert,
  Badge,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  ReportProblem as ComplaintIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  CheckCircle as ResolvedIcon,
  HourglassTop as PendingIcon,
  Cancel as RejectedIcon,
  Assignment as AssignIcon,
  Lightbulb as SuggestionIcon,
  Chat as ChatIcon,
  PersonOutline as PersonIcon,
} from '@mui/icons-material';
import { complaintsService } from '../../services/complaintsService';

const DEMO_COMPLAINTS = [
  {
    _id: '1',
    subject: 'تأخر في تسليم التقارير الشهرية',
    type: 'complaint',
    source: 'employee',
    category: 'administrative',
    priority: 'high',
    status: 'new',
    submittedBy: 'محمد أحمد',
    department: 'التأهيل',
    assignedTo: 'إدارة الجودة',
    createdAt: '2026-03-15',
    description: 'تأخر واضح في تسليم التقارير الشهرية الخاصة بالتأهيل',
  },
  {
    _id: '2',
    subject: 'اقتراح تحسين نظام الحضور',
    type: 'suggestion',
    source: 'employee',
    category: 'technical',
    priority: 'medium',
    status: 'in_progress',
    submittedBy: 'سارة خالد',
    department: 'الموارد البشرية',
    assignedTo: 'تقنية المعلومات',
    createdAt: '2026-03-12',
    description: 'اقتراح ربط بصمة الحضور بالتطبيق المحمول',
  },
  {
    _id: '3',
    subject: 'شكوى من جودة وجبات المقصف',
    type: 'complaint',
    source: 'employee',
    category: 'service',
    priority: 'medium',
    status: 'resolved',
    submittedBy: 'عبدالله فهد',
    department: 'عام',
    assignedTo: 'إدارة المرافق',
    createdAt: '2026-03-08',
    resolvedAt: '2026-03-11',
    description: 'جودة الوجبات غير مقبولة',
  },
  {
    _id: '4',
    subject: 'طلب توفير مواقف سيارات إضافية',
    type: 'suggestion',
    source: 'employee',
    category: 'other',
    priority: 'low',
    status: 'new',
    submittedBy: 'نورة سعد',
    department: 'المالية',
    assignedTo: null,
    createdAt: '2026-03-17',
    description: 'المواقف الحالية غير كافية',
  },
  {
    _id: '5',
    subject: 'شكوى تأخر صرف البدلات',
    type: 'complaint',
    source: 'employee',
    category: 'financial',
    priority: 'high',
    status: 'in_progress',
    submittedBy: 'فهد ناصر',
    department: 'التعليم',
    assignedTo: 'الإدارة المالية',
    createdAt: '2026-03-14',
    description: 'تأخر صرف بدل النقل لأكثر من شهرين',
  },
  {
    _id: '6',
    subject: 'اقتراح إنشاء صالة رياضية',
    type: 'suggestion',
    source: 'employee',
    category: 'other',
    priority: 'low',
    status: 'rejected',
    submittedBy: 'خالد العتيبي',
    department: 'عام',
    assignedTo: null,
    createdAt: '2026-03-05',
    description: 'إنشاء صالة رياضية للموظفين',
  },
];

const STATUS_CONFIG = {
  new: { label: 'جديدة', color: 'info', icon: <PendingIcon fontSize="small" /> },
  under_review: {
    label: 'قيد المراجعة',
    color: 'secondary',
    icon: <AssignIcon fontSize="small" />,
  },
  in_progress: { label: 'قيد المعالجة', color: 'warning', icon: <AssignIcon fontSize="small" /> },
  escalated: { label: 'مُصعّدة', color: 'error', icon: <PendingIcon fontSize="small" /> },
  resolved: { label: 'تم الحل', color: 'success', icon: <ResolvedIcon fontSize="small" /> },
  rejected: { label: 'مرفوضة', color: 'error', icon: <RejectedIcon fontSize="small" /> },
  closed: { label: 'مغلقة', color: 'default', icon: <ResolvedIcon fontSize="small" /> },
};

const PRIORITY_CONFIG = {
  critical: { label: 'حرجة', color: 'error' },
  high: { label: 'عالية', color: 'error' },
  medium: { label: 'متوسطة', color: 'warning' },
  low: { label: 'منخفضة', color: 'info' },
};

const SOURCE_CONFIG = {
  employee: 'موظف',
  student: 'طالب',
  customer: 'عميل',
  parent: 'ولي أمر',
  other: 'أخرى',
};

const CATEGORY_CONFIG = {
  administrative: 'إدارية',
  technical: 'تقنية',
  financial: 'مالية',
  service: 'خدمات',
  hr: 'موارد بشرية',
  safety: 'سلامة',
  academic: 'أكاديمية',
  other: 'أخرى',
};

const STEPS = ['جديدة', 'قيد المعالجة', 'تم الحل', 'مغلقة'];
const statusToStep = s =>
  ({ new: 0, under_review: 0, in_progress: 1, escalated: 1, resolved: 2, closed: 3, rejected: -1 })[
    s
  ] ?? 0;

export default function ComplaintsManagementPage() {
  const [tab, setTab] = useState(0);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [detailDialog, setDetailDialog] = useState({ open: false, data: null });
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complaintsService.getAll();
      if (res?.data?.data?.length) {
        setComplaints(res.data.data);
        setIsDemo(false);
      } else {
        setComplaints(DEMO_COMPLAINTS);
        setIsDemo(true);
      }
    } catch {
      setComplaints(DEMO_COMPLAINTS);
      setIsDemo(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.data?._id) await complaintsService.update(dialog.data._id, form);
      else await complaintsService.create(form);
      setDialog({ open: false, data: null });
      setForm({});
      fetchData();
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    }
  };

  const openCount = complaints.filter(
    c => c.status === 'new' || c.status === 'under_review'
  ).length;
  const inProgressCount = complaints.filter(c => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'resolved').length;
  const complaintsOnly = complaints.filter(c => c.type === 'complaint');
  const suggestionsOnly = complaints.filter(c => c.type === 'suggestion');

  const filtered =
    tab === 0
      ? complaints
      : tab === 1
        ? complaintsOnly
        : tab === 2
          ? suggestionsOnly
          : tab === 3
            ? complaints.filter(
                c => c.status === 'new' || c.status === 'under_review' || c.status === 'in_progress'
              )
            : complaints.filter(c => c.status === 'resolved' || c.status === 'closed');

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>

      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #b71c1c 0%, #d32f2f 50%, #ef5350 100%)',
          color: '#fff',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <ComplaintIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  إدارة الشكاوى والمقترحات
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  نظام موحد لاستقبال ومعالجة الشكاوى والمقترحات
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => {
                  setDialog({ open: true, data: null });
                  setForm({ type: 'complaint', priority: 'medium', source: 'employee' });
                }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  borderRadius: 2,
                }}
              >
                شكوى / مقترح جديد
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
            label: 'إجمالي الشكاوى',
            value: complaintsOnly.length,
            icon: <ComplaintIcon />,
            color: '#b71c1c',
          },
          {
            label: 'المقترحات',
            value: suggestionsOnly.length,
            icon: <SuggestionIcon />,
            color: '#4CAF50',
          },
          { label: 'مفتوحة', value: openCount, icon: <PendingIcon />, color: '#2196F3' },
          { label: 'قيد المعالجة', value: inProgressCount, icon: <AssignIcon />, color: '#FF9800' },
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
        <Tab label={`الكل (${complaints.length})`} />
        <Tab label={`شكاوى (${complaintsOnly.length})`} />
        <Tab label={`مقترحات (${suggestionsOnly.length})`} />
        <Tab
          label={
            <Badge badgeContent={openCount + inProgressCount} color="warning">
              نشطة
            </Badge>
          }
        />
        <Tab label={`محلولة (${resolvedCount})`} />
      </Tabs>

      {/* Table */}
      <Card sx={{ borderRadius: 2 }}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الأولوية</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>مقدم الشكوى</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>محول إلى</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(c => (
                <TableRow
                  key={c._id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setDetailDialog({ open: true, data: c })}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {c.subject}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={c.type === 'complaint' ? <ComplaintIcon /> : <SuggestionIcon />}
                      label={c.type === 'complaint' ? 'شكوى' : 'مقترح'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={PRIORITY_CONFIG[c.priority]?.label}
                      color={PRIORITY_CONFIG[c.priority]?.color}
                    />
                  </TableCell>
                  <TableCell>{c.submittedBy}</TableCell>
                  <TableCell>{c.assignedTo || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={STATUS_CONFIG[c.status]?.icon}
                      label={STATUS_CONFIG[c.status]?.label}
                      color={STATUS_CONFIG[c.status]?.color}
                    />
                  </TableCell>
                  <TableCell>{new Date(c.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDialog({ open: true, data: c });
                        setForm(c);
                      }}
                    >
                      <ChatIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{detailDialog.data?.subject}</DialogTitle>
        <DialogContent dividers>
          {detailDialog.data && (
            <Stack spacing={2}>
              <Stepper activeStep={statusToStep(detailDialog.data.status)} alternativeLabel>
                {STEPS.map(s => (
                  <Step key={s}>
                    <StepLabel>{s}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Chip
                  label={detailDialog.data.type === 'complaint' ? 'شكوى' : 'مقترح'}
                  color="primary"
                />
                <Chip label={detailDialog.data.category} variant="outlined" />
                <Chip
                  label={PRIORITY_CONFIG[detailDialog.data.priority]?.label}
                  color={PRIORITY_CONFIG[detailDialog.data.priority]?.color}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                <PersonIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} /> مقدم من:{' '}
                {detailDialog.data.submittedBy} — {detailDialog.data.department}
              </Typography>
              <Typography
                variant="body1"
                sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2, lineHeight: 1.8 }}
              >
                {detailDialog.data.description}
              </Typography>
              {detailDialog.data.assignedTo && (
                <Typography variant="body2">
                  محول إلى: <strong>{detailDialog.data.assignedTo}</strong>
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, data: null })}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{dialog.data?._id ? 'تعديل' : 'شكوى / مقترح جديد'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="العنوان"
              value={form.subject || ''}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  select
                  label="النوع"
                  value={form.type || 'complaint'}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                >
                  <MenuItem value="complaint">شكوى</MenuItem>
                  <MenuItem value="suggestion">مقترح</MenuItem>
                  <MenuItem value="grievance">تظلم</MenuItem>
                  <MenuItem value="feedback">ملاحظة</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  select
                  label="المصدر"
                  value={form.source || 'employee'}
                  onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                >
                  {Object.entries(SOURCE_CONFIG).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  select
                  label="الفئة"
                  value={form.category || 'other'}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                >
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
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
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="الوصف"
              multiline
              rows={3}
              value={form.description || ''}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
            {dialog.data?._id && (
              <TextField
                fullWidth
                select
                label="الحالة"
                value={form.status || 'new'}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
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
