import { Box, Container, Grid, Paper, Typography, Card, CardContent } from '@mui/material';
import {
  People,
  Assignment,
  AttachMoney,
  TrendingUp,
  School,
  Description,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '../store/authStore';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            borderRadius: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Icon sx={{ color: `${color}.main`, fontSize: 32 }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const { user } = useAuthStore();

  const stats = [
    { title: 'الموظفين', value: '124', icon: People, color: 'primary' },
    { title: 'المشاريع النشطة', value: '18', icon: Assignment, color: 'success' },
    { title: 'المبيعات (الشهر)', value: '₪45,280', icon: AttachMoney, color: 'warning' },
    { title: 'معدل النمو', value: '+12.5%', icon: TrendingUp, color: 'info' },
    { title: 'الطلاب المسجلين', value: '356', icon: School, color: 'secondary' },
    { title: 'المستندات', value: '1,248', icon: Description, color: 'error' },
  ];

  // Sales trend data
  const salesData = [
    { month: 'يناير', sales: 35000, target: 40000 },
    { month: 'فبراير', sales: 38000, target: 40000 },
    { month: 'مارس', sales: 42000, target: 40000 },
    { month: 'أبريل', sales: 40000, target: 40000 },
    { month: 'مايو', sales: 45000, target: 40000 },
    { month: 'يونيو', sales: 45280, target: 40000 },
  ];

  // Department performance
  const departmentData = [
    { name: 'المبيعات', performance: 92 },
    { name: 'الموارد البشرية', performance: 87 },
    { name: 'التسويق', performance: 85 },
    { name: 'التطوير', performance: 95 },
    { name: 'الدعم الفني', performance: 89 },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          مرحباً، {user?.fullName || 'المستخدم'} 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          إليك نظرة عامة على نظامك اليوم
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              اتجاه المبيعات
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#1976d2"
                  name="المبيعات"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#d32f2f"
                  name="الهدف"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              أداء الأقسام
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="performance" fill="#2e7d32" name="الأداء %" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
