/**
 * Family Engagement Page — صفحة التواصل الأسري ومشاركة الأسرة
 *
 * الهدف السريري: ربط الأسرة بالمسار العلاجي للمستفيد —
 * إدارة أفراد الأسرة، تسجيل التواصل، تكليف الواجبات المنزلية، ولوحة المتابعة.
 *
 * يستخدم: familyAPI من services/ddd
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  Tabs,
  Tab,
  IconButton,
  Stack,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  Tooltip,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  FamilyRestroom as FamilyIcon,
  Message as CommIcon,
  Assignment as HomeworkIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  VideoCall as VideoIcon,
  Chat as ChatIcon,
  Home as HomeVisitIcon,
  CheckCircle as DoneIcon,
  HourglassTop as PendingIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { familyAPI } from '../../services/ddd';

// ── Constants ────────────────────────────────────────────────────────────────
const RELATIONSHIP_OPTIONS = [
  { value: 'father', label: 'الأب' },
  { value: 'mother', label: 'الأم' },
  { value: 'guardian', label: 'وليّ الأمر' },
  { value: 'sibling', label: 'الأخ / الأخت' },
  { value: 'grandparent', label: 'الجد / الجدة' },
  { value: 'uncle_aunt', label: 'العم / الخال / العمة / الخالة' },
  { value: 'other', label: 'أخرى' },
];

const COMM_TYPES = [
  { value: 'phone', label: 'مكالمة هاتفية', Icon: PhoneIcon, color: '#4caf50' },
  { value: 'email', label: 'بريد إلكتروني', Icon: EmailIcon, color: '#2196f3' },
  { value: 'video', label: 'مكالمة مرئية', Icon: VideoIcon, color: '#9c27b0' },
  { value: 'whatsapp', label: 'واتساب', Icon: ChatIcon, color: '#25d366' },
  { value: 'home_visit', label: 'زيارة منزلية', Icon: HomeVisitIcon, color: '#ff9800' },
  { value: 'in_person', label: 'حضوري', Icon: PersonIcon, color: '#607d8b' },
];

const COMM_DIRECTIONS = [
  { value: 'outbound', label: 'صادر' },
  { value: 'inbound', label: 'وارد' },
];

const HOMEWORK_TYPES = [
  { value: 'exercise', label: 'تمرين علاجي' },
  { value: 'activity', label: 'نشاط منزلي' },
  { value: 'observation', label: 'ملاحظة وتسجيل' },
  { value: 'reading', label: 'قراءة أو مواد تثقيفية' },
  { value: 'behavior_strategy', label: 'استراتيجية سلوكية' },
  { value: 'other', label: 'أخرى' },
];

const HOMEWORK_STATUS = {
  pending: { label: 'معلّق', color: 'warning', Icon: PendingIcon },
  completed: { label: 'مكتمل', color: 'success', Icon: DoneIcon },
  partial: { label: 'جزئي', color: 'info', Icon: PendingIcon },
  skipped: { label: 'متخطى', color: 'error', Icon: CloseIcon },
};

const GENDER_OPTIONS = [
  { value: 'male', label: 'ذكر' },
  { value: 'female', label: 'أنثى' },
];

const INITIAL_MEMBER_FORM = {
  beneficiaryId: '',
  name: '',
  relationship: 'mother',
  gender: 'female',
  phone: '',
  email: '',
  isPrimaryContact: false,
  communicationPreference: 'phone',
  notes: '',
};

const INITIAL_COMM_FORM = {
  beneficiaryId: '',
  familyMemberId: '',
  type: 'phone',
  direction: 'outbound',
  subject: '',
  summary: '',
  date: new Date().toISOString().slice(0, 10),
  followUpRequired: false,
  followUpDate: '',
};

const INITIAL_HOMEWORK_FORM = {
  beneficiaryId: '',
  type: 'exercise',
  title: '',
  description: '',
  frequency: 'daily',
  dueDate: '',
  instructions: '',
};

const fmtDate = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');
const getCommType = v => COMM_TYPES.find(c => c.value === v);

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, loading: busy }) {
  return (
    <Card sx={{ borderRadius: 2, border: `1px solid ${color}33` }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          {busy ? (
            <CircularProgress size={24} />
          ) : (
            <Typography variant="h4" fontWeight="bold" lineHeight={1}>
              {value ?? 0}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FamilyEngagementPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data
  const [members, setMembers] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [pendingHomework, _setPendingHomework] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);

  // Dialog state
  const [memberDialog, setMemberDialog] = useState(false);
  const [commDialog, setCommDialog] = useState(false);
  const [homeworkDialog, setHomeworkDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState(INITIAL_MEMBER_FORM);
  const [commForm, setCommForm] = useState(INITIAL_COMM_FORM);
  const [homeworkForm, setHomeworkForm] = useState(INITIAL_HOMEWORK_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Filter
  const [filterType, setFilterType] = useState('');
  const [searchBeneficiary, setSearchBeneficiary] = useState('');

  // ── Fetch Dashboard ──────────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await familyAPI.getDashboard({});
      setDashboardData(res?.data?.data || res?.data || null);
    } catch {
      setDashboardData(null);
    }
  }, []);

  // ── Fetch Communications ─────────────────────────────────────────────────────
  const fetchCommunications = useCallback(async () => {
    try {
      const params = {
        limit: 50,
        ...(filterType && { type: filterType }),
      };
      const res = await familyAPI.listCommunications(params);
      const items = res?.data?.data || res?.data?.communications || res?.data || [];
      setCommunications(Array.isArray(items) ? items : []);
    } catch {
      setCommunications([]);
    }
  }, [filterType]);

  // ── Fetch All Data ───────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.allSettled([fetchDashboard(), fetchCommunications()]);
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard, fetchCommunications]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Derived KPIs ─────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const d = dashboardData;
    return {
      totalMembers: d?.totalFamilyMembers ?? members.length,
      totalComms: d?.totalCommunications ?? communications.length,
      pendingFollowUps: d?.pendingFollowUps ?? 0,
      completedHomework: d?.completedHomework ?? 0,
    };
  }, [dashboardData, members.length, communications.length]);

  // ── Member Handlers ──────────────────────────────────────────────────────────
  const handleOpenAddMember = () => {
    setEditingMember(null);
    setMemberForm(INITIAL_MEMBER_FORM);
    setFormError('');
    setMemberDialog(true);
  };

  const handleOpenEditMember = m => {
    setEditingMember(m);
    setMemberForm({
      beneficiaryId: m.beneficiaryId?._id || m.beneficiaryId || '',
      name: m.name || '',
      relationship: m.relationship || 'mother',
      gender: m.gender || 'female',
      phone: m.phone || '',
      email: m.email || '',
      isPrimaryContact: m.isPrimaryContact || false,
      communicationPreference: m.communicationPreference || 'phone',
      notes: m.notes || '',
    });
    setFormError('');
    setMemberDialog(true);
  };

  const handleSaveMember = async () => {
    if (!memberForm.name.trim()) {
      setFormError('الاسم مطلوب');
      return;
    }
    if (!memberForm.beneficiaryId.trim()) {
      setFormError('يرجى إدخال معرّف المستفيد');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingMember) {
        await familyAPI.updateMember(editingMember._id, memberForm);
      } else {
        await familyAPI.addMember(memberForm);
      }
      setMemberDialog(false);
      // Fetch members for the given beneficiary
      const res = await familyAPI.listMembers(memberForm.beneficiaryId);
      const items = res?.data?.data || res?.data || [];
      setMembers(Array.isArray(items) ? items : []);
      fetchDashboard();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // ── Communication Handlers ───────────────────────────────────────────────────
  const handleSaveComm = async () => {
    if (!commForm.subject.trim()) {
      setFormError('الموضوع مطلوب');
      return;
    }
    if (!commForm.beneficiaryId.trim()) {
      setFormError('معرّف المستفيد مطلوب');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await familyAPI.send({
        ...commForm,
        date: commForm.date ? new Date(commForm.date).toISOString() : new Date().toISOString(),
        followUpDate: commForm.followUpDate
          ? new Date(commForm.followUpDate).toISOString()
          : undefined,
      });
      setCommDialog(false);
      fetchCommunications();
      fetchDashboard();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // ── Homework Handlers ────────────────────────────────────────────────────────
  const handleSaveHomework = async () => {
    if (!homeworkForm.title.trim()) {
      setFormError('عنوان الواجب مطلوب');
      return;
    }
    if (!homeworkForm.beneficiaryId.trim()) {
      setFormError('معرّف المستفيد مطلوب');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await familyAPI.send({
        beneficiaryId: homeworkForm.beneficiaryId,
        type: 'in_person',
        direction: 'outbound',
        subject: homeworkForm.title,
        summary: homeworkForm.description,
        homework: [
          {
            type: homeworkForm.type,
            title: homeworkForm.title,
            description: homeworkForm.description,
            frequency: homeworkForm.frequency,
            dueDate: homeworkForm.dueDate
              ? new Date(homeworkForm.dueDate).toISOString()
              : undefined,
            instructions: homeworkForm.instructions,
          },
        ],
      });
      setHomeworkDialog(false);
      fetchCommunications();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const setMemberField = k => e => setMemberForm(f => ({ ...f, [k]: e.target.value }));
  const setCommField = k => e => setCommForm(f => ({ ...f, [k]: e.target.value }));
  const setHomeworkField = k => e => setHomeworkForm(f => ({ ...f, [k]: e.target.value }));

  // ── Filtered communications ───────────────────────────────────────────────────
  const filteredComms = useMemo(() => {
    if (!searchBeneficiary) return communications;
    return communications.filter(
      c =>
        c.beneficiaryId?.name?.toLowerCase().includes(searchBeneficiary.toLowerCase()) ||
        c.beneficiaryId?._id?.includes(searchBeneficiary)
    );
  }, [communications, searchBeneficiary]);

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#e91e63', width: 44, height: 44 }}>
            <FamilyIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              التواصل الأسري
            </Typography>
            <Typography variant="caption" color="text.secondary">
              مشاركة الأسرة في المسار العلاجي — التواصل والواجبات والمتابعة
            </Typography>
          </Box>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchAll} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<DashboardIcon fontSize="small" />} iconPosition="start" label="لوحة المتابعة" />
        <Tab icon={<FamilyIcon fontSize="small" />} iconPosition="start" label="أفراد الأسرة" />
        <Tab
          icon={<CommIcon fontSize="small" />}
          iconPosition="start"
          label={`التواصل (${communications.length})`}
        />
        <Tab
          icon={<HomeworkIcon fontSize="small" />}
          iconPosition="start"
          label="الواجبات المنزلية"
        />
      </Tabs>

      {/* ── TAB 0: Dashboard ── */}
      {tab === 0 && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="أفراد الأسرة المسجلون"
                value={kpis.totalMembers}
                icon={<FamilyIcon />}
                color="#e91e63"
                loading={loading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="تواصل مسجّل"
                value={kpis.totalComms}
                icon={<CommIcon />}
                color="#9c27b0"
                loading={loading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="متابعات معلّقة"
                value={kpis.pendingFollowUps}
                icon={<PendingIcon />}
                color="#ff9800"
                loading={loading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="واجبات مكتملة"
                value={kpis.completedHomework}
                icon={<DoneIcon />}
                color="#4caf50"
                loading={loading}
              />
            </Grid>
          </Grid>

          {/* Recent Communications */}
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  آخر التواصل مع الأسرة
                </Typography>
                <Button size="small" onClick={() => setTab(2)}>
                  عرض الكل
                </Button>
              </Box>
              {communications.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                  لا يوجد تواصل مسجّل بعد
                </Typography>
              ) : (
                <List dense>
                  {communications.slice(0, 6).map((comm, i) => {
                    const ct = getCommType(comm.type);
                    const IconComp = ct?.Icon || CommIcon;
                    return (
                      <Box key={comm._id || i}>
                        {i > 0 && <Divider component="li" />}
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: `${ct?.color}22`, width: 36, height: 36 }}>
                              <IconComp sx={{ color: ct?.color, fontSize: 18 }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={comm.subject || '—'}
                            secondary={`${ct?.label || comm.type} • ${fmtDate(comm.date || comm.createdAt)}`}
                          />
                          <ListItemSecondaryAction>
                            {comm.followUpRequired && !comm.followUpCompleted && (
                              <Chip label="يحتاج متابعة" color="warning" size="small" />
                            )}
                          </ListItemSecondaryAction>
                        </ListItem>
                      </Box>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ── TAB 1: Family Members ── */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddMember}
              sx={{ bgcolor: '#e91e63', '&:hover': { bgcolor: '#c2185b' } }}
            >
              إضافة فرد أسرة
            </Button>
          </Box>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>الاسم</TableCell>
                  <TableCell>صلة القرابة</TableCell>
                  <TableCell>الهاتف</TableCell>
                  <TableCell>البريد</TableCell>
                  <TableCell>وسيلة التواصل المفضلة</TableCell>
                  <TableCell>الجهة الرئيسية</TableCell>
                  <TableCell align="center">تعديل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      ابحث عن مستفيد أو أضف فرد أسرة لعرض البيانات
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map(m => (
                    <TableRow key={m._id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              bgcolor: '#e91e6322',
                              color: '#e91e63',
                              fontSize: 13,
                            }}
                          >
                            {(m.name || '?')[0]}
                          </Avatar>
                          <Typography variant="body2">{m.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {RELATIONSHIP_OPTIONS.find(r => r.value === m.relationship)?.label ||
                            m.relationship}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{m.phone || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{m.email || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            getCommType(m.communicationPreference)?.label ||
                            m.communicationPreference ||
                            '—'
                          }
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {m.isPrimaryContact && <Chip label="رئيسي" color="success" size="small" />}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => handleOpenEditMember(m)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── TAB 2: Communications ── */}
      {tab === 2 && (
        <Box>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 2 }}
            flexWrap="wrap"
            useFlexGap
          >
            <TextField
              size="small"
              placeholder="بحث باسم المستفيد..."
              value={searchBeneficiary}
              onChange={e => setSearchBeneficiary(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>نوع التواصل</InputLabel>
              <Select
                value={filterType}
                onChange={e => {
                  setFilterType(e.target.value);
                  fetchCommunications();
                }}
                label="نوع التواصل"
              >
                <MenuItem value="">الكل</MenuItem>
                {COMM_TYPES.map(c => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setFormError('');
                setCommDialog(true);
              }}
              sx={{ bgcolor: '#9c27b0', '&:hover': { bgcolor: '#7b1fa2' } }}
            >
              تسجيل تواصل
            </Button>
          </Stack>

          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>النوع</TableCell>
                  <TableCell>الموضوع</TableCell>
                  <TableCell>الاتجاه</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>ملخص</TableCell>
                  <TableCell>متابعة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredComms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      لا يوجد تواصل مسجّل
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredComms.map(comm => {
                    const ct = getCommType(comm.type);
                    const IconComp = ct?.Icon || CommIcon;
                    return (
                      <TableRow key={comm._id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Avatar sx={{ width: 24, height: 24, bgcolor: `${ct?.color}22` }}>
                              <IconComp sx={{ color: ct?.color, fontSize: 14 }} />
                            </Avatar>
                            <Typography variant="caption">{ct?.label || comm.type}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {comm.subject}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              COMM_DIRECTIONS.find(d => d.value === comm.direction)?.label ||
                              comm.direction
                            }
                            size="small"
                            color={comm.direction === 'outbound' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {fmtDate(comm.date || comm.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" noWrap sx={{ maxWidth: 180 }}>
                            {comm.summary || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {comm.followUpRequired ? (
                            <Chip
                              label={comm.followUpCompleted ? 'مكتملة' : 'مطلوبة'}
                              color={comm.followUpCompleted ? 'success' : 'warning'}
                              size="small"
                            />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── TAB 3: Homework ── */}
      {tab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setFormError('');
                setHomeworkDialog(true);
              }}
              sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#e65100' } }}
            >
              تكليف واجب منزلي
            </Button>
          </Box>
          <List
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {pendingHomework.length === 0 ? (
              <ListItem sx={{ justifyContent: 'center', py: 5 }}>
                <Typography color="text.secondary">
                  ابحث عن مستفيد لعرض الواجبات المعلّقة، أو أضف واجباً جديداً
                </Typography>
              </ListItem>
            ) : (
              pendingHomework.map((hw, i) => {
                const sc = HOMEWORK_STATUS[hw.status] || HOMEWORK_STATUS.pending;
                const IconComp = sc.Icon;
                return (
                  <Box key={hw._id || i}>
                    {i > 0 && <Divider />}
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: `${sc.color === 'success' ? '#4caf50' : sc.color === 'warning' ? '#ff9800' : '#f44336'}22`,
                          }}
                        >
                          <IconComp color={sc.color} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={hw.title}
                        secondary={`${HOMEWORK_TYPES.find(t => t.value === hw.type)?.label || hw.type} • تاريخ الاستحقاق: ${fmtDate(hw.dueDate)}`}
                      />
                      <ListItemSecondaryAction>
                        <Chip label={sc.label} color={sc.color} size="small" />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </Box>
                );
              })
            )}
          </List>
        </Box>
      )}

      {/* ── Add/Edit Family Member Dialog ── */}
      <Dialog open={memberDialog} onClose={() => setMemberDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">
              {editingMember ? 'تعديل بيانات فرد الأسرة' : 'إضافة فرد أسرة جديد'}
            </Typography>
            <IconButton onClick={() => setMemberDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="معرّف المستفيد *"
                value={memberForm.beneficiaryId}
                onChange={setMemberField('beneficiaryId')}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                size="small"
                label="الاسم الكامل *"
                value={memberForm.name}
                onChange={setMemberField('name')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>الجنس</InputLabel>
                <Select value={memberForm.gender} onChange={setMemberField('gender')} label="الجنس">
                  {GENDER_OPTIONS.map(g => (
                    <MenuItem key={g.value} value={g.value}>
                      {g.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>صلة القرابة</InputLabel>
                <Select
                  value={memberForm.relationship}
                  onChange={setMemberField('relationship')}
                  label="صلة القرابة"
                >
                  {RELATIONSHIP_OPTIONS.map(r => (
                    <MenuItem key={r.value} value={r.value}>
                      {r.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>وسيلة التواصل المفضلة</InputLabel>
                <Select
                  value={memberForm.communicationPreference}
                  onChange={setMemberField('communicationPreference')}
                  label="وسيلة التواصل المفضلة"
                >
                  {COMM_TYPES.map(c => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="رقم الهاتف"
                value={memberForm.phone}
                onChange={setMemberField('phone')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="email"
                label="البريد الإلكتروني"
                value={memberForm.email}
                onChange={setMemberField('email')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="ملاحظات"
                value={memberForm.notes}
                onChange={setMemberField('notes')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSaveMember}
            disabled={saving}
            sx={{ bgcolor: '#e91e63', '&:hover': { bgcolor: '#c2185b' } }}
          >
            {saving ? <CircularProgress size={20} /> : editingMember ? 'حفظ التعديلات' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Log Communication Dialog ── */}
      <Dialog open={commDialog} onClose={() => setCommDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">تسجيل تواصل مع الأسرة</Typography>
            <IconButton onClick={() => setCommDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="معرّف المستفيد *"
                value={commForm.beneficiaryId}
                onChange={setCommField('beneficiaryId')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="تاريخ التواصل"
                value={commForm.date}
                onChange={setCommField('date')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع التواصل</InputLabel>
                <Select value={commForm.type} onChange={setCommField('type')} label="نوع التواصل">
                  {COMM_TYPES.map(c => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الاتجاه</InputLabel>
                <Select
                  value={commForm.direction}
                  onChange={setCommField('direction')}
                  label="الاتجاه"
                >
                  {COMM_DIRECTIONS.map(d => (
                    <MenuItem key={d.value} value={d.value}>
                      {d.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="الموضوع *"
                value={commForm.subject}
                onChange={setCommField('subject')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="ملخص التواصل"
                value={commForm.summary}
                onChange={setCommField('summary')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>يحتاج متابعة؟</InputLabel>
                <Select
                  value={commForm.followUpRequired ? 'yes' : 'no'}
                  onChange={e =>
                    setCommForm(f => ({ ...f, followUpRequired: e.target.value === 'yes' }))
                  }
                  label="يحتاج متابعة؟"
                >
                  <MenuItem value="no">لا</MenuItem>
                  <MenuItem value="yes">نعم</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {commForm.followUpRequired && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="تاريخ المتابعة"
                  value={commForm.followUpDate}
                  onChange={setCommField('followUpDate')}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSaveComm}
            disabled={saving}
            sx={{ bgcolor: '#9c27b0', '&:hover': { bgcolor: '#7b1fa2' } }}
          >
            {saving ? <CircularProgress size={20} /> : 'تسجيل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Assign Homework Dialog ── */}
      <Dialog
        open={homeworkDialog}
        onClose={() => setHomeworkDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">تكليف واجب منزلي</Typography>
            <IconButton onClick={() => setHomeworkDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="معرّف المستفيد *"
                value={homeworkForm.beneficiaryId}
                onChange={setHomeworkField('beneficiaryId')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الواجب</InputLabel>
                <Select
                  value={homeworkForm.type}
                  onChange={setHomeworkField('type')}
                  label="نوع الواجب"
                >
                  {HOMEWORK_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="العنوان *"
                value={homeworkForm.title}
                onChange={setHomeworkField('title')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="الوصف"
                value={homeworkForm.description}
                onChange={setHomeworkField('description')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>التكرار</InputLabel>
                <Select
                  value={homeworkForm.frequency}
                  onChange={setHomeworkField('frequency')}
                  label="التكرار"
                >
                  <MenuItem value="daily">يومي</MenuItem>
                  <MenuItem value="twice_daily">مرتين يومياً</MenuItem>
                  <MenuItem value="3x_week">3 مرات أسبوعياً</MenuItem>
                  <MenuItem value="weekly">أسبوعي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="تاريخ الاستحقاق"
                value={homeworkForm.dueDate}
                onChange={setHomeworkField('dueDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="تعليمات للأسرة"
                value={homeworkForm.instructions}
                onChange={setHomeworkField('instructions')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHomeworkDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSaveHomework}
            disabled={saving}
            sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#e65100' } }}
          >
            {saving ? <CircularProgress size={20} /> : 'تكليف'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
