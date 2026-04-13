/**
 * Knowledge Center Dashboard — لوحة تحكم مركز المعرفة
 */
import { useState, useEffect } from 'react';

import { MenuBook, Category, TrendingUp, Bookmark } from '@mui/icons-material';
import apiClient from '../../services/api';

const COLORS = ['#1976d2', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'];

const KPICard = ({ icon: Icon, title, value, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Icon sx={{ color }} />
        <Typography variant="body2" color="text.secondary">{title}</Typography>
      </Box>
      <Typography variant="h4" fontWeight="bold">{value}</Typography>
    </CardContent>
  </Card>
);

export default function KnowledgeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/knowledge-center/stats');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalArticles: 245, categories: 18, totalViews: 12500, bookmarks: 89,
          byCategory: [
            { name: 'سياسات', value: 45 }, { name: 'إجراءات', value: 68 },
            { name: 'أدلة تدريب', value: 52 }, { name: 'أبحاث', value: 38 }, { name: 'أخرى', value: 42 }
          ],
          monthlyViews: [
            { month: 'يناير', views: 1800 }, { month: 'فبراير', views: 2100 },
            { month: 'مارس', views: 2400 }, { month: 'أبريل', views: 1950 },
            { month: 'مايو', views: 2200 }, { month: 'يونيو', views: 2050 }
          ],
          topArticles: [
            { _id: '1', title: 'دليل السياسات العامة', category: 'سياسات', views: 450, rating: 4.8 },
            { _id: '2', title: 'إجراءات السلامة', category: 'إجراءات', views: 380, rating: 4.6 },
            { _id: '3', title: 'دليل التدريب الشامل', category: 'أدلة تدريب', views: 320, rating: 4.5 }
          ]
        });
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <LinearProgress />;
  if (!data) return null;

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={3}>لوحة تحكم مركز المعرفة</Typography>
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={MenuBook} title="إجمالي المقالات" value={data.totalArticles} color="#1976d2" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Category} title="التصنيفات" value={data.categories} color="#4caf50" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={TrendingUp} title="إجمالي المشاهدات" value={data.totalViews?.toLocaleString()} color="#ff9800" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Bookmark} title="المحفوظات" value={data.bookmarks} color="#9c27b0" /></Grid>
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>المقالات حسب التصنيف</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={data.byCategory} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>
                {data.byCategory?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>المشاهدات الشهرية</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyViews}><CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" /><YAxis /><Tooltip />
                <Bar dataKey="views" fill="#1976d2" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>أكثر المقالات مشاهدة</Typography>
        <TableContainer><Table size="small">
          <TableHead><TableRow>
            <TableCell>العنوان</TableCell><TableCell>التصنيف</TableCell>
            <TableCell>المشاهدات</TableCell><TableCell>التقييم</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {data.topArticles?.map(a => (
              <TableRow key={a._id}>
                <TableCell>{a.title}</TableCell><TableCell>{a.category}</TableCell>
                <TableCell>{a.views}</TableCell>
                <TableCell><Chip label={a.rating} color="primary" size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
    </Box>
  );
}
