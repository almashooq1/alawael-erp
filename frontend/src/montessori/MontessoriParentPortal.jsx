import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Alert, Paper, Chip } from '@mui/material';

const API = '/api/montessori/parent-portal';
const token = localStorage.getItem('montessori_token');

export default function MontessoriParentPortal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setData(d);
    } catch {
      setError('فشل في جلب بيانات الطالب');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return null;

  return (
    <Box mt={4}>
      <Typography variant="h5" mb={2}>بوابة ولي الأمر</Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">معلومات الطالب</Typography>
        <Typography>الاسم: {data.student?.fullName}</Typography>
        <Typography>العمر: {data.student?.age}</Typography>
        <Typography>الصف: {data.student?.classLevel}</Typography>
      </Paper>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">الخطط الفردية</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>المجال</TableCell>
              <TableCell>الهدف</TableCell>
              <TableCell>الأنشطة</TableCell>
              <TableCell>تاريخ مستهدف</TableCell>
              <TableCell>منجز؟</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data.plans || []).flatMap(p => p.goals.map((g, i) => (
              <TableRow key={p._id + '-' + i}>
                <TableCell>{g.area}</TableCell>
                <TableCell>{g.objective}</TableCell>
                <TableCell>{(g.activities || []).join(', ')}</TableCell>
                <TableCell>{g.targetDate ? g.targetDate.slice(0,10) : ''}</TableCell>
                <TableCell>{g.achieved ? <Chip label="نعم" color="success" /> : <Chip label="لا" color="warning" />}</TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </Paper>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">الجلسات والتقييمات</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>التاريخ</TableCell>
              <TableCell>الأنشطة</TableCell>
              <TableCell>ملاحظات</TableCell>
              <TableCell>تقييم</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data.sessions || []).map(s => (
              <TableRow key={s._id}>
                <TableCell>{s.date ? s.date.slice(0,10) : ''}</TableCell>
                <TableCell>{(s.activities || []).join(', ')}</TableCell>
                <TableCell>{s.notes}</TableCell>
                <TableCell>{s.evaluation}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">التقارير</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>العنوان</TableCell>
              <TableCell>المحتوى</TableCell>
              <TableCell>التاريخ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data.reports || []).map(r => (
              <TableRow key={r._id}>
                <TableCell>{r.title}</TableCell>
                <TableCell>{r.content?.slice(0, 40)}{r.content?.length > 40 ? '...' : ''}</TableCell>
                <TableCell>{r.date ? r.date.slice(0,10) : ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">الوسائط</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>العنوان</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>اسم الملف</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data.media || []).map(m => (
              <TableRow key={m._id}>
                <TableCell>{m.title}</TableCell>
                <TableCell>{m.type}</TableCell>
                <TableCell>{m.filename}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
