/**
 * Guardian Portal Dashboard — بوابة ولي الأمر
 *
 * Parent/guardian portal: beneficiary progress, attendance,
 * payments, messages, appointments, IEP tracking.
 */
import { useState, useEffect, useCallback } from 'react';
import { Paper,
} from '@mui/material';

import guardianApi from '../../services/guardianPortal.service';

export default function GuardianPortalDashboard() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, benRes, payRes, msgRes, notifRes, apptRes] = await Promise.all([
        guardianApi.getDashboard().catch(() => ({ data: { data: null } })),
        guardianApi.getBeneficiaries().catch(() => ({ data: { data: [] } })),
        guardianApi.getPayments().catch(() => ({ data: { data: [] } })),
        guardianApi.getMessages().catch(() => ({ data: { data: [] } })),
        guardianApi.getNotifications().catch(() => ({ data: { data: [] } })),
        guardianApi.getAppointments().catch(() => ({ data: { data: [] } })),
      ]);
      setDashboard(dashRes?.data?.data || null);
      setBeneficiaries(Array.isArray(benRes?.data?.data) ? benRes.data.data : benRes?.data?.data?.beneficiaries || []);
      setPayments(Array.isArray(payRes?.data?.data) ? payRes.data.data : []);
      setMessages(Array.isArray(msgRes?.data?.data) ? msgRes.data.data : []);
      setNotifications(Array.isArray(notifRes?.data?.data) ? notifRes.data.data : []);
      setAppointments(Array.isArray(apptRes?.data?.data) ? apptRes.data.data : []);
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const StatCard = ({ title, value, icon, color = 'primary.main' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold">{value ?? '—'}</Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box p={4} textAlign="center">
        <CircularProgress />
        <Typography mt={2}>جاري تحميل بوابة ولي الأمر...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3} dir="rtl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            بوابة ولي الأمر
          </Typography>
          <Typography color="text.secondary">متابعة تقدم الأبناء والخدمات والمدفوعات</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Badge badgeContent={notifications.length} color="error">
            <IconButton><NotifIcon /></IconButton>
          </Badge>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>تحديث</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="المستفيدون" value={beneficiaries.length} icon={<ChildIcon />} color="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="المواعيد القادمة" value={appointments.length} icon={<CalendarIcon />} color="info.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="الرسائل" value={messages.length} icon={<MessageIcon />} color="success.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="المدفوعات المعلقة" value={payments.filter(p => p.status === 'pending').length} icon={<PaymentIcon />} color="warning.main" />
        </Grid>
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
        <Tab label="المستفيدون" icon={<ChildIcon />} iconPosition="start" />
        <Tab label="المدفوعات" icon={<PaymentIcon />} iconPosition="start" />
        <Tab label="المواعيد" icon={<CalendarIcon />} iconPosition="start" />
        <Tab label="الرسائل" icon={<MessageIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Beneficiaries */}
      {tab === 0 && (
        <Grid container spacing={2}>
          {beneficiaries.length === 0 ? (
            <Grid item xs={12}>
              <Card><CardContent><Typography align="center" color="text.secondary">لا يوجد مستفيدون مسجلون</Typography></CardContent></Card>
            </Grid>
          ) : beneficiaries.map((b, i) => (
            <Grid item xs={12} md={6} key={b._id || i}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                      <ChildIcon />
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6">{b.name?.ar || b.name || '—'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        رقم الملف: {b.fileNumber || '—'}
                      </Typography>
                    </Box>
                    <Chip label={b.status === 'active' ? 'نشط' : b.status || '—'} color={b.status === 'active' ? 'success' : 'default'} size="small" />
                  </Box>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Box textAlign="center" p={1} bgcolor="grey.50" borderRadius={1}>
                        <ProgressIcon color="primary" fontSize="small" />
                        <Typography variant="caption" display="block">التقدم</Typography>
                        <Typography variant="body2" fontWeight="bold">{b.progressPercent != null ? `${b.progressPercent}%` : '—'}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center" p={1} bgcolor="grey.50" borderRadius={1}>
                        <AttendanceIcon color="success" fontSize="small" />
                        <Typography variant="caption" display="block">الحضور</Typography>
                        <Typography variant="body2" fontWeight="bold">{b.attendanceRate != null ? `${b.attendanceRate}%` : '—'}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center" p={1} bgcolor="grey.50" borderRadius={1}>
                        <StarIcon color="warning" fontSize="small" />
                        <Typography variant="caption" display="block">التقييم</Typography>
                        <Typography variant="body2" fontWeight="bold">{b.overallRating || '—'}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 1: Payments */}
      {tab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>المدفوعات والفواتير</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الوصف</TableCell>
                    <TableCell>المبلغ</TableCell>
                    <TableCell>تاريخ الاستحقاق</TableCell>
                    <TableCell>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center">لا توجد مدفوعات</TableCell></TableRow>
                  ) : payments.map((p, i) => (
                    <TableRow key={p._id || i}>
                      <TableCell>{p.description || p.type || '—'}</TableCell>
                      <TableCell>{p.amount != null ? `${p.amount.toLocaleString()} ر.س` : '—'}</TableCell>
                      <TableCell>{p.dueDate ? new Date(p.dueDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={p.status === 'paid' ? 'مدفوع' : p.status === 'pending' ? 'معلق' : p.status === 'overdue' ? 'متأخر' : p.status || '—'}
                          color={p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'error' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Appointments */}
      {tab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>المواعيد</Typography>
            <List>
              {appointments.length === 0 ? (
                <ListItem><ListItemText primary="لا توجد مواعيد حالياً" /></ListItem>
              ) : appointments.map((a, i) => (
                <React.Fragment key={a._id || i}>
                  <ListItem>
                    <ListItemAvatar><Avatar sx={{ bgcolor: 'info.main' }}><CalendarIcon /></Avatar></ListItemAvatar>
                    <ListItemText
                      primary={a.title || a.type || 'موعد'}
                      secondary={`${a.date ? new Date(a.date).toLocaleDateString('ar-SA') : '—'} — ${a.time || ''} — ${a.status === 'confirmed' ? 'مؤكد' : a.status === 'pending' ? 'بانتظار التأكيد' : a.status || ''}`}
                    />
                    <Chip label={a.status === 'confirmed' ? 'مؤكد' : 'معلق'} color={a.status === 'confirmed' ? 'success' : 'warning'} size="small" />
                  </ListItem>
                  {i < appointments.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Messages */}
      {tab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>الرسائل</Typography>
            <List>
              {messages.length === 0 ? (
                <ListItem><ListItemText primary="لا توجد رسائل" /></ListItem>
              ) : messages.map((m, i) => (
                <React.Fragment key={m._id || i}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar><Avatar sx={{ bgcolor: m.read ? 'grey.400' : 'primary.main' }}><MessageIcon /></Avatar></ListItemAvatar>
                    <ListItemText
                      primary={m.subject || m.title || 'رسالة'}
                      secondary={
                        <>
                          <Typography component="span" variant="body2">{m.body || m.content || ''}</Typography>
                          <br />
                          <Typography component="span" variant="caption" color="text.secondary">
                            {m.createdAt ? new Date(m.createdAt).toLocaleDateString('ar-SA') : ''}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {i < messages.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
