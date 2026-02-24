import React from 'react';
import { Box, Grid, Card, CardContent, Typography, LinearProgress } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Message as MessageIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  SmartToy as BotIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const AnalyticsDashboard = ({ stats }) => {
  // بيانات الرسوم البيانية
  const messagesTrendData = [
    { month: 'يناير', messages: 320, emails: 120, bot: 45 },
    { month: 'فبراير', messages: 450, emails: 180, bot: 67 },
    { month: 'مارس', messages: 380, emails: 150, bot: 52 },
    { month: 'أبريل', messages: 520, emails: 220, bot: 89 },
    { month: 'مايو', messages: 680, emails: 290, bot: 112 },
    { month: 'يونيو', messages: 750, emails: 310, bot: 134 },
  ];

  const responseTimeData = [
    { day: 'السبت', avgTime: 2.1 },
    { day: 'الأحد', avgTime: 1.8 },
    { day: 'الاثنين', avgTime: 2.5 },
    { day: 'الثلاثاء', avgTime: 1.9 },
    { day: 'الأربعاء', avgTime: 2.3 },
    { day: 'الخميس', avgTime: 2.0 },
    { day: 'الجمعة', avgTime: 1.5 },
  ];

  const channelDistribution = [
    { name: 'الرسائل المباشرة', value: 45, color: '#667eea' },
    { name: 'البريد الداخلي', value: 30, color: '#f093fb' },
    { name: 'المساعد الذكي', value: 15, color: '#4facfe' },
    { name: 'أخرى', value: 10, color: '#43e97b' },
  ];

  const satisfactionData = [
    { category: 'ممتاز', count: 156, percentage: 52 },
    { category: 'جيد', count: 98, percentage: 33 },
    { category: 'متوسط', count: 32, percentage: 11 },
    { category: 'ضعيف', count: 12, percentage: 4 },
  ];

  const performanceMetrics = [
    {
      title: 'معدل الاستجابة',
      value: '95.5%',
      change: '+3.2%',
      trend: 'up',
      color: 'success',
      icon: <CheckIcon />,
    },
    {
      title: 'متوسط وقت الحل',
      value: '2.3 س',
      change: '-0.5س',
      trend: 'up',
      color: 'info',
      icon: <ScheduleIcon />,
    },
    {
      title: 'رضا المستخدمين',
      value: '4.8/5',
      change: '+0.3',
      trend: 'up',
      color: 'warning',
      icon: <TrendingUpIcon />,
    },
    {
      title: 'دقة الذكاء الاصطناعي',
      value: '89%',
      change: '+5%',
      trend: 'up',
      color: 'primary',
      icon: <BotIcon />,
    },
  ];

  const getChangeColor = trend => {
    return trend === 'up' ? 'success.main' : 'error.main';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
        تحليلات ولوحة معلومات الاتصالات
      </Typography>

      {/* مقاييس الأداء */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {performanceMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: `${metric.color}.light`,
                      color: `${metric.color}.main`,
                      mr: 2,
                    }}
                  >
                    {metric.icon}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {metric.title}
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {metric.value}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {metric.trend === 'up' ? (
                    <TrendingUpIcon sx={{ color: getChangeColor(metric.trend), fontSize: 16 }} />
                  ) : (
                    <TrendingDownIcon sx={{ color: getChangeColor(metric.trend), fontSize: 16 }} />
                  )}
                  <Typography variant="caption" sx={{ color: getChangeColor(metric.trend), fontWeight: 'bold' }}>
                    {metric.change}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    من الشهر السابق
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* الرسوم البيانية */}
      <Grid container spacing={3}>
        {/* اتجاه الرسائل */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                اتجاه الرسائل (آخر 6 شهور)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={messagesTrendData}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f093fb" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f093fb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBot" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4facfe" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#4facfe" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    name="الرسائل المباشرة"
                    stroke="#667eea"
                    fillOpacity={1}
                    fill="url(#colorMessages)"
                  />
                  <Area type="monotone" dataKey="emails" name="البريد الداخلي" stroke="#f093fb" fillOpacity={1} fill="url(#colorEmails)" />
                  <Area type="monotone" dataKey="bot" name="المساعد الذكي" stroke="#4facfe" fillOpacity={1} fill="url(#colorBot)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* توزيع القنوات */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                توزيع قنوات الاتصال
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={channelDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {channelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* متوسط وقت الاستجابة */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                متوسط وقت الاستجابة (ساعات)
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgTime" name="متوسط الوقت" fill="#4facfe" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* تقييم الرضا */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                تقييم رضا المستخدمين
              </Typography>
              {satisfactionData.map((item, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{item.category}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.count} ({item.percentage}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={item.percentage}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: index === 0 ? 'success.main' : index === 1 ? 'info.main' : index === 2 ? 'warning.main' : 'error.main',
                      },
                    }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* إحصائيات إضافية */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                إحصائيات شاملة
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <MessageIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stats.totalMessages?.toLocaleString() || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      إجمالي الرسائل
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <BotIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stats.botResponses?.toLocaleString() || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ردود المساعد الذكي
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <CheckIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stats.activeChats || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      محادثات نشطة
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <ScheduleIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stats.avgResponseTime || '0'}s
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      متوسط وقت الرد
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
