import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import administrationService from '../../services/administration.service';




import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

/* ═══ Helpers ════════════════════════════════════════════════════════════════ */
const decisionStatusConfig = {
  draft: { label: 'مسودة', color: 'default' },
  under_review: { label: 'قيد المراجعة', color: 'info' },
  pending_approval: { label: 'بانتظار الاعتماد', color: 'warning' },
  approved: { label: 'معتمد', color: 'success' },
  published: { label: 'منشور', color: 'success' },
  archived: { label: 'مؤرشف', color: 'default' },
  revoked: { label: 'ملغي', color: 'error' },
};

const corrStatusConfig = {
  received: { label: 'مستلم', color: 'info' },
  under_processing: { label: 'قيد المعالجة', color: 'warning' },
  forwarded: { label: 'محوّل', color: 'info' },
  pending_reply: { label: 'بانتظار الرد', color: 'warning' },
  replied: { label: 'تم الرد', color: 'success' },
  completed: { label: 'مكتمل', color: 'success' },
  archived: { label: 'مؤرشف', color: 'default' },
  returned: { label: 'مُعاد', color: 'error' },
};

const docTypeLabels = {
  decision: 'قرار',
  memo: 'مذكرة',
  circular: 'تعميم',
  directive: 'توجيه',
  announcement: 'إعلان',
  policy: 'سياسة',
  procedure: 'إجراء',
  minutes: 'محضر',
};

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Administration() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await administrationService.getStats();
      if (res?.data?.data) setStats(res.data.data);
    } catch {
      showSnackbar('خطأ في تحميل إحصائيات الإدارة', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /* ─── KPI cards ─────────────────────────────────────────────────────────── */
  const kpis = stats
    ? [
        {
          label: 'إجمالي القرارات',
          value: stats.decisions?.total ?? 0,
          icon: <Gavel />,
          gradient: gradients.primary,
        },
        {
          label: 'قرارات منشورة',
          value: stats.decisions?.published ?? 0,
          icon: <CheckCircle />,
          gradient: gradients.success || 'linear-gradient(135deg,#43a047,#66bb6a)',
        },
        {
          label: 'قرارات بانتظار الاعتماد',
          value: stats.decisions?.pendingApproval ?? 0,
          icon: <PendingActions />,
          gradient: gradients.warning || 'linear-gradient(135deg,#ef6c00,#ffa726)',
        },
        {
          label: 'إجمالي المراسلات',
          value: stats.correspondence?.total ?? 0,
          icon: <Mail />,
          gradient: gradients.info || 'linear-gradient(135deg,#1565c0,#42a5f5)',
        },
        {
          label: 'مراسلات متأخرة',
          value: stats.correspondence?.overdue ?? 0,
          icon: <WarningAmber />,
          gradient: gradients.error || 'linear-gradient(135deg,#c62828,#ef5350)',
        },
        {
          label: 'تفويضات نشطة',
          value: stats.delegations?.active ?? 0,
          icon: <SwapHoriz />,
          gradient: 'linear-gradient(135deg,#6a1b9a,#ab47bc)',
        },
      ]
    : [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ background: gradients.primary, borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <Business sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                نظام الإدارة
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                إدارة القرارات والمذكرات والمراسلات والتفويضات
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/administration/decisions/create')}
              sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f5f5f5' } }}
            >
              قرار جديد
            </Button>
            <Button
              variant="outlined"
              startIcon={<MailOutline />}
              onClick={() => navigate('/administration/correspondence')}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
            >
              المراسلات
            </Button>
            <Tooltip title="تحديث">
              <IconButton onClick={loadStats} sx={{ color: 'white' }}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* ─── KPI Cards ───────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {kpis.map((kpi, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card
              sx={{ background: kpi.gradient, color: 'white', borderRadius: 2, height: '100%' }}
            >
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                {kpi.icon}
                <Typography variant="h4" fontWeight="bold">
                  {kpi.value}
                </Typography>
                <Typography variant="caption">{kpi.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ─── Quick‑access cards ──────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: 'القرارات والمذكرات',
            desc: 'إدارة القرارات الإدارية والتعاميم والمذكرات',
            icon: <Description sx={{ fontSize: 40 }} />,
            path: '/administration/decisions',
            color: '#1565c0',
          },
          {
            title: 'المراسلات',
            desc: 'تتبع المراسلات الواردة والصادرة',
            icon: <Mail sx={{ fontSize: 40 }} />,
            path: '/administration/correspondence',
            color: '#2e7d32',
          },
          {
            title: 'التفويضات',
            desc: 'إدارة تفويض الصلاحيات',
            icon: <Assignment sx={{ fontSize: 40 }} />,
            path: '/administration/delegations',
            color: '#6a1b9a',
          },
        ].map((c, i) => (
          <Grid item xs={12} md={4} key={i}>
            <Card
              sx={{
                borderRadius: 2,
                cursor: 'pointer',
                transition: '0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
              }}
              onClick={() => navigate(c.path)}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                <Avatar sx={{ bgcolor: c.color, width: 64, height: 64 }}>{c.icon}</Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {c.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.desc}
                  </Typography>
                </Box>
                <ArrowForward color="action" />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ─── Recent Decisions ────────────────────────────────────────────── */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'grey.50',
              }}
            >
              <Typography variant="h6" fontWeight="bold">
                آخر القرارات
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/administration/decisions')}
              >
                عرض الكل
              </Button>
            </Box>
            <Divider />
            {stats?.recentDecisions?.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>الرقم</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>العنوان</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.recentDecisions.map(d => {
                      const sc = decisionStatusConfig[d.status] || decisionStatusConfig.draft;
                      return (
                        <TableRow
                          key={d._id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/administration/decisions/${d._id}`)}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {d.decisionNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>{d.title}</TableCell>
                          <TableCell>
                            <Chip
                              label={docTypeLabels[d.documentType] || d.documentType}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip label={sc.label} color={sc.color} size="small" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">لا توجد قرارات حديثة</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* ─── Recent Correspondence ─────────────────────────────────────── */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'grey.50',
              }}
            >
              <Typography variant="h6" fontWeight="bold">
                آخر المراسلات
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/administration/correspondence')}
              >
                عرض الكل
              </Button>
            </Box>
            <Divider />
            {stats?.recentCorrespondence?.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>الرقم المرجعي</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>الموضوع</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>الاتجاه</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.recentCorrespondence.map(c => {
                      const sc = corrStatusConfig[c.status] || corrStatusConfig.received;
                      return (
                        <TableRow
                          key={c._id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/administration/correspondence/${c._id}`)}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {c.referenceNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>{c.subject}</TableCell>
                          <TableCell>
                            <Chip
                              label={c.direction === 'incoming' ? 'وارد' : 'صادر'}
                              size="small"
                              color={c.direction === 'incoming' ? 'info' : 'success'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip label={sc.label} color={sc.color} size="small" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">لا توجد مراسلات حديثة</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
