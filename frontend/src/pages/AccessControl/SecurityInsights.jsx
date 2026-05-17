/**
 * SecurityInsights — تحليلات الأمان الذكية
 * AI-driven risk detection: dormant accounts, missing MFA, over-privileged users
 */
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  AlertTitle,
  alpha,
  Skeleton,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as OkIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  ArrowForward as ActionIcon,
  Refresh as RefreshIcon,
  Lock as LockIcon,
  Shield as ShieldIcon,
  Dangerous as DangerIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { getRoleConfig } from './accessControl.constants';

// ─── Severity config ──────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  critical: {
    label: 'حرجة',
    color: '#b71c1c',
    bg: '#fce4ec',
    icon: DangerIcon,
    muiColor: 'error',
  },
  high: {
    label: 'عالية',
    color: '#e53935',
    bg: '#ffebee',
    icon: ErrorIcon,
    muiColor: 'error',
  },
  medium: {
    label: 'متوسطة',
    color: '#fb8c00',
    bg: '#fff3e0',
    icon: WarningIcon,
    muiColor: 'warning',
  },
  low: {
    label: 'منخفضة',
    color: '#1976d2',
    bg: '#e3f2fd',
    icon: InfoIcon,
    muiColor: 'info',
  },
};

// ─── Insight Card ─────────────────────────────────────────────────────────────
const InsightCard = ({ insight, onAction }) => {
  const cfg = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.low;
  const Icon = cfg.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(v => !v)}
      elevation={0}
      sx={{
        mb: 1.5,
        border: `1px solid ${alpha(cfg.color, 0.3)}`,
        borderRadius: '12px !important',
        '&:before': { display: 'none' },
        '&.Mui-expanded': { borderColor: cfg.color },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandIcon />}
        sx={{ bgcolor: alpha(cfg.color, 0.04), minHeight: 64 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 1 }}>
          <Avatar sx={{ bgcolor: alpha(cfg.color, 0.15), color: cfg.color, width: 40, height: 40 }}>
            <Icon fontSize="small" />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body1" fontWeight={700} noWrap>
                {insight.title}
              </Typography>
              <Chip
                label={cfg.label}
                size="small"
                sx={{ bgcolor: cfg.color, color: '#fff', fontWeight: 700, height: 20 }}
              />
              <Chip
                label={`${insight.affectedCount} حساب`}
                size="small"
                variant="outlined"
                sx={{ borderColor: cfg.color, color: cfg.color, height: 20 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" noWrap>
              {insight.description}
            </Typography>
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0 }}>
        <Divider sx={{ mb: 2 }} />

        {/* Recommended action */}
        <Alert severity={cfg.muiColor} icon={<ActionIcon />} sx={{ mb: 2, borderRadius: 2 }}>
          <AlertTitle>الإجراء الموصى به</AlertTitle>
          {insight.action}
        </Alert>

        {/* Affected users list */}
        {insight.users && insight.users.length > 0 && (
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              gutterBottom
              display="block"
            >
              الحسابات المتأثرة ({insight.users.length})
            </Typography>
            <List dense disablePadding>
              {insight.users.slice(0, 6).map((u, idx) => {
                const roleCfg = getRoleConfig(u.role);
                return (
                  <ListItem
                    key={u.id || idx}
                    disableGutters
                    sx={{
                      py: 0.5,
                      px: 1,
                      borderRadius: 1.5,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: 12,
                          bgcolor: alpha(roleCfg.color, 0.15),
                          color: roleCfg.color,
                        }}
                      >
                        {(u.name || '?')[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={u.name || u.id}
                      secondary={roleCfg.label}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                );
              })}
              {insight.users.length > 6 && (
                <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                  + {insight.users.length - 6} آخرون
                </Typography>
              )}
            </List>
          </Box>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            variant="outlined"
            color={cfg.muiColor}
            onClick={() => onAction && onAction(insight)}
            endIcon={<ActionIcon />}
          >
            اتخاذ إجراء
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

// ─── Security Tips ────────────────────────────────────────────────────────────
const SECURITY_TIPS = [
  { icon: LockIcon, color: '#7b1fa2', text: 'فعّل التحقق الثنائي (MFA) لجميع الحسابات الإدارية' },
  { icon: ShieldIcon, color: '#1565c0', text: 'راجع صلاحيات المستخدمين دورياً كل 90 يوماً' },
  {
    icon: PeopleIcon,
    color: '#2e7d32',
    text: 'طبّق مبدأ الحد الأدنى من الصلاحيات (Least Privilege)',
  },
  { icon: SecurityIcon, color: '#e65100', text: 'أغلق الحسابات الخاملة لأكثر من 6 أشهر فوراً' },
];

// ─── SecurityInsights ─────────────────────────────────────────────────────────
const SecurityInsights = ({ insights = [], loading, onRefresh, onAction }) => {
  const criticalCount = insights.filter(i => i.severity === 'critical').length;
  const highCount = insights.filter(i => i.severity === 'high').length;

  if (loading) {
    return (
      <Box>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={80} sx={{ mb: 1.5, borderRadius: 3 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <SecurityIcon color="primary" />
            تحليلات الأمان الذكية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تحليل آلي لمخاطر الصلاحيات والوصول
          </Typography>
        </Box>
        <Tooltip title="تحديث التحليل">
          <IconButton onClick={onRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary bar */}
      {(criticalCount > 0 || highCount > 0) && (
        <Alert severity="error" icon={<DangerIcon />} sx={{ mb: 2, borderRadius: 2 }}>
          <AlertTitle>يتطلب انتباهاً فورياً</AlertTitle>
          {criticalCount > 0 && `${criticalCount} مشكلة حرجة`}
          {criticalCount > 0 && highCount > 0 && ' و '}
          {highCount > 0 && `${highCount} مشكلة عالية الخطورة`}
          {' — يُنصح بالمعالجة الفورية'}
        </Alert>
      )}

      {/* No issues */}
      {insights.length === 0 && (
        <Card
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'success.light',
            borderRadius: 3,
            p: 4,
            textAlign: 'center',
            mb: 3,
          }}
        >
          <OkIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
          <Typography variant="h6" fontWeight={700} color="success.main">
            لا توجد مشكلات أمنية مكتشفة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            جميع الحسابات تعمل ضمن نطاق الأمان المقبول
          </Typography>
        </Card>
      )}

      {/* Insights list */}
      {insights.map(insight => (
        <InsightCard key={insight.id} insight={insight} onAction={onAction} />
      ))}

      {/* Security Tips */}
      <Card
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, mt: 3 }}
      >
        <CardHeader
          title="أفضل الممارسات الأمنية"
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          avatar={<ShieldIcon color="primary" />}
        />
        <CardContent sx={{ pt: 0 }}>
          {SECURITY_TIPS.map((tip, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.2,
                borderRadius: 2,
                mb: 1,
                bgcolor: alpha(tip.color, 0.05),
                border: `1px solid ${alpha(tip.color, 0.15)}`,
              }}
            >
              <tip.icon sx={{ color: tip.color, fontSize: 20, flexShrink: 0 }} />
              <Typography variant="body2">{tip.text}</Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SecurityInsights;
