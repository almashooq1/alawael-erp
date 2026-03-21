/**
 * Administrative Communications Dashboard — لوحة تحكم الاتصالات الإدارية
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';




import { gradients } from '../../theme/palette';
import adminCommunicationsService from '../../services/adminCommunications.service';

/* ═══ Stat Card Component ══════════════════════════════════════════════════ */
function StatCard({ title, value, icon, color, gradient, onClick, subtitle, loading }) {
  return (
    <Card
      sx={{
        height: '100%',
        background: gradient || `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
        border: `1px solid ${color}30`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        '&:hover': onClick
          ? { transform: 'translateY(-4px)', boxShadow: `0 8px 25px ${color}25` }
          : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {loading ? (
              <Skeleton width={60} height={40} />
            ) : (
              <Typography variant="h3" fontWeight="bold" color={color}>
                {value ?? 0}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: `${color}20`,
              color: color,
              width: 56,
              height: 56,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ═══ Recent Item ═════════════════════════════════════════════════════════ */
function RecentItem({ item, onClick }) {
  const isIncoming = item.type === 'incoming';
  return (
    <ListItem
      button
      onClick={onClick}
      sx={{
        borderRadius: 1,
        mb: 0.5,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <ListItemIcon>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: isIncoming ? '#e3f2fd' : '#e8f5e9',
            color: isIncoming ? '#1976d2' : '#2e7d32',
          }}
        >
          {isIncoming ? <CallReceived fontSize="small" /> : <CallMade fontSize="small" />}
        </Avatar>
      </ListItemIcon>
      <ListItemText
        primary={
          <Typography variant="body2" fontWeight={item.isRead ? 'normal' : 'bold'} noWrap>
            {item.subject || 'بدون عنوان'}
          </Typography>
        }
        secondary={
          <Typography variant="caption" color="text.secondary" noWrap>
            {item.referenceNumber} — {item.senderName || 'غير محدد'}
          </Typography>
        }
      />
      <ListItemSecondaryAction>
        <Chip
          label={item.priorityLabel || 'عادية'}
          size="small"
          color={item.priorityChipColor || 'default'}
          variant="outlined"
        />
      </ListItemSecondaryAction>
    </ListItem>
  );
}

/* ═══ Main Dashboard ═════════════════════════════════════════════════════ */
export default function AdminCommunicationsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentInbox, setRecentInbox] = useState([]);
  const [recentOutbox, setRecentOutbox] = useState([]);
  const [overdueItems, setOverdueItems] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, inboxRes, outboxRes, overdueRes] = await Promise.allSettled([
        adminCommunicationsService.getStatistics(),
        adminCommunicationsService.getInbox({ limit: 5 }),
        adminCommunicationsService.getOutbox({ limit: 5 }),
        adminCommunicationsService.getOverdue(0),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value?.data?.data || {});
      if (inboxRes.status === 'fulfilled') setRecentInbox(inboxRes.value?.data?.data || []);
      if (outboxRes.status === 'fulfilled') setRecentOutbox(outboxRes.value?.data?.data || []);
      if (overdueRes.status === 'fulfilled') setOverdueItems(overdueRes.value?.data?.data || []);
    } catch {
      /* silent - stats page should degrade gracefully */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statCards = [
    {
      title: 'إجمالي المراسلات',
      value: stats.totalCorrespondences,
      icon: <MailIcon />,
      color: '#1976d2',
      onClick: () => navigate('/admin-communications/all'),
    },
    {
      title: 'الوارد',
      value: stats.incomingCount,
      icon: <CallReceived />,
      color: '#0288d1',
      subtitle: `${stats.unreadIncoming || 0} غير مقروء`,
      onClick: () => navigate('/admin-communications/inbox'),
    },
    {
      title: 'الصادر',
      value: stats.outgoingCount,
      icon: <CallMade />,
      color: '#2e7d32',
      onClick: () => navigate('/admin-communications/outbox'),
    },
    {
      title: 'قيد المعالجة',
      value: stats.inProgressCount,
      icon: <AccessTimeIcon />,
      color: '#ed6c02',
      onClick: () => navigate('/admin-communications/all?status=in_progress'),
    },
    {
      title: 'بانتظار الاعتماد',
      value: stats.pendingApprovalCount,
      icon: <Assignment />,
      color: '#9c27b0',
    },
    {
      title: 'متأخرة',
      value: overdueItems.length,
      icon: <WarningIcon />,
      color: '#d32f2f',
      onClick: () => navigate('/admin-communications/all?status=overdue'),
    },
    {
      title: 'مكتملة',
      value: stats.completedCount,
      icon: <CheckCircleIcon />,
      color: '#388e3c',
    },
    {
      title: 'المسودات',
      value: stats.draftCount,
      icon: <DraftsIcon />,
      color: '#757575',
      onClick: () => navigate('/admin-communications/all?status=draft'),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: gradients?.primary || 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: '#fff',
          borderRadius: 2,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" fontWeight="bold">
              الاتصالات الإدارية
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
              نظام إدارة المراسلات الرسمية — الصادر والوارد والداخلي
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/admin-communications/compose')}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              مراسلة جديدة
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ── Statistics Cards ─────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((card, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <StatCard {...card} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* ── Content Grid ─────────────────────────────────────── */}
      <Grid container spacing={3}>
        {/* Recent Inbox */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight="bold">
                <InboxIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#1976d2' }} />
                آخر الوارد
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/admin-communications/inbox')}
              >
                عرض الكل
              </Button>
            </Box>
            <Divider sx={{ mb: 1 }} />
            {loading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} height={60} sx={{ mb: 1 }} />
              ))
            ) : recentInbox.length === 0 ? (
              <Box py={4} textAlign="center">
                <MailOutline sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">لا توجد مراسلات واردة</Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {recentInbox.map((item, i) => (
                  <RecentItem
                    key={item._id || i}
                    item={{ ...item, type: 'incoming' }}
                    onClick={() => navigate(`/admin-communications/view/${item._id}`)}
                  />
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Recent Outbox */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight="bold">
                <SendIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#2e7d32' }} />
                آخر الصادر
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/admin-communications/outbox')}
              >
                عرض الكل
              </Button>
            </Box>
            <Divider sx={{ mb: 1 }} />
            {loading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} height={60} sx={{ mb: 1 }} />
              ))
            ) : recentOutbox.length === 0 ? (
              <Box py={4} textAlign="center">
                <MailOutline sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">لا توجد مراسلات صادرة</Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {recentOutbox.map((item, i) => (
                  <RecentItem
                    key={item._id || i}
                    item={{ ...item, type: 'outgoing' }}
                    onClick={() => navigate(`/admin-communications/view/${item._id}`)}
                  />
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Overdue / Alerts */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight="bold">
                <WarningIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#d32f2f' }} />
                المراسلات المتأخرة والتنبيهات
              </Typography>
              <Chip
                label={`${overdueItems.length} متأخرة`}
                color="error"
                size="small"
                variant="outlined"
              />
            </Box>
            <Divider sx={{ mb: 1 }} />
            {loading ? (
              <Skeleton height={60} />
            ) : overdueItems.length === 0 ? (
              <Box py={3} textAlign="center">
                <CheckCircleIcon sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
                <Typography color="text.secondary">
                  لا توجد مراسلات متأخرة — ممتاز!
                </Typography>
              </Box>
            ) : (
              <List dense>
                {overdueItems.slice(0, 5).map((item, i) => (
                  <ListItem
                    key={item._id || i}
                    button
                    onClick={() => navigate(`/admin-communications/view/${item._id}`)}
                    sx={{
                      bgcolor: '#fff3e0',
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  >
                    <ListItemIcon>
                      <WarningIcon color="error" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.subject || 'مراسلة متأخرة'}
                      secondary={`الرقم المرجعي: ${item.referenceNumber || '-'} — مستحقة: ${item.dueDate ? new Date(item.dueDate).toLocaleDateString('ar-SA') : '-'}`}
                    />
                    <Chip label="متأخرة" color="error" size="small" />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              <Speed sx={{ mr: 1, verticalAlign: 'middle', color: '#1976d2' }} />
              إجراءات سريعة
            </Typography>
            <Grid container spacing={2}>
              {[
                {
                  label: 'خطاب صادر جديد',
                  icon: <CallMade />,
                  color: '#2e7d32',
                  path: '/admin-communications/compose?type=outgoing',
                },
                {
                  label: 'تسجيل وارد',
                  icon: <CallReceived />,
                  color: '#1976d2',
                  path: '/admin-communications/compose?type=incoming',
                },
                {
                  label: 'مذكرة داخلية',
                  icon: <Assignment />,
                  color: '#ed6c02',
                  path: '/admin-communications/compose?type=internal',
                },
                {
                  label: 'تعميم',
                  icon: <Notifications />,
                  color: '#9c27b0',
                  path: '/admin-communications/compose?type=circular',
                },
                {
                  label: 'الأرشيف',
                  icon: <ArchiveIcon />,
                  color: '#757575',
                  path: '/admin-communications/all?status=archived',
                },
                {
                  label: 'البحث المتقدم',
                  icon: <TrendingUpIcon />,
                  color: '#0288d1',
                  path: '/admin-communications/all',
                },
              ].map((action, i) => (
                <Grid item xs={6} sm={4} md={2} key={i}>
                  <Card
                    sx={{
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 3,
                        borderColor: action.color,
                      },
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                    onClick={() => navigate(action.path)}
                  >
                    <CardActionArea sx={{ p: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: `${action.color}15`,
                          color: action.color,
                          width: 48,
                          height: 48,
                          mx: 'auto',
                          mb: 1,
                        }}
                      >
                        {action.icon}
                      </Avatar>
                      <Typography variant="body2" fontWeight="medium">
                        {action.label}
                      </Typography>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
