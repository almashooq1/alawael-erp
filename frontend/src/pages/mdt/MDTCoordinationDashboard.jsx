/**
 * لوحة تحكم التنسيق متعدد التخصصات — MDT Coordination Dashboard (Enhanced)
 * يعرض: KPI شامل، اجتماعات قادمة، ملخص الخطط، الإحالات المعلقة، المتأخرات
 */
import { useState, useEffect, useCallback } from 'react';



import { useNavigate } from 'react-router-dom';
import {
  meetingsService, dashboardService, plansService, referralsService,
} from '../../services/mdtCoordinationService';

const meetTypeLabels = {
  REGULAR: 'دوري', EMERGENCY: 'طارئ', CASE_REVIEW: 'مراجعة حالة',
  CARE_PLANNING: 'تخطيط رعاية', DISCHARGE_PLANNING: 'تخطيط خروج',
  PROGRESS_REVIEW: 'مراجعة تقدم', INITIAL_ASSESSMENT: 'تقييم أولي',
};
const statusColors = {
  SCHEDULED: 'info', IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'error', POSTPONED: 'default',
  DRAFT: 'default', PENDING_APPROVAL: 'warning', ACTIVE: 'success', ON_HOLD: 'warning', ARCHIVED: 'default',
  PENDING: 'warning', ACCEPTED: 'info', REJECTED: 'error', RETURNED: 'default',
};
const statusLabels = {
  SCHEDULED: 'مجدول', IN_PROGRESS: 'جارٍ', COMPLETED: 'مكتمل', CANCELLED: 'ملغى', POSTPONED: 'مؤجل',
  DRAFT: 'مسودة', PENDING_APPROVAL: 'بانتظار الاعتماد', ACTIVE: 'نشط', ON_HOLD: 'معلق', ARCHIVED: 'أرشيف',
  PENDING: 'قيد الانتظار', ACCEPTED: 'مقبول', REJECTED: 'مرفوض', RETURNED: 'مُعاد',
};
const priorityColors = { LOW: '#4caf50', MEDIUM: '#ff9800', HIGH: '#f44336', URGENT: '#d32f2f' };

