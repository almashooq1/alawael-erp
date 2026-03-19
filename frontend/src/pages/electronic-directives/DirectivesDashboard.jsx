/**
 * Electronic Directives Dashboard — لوحة تحكم التوجيهات الإلكترونية
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  Chip,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Tooltip,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  Gavel as DecisionIcon,
  Description as MemoIcon,
  NotificationsActive as UrgentIcon,
  PolicyOutlined as PolicyIcon,
  Rule as ProcedureIcon,
  Assignment as InstructionIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Visibility as ViewIcon,
  Speed as SpeedIcon,
  FiberNew as NewIcon,
} from '@mui/icons-material';
import electronicDirectivesService from '../../services/electronicDirectives.service';
import {
  DIRECTIVE_TYPES,
  DIRECTIVE_PRIORITIES,
  DIRECTIVE_STATUS,
} from './constants';

/* ═══ Stat Card ════════════════════════════════════════════════ */
function StatCard({ title, value, icon, color, onClick, loading }) {
  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
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
          </Box>
          <Avatar sx={{ bgcolor: `${color}20`, color, width: 48, height: 48 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ═══ Type Icon Map ════════════════════════════════════════════ */
const typeIcons = {
  instruction: <InstructionIcon />,
  circular: <CampaignIcon />,
  decision: <DecisionIcon />,
  memo: <MemoIcon />,
  urgent_notice: <UrgentIcon />,
  policy_update: <PolicyIcon />,
  procedure_change: <ProcedureIcon />,
};

/* ═══ Main Component ══════════════════════════════════════════ */
export default function DirectivesDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentDirectives, setRecentDirectives] = useState([]);
  const [overdueActions, setOverdueActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, recentRes, overdueRes] = await Promise.all([
        electronicDirectivesService.getStatistics(),
        electronicDirectivesService.search({ page: 1, limit: 5 }),
        electronicDirectivesService.getOverdue(),
      ]);
      setStats(statsRes.data?.data || statsRes.data || {});
      setRecentDirectives(recentRes.data?.data || recentRes.data || []);
      setOverdueActions(overdueRes.data?.data || overdueRes.data || []);
    } catch (err) {
      console.error('Failed to load directives dashboard:', err);
      setError('فشل في تحميل بيانات التوجيهات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalIssued = stats?.byStatus?.issued || 0;
  const totalDraft = stats?.byStatus?.draft || 0;
  const totalExpired = stats?.byStatus?.expired || 0;
  const totalCancelled = stats?.byStatus?.cancelled || 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* ─── Header ────────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            التوجيهات الإلكترونية
          </Typography>
          <Typography variant="body1" color="text.secondary">
            إدارة ومتابعة التوجيهات والتعاميم الصادرة
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="large"
          onClick={() => navigate('/electronic-directives/compose')}
          sx={{ borderRadius: 2 }}
        >
          توجيه جديد
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ─── Stats Cards ───────────────────────────────────── */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي التوجيهات"
            value={stats?.total}
            icon={<CampaignIcon />}
            color="#1976d2"
            loading={loading}
            onClick={() => navigate('/electronic-directives/list')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="التوجيهات الصادرة"
            value={totalIssued}
            icon={<CheckCircleIcon />}
            color="#388e3c"
            loading={loading}
            onClick={() => navigate('/electronic-directives/list?status=issued')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="المسودات"
            value={totalDraft}
            icon={<AccessTimeIcon />}
            color="#f57c00"
            loading={loading}
            onClick={() => navigate('/electronic-directives/list?status=draft')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجراءات متأخرة"
            value={overdueActions.length}
            icon={<WarningIcon />}
            color="#d32f2f"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* ─── Recent Directives ─────────────────────────── */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                آخر التوجيهات
              </Typography>
              <Button
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/electronic-directives/list')}
              >
                عرض الكل
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} height={64} sx={{ mb: 1 }} />
              ))
            ) : recentDirectives.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                لا توجد توجيهات حتى الآن
              </Typography>
            ) : (
              <List disablePadding>
                {recentDirectives.map((d) => (
                  <ListItem
                    key={d._id}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/electronic-directives/view/${d._id}`)}
                  >
                    <ListItemIcon>
                      <Avatar
                        sx={{
                          bgcolor: `${DIRECTIVE_TYPES[d.type]?.color || '#1976d2'}20`,
                          color: DIRECTIVE_TYPES[d.type]?.color || '#1976d2',
                        }}
                      >
                        {typeIcons[d.type] || <CampaignIcon />}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2" noWrap>
                            {d.subject}
                          </Typography>
                          <Chip
                            label={DIRECTIVE_PRIORITIES[d.priority]?.label || d.priority}
                            size="small"
                            sx={{
                              bgcolor: `${DIRECTIVE_PRIORITIES[d.priority]?.color || '#9e9e9e'}20`,
                              color: DIRECTIVE_PRIORITIES[d.priority]?.color || '#9e9e9e',
                              fontWeight: 'bold',
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box display="flex" gap={1} alignItems="center">
                          <Chip
                            label={DIRECTIVE_STATUS[d.status]?.label || d.status}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {d.referenceNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •{' '}
                            {d.createdAt
                              ? new Date(d.createdAt).toLocaleDateString('ar-SA')
                              : ''}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/electronic-directives/view/${d._id}`);
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* ─── Type Distribution + Overdue ───────────────── */}
        <Grid item xs={12} md={5}>
          {/* Type Distribution */}
          <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              التوزيع حسب النوع
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} height={36} sx={{ mb: 1 }} />
              ))
            ) : (
              Object.entries(stats?.byType || {}).map(([type, count]) => (
                <Box
                  key={type}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1.5}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: `${DIRECTIVE_TYPES[type]?.color || '#1976d2'}20`,
                        color: DIRECTIVE_TYPES[type]?.color || '#1976d2',
                      }}
                    >
                      {typeIcons[type] || <CampaignIcon fontSize="small" />}
                    </Avatar>
                    <Typography variant="body2">
                      {DIRECTIVE_TYPES[type]?.label || type}
                    </Typography>
                  </Box>
                  <Chip label={count} size="small" color="primary" variant="outlined" />
                </Box>
              ))
            )}
            {!loading && Object.keys(stats?.byType || {}).length === 0 && (
              <Typography color="text.secondary" textAlign="center" py={2}>
                لا توجد بيانات
              </Typography>
            )}
          </Paper>

          {/* Overdue Actions */}
          {overdueActions.length > 0 && (
            <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid #d32f2f30' }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <WarningIcon color="error" />
                <Typography variant="h6" fontWeight="bold" color="error">
                  إجراءات متأخرة
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List disablePadding dense>
                {overdueActions.slice(0, 5).map((item) => (
                  <ListItem
                    key={item._id}
                    sx={{ cursor: 'pointer', borderRadius: 1 }}
                    onClick={() => navigate(`/electronic-directives/view/${item._id}`)}
                  >
                    <ListItemIcon>
                      <WarningIcon color="error" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.subject || item.referenceNumber}
                      secondary={`الرقم المرجعي: ${item.referenceNumber}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {/* Engagement Stats */}
          <Paper sx={{ p: 3, borderRadius: 2, mt: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              إحصائيات التفاعل
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              <Skeleton height={80} />
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" fontWeight="bold" color="#1976d2">
                      {stats?.engagement?.totalRead || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      مقروء
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" fontWeight="bold" color="#388e3c">
                      {stats?.engagement?.totalAcknowledged || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      تم الإقرار
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
