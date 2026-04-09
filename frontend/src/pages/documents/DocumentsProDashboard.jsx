/**
 * DocumentsProDashboard — لوحة إدارة المستندات الاحترافية
 * ═══════════════════════════════════════════════════════════
 * لوحة معلومات ذكية شاملة مع تحليلات، سير عمل، بحث متقدم،
 * إشعارات، وتوصيات ذكية
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  CircularProgress,
  Tooltip,
  Alert,
  AlertTitle,
  Tab,
  Tabs,
  Fade,
  Skeleton,
  useTheme,
} from '@mui/material';

import {
  Search as SearchIcon,
  Description as DocIcon,
  CloudUpload as UploadIcon,
  Analytics as AnalyticsIcon,
  Notifications as NotifIcon,
  Assignment as TaskIcon,
  TrendingUp as TrendIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  BarChart as ChartIcon,
  FolderOpen as FolderIcon,
  Timer as TimerIcon,
  WorkspacePremium as PremiumIcon,
  AutoAwesome as AIIcon,
  ManageSearch as SmartSearchIcon,
  AccountTree as WorkflowIcon,
  Summarize as SummaryIcon,
  ContentCopy as DuplicateIcon,
  Label as TagIcon,
  StarBorder as StarIcon,
  ArrowForward as ArrowIcon,
  MoreVert as MoreIcon,
  InfoOutlined as InfoIcon,
  PieChart as PieIcon,
} from '@mui/icons-material';

import documentProService from '../../services/documentProService';

// ── ألوان ثابتة ──────────────────────────────────────────
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  pink: '#EC4899',
  orange: '#F97316',
  gray: '#6B7280',
};

const GRADE_COLORS = {
  'A+': '#10B981',
  A: '#10B981',
  'B+': '#3B82F6',
  B: '#3B82F6',
  C: '#F59E0B',
  D: '#F97316',
  F: '#EF4444',
};

// ── StatCard — بطاقة إحصائية ────────────────────────────
function StatCard({ icon, title, value, subtitle, color = COLORS.primary, trend, loading }) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.3s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {loading ? (
          <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {title}
              </Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ color, lineHeight: 1.2 }}>
                {value}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {subtitle}
                </Typography>
              )}
              {trend && (
                <Chip
                  icon={<TrendIcon sx={{ fontSize: 14 }} />}
                  label={trend}
                  size="small"
                  sx={{ mt: 1, fontSize: 11, height: 22, bgcolor: `${color}15`, color }}
                />
              )}
            </Box>
            <Avatar
              sx={{
                bgcolor: `${color}15`,
                color,
                width: 48,
                height: 48,
              }}
            >
              {icon}
            </Avatar>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ── HealthGauge — مقياس الصحة ──────────────────────────
function HealthGauge({ health, loading }) {
  if (loading) return <Skeleton variant="circular" width={120} height={120} />;
  if (!health) return null;

  const color = GRADE_COLORS[health.grade] || COLORS.gray;

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={health.score}
          size={120}
          thickness={6}
          sx={{ color, '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h4" fontWeight="bold" sx={{ color }}>
            {health.grade}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {health.score}%
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        صحة قاعدة المستندات
      </Typography>
      {health.issues?.length > 0 && (
        <Box sx={{ mt: 1.5, textAlign: 'right' }}>
          {health.issues.slice(0, 3).map((issue, i) => (
            <Typography key={i} variant="caption" display="block" sx={{ mb: 0.5 }}>
              {issue.icon} {issue.message}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ── CategoryDistribution — توزيع الفئات ───────────────
function CategoryDistribution({ categories, loading }) {
  if (loading) {
    return Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} variant="rectangular" height={32} sx={{ mb: 1, borderRadius: 1 }} />
    ));
  }
  if (!categories?.length) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
        لا توجد بيانات
      </Typography>
    );
  }

  const maxCount = Math.max(...categories.map((c) => c.count));

  return (
    <Box>
      {categories.map((cat, idx) => (
        <Box key={idx} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography sx={{ fontSize: 20, width: 28, textAlign: 'center' }}>
            {cat.icon || '📎'}
          </Typography>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
              <Typography variant="body2" fontWeight={500}>
                {cat.label || cat.category}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {cat.count} ({cat.percentage}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(cat.count / maxCount) * 100}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: `${cat.color || COLORS.gray}20`,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  bgcolor: cat.color || COLORS.primary,
                },
              }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ── QuickSearchBar — شريط البحث السريع ────────────────
function QuickSearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(
    async (q) => {
      if (!q || q.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await documentProService.quickSearch(q);
        setResults(res.results || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        fullWidth
        placeholder="ابحث في المستندات... (عنوان، وسم، اسم ملف)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && onSearch?.(query)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              {searching ? <CircularProgress size={20} /> : <SearchIcon />}
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            bgcolor: 'background.paper',
          },
        }}
      />
      {results.length > 0 && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            mt: 0.5,
            borderRadius: 2,
            maxHeight: 300,
            overflow: 'auto',
          }}
        >
          <List dense>
            {results.map((doc) => (
              <ListItem
                key={doc.id}
                button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  onSearch?.(doc.title, doc.id);
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: `${COLORS.primary}15`, color: COLORS.primary }}>
                    <DocIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={doc.title}
                  secondary={`${doc.category || ''} — ${doc.fileType || ''}`}
                  primaryTypographyProps={{ noWrap: true, fontSize: 13 }}
                  secondaryTypographyProps={{ fontSize: 11 }}
                />
                {doc.tags?.map((tag, i) => (
                  <Chip key={i} label={tag} size="small" sx={{ ml: 0.5, height: 20, fontSize: 10 }} />
                ))}
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}

// ── PendingTasksList — قائمة المهام المعلقة ─────────────
function PendingTasksList({ tasks, loading }) {
  if (loading) {
    return Array.from({ length: 3 }).map((_, i) => (
      <Skeleton key={i} variant="rectangular" height={56} sx={{ mb: 1, borderRadius: 1 }} />
    ));
  }

  if (!tasks?.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CheckIcon sx={{ fontSize: 40, color: COLORS.success, mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          لا توجد مهام معلقة
        </Typography>
      </Box>
    );
  }

  return (
    <List dense>
      {tasks.slice(0, 5).map((task, idx) => (
        <ListItem
          key={idx}
          sx={{
            borderRadius: 1.5,
            mb: 0.5,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <ListItemAvatar>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: `${task.status?.color || COLORS.warning}15`,
                color: task.status?.color || COLORS.warning,
                fontSize: 16,
              }}
            >
              {task.status?.icon || '⏳'}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={task.documentId?.title || 'مستند'}
            secondary={task.status?.label || task.currentStatus || ''}
            primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
            secondaryTypographyProps={{ fontSize: 11 }}
          />
          {task.sla?.isOverdue && (
            <Chip label="متأخر" size="small" color="error" sx={{ height: 20, fontSize: 10 }} />
          )}
          {task.completionPercentage > 0 && (
            <Chip
              label={`${task.completionPercentage}%`}
              size="small"
              sx={{ height: 20, fontSize: 10, mr: 0.5 }}
            />
          )}
        </ListItem>
      ))}
    </List>
  );
}

// ── ExpiringDocsList — المستندات قريبة الانتهاء ────────
function ExpiringDocsList({ documents, loading }) {
  if (loading) {
    return Array.from({ length: 3 }).map((_, i) => (
      <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />
    ));
  }

  if (!documents?.length) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
        لا توجد مستندات قريبة الانتهاء 🎉
      </Typography>
    );
  }

  return (
    <List dense>
      {documents.map((doc, idx) => {
        const daysLeft = doc.expiryDate
          ? Math.max(0, Math.floor((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)))
          : null;
        const color = daysLeft <= 7 ? COLORS.danger : daysLeft <= 15 ? COLORS.orange : COLORS.warning;

        return (
          <ListItem key={idx} sx={{ borderRadius: 1.5, mb: 0.5 }}>
            <ListItemAvatar>
              <Avatar sx={{ width: 32, height: 32, bgcolor: `${color}15`, color }}>
                <TimerIcon sx={{ fontSize: 16 }} />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={doc.title}
              secondary={daysLeft !== null ? `ينتهي خلال ${daysLeft} يوم` : ''}
              primaryTypographyProps={{ fontSize: 13 }}
              secondaryTypographyProps={{ fontSize: 11, color }}
            />
          </ListItem>
        );
      })}
    </List>
  );
}

// ── RecentDocsList — المستندات الأخيرة ──────────────────
function RecentDocsList({ documents, loading }) {
  if (loading) {
    return Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
    ));
  }

  if (!documents?.length) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
        لا توجد مستندات حديثة
      </Typography>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <List dense>
      {documents.map((doc, idx) => (
        <ListItem
          key={idx}
          sx={{
            borderRadius: 1.5,
            mb: 0.5,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <ListItemAvatar>
            <Avatar sx={{ width: 36, height: 36, bgcolor: `${COLORS.primary}10` }}>
              <DocIcon sx={{ fontSize: 18, color: COLORS.primary }} />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={doc.title}
            secondary={
              <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography component="span" variant="caption">
                  {doc.category || 'عام'}
                </Typography>
                <Typography component="span" variant="caption">
                  •
                </Typography>
                <Typography component="span" variant="caption">
                  {formatSize(doc.fileSize)}
                </Typography>
                <Typography component="span" variant="caption">
                  •
                </Typography>
                <Typography component="span" variant="caption">
                  {formatDate(doc.createdAt)}
                </Typography>
              </Box>
            }
            primaryTypographyProps={{ fontSize: 13, fontWeight: 500, noWrap: true }}
          />
          {doc.workflowStatus && doc.workflowStatus !== 'draft' && (
            <Chip
              label={doc.workflowStatus}
              size="small"
              sx={{ height: 20, fontSize: 10, ml: 1 }}
            />
          )}
        </ListItem>
      ))}
    </List>
  );
}

// ══════════════════════════════════════════════════════════════
//  المكون الرئيسي — DocumentsProDashboard
// ══════════════════════════════════════════════════════════════

export default function DocumentsProDashboard() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // ── جلب البيانات ─────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await documentProService.getDashboard();
      setData(result.data || result);
    } catch (err) {
      console.error('[Dashboard] Error:', err);
      setError(err.response?.data?.message || err.message || 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── الإحصائيات ──────────────────────────────────────
  const analytics = data?.analytics;
  const overview = analytics?.overview || {};
  const distributions = analytics?.distributions || {};
  const health = analytics?.health;
  const workflow = data?.workflow || {};
  const recentDocuments = data?.recentDocuments || [];
  const expiringSoon = data?.expiringSoon || [];
  const unreadNotifications = data?.unreadNotifications || 0;

  return (
    <Box dir="rtl" sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      {/* ── Header ──────────────────────────────────────── */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.purple} 100%)`,
          color: 'white',
          pt: 3,
          pb: 4,
          px: 3,
          borderRadius: '0 0 24px 24px',
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PremiumIcon /> إدارة المستندات الاحترافية
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                نظام ذكي متكامل للتصنيف، سير العمل، البحث المتقدم والتحليلات
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="الإشعارات">
                <IconButton sx={{ color: 'white' }}>
                  <Badge badgeContent={unreadNotifications} color="error">
                    <NotifIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="تحديث البيانات">
                <IconButton sx={{ color: 'white' }} onClick={fetchDashboard}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* شريط البحث */}
          <QuickSearchBar
            onSearch={(q) => {
              if (q) {
                window.location.href = `/document-management/list?q=${encodeURIComponent(q)}`;
              }
            }}
          />
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: -2 }}>
        {/* ── خطأ ────────────────────────────────────────── */}
        {error && (
          <Fade in>
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
              <AlertTitle>خطأ</AlertTitle>
              {error}
            </Alert>
          </Fade>
        )}

        {/* ── بطاقات الإحصائيات ──────────────────────────── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<DocIcon />}
              title="إجمالي المستندات"
              value={overview.totalDocuments?.toLocaleString('ar-SA') || '0'}
              subtitle={overview.totalSizeFormatted || '0 Bytes'}
              color={COLORS.primary}
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<UploadIcon />}
              title="تحميلات هذا الشهر"
              value={overview.thisMonthUploads?.toLocaleString('ar-SA') || '0'}
              subtitle={`${overview.dailyUploadRate || 0} يومياً في المتوسط`}
              color={COLORS.success}
              trend={overview.dailyUploadRate > 0 ? `+${overview.dailyUploadRate}/يوم` : null}
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<WorkflowIcon />}
              title="سير عمل نشط"
              value={workflow.stats?.overview?.totalActive?.toLocaleString('ar-SA') || '0'}
              subtitle={`${workflow.stats?.overview?.totalOverdue || 0} متأخر`}
              color={COLORS.purple}
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<WarningIcon />}
              title="منتهية / قريبة الانتهاء"
              value={`${overview.expiredCount || 0} / ${overview.expiringSoonCount || 0}`}
              subtitle="مستندات تحتاج اهتمام"
              color={overview.expiredCount > 0 ? COLORS.danger : COLORS.warning}
              loading={loading}
            />
          </Grid>
        </Grid>

        {/* ── المحتوى الرئيسي (Tabs) ───────────────────── */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              pt: 1,
              '& .MuiTab-root': { fontWeight: 600, fontSize: 13, minHeight: 44 },
            }}
          >
            <Tab icon={<AnalyticsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="التحليلات" />
            <Tab icon={<TaskIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="سير العمل" />
            <Tab icon={<TimerIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="التنبيهات" />
            <Tab icon={<AIIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="الذكاء الاصطناعي" />
          </Tabs>
          <Divider />

          {/* ── تبويب التحليلات ──────────────────────────── */}
          {activeTab === 0 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                {/* توزيع الفئات */}
                <Grid item xs={12} md={5}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PieIcon fontSize="small" /> توزيع المستندات حسب الفئة
                  </Typography>
                  <CategoryDistribution categories={distributions.byCategory} loading={loading} />
                </Grid>

                {/* صحة قاعدة المستندات */}
                <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <HealthGauge health={health} loading={loading} />
                </Grid>

                {/* توزيع أنواع الملفات */}
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FolderIcon fontSize="small" /> أنواع الملفات
                  </Typography>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} height={28} sx={{ mb: 0.5 }} />
                    ))
                  ) : distributions.byType?.length ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {distributions.byType.map((type, idx) => (
                        <Chip
                          key={idx}
                          label={`${type.type?.toUpperCase()} (${type.count})`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 11, borderRadius: 1 }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      لا توجد بيانات
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ChartIcon fontSize="small" /> توزيع الحالات
                  </Typography>
                  {loading ? (
                    <Skeleton height={60} />
                  ) : distributions.byStatus?.length ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {distributions.byStatus.map((status, idx) => (
                        <Chip
                          key={idx}
                          label={`${status.status} (${status.count})`}
                          size="small"
                          color={
                            status.status === 'نشط' ? 'success' :
                            status.status === 'مؤرشف' ? 'default' :
                            status.status === 'محذوف' ? 'error' : 'primary'
                          }
                          sx={{ fontSize: 11 }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      لا توجد بيانات
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ── تبويب سير العمل ──────────────────────────── */}
          {activeTab === 1 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TaskIcon fontSize="small" /> المهام المعلقة
                  </Typography>
                  <PendingTasksList tasks={workflow.pendingTasks} loading={loading} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    إحصائيات سير العمل
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h5" fontWeight="bold" color="primary">
                            {workflow.stats?.overview?.totalActive || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            نشط
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h5" fontWeight="bold" sx={{ color: COLORS.success }}>
                            {workflow.stats?.overview?.totalCompleted || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            مكتمل
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h5" fontWeight="bold" sx={{ color: COLORS.danger }}>
                            {workflow.stats?.overview?.totalOverdue || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            متأخر
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h5" fontWeight="bold" sx={{ color: COLORS.cyan }}>
                            {workflow.stats?.overview?.avgCompletionHours || 0}h
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            متوسط وقت الإنجاز
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ── تبويب التنبيهات ──────────────────────────── */}
          {activeTab === 2 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon fontSize="small" color="warning" /> مستندات قريبة الانتهاء
                  </Typography>
                  <ExpiringDocsList documents={expiringSoon} loading={loading} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotifIcon fontSize="small" /> الإشعارات
                  </Typography>
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Badge badgeContent={unreadNotifications} color="error">
                      <NotifIcon sx={{ fontSize: 48, color: COLORS.gray }} />
                    </Badge>
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      {unreadNotifications} إشعار غير مقروء
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mt: 1, borderRadius: 2 }}
                    >
                      عرض جميع الإشعارات
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ── تبويب الذكاء الاصطناعي ──────────────────── */}
          {activeTab === 3 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ borderRadius: 2, p: 2, textAlign: 'center' }}>
                    <AIIcon sx={{ fontSize: 40, color: COLORS.purple, mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      التصنيف التلقائي
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      تصنيف ذكي للمستندات بناءً على المحتوى والعنوان والوسوم
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AIIcon />}
                      sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                      تصنيف الكل تلقائياً
                    </Button>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ borderRadius: 2, p: 2, textAlign: 'center' }}>
                    <DuplicateIcon sx={{ fontSize: 40, color: COLORS.orange, mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      اكتشاف التكرار
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      فحص قاعدة المستندات واكتشاف المستندات المكررة أو المتشابهة
                    </Typography>
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      startIcon={<DuplicateIcon />}
                      sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                      فحص التكرار
                    </Button>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ borderRadius: 2, p: 2, textAlign: 'center' }}>
                    <SummaryIcon sx={{ fontSize: 40, color: COLORS.cyan, mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      التلخيص التلقائي
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      تلخيص المستندات واستخراج النقاط الرئيسية تلقائياً
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<SummaryIcon />}
                      sx={{ borderRadius: 2, textTransform: 'none', bgcolor: COLORS.cyan }}
                    >
                      تلخيص المستندات
                    </Button>
                  </Card>
                </Grid>

                {/* ميزات إضافية */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    🌟 مزايا الذكاء الاصطناعي
                  </Typography>
                  <Grid container spacing={2}>
                    {[
                      { icon: '🏷️', title: 'اقتراح الوسوم', desc: 'وسوم مقترحة تلقائياً لكل مستند' },
                      { icon: '🔒', title: 'اكتشاف الأمان', desc: 'تحديد مستوى السرية تلقائياً' },
                      { icon: '📊', title: 'استخراج الكيانات', desc: 'استخراج التواريخ والمبالغ والمراجع' },
                      { icon: '🌍', title: 'اكتشاف اللغة', desc: 'دعم العربية والإنجليزية والمزدوج' },
                      { icon: '📋', title: 'التوصيات الذكية', desc: 'توصيات لتحسين المستندات وأمانها' },
                      { icon: '📈', title: 'تحليلات الصحة', desc: 'تقييم شامل لجودة قاعدة المستندات' },
                    ].map((feature, idx) => (
                      <Grid item xs={12} sm={6} md={4} key={idx}>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 1 }}>
                          <Typography sx={{ fontSize: 24 }}>{feature.icon}</Typography>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {feature.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {feature.desc}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>

        {/* ── المستندات الأخيرة ───────────────────────────── */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DocIcon fontSize="small" /> آخر المستندات المرفوعة
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowIcon sx={{ transform: 'scaleX(-1)' }} />}
                  sx={{ textTransform: 'none', fontSize: 12 }}
                  href="/document-management/list"
                >
                  عرض الكل
                </Button>
              </Box>
              <RecentDocsList documents={recentDocuments} loading={loading} />
            </Paper>
          </Grid>

          {/* أدوات سريعة */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SpeedIcon fontSize="small" /> أدوات سريعة
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { icon: <UploadIcon />, label: 'رفع مستند جديد', href: '/document-management/list', color: COLORS.primary },
                  { icon: <SmartSearchIcon />, label: 'البحث المتقدم', href: '/document-management/advanced', color: COLORS.purple },
                  { icon: <AnalyticsIcon />, label: 'التقارير والإحصائيات', href: '/document-management/reports', color: COLORS.success },
                  { icon: <WorkflowIcon />, label: 'إدارة سير العمل', href: '/document-management/smart', color: COLORS.orange },
                  { icon: <FolderIcon />, label: 'الأرشيف', href: '/document-management/archive', color: COLORS.gray },
                ].map((tool, idx) => (
                  <Button
                    key={idx}
                    variant="outlined"
                    startIcon={tool.icon}
                    href={tool.href}
                    fullWidth
                    sx={{
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      borderColor: 'divider',
                      color: 'text.primary',
                      borderRadius: 2,
                      py: 1,
                      '&:hover': {
                        borderColor: tool.color,
                        bgcolor: `${tool.color}08`,
                      },
                    }}
                  >
                    {tool.label}
                  </Button>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