export default function MDTCoordinationDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({});
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [recentPlans, setRecentPlans] = useState([]);
  const [recentReferrals, setRecentReferrals] = useState([]);
  const [overdue, setOverdue] = useState({ overdueReviews: [], overdueReferrals: [], overdueActions: [] });
  const [tab, setTab] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, mtRes, plRes, rfRes, odRes] = await Promise.all([
        dashboardService.getOverview().catch(() => ({ data: {} })),
        meetingsService.getAll().catch(() => ({ data: [] })),
        plansService.getAll().catch(() => ({ data: [] })),
        referralsService.getAll().catch(() => ({ data: [] })),
        dashboardService.getOverdue().catch(() => ({ data: {} })),
      ]);
      setOverview(ovRes.data || ovRes || {});
      const mtArr = Array.isArray(mtRes.data) ? mtRes.data : Array.isArray(mtRes) ? mtRes : [];
      setRecentMeetings(mtArr.slice(0, 8));
      setRecentPlans((Array.isArray(plRes.data) ? plRes.data : []).slice(0, 6));
      setRecentReferrals((Array.isArray(rfRes.data) ? rfRes.data : []).slice(0, 8));
      setOverdue(odRes.data || odRes || {});
    } catch { /* fallback */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress size={48} /></Box>;

  const kpis = [
    { label: 'إجمالي الاجتماعات', value: overview.totalMeetings || 0, sub: `${overview.completedMeetings || 0} مكتمل`, icon: <MeetingIcon sx={{ fontSize: 36 }} />, bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' },
    { label: 'خطط التأهيل', value: overview.totalPlans || 0, sub: `${overview.activePlans || 0} نشط`, icon: <PlanIcon sx={{ fontSize: 36 }} />, bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: '#fff' },
    { label: 'الإحالات', value: overview.totalReferrals || 0, sub: `${overview.pendingReferrals || 0} قيد الانتظار`, icon: <RefIcon sx={{ fontSize: 36 }} />, bg: 'linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%)', color: '#fff' },
    { label: 'نسبة الإنجاز', value: `${overview.completionRate || 0}%`, sub: `تقدم الخطط: ${overview.averageProgress || 0}%`, icon: <TrendIcon sx={{ fontSize: 36 }} />, bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#fff' },
  ];

  const overdueTotal = (overdue.overdueReviews?.length || 0) + (overdue.overdueReferrals?.length || 0) + (overdue.overdueActions?.length || 0);

  return (
    <Box p={3} dir="rtl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">التنسيق متعدد التخصصات</Typography>
          <Typography variant="body2" color="text.secondary">إدارة شاملة لاجتماعات الفريق، خطط التأهيل، والإحالات الداخلية</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث"><IconButton onClick={loadData}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<MeetingIcon />} onClick={() => navigate('/mdt-coordination/meetings')} sx={{ borderRadius: 2 }}>الاجتماعات</Button>
          <Button variant="outlined" startIcon={<PlanIcon />} onClick={() => navigate('/mdt-coordination/plans')} sx={{ borderRadius: 2 }}>الخطط</Button>
          <Button variant="outlined" startIcon={<RefIcon />} onClick={() => navigate('/mdt-coordination/referrals')} sx={{ borderRadius: 2 }}>الإحالات</Button>
        </Box>
      </Box>

      {overdueTotal > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} icon={<WarningIcon />}>
          يوجد <strong>{overdueTotal}</strong> عنصر متأخر — {overdue.overdueReviews?.length || 0} مراجعة، {overdue.overdueReferrals?.length || 0} إحالة، {overdue.overdueActions?.length || 0} مهمة
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        {kpis.map((k) => (
          <Grid item xs={12} sm={6} md={3} key={k.label}>
            <Card sx={{ background: k.bg, color: k.color, borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
                <Box sx={{ opacity: 0.85 }}>{k.icon}</Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{k.value}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>{k.label}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.75 }}>{k.sub}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}><CalIcon color="primary" /><Typography variant="subtitle1" fontWeight="bold">اجتماعات هذا الشهر</Typography></Box>
            <Typography variant="h3" fontWeight="bold" color="primary">{overview.monthlyMeetings || 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}><RefIcon color="secondary" /><Typography variant="subtitle1" fontWeight="bold">إحالات هذا الشهر</Typography></Box>
            <Typography variant="h3" fontWeight="bold" color="secondary">{overview.monthlyReferrals || 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}><TrendIcon sx={{ color: '#4caf50' }} /><Typography variant="subtitle1" fontWeight="bold">متوسط تقدم الخطط</Typography></Box>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h3" fontWeight="bold" sx={{ color: '#4caf50' }}>{overview.averageProgress || 0}%</Typography>
              <LinearProgress variant="determinate" value={overview.averageProgress || 0} sx={{ flex: 1, height: 10, borderRadius: 5 }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, borderRadius: 2, mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab icon={<Badge badgeContent={recentMeetings.length} color="primary"><EventIcon /></Badge>} label="الاجتماعات" iconPosition="start" />
          <Tab icon={<Badge badgeContent={recentPlans.length} color="success"><PlanIcon /></Badge>} label="الخطط" iconPosition="start" />
          <Tab icon={<Badge badgeContent={overview.pendingReferrals || 0} color="warning"><RefIcon /></Badge>} label="الإحالات" iconPosition="start" />
          <Tab icon={<Badge badgeContent={overdueTotal} color="error"><WarningIcon /></Badge>} label="المتأخرات" iconPosition="start" />
        </Tabs>

        {tab === 0 && (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">آخر الاجتماعات</Typography>
              <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate('/mdt-coordination/meetings')}>عرض الكل</Button>
            </Box>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>الرقم</TableCell><TableCell>العنوان</TableCell><TableCell>النوع</TableCell><TableCell>الحالة</TableCell><TableCell>التاريخ</TableCell><TableCell>المشاركون</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {recentMeetings.map((m, i) => (
                  <TableRow key={m._id || i} hover sx={{ cursor: 'pointer' }} onClick={() => navigate('/mdt-coordination/meetings')}>
                    <TableCell><Typography variant="body2" color="primary">{m.meetingNumber || '-'}</Typography></TableCell>
                    <TableCell>{m.title || '-'}</TableCell>
                    <TableCell><Chip label={meetTypeLabels[m.type] || m.type || '-'} size="small" variant="outlined" /></TableCell>
                    <TableCell><Chip label={statusLabels[m.status] || m.status || '-'} color={statusColors[m.status] || 'default'} size="small" /></TableCell>
                    <TableCell>{m.date ? new Date(m.date).toLocaleDateString('ar') : '-'}</TableCell>
                    <TableCell><Chip label={m.attendees?.length || 0} size="small" icon={<MeetingIcon />} /></TableCell>
                  </TableRow>
                ))}
                {recentMeetings.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">لا توجد اجتماعات</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
          </>
        )}

        {tab === 1 && (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">خطط التأهيل</Typography>
              <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate('/mdt-coordination/plans')}>عرض الكل</Button>
            </Box>
            <Grid container spacing={2}>
              {recentPlans.map((p) => (
                <Grid item xs={12} sm={6} md={4} key={p._id}>
                  <Card variant="outlined" sx={{ borderRadius: 2, cursor: 'pointer' }} onClick={() => navigate('/mdt-coordination/plans')}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Typography variant="subtitle2" color="primary">{p.planNumber}</Typography>
                        <Chip label={statusLabels[p.status] || p.status} color={statusColors[p.status] || 'default'} size="small" />
                      </Box>
                      <Typography variant="body1" fontWeight="bold" mt={0.5}>{p.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{p.beneficiaryName || p.beneficiary?.name || '-'}</Typography>
                      <Box mt={1}>
                        <Box display="flex" justifyContent="space-between"><Typography variant="caption">التقدم</Typography><Typography variant="caption" fontWeight="bold">{p.overallProgress || 0}%</Typography></Box>
                        <LinearProgress variant="determinate" value={p.overallProgress || 0} sx={{ height: 6, borderRadius: 3 }} />
                      </Box>
                      <Box display="flex" gap={1} mt={1}>
                        <Chip icon={<MeetingIcon />} label={`${p.teamMembers?.length || 0} أعضاء`} size="small" variant="outlined" />
                        <Chip icon={<TaskIcon />} label={`${p.goals?.length || 0} أهداف`} size="small" variant="outlined" />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {recentPlans.length === 0 && <Grid item xs={12}><Typography color="text.secondary" textAlign="center" py={4}>لا توجد خطط</Typography></Grid>}
            </Grid>
          </>
        )}

        {tab === 2 && (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">الإحالات الداخلية</Typography>
              <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate('/mdt-coordination/referrals')}>عرض الكل</Button>
            </Box>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>الرقم</TableCell><TableCell>المستفيد</TableCell><TableCell>من</TableCell><TableCell>إلى</TableCell><TableCell>الأولوية</TableCell><TableCell>الحالة</TableCell><TableCell>التاريخ</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {recentReferrals.map((r, i) => (
                  <TableRow key={r._id || i} hover>
                    <TableCell><Typography variant="body2" color="primary">{r.ticketNumber || '-'}</Typography></TableCell>
                    <TableCell>{r.beneficiaryName || r.beneficiary?.name || '-'}</TableCell>
                    <TableCell>{r.fromDepartment || '-'}</TableCell>
                    <TableCell>{r.toDepartment || '-'}</TableCell>
                    <TableCell><Chip label={r.priority || '-'} size="small" sx={{ bgcolor: priorityColors[r.priority] || '#999', color: '#fff', fontWeight: 'bold' }} /></TableCell>
                    <TableCell><Chip label={statusLabels[r.status] || r.status || '-'} color={statusColors[r.status] || 'default'} size="small" /></TableCell>
                    <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar') : '-'}</TableCell>
                  </TableRow>
                ))}
                {recentReferrals.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">لا توجد إحالات</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
          </>
        )}

        {tab === 3 && (
          <>
            <Typography variant="h6" mb={2}>العناصر المتأخرة</Typography>
            {overdueTotal === 0 ? (
              <Box textAlign="center" py={4}><CheckIcon sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} /><Typography color="text.secondary">لا توجد عناصر متأخرة</Typography></Box>
            ) : (
              <Grid container spacing={2}>
                {(overdue.overdueReviews || []).length > 0 && (
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="error" gutterBottom>مراجعات متأخرة ({overdue.overdueReviews.length})</Typography>
                    <List dense>
                      {overdue.overdueReviews.slice(0, 5).map((r, i) => (
                        <ListItem key={i}><ListItemAvatar><Avatar sx={{ bgcolor: '#f44336', width: 32, height: 32 }}><PlanIcon sx={{ fontSize: 18 }} /></Avatar></ListItemAvatar>
                          <ListItemText primary={r.planNumber || r.beneficiaryName} secondary={r.reviewDate ? `المراجعة: ${new Date(r.reviewDate).toLocaleDateString('ar')}` : ''} /></ListItem>
                      ))}
                    </List>
                  </Grid>
                )}
                {(overdue.overdueReferrals || []).length > 0 && (
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="error" gutterBottom>إحالات متأخرة ({overdue.overdueReferrals.length})</Typography>
                    <List dense>
                      {overdue.overdueReferrals.slice(0, 5).map((r, i) => (
                        <ListItem key={i}><ListItemAvatar><Avatar sx={{ bgcolor: '#ff9800', width: 32, height: 32 }}><RefIcon sx={{ fontSize: 18 }} /></Avatar></ListItemAvatar>
                          <ListItemText primary={r.ticketNumber || r.beneficiaryName} secondary={`${r.fromDepartment} → ${r.toDepartment}`} /></ListItem>
                      ))}
                    </List>
                  </Grid>
                )}
                {(overdue.overdueActions || []).length > 0 && (
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="error" gutterBottom>مهام متأخرة ({overdue.overdueActions.length})</Typography>
                    <List dense>
                      {overdue.overdueActions.slice(0, 5).map((a, i) => (
                        <ListItem key={i}><ListItemAvatar><Avatar sx={{ bgcolor: '#9c27b0', width: 32, height: 32 }}><TaskIcon sx={{ fontSize: 18 }} /></Avatar></ListItemAvatar>
                          <ListItemText primary={a.actionItem?.description || 'مهمة'} secondary={`اجتماع: ${a.meetingNumber}`} /></ListItem>
                      ))}
                    </List>
                  </Grid>
                )}
              </Grid>
            )}
          </>
        )}
      </Paper>

      {(overview.upcomingMeetings || []).length > 0 && (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}><TimeIcon color="primary" /><Typography variant="h6">الاجتماعات القادمة</Typography></Box>
          <Grid container spacing={2}>
            {overview.upcomingMeetings.map((m) => (
              <Grid item xs={12} sm={6} md={4} key={m._id}>
                <Card variant="outlined" sx={{ borderRadius: 2, borderRight: '4px solid', borderRightColor: 'primary.main' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold">{m.title}</Typography>
                    <Box display="flex" gap={2} mt={0.5}>
                      <Typography variant="caption" color="text.secondary">{m.date ? new Date(m.date).toLocaleDateString('ar') : '-'}</Typography>
                      <Typography variant="caption" color="text.secondary">{m.startTime || '-'}</Typography>
                    </Box>
                    <Box display="flex" gap={1} mt={0.5}>
                      <Chip label={meetTypeLabels[m.type] || m.type} size="small" variant="outlined" />
                      <Chip label={`${m.attendees?.length || 0} مشارك`} size="small" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Box>
  );
}
