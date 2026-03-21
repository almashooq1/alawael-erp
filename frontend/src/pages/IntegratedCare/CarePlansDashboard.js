import { useState, useEffect, useCallback } from 'react';





import { useNavigate } from 'react-router-dom';
import apiClient from 'services/api.client';
import { gradients } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

// --- Sub-components with real API integration ---
const IntegratedCareStats = ({ plans, sessions: _sessions }) => {
  const activePlans = plans.filter(p => p.status === 'ACTIVE' || p.status === 'active').length;
  const draftPlans = plans.filter(p => p.status === 'DRAFT' || p.status === 'draft').length;
  const uniqueStudents = new Set(plans.map(p => p.beneficiary?._id || p.beneficiary)).size;

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <PlanIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4">{plans.length}</Typography>
            <Typography color="text.secondary">إجمالي الخطط</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <CheckIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4">{activePlans}</Typography>
            <Typography color="text.secondary">خطط نشطة</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <PendingIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4">{draftPlans}</Typography>
            <Typography color="text.secondary">مسودات</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <PeopleIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4">{uniqueStudents}</Typography>
            <Typography color="text.secondary">طلاب مسجلين</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const StudentPlansList = ({ plans, loading }) => {
  if (loading)
    return (
      <Box textAlign="center" py={4}>
        <CircularProgress />
      </Box>
    );
  if (!plans.length)
    return (
      <Typography align="center" color="text.secondary" py={4}>
        لا توجد خطط فردية حالياً
      </Typography>
    );

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>الطالب / المستفيد</TableCell>
            <TableCell>نوع الخطة</TableCell>
            <TableCell>تاريخ الإنشاء</TableCell>
            <TableCell>الحالة</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {plans
            .filter(p => p.planType !== 'group')
            .map(p => (
              <TableRow key={p._id}>
                <TableCell>{p.beneficiary?.name || p.studentName || '—'}</TableCell>
                <TableCell>{p.planType || 'فردي'}</TableCell>
                <TableCell>
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar') : '—'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={p.status || 'مسودة'}
                    size="small"
                    color={p.status === 'ACTIVE' || p.status === 'active' ? 'success' : 'default'}
                  />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const GroupProgramsList = ({ plans, loading }) => {
  if (loading)
    return (
      <Box textAlign="center" py={4}>
        <CircularProgress />
      </Box>
    );
  const groupPlans = plans.filter(p => p.planType === 'group');
  if (!groupPlans.length)
    return (
      <Typography align="center" color="text.secondary" py={4}>
        لا توجد برامج جماعية حالياً
      </Typography>
    );

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>اسم البرنامج</TableCell>
            <TableCell>المجال</TableCell>
            <TableCell>عدد المشاركين</TableCell>
            <TableCell>الحالة</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groupPlans.map(p => (
            <TableRow key={p._id}>
              <TableCell>{p.title || p.programName || '—'}</TableCell>
              <TableCell>{p.domain || '—'}</TableCell>
              <TableCell>{p.participants?.length || 0}</TableCell>
              <TableCell>
                <Chip
                  label={p.status || 'مسودة'}
                  size="small"
                  color={p.status === 'ACTIVE' || p.status === 'active' ? 'success' : 'default'}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const RecentSessionsList = ({ sessions, loading }) => {
  if (loading)
    return (
      <Box textAlign="center" py={4}>
        <CircularProgress />
      </Box>
    );
  if (!sessions.length)
    return (
      <Typography align="center" color="text.secondary" py={4}>
        لا توجد جلسات مسجلة
      </Typography>
    );

  return (
    <List>
      {sessions.map(s => (
        <ListItem key={s._id} divider>
          <ListItemText
            primary={s.title || s.type || 'جلسة'}
            secondary={`${s.therapist?.name || '—'} • ${s.createdAt ? new Date(s.createdAt).toLocaleDateString('ar') : '—'}`}
          />
          <Chip label={s.status || 'مكتمل'} size="small" color="primary" />
        </ListItem>
      ))}
    </List>
  );
};
// --------------------------------------------------------

function CarePlansDashboard() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, sessionsRes] = await Promise.allSettled([
        apiClient.get('/integrated-care/plans'),
        apiClient.get('/integrated-care/sessions'),
      ]);
      if (plansRes.status === 'fulfilled') {
        const d = plansRes.value;
        setPlans(Array.isArray(d) ? d : d?.data || []);
      }
      if (sessionsRes.status === 'fulfilled') {
        const d = sessionsRes.value;
        setSessions(Array.isArray(d) ? d : d?.data || []);
      }
    } catch {
      // Keep empty defaults
      showSnackbar('تعذر تحميل بيانات خطط الرعاية', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PlanIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              لوحة خطط الرعاية
            </Typography>
            <Typography variant="body2">متابعة وإدارة خطط الرعاية المتكاملة</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <PlanIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
            نظام الرعاية المتكاملة
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            إدارة الخطط التعليمية والعلاجية ومهارات الحياة في عرض موحد.
          </Typography>
        </div>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SessionIcon />}
            size="large"
            sx={{ mr: 2 }}
            onClick={() => navigate('/integrated-care/session')}
          >
            تسجيل جلسة
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="large"
            onClick={() => navigate('/integrated-care/create')}
          >
            خطة / ملف جديد
          </Button>
        </Box>
      </Box>

      {/* Stats Overview */}
      <IntegratedCareStats plans={plans} sessions={sessions} />

      {/* Main Content */}
      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<SchoolIcon />} label="الخطط الفردية" />
          <Tab icon={<GroupsIcon />} label="البرامج الجماعية" />
          <Tab icon={<SessionIcon />} label="الجلسات الأخيرة" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && <StudentPlansList plans={plans} loading={loading} />}
          {activeTab === 1 && <GroupProgramsList plans={plans} loading={loading} />}
          {activeTab === 2 && <RecentSessionsList sessions={sessions} loading={loading} />}
        </Box>
      </Paper>
    </Container>
  );
}

export default CarePlansDashboard;
