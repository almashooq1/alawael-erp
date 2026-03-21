/**
 * 🤝 لوحة تحكم CRM — CRM Dashboard
 * AlAwael ERP — Customer Relationship Management
 */
import { useState, useEffect, useCallback } from 'react';
import {
  useTheme,
} from '@mui/material';

import { MOCK_CRM_DASHBOARD, crmReportsService, seedService } from 'services/crmService';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  Tooltip,
  Typography
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HandshakeIcon from '@mui/icons-material/Handshake';
import MoneyIcon from '@mui/icons-material/Money';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import PhoneIcon from '@mui/icons-material/Phone';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import { CalendarIcon } from 'utils/iconAliases';

const COLORS = ['#4FC3F7', '#81C784', '#FFB74D', '#E57373', '#BA68C8', '#4DB6AC'];

const formatCurrency = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v);

export default function CRMDashboard() {
  const theme = useTheme();
  const [data, setData] = useState(MOCK_CRM_DASHBOARD);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmReportsService.getDashboardStats();
      if (res) setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSeedData = async () => {
    setLoading(true);
    try {
      const res = await seedService.seedDemoData();
      if (res) {
        setSnackbar({
          open: true,
          message: `تم إنشاء ${res.contacts || 0} جهة اتصال و ${res.deals || 0} صفقة و ${res.followUps || 0} متابعة`,
          severity: 'success',
        });
        await refresh();
      } else {
        setSnackbar({ open: true, message: 'البيانات التجريبية موجودة بالفعل', severity: 'info' });
      }
    } catch {
      setSnackbar({ open: true, message: 'حدث خطأ أثناء إنشاء البيانات', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    {
      label: 'إجمالي جهات الاتصال',
      value: data.totalContacts,
      sub: `${data.activeContacts} نشط`,
      icon: <PeopleIcon />,
      color: '#4FC3F7',
      trend: `+${data.thisMonthNewContacts || 0} هذا الشهر`,
      up: true,
    },
    {
      label: 'الصفقات الإجمالية',
      value: data.totalLeads,
      sub: `${data.openDeals} فرصة مفتوحة`,
      icon: <PersonAddIcon />,
      color: '#BA68C8',
      trend: `+${data.thisMonthNewDeals || 0} هذا الشهر`,
      up: true,
    },
    {
      label: 'الصفقات المكتسبة',
      value: data.wonDeals,
      sub: `${data.lostDeals} خسارة`,
      icon: <HandshakeIcon />,
      color: '#81C784',
      trend: '+15%',
      up: true,
    },
    {
      label: 'إجمالي الإيرادات',
      value: formatCurrency(data.totalRevenue),
      sub: `متوسط ${formatCurrency(data.avgDealSize)}`,
      icon: <MoneyIcon />,
      color: '#FFB74D',
      trend: '+22%',
      up: true,
    },
    {
      label: 'معدل التحويل',
      value: `${data.conversionRate}%`,
      sub: data.overdueFollowUps ? `${data.overdueFollowUps} متابعات متأخرة` : 'من إجمالي الفرص',
      icon: <TrendingUpIcon />,
      color: data.overdueFollowUps > 0 ? '#E57373' : '#4DB6AC',
      trend: data.overdueFollowUps > 0 ? `${data.overdueFollowUps} متأخرة` : '+3.2%',
      up: !data.overdueFollowUps,
    },
  ];

  const activityIcons = {
    deal_won: <CheckIcon sx={{ color: '#81C784' }} />,
    deal_lost: <CancelIcon sx={{ color: '#E57373' }} />,
    new_lead: <NewIcon sx={{ color: '#4FC3F7' }} />,
    follow_up: <PhoneIcon sx={{ color: '#FFB74D' }} />,
    contact: <PersonAddIcon sx={{ color: '#BA68C8' }} />,
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          borderRadius: 3,
        }}
      >
        <CardContent
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              🤝 إدارة علاقات العملاء (CRM)
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
              لوحة تحكم شاملة لإدارة العملاء والفرص والمتابعات
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="إنشاء بيانات تجريبية">
              <Button
                variant="outlined"
                size="small"
                onClick={handleSeedData}
                startIcon={<SeedIcon />}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                بيانات تجريبية
              </Button>
            </Tooltip>
            <Tooltip title="تحديث البيانات">
              <IconButton onClick={refresh} sx={{ color: 'white' }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid item xs={12} sm={6} md={2.4} key={i}>
            <Card
              sx={{ borderRadius: 2, height: '100%', position: 'relative', overflow: 'visible' }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Avatar sx={{ bgcolor: `${k.color}22`, color: k.color, width: 44, height: 44 }}>
                    {k.icon}
                  </Avatar>
                  <Chip
                    size="small"
                    label={k.trend}
                    icon={
                      k.up ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />
                    }
                    color={k.up ? 'success' : 'error'}
                    variant="outlined"
                    sx={{ height: 24, fontSize: 11 }}
                  />
                </Box>
                <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
                  {k.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {k.label}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {k.sub}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="نظرة عامة" />
          <Tab label="مسار المبيعات" />
          <Tab label="مصادر العملاء" />
          <Tab label="الأنشطة الأخيرة" />
          <Tab label="المتابعات" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tab === 0 && (
        <Grid container spacing={3}>
          {/* Revenue & Leads Trend */}
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 2, height: 400 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  📈 اتجاه الإيرادات والفرص الشهري
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ReTooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="leads"
                      stroke="#4FC3F7"
                      strokeWidth={2}
                      name="العملاء المحتملين"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="won"
                      stroke="#81C784"
                      strokeWidth={2}
                      name="صفقات ناجحة"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#FFB74D"
                      strokeWidth={2}
                      name="الإيرادات"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Performers */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, height: 400 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  🏆 أفضل مندوبي المبيعات
                </Typography>
                <List dense>
                  {data.topPerformers.map((p, i) => (
                    <ListItem key={i} sx={{ py: 1 }}>
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: COLORS[i % COLORS.length] + '22',
                            color: COLORS[i % COLORS.length],
                            fontWeight: 700,
                          }}
                        >
                          {i + 1}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={p.name}
                        secondary={`${p.deals} صفقات • ${formatCurrency(p.revenue)}`}
                      />
                      <TrophyIcon
                        sx={{
                          color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32',
                          opacity: i < 3 ? 1 : 0.3,
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  📊 توزيع مسار المبيعات
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.pipelineDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="stage" type="category" width={120} />
                    <ReTooltip formatter={v => formatCurrency(v)} />
                    <Bar dataKey="value" fill="#4FC3F7" radius={[0, 6, 6, 0]} name="القيمة" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  عدد الفرص لكل مرحلة
                </Typography>
                {data.pipelineDistribution.map((s, i) => (
                  <Box key={i} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{s.stage}</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {s.count} فرصة
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(s.count / 30) * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: COLORS[i % COLORS.length] + '22',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: COLORS[i % COLORS.length],
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  🎯 توزيع مصادر العملاء
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={data.sourceDistribution}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={130}
                      label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.sourceDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  إحصائيات المصادر
                </Typography>
                {data.sourceDistribution.map((s, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: COLORS[i % COLORS.length] + '22',
                        color: COLORS[i % COLORS.length],
                        width: 36,
                        height: 36,
                        mr: 2,
                      }}
                    >
                      {s.count}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {s.source}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(
                          (s.count / data.sourceDistribution.reduce((a, b) => a + b.count, 0)) *
                          100
                        ).toFixed(1)}
                        % من الإجمالي
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 3 && (
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              🕐 الأنشطة الأخيرة
            </Typography>
            <List>
              {data.recentActivities.map((a, i) => (
                <Box key={i}>
                  <ListItem sx={{ py: 1.5 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent' }}>{activityIcons[a.type]}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={a.text} secondary={`منذ ${a.time}`} />
                    <Chip
                      size="small"
                      label={
                        a.type === 'deal_won'
                          ? 'صفقة ناجحة'
                          : a.type === 'deal_lost'
                            ? 'صفقة خاسرة'
                            : a.type === 'new_lead'
                              ? 'فرصة جديدة'
                              : a.type === 'follow_up'
                                ? 'متابعة'
                                : 'جهة اتصال'
                      }
                      variant="outlined"
                    />
                  </ListItem>
                  {i < data.recentActivities.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* المتابعات القادمة والمتأخرة */}
      {tab === 4 && (
        <Grid container spacing={3}>
          {/* متابعات متأخرة */}
          {data.overdueFollowUps > 0 && (
            <Grid item xs={12}>
              <Alert severity="warning" icon={<WarningIcon />} sx={{ borderRadius: 2, mb: 1 }}>
                لديك <strong>{data.overdueFollowUps}</strong> متابعة متأخرة تحتاج انتباهك فوراً
              </Alert>
            </Grid>
          )}
          {/* قائمة المتابعات القادمة */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  <CalendarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  المتابعات القادمة
                </Typography>
                {data.upcomingFollowUps && data.upcomingFollowUps.length > 0 ? (
                  <List>
                    {data.upcomingFollowUps.map((f, i) => (
                      <Box key={f._id || i}>
                        <ListItem sx={{ py: 1.5 }}>
                          <ListItemAvatar>
                            <Avatar
                              sx={{
                                bgcolor: f.status === 'overdue' ? '#f44336' : '#2196f3',
                                width: 36,
                                height: 36,
                              }}
                            >
                              <CalendarIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={f.title || f.notes || 'متابعة'}
                            secondary={
                              <>
                                {f.contactName && <span>العميل: {f.contactName} • </span>}
                                {f.scheduledDate && (
                                  <span>
                                    الموعد: {new Date(f.scheduledDate).toLocaleDateString('ar-SA')}
                                  </span>
                                )}
                              </>
                            }
                          />
                          <Chip
                            size="small"
                            label={
                              f.type === 'call'
                                ? 'مكالمة'
                                : f.type === 'meeting'
                                  ? 'اجتماع'
                                  : f.type === 'email'
                                    ? 'بريد'
                                    : f.type === 'visit'
                                      ? 'زيارة'
                                      : 'مهمة'
                            }
                            color={f.status === 'overdue' ? 'error' : 'primary'}
                            variant="outlined"
                          />
                        </ListItem>
                        {i < data.upcomingFollowUps.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CalendarIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">لا توجد متابعات قادمة</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Snackbar للإشعارات */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
