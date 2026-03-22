/**
 * Kitchen Dashboard — لوحة معلومات المطبخ والتغذية
 */
import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, LinearProgress
} from '@mui/material';
import {
  Restaurant as MealIcon,
  MenuBook as MenuIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../../services/api';

const COLORS = ['#e65100', '#2e7d32', '#1565c0', '#6a1b9a', '#c62828', '#00838f'];

export default function KitchenDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/kitchen/dashboard');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalMealsToday: 385,
          menuItems: 64,
          inventoryItems: 142,
          dietaryPlans: 28,
          mealDistribution: [
            { name: 'فطور', value: 120 }, { name: 'غداء', value: 155 },
            { name: 'عشاء', value: 80 }, { name: 'وجبات خفيفة', value: 30 }
          ],
          weeklyMeals: [
            { day: 'سبت', meals: 370 }, { day: 'أحد', meals: 385 },
            { day: 'إثنين', meals: 392 }, { day: 'ثلاثاء', meals: 378 },
            { day: 'أربعاء', meals: 395 }, { day: 'خميس', meals: 360 },
            { day: 'جمعة', meals: 340 }
          ],
          todayMenu: [
            { meal: 'فطور', items: 'بيض، خبز، جبن، عصير', time: '07:00', served: 120 },
            { meal: 'غداء', items: 'أرز، دجاج مشوي، سلطة', time: '12:00', served: 155 },
            { meal: 'عشاء', items: 'شوربة عدس، خبز، فواكه', time: '18:00', served: 80 }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LinearProgress />;
  if (!data) return <Typography>لا توجد بيانات</Typography>;

  const kpis = [
    { label: 'وجبات اليوم', value: data.totalMealsToday, icon: <MealIcon />, color: '#e65100' },
    { label: 'أصناف القائمة', value: data.menuItems, icon: <MenuIcon />, color: '#2e7d32' },
    { label: 'مواد المخزون', value: data.inventoryItems, icon: <InventoryIcon />, color: '#1565c0' },
    { label: 'خطط غذائية', value: data.dietaryPlans, icon: <PeopleIcon />, color: '#6a1b9a' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">لوحة المطبخ والتغذية</Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ borderTop: `4px solid ${k.color}` }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ color: k.color, mb: 1 }}>{k.icon}</Box>
                <Typography variant="h4" fontWeight="bold">{k.value}</Typography>
                <Typography color="text.secondary">{k.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>توزيع الوجبات</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.mealDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {data.mealDistribution?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>الوجبات الأسبوعية</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.weeklyMeals}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip />
                <Bar dataKey="meals" name="وجبات" fill="#e65100" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>قائمة اليوم</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>الوجبة</TableCell><TableCell>الأصناف</TableCell>
              <TableCell>الوقت</TableCell><TableCell>تم التقديم</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.todayMenu?.map((m, i) => (
                <TableRow key={i}>
                  <TableCell><Chip label={m.meal} size="small" color="primary" /></TableCell>
                  <TableCell>{m.items}</TableCell>
                  <TableCell>{m.time}</TableCell>
                  <TableCell>{m.served}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
