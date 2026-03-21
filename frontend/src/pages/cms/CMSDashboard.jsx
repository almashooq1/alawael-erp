/**
 * CMS Dashboard — لوحة إدارة المحتوى
 */
import { useState, useEffect } from 'react';

import apiClient from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { ViewIcon } from 'utils/iconAliases';

const COLORS = ['#1565c0', '#2e7d32', '#e65100', '#6a1b9a', '#c62828'];

export default function CMSDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/cms/stats');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalPages: 32,
          totalBlogs: 48,
          totalViews: 15420,
          publishedContent: 68,
          contentTypes: [
            { name: 'صفحات ثابتة', value: 32 }, { name: 'مدونات', value: 48 },
            { name: 'أخبار', value: 24 }, { name: 'إعلانات', value: 15 }
          ],
          monthlyViews: [
            { month: 'أكتوبر', views: 2100 }, { month: 'نوفمبر', views: 2400 },
            { month: 'ديسمبر', views: 1900 }, { month: 'يناير', views: 2800 },
            { month: 'فبراير', views: 3100 }, { month: 'مارس', views: 3120 }
          ],
          recentContent: [
            { title: 'دليل الخدمات الجديد', type: 'صفحة', status: 'منشور', views: 245, date: '2026-03-20' },
            { title: 'أخبار البرامج التأهيلية', type: 'مدونة', status: 'منشور', views: 180, date: '2026-03-19' },
            { title: 'إعلان التسجيل', type: 'إعلان', status: 'مسودة', views: 0, date: '2026-03-21' }
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
    { label: 'الصفحات', value: data.totalPages, icon: <PageIcon />, color: '#1565c0' },
    { label: 'المدونات', value: data.totalBlogs, icon: <BlogIcon />, color: '#2e7d32' },
    { label: 'المشاهدات', value: data.totalViews?.toLocaleString(), icon: <ViewIcon />, color: '#e65100' },
    { label: 'محتوى منشور', value: data.publishedContent, icon: <EditIcon />, color: '#6a1b9a' }
  ];

  const statusColor = { 'منشور': 'success', 'مسودة': 'default' };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">لوحة إدارة المحتوى</Typography>
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
            <Typography variant="h6" gutterBottom>أنواع المحتوى</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.contentTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {data.contentTypes?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>المشاهدات الشهرية</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyViews}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip />
                <Bar dataKey="views" name="مشاهدات" fill="#1565c0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>أحدث المحتوى</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>العنوان</TableCell><TableCell>النوع</TableCell>
              <TableCell>الحالة</TableCell><TableCell>المشاهدات</TableCell><TableCell>التاريخ</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.recentContent?.map((c, i) => (
                <TableRow key={i}>
                  <TableCell>{c.title}</TableCell>
                  <TableCell>{c.type}</TableCell>
                  <TableCell><Chip label={c.status} size="small" color={statusColor[c.status] || 'default'} /></TableCell>
                  <TableCell>{c.views}</TableCell>
                  <TableCell>{c.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
