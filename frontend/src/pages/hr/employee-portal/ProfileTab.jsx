import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Person as PersonIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarMonth as CalendarIcon,
  EventAvailable as EventAvailableIcon,
  Assignment as AssignmentIcon,
  AccountBalanceWallet as WalletIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';

/**
 * ProfileTab – Employee overview card with personal details and summary stats.
 */
export default function ProfileTab({
  profile = {},
  leaveStats = {},
  requests = [],
  payrollSummary = {},
  documents = [],
  deptColor = '#1976d2',
}) {
  const infoRows = [
    { icon: <BadgeIcon />, label: 'الرقم الوظيفي', value: profile.empId },
    { icon: <BusinessIcon />, label: 'القسم', value: profile.department },
    { icon: <PersonIcon />, label: 'المسمّى الوظيفي', value: profile.position },
    { icon: <PhoneIcon />, label: 'الهاتف', value: profile.phone },
    { icon: <EmailIcon />, label: 'البريد الإلكتروني', value: profile.email },
    {
      icon: <CalendarIcon />,
      label: 'تاريخ الالتحاق',
      value: profile.joinDate
        ? new Date(profile.joinDate).toLocaleDateString('ar-SA')
        : '—',
    },
  ];

  const statCards = [
    {
      icon: <EventAvailableIcon />,
      title: 'الإجازات',
      primary: `${leaveStats.totalUsed ?? 0} مستخدمة`,
      secondary: `${leaveStats.totalRemaining ?? 0} متبقية`,
      extra: leaveStats.pendingCount
        ? `${leaveStats.pendingCount} معلّقة`
        : null,
      color: '#2e7d32',
    },
    {
      icon: <AssignmentIcon />,
      title: 'الطلبات',
      primary: `${requests.length} طلب`,
      secondary: `${requests.filter((r) => r.status === 'pending').length} معلّقة`,
      color: '#ed6c02',
    },
    {
      icon: <WalletIcon />,
      title: 'الرواتب',
      primary: payrollSummary.latest
        ? `${Number(payrollSummary.latest).toLocaleString('ar-SA')} ر.س`
        : '—',
      secondary: payrollSummary.monthCount
        ? `${payrollSummary.monthCount} كشف`
        : null,
      color: '#0288d1',
    },
    {
      icon: <FolderIcon />,
      title: 'المستندات',
      primary: `${documents.length} مستند`,
      secondary: null,
      color: '#7b1fa2',
    },
  ];

  return (
    <Box>
      {/* ─── Personal Info Card ─── */}
      <Card sx={{ mb: 3, borderTop: `4px solid ${deptColor}` }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                bgcolor: deptColor,
                fontSize: 28,
              }}
            >
              {profile.name ? profile.name.charAt(0) : '؟'}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {profile.name || '—'}
              </Typography>
              <Chip
                label={profile.department || '—'}
                size="small"
                sx={{ bgcolor: deptColor, color: '#fff', mt: 0.5 }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <List dense disablePadding>
            {infoRows.map((row, idx) => (
              <ListItem key={idx} disableGutters>
                <ListItemIcon sx={{ minWidth: 36, color: deptColor }}>
                  {row.icon}
                </ListItemIcon>
                <ListItemText
                  primary={row.label}
                  secondary={row.value || '—'}
                  primaryTypographyProps={{
                    variant: 'caption',
                    color: 'text.secondary',
                  }}
                  secondaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* ─── Summary Stats ─── */}
      <Grid container spacing={2}>
        {statCards.map((s, idx) => (
          <Grid item xs={6} md={3} key={idx}>
            <Card
              variant="outlined"
              sx={{
                textAlign: 'center',
                py: 2,
                borderColor: s.color,
                borderWidth: 1.5,
              }}
            >
              <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
              <Typography variant="subtitle2" color="text.secondary">
                {s.title}
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {s.primary}
              </Typography>
              {s.secondary && (
                <Typography variant="caption" color="text.secondary">
                  {s.secondary}
                </Typography>
              )}
              {s.extra && (
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ color: '#ed6c02' }}
                >
                  {s.extra}
                </Typography>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
