/**
 * لوحة تحكم التوظيف — Recruitment Dashboard
 */
import { useState, useEffect } from 'react';





import { getDashboard } from '../../services/recruitment.service';

const stageLabels = {
  new: 'جديد', screening: 'فرز', shortlisted: 'مرشح', interview: 'مقابلة',
  assessment: 'تقييم', offer: 'عرض', hired: 'تم التوظيف', rejected: 'مرفوض', withdrawn: 'منسحب',
};
const sourceLabels = { website: 'الموقع', linkedin: 'لينكدإن', referral: 'إحالة', job_board: 'منصة توظيف', social_media: 'تواصل اجتماعي', other: 'أخرى' };
const PIE_COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4', '#795548', '#607d8b', '#e91e63'];

export default function RecruitmentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then((r) => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const kpis = [
    { label: 'الوظائف', value: data.totalJobs, icon: <JobIcon />, bg: '#e3f2fd' },
    { label: 'وظائف مفتوحة', value: data.openJobs, icon: <JobIcon />, bg: '#e8f5e9' },
    { label: 'إجمالي التقديمات', value: data.totalApplications, icon: <ApplicantIcon />, bg: '#fff3e0' },
    { label: 'المقابلات المجدولة', value: data.interviewsScheduled, icon: <InterviewIcon />, bg: '#f3e5f5' },
  ];

  const stageData = (data.byStage || []).map((s, i) => ({
    name: stageLabels[s.stage] || s.stage, value: s.count, color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const sourceData = (data.bySource || []).map((s) => ({
    source: sourceLabels[s.source] || s.source, count: s.count,
  }));

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>لوحة تحكم التوظيف</Typography>

      <Grid container spacing={2} mb={3}>
        {kpis.map((k) => (
          <Grid item xs={12} sm={6} md={3} key={k.label}>
            <Card sx={{ bgcolor: k.bg }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {k.icon}
                <Box>
                  <Typography variant="h5" fontWeight="bold">{k.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{k.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>حسب المرحلة</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {stageData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>حسب المصدر</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>أحدث التقديمات</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الرقم</TableCell>
                  <TableCell>المتقدم</TableCell>
                  <TableCell>المرحلة</TableCell>
                  <TableCell>التقييم</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.recentApplications || []).map((a) => (
                  <TableRow key={a._id}>
                    <TableCell>{a.applicationNumber}</TableCell>
                    <TableCell>{a.applicant?.firstName} {a.applicant?.lastName}</TableCell>
                    <TableCell>
                      <Chip size="small" label={stageLabels[a.stage] || a.stage} color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>{'★'.repeat(a.rating || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
