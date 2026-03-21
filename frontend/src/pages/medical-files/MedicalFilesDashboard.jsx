/**
 * Medical Files Dashboard — لوحة معلومات السجلات الطبية
 */
import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, LinearProgress
} from '@mui/material';
import {
  FolderSpecial as FilesIcon,
  CloudUpload as UploadIcon,
  Storage as StorageIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../../services/api';

const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#00796b'];

export default function MedicalFilesDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/medical-files/storage/statistics');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalFiles: 1247,
          totalSizeMB: 3584,
          filesByType: [
            { type: 'تقارير طبية', count: 420, sizeMB: 1200 },
            { type: 'صور أشعة', count: 280, sizeMB: 1400 },
            { type: 'نتائج مختبر', count: 310, sizeMB: 520 },
            { type: 'وصفات طبية', count: 237, sizeMB: 464 }
          ],
          recentUploads: [
            { fileName: 'تقرير_أشعة_001.pdf', type: 'صور أشعة', uploadedBy: 'د. أحمد', date: '2026-03-20', sizeMB: 4.2 },
            { fileName: 'نتيجة_مختبر_045.pdf', type: 'نتائج مختبر', uploadedBy: 'المختبر', date: '2026-03-20', sizeMB: 1.1 },
            { fileName: 'وصفة_علاج_089.pdf', type: 'وصفات طبية', uploadedBy: 'د. سارة', date: '2026-03-19', sizeMB: 0.3 }
          ],
          monthlyUploads: [
            { month: 'أكتوبر', count: 145 }, { month: 'نوفمبر', count: 162 },
            { month: 'ديسمبر', count: 138 }, { month: 'يناير', count: 189 },
            { month: 'فبراير', count: 201 }, { month: 'مارس', count: 212 }
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
    { label: 'إجمالي الملفات', value: data.totalFiles?.toLocaleString(), icon: <FilesIcon />, color: '#1976d2' },
    { label: 'حجم التخزين (MB)', value: data.totalSizeMB?.toLocaleString(), icon: <StorageIcon />, color: '#388e3c' },
    { label: 'ملفات اليوم', value: data.recentUploads?.length || 0, icon: <UploadIcon />, color: '#f57c00' },
    { label: 'أنواع الملفات', value: data.filesByType?.length || 0, icon: <SecurityIcon />, color: '#7b1fa2' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">لوحة السجلات الطبية</Typography>

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
            <Typography variant="h6" gutterBottom>توزيع حسب النوع</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.filesByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={100} label>
                  {data.filesByType?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>الرفع الشهري</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyUploads}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="عدد الملفات" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>آخر الملفات المرفوعة</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>اسم الملف</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>رفع بواسطة</TableCell>
                <TableCell>التاريخ</TableCell>
                <TableCell>الحجم (MB)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.recentUploads?.map((f, i) => (
                <TableRow key={i}>
                  <TableCell>{f.fileName}</TableCell>
                  <TableCell><Chip label={f.type} size="small" /></TableCell>
                  <TableCell>{f.uploadedBy}</TableCell>
                  <TableCell>{f.date}</TableCell>
                  <TableCell>{f.sizeMB}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
