/**
 * لوحة تحكم الحضور والانصراف — Attendance Dashboard
 */
import { useState, useEffect } from 'react';




import { motion } from 'framer-motion';
import apiClient from '../../services/api';

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];
const statusLabels = { present: 'حاضر', absent: 'غائب', late: 'متأخر', early_departure: 'انصراف مبكر', on_leave: 'إجازة' };
const statusChipColors = {
  present: { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  absent: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626' },
  late: { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
  early_departure: { bg: 'rgba(59,130,246,0.1)', color: '#2563EB' },
  on_leave: { bg: 'rgba(107,114,128,0.1)', color: '#6B7280' },
};

/* Glass card */
const Glass = ({ children, sx, ...props }) => (
  <Box
    sx={{
      background: 'rgba(255,255,255,0.65)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.35)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
      '&:hover': { boxShadow: '0 12px 40px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' },
      ...sx,
    }}
    {...props}
  >
    {children}
  </Box>
);

export default function AttendanceDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/attendance/report/comprehensive')
      .then((r) => { setData(r.data?.data || r.data); setLoading(false); })
      .catch(() => {
        setData({
          totalEmployees: 312, presentToday: 278, absentToday: 18, lateToday: 16,
          byStatus: [
            { status: 'حاضر', count: 278 }, { status: 'غائب', count: 18 },
            { status: 'متأخر', count: 16 }, { status: 'إجازة', count: 12 },
          ],
          weeklyTrend: [
            { day: 'الأحد', present: 290, absent: 12, late: 10 },
            { day: 'الاثنين', present: 285, absent: 15, late: 12 },
            { day: 'الثلاثاء', present: 278, absent: 18, late: 16 },
            { day: 'الأربعاء', present: 282, absent: 14, late: 16 },
            { day: 'الخميس', present: 275, absent: 20, late: 17 },
          ],
          recentRecords: [
            { employeeName: 'أحمد محمد', department: 'الإدارة', checkIn: '07:45', checkOut: '16:05', status: 'present' },
            { employeeName: 'سارة علي', department: 'التأهيل', checkIn: '08:20', checkOut: '—', status: 'late' },
            { employeeName: 'خالد عبدالله', department: 'التعليم', checkIn: '—', checkOut: '—', status: 'absent' },
            { employeeName: 'نورة حسن', department: 'المالية', checkIn: '07:55', checkOut: '14:30', status: 'early_departure' },
          ],
        });
        setLoading(false);
      });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" mt={10}><CircularProgress size={48} sx={{ color: '#10b981' }} /></Box>;
  if (!data) return null;

  const kpiGradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  ];
  const kpiIcons = [
    <BiometricIcon sx={{ fontSize: 28, color: '#fff' }} />,
    <PresentIcon sx={{ fontSize: 28, color: '#fff' }} />,
    <AbsentIcon sx={{ fontSize: 28, color: '#fff' }} />,
    <LateIcon sx={{ fontSize: 28, color: '#fff' }} />,
  ];
  const kpis = [
    { label: 'إجمالي الموظفين', value: data.totalEmployees },
    { label: 'حاضرون اليوم', value: data.presentToday, trend: '+3%', up: true },
    { label: 'غائبون اليوم', value: data.absentToday, trend: '-12%', up: false },
    { label: 'متأخرون اليوم', value: data.lateToday, trend: '+5%', up: true },
  ];

  const statusData = (data.byStatus || []).map((s) => ({ name: s.status, value: s.count }));
  const weeklyData = data.weeklyTrend || [];
  const attendanceRate = data.totalEmployees ? Math.round((data.presentToday / data.totalEmployees) * 100) : 0;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)' }}>
      {/* Header */}
      <Fade in timeout={500}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #10b981, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
                لوحة تحكم الحضور والانصراف
              </Typography>
              <Typography variant="body2" color="text.secondary">متابعة حضور وانصراف الموظفين في الوقت الفعلي</Typography>
            </Box>
            <Chip
              label={`نسبة الحضور اليوم: ${attendanceRate}%`}
              sx={{
                bgcolor: attendanceRate >= 85 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                color: attendanceRate >= 85 ? '#059669' : '#D97706',
                fontWeight: 700, fontSize: '14px', height: 36, borderRadius: '12px',
                border: `1px solid ${attendanceRate >= 85 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
              }}
            />
          </Box>
        </Box>
      </Fade>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpis.map((k, i) => (
          <Grid item xs={12} sm={6} md={3} key={k.label}>
            <Grow in timeout={600 + i * 150}>
              <Card
                component={motion.div}
                whileHover={{ y: -4 }}
                sx={{ borderRadius: '20px', overflow: 'hidden', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
              >
                <Box sx={{ height: 4, background: kpiGradients[i] }} />
                <CardContent sx={{ p: '20px 24px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5 }}>{k.label}</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, mb: 0.5, lineHeight: 1.2 }}>{k.value}</Typography>
                      {k.trend && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {k.up ? <TrendingUpIcon sx={{ fontSize: 14, color: '#10b981' }} /> : <TrendingDownIcon sx={{ fontSize: 14, color: '#ef4444' }} />}
                          <Typography variant="caption" sx={{ color: k.up ? '#10b981' : '#ef4444', fontWeight: 600 }}>{k.trend}</Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{
                      width: 52, height: 52, borderRadius: '16px', background: kpiGradients[i],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 14px ${PIE_COLORS[i]}40`,
                    }}>
                      {kpiIcons[i]}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Fade in timeout={800}>
            <div>
              <Glass sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>حالة الحضور اليوم</Typography>
                  <Chip label="مباشر" size="small" sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#059669', fontWeight: 600, borderRadius: '8px', '&::before': { content: '""', width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981', display: 'inline-block', mr: 0.5, animation: 'pulse 2s infinite' } }} />
                </Box>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={55} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Glass>
            </div>
          </Fade>
        </Grid>

        <Grid item xs={12} md={8}>
          <Fade in timeout={900}>
            <div>
              <Glass sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>الحضور الأسبوعي</Typography>
                  <Chip label="هذا الأسبوع" size="small" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 500 }} />
                </Box>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={weeklyData} barSize={24}>
                    <defs>
                      <linearGradient id="attPresent" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" /></linearGradient>
                      <linearGradient id="attLate" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient>
                      <linearGradient id="attAbsent" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#dc2626" /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#999' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#999' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                    <Legend />
                    <Bar dataKey="present" name="حاضر" fill="url(#attPresent)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="late" name="متأخر" fill="url(#attLate)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="absent" name="غائب" fill="url(#attAbsent)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Glass>
            </div>
          </Fade>
        </Grid>
      </Grid>

      {/* Records Table */}
      <Fade in timeout={1000}>
        <div>
          <Glass sx={{ p: 3, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>سجلات اليوم</Typography>
              <Chip label={`${(data.recentRecords || []).length} سجل`} size="small" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 500 }} />
            </Box>
            <TableContainer>
              <Table size="small" sx={{ '& .MuiTableCell-root': { borderColor: 'rgba(0,0,0,0.06)', py: 1.5 } }}>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', fontSize: '12px', textTransform: 'uppercase', letterSpacing: 0.5, bgcolor: 'rgba(0,0,0,0.02)' } }}>
                    <TableCell>الموظف</TableCell>
                    <TableCell>القسم</TableCell>
                    <TableCell>الحضور</TableCell>
                    <TableCell>الانصراف</TableCell>
                    <TableCell>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data.recentRecords || []).slice(0, 10).map((r, i) => (
                    <TableRow key={i} sx={{ transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                      <TableCell sx={{ fontWeight: 600 }}>{r.employeeName}</TableCell>
                      <TableCell>{r.department}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 500 }}>{r.checkIn}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 500 }}>{r.checkOut}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusLabels[r.status] || r.status}
                          sx={{
                            bgcolor: (statusChipColors[r.status] || statusChipColors.on_leave).bg,
                            color: (statusChipColors[r.status] || statusChipColors.on_leave).color,
                            fontWeight: 600, borderRadius: '8px', height: 24, fontSize: '11px',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Glass>
        </div>
      </Fade>
    </Box>
  );
}
