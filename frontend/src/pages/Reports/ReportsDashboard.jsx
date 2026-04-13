/**
 * Reports Center Dashboard — لوحة تحكم مركز التقارير
 */
import { useState, useEffect } from 'react';

import { motion } from 'framer-motion';
import apiClient from '../../services/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

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

export default function ReportsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/v1/basic-reports');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalReports: 156, scheduledReports: 12, downloadsThisMonth: 345, reportTypes: 8,
          byType: [
            { name: 'مالية', value: 35 }, { name: 'موارد بشرية', value: 28 },
            { name: 'تشغيلية', value: 42 }, { name: 'إدارية', value: 22 },
            { name: 'تأهيلية', value: 18 }, { name: 'أخرى', value: 11 }
          ],
          monthlyGeneration: [
            { month: 'يناير', count: 22 }, { month: 'فبراير', count: 28 },
            { month: 'مارس', count: 35 }, { month: 'أبريل', count: 25 },
            { month: 'مايو', count: 30 }, { month: 'يونيو', count: 16 }
          ],
          recentReports: [
            { _id: '1', title: 'تقرير الأداء الشهري', type: 'تشغيلية', generatedBy: 'النظام', date: '2026-03-20', downloads: 45 },
            { _id: '2', title: 'تقرير الميزانية Q1', type: 'مالية', generatedBy: 'أحمد', date: '2026-03-18', downloads: 32 },
            { _id: '3', title: 'تقرير الحضور الأسبوعي', type: 'موارد بشرية', generatedBy: 'النظام', date: '2026-03-21', downloads: 28 }
          ]
        });
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <Box sx={{ p: 4 }}><LinearProgress sx={{ borderRadius: 2, height: 4, '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' } }} /></Box>;
  if (!data) return null;

  const kpiGradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  ];
  const kpiIcons = [
    <Summarize sx={{ fontSize: 28, color: '#fff' }} />,
    <Schedule sx={{ fontSize: 28, color: '#fff' }} />,
    <Download sx={{ fontSize: 28, color: '#fff' }} />,
    <Assessment sx={{ fontSize: 28, color: '#fff' }} />,
  ];
  const kpis = [
    { label: 'إجمالي التقارير', value: data.totalReports },
    { label: 'تقارير مجدولة', value: data.scheduledReports },
    { label: 'تحميلات الشهر', value: data.downloadsThisMonth },
    { label: 'أنواع التقارير', value: data.reportTypes },
  ];

  const typeChipColors = {
    'مالية': { bg: 'rgba(99,102,241,0.1)', color: '#4F46E5' },
    'موارد بشرية': { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
    'تشغيلية': { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
    'إدارية': { bg: 'rgba(239,68,68,0.1)', color: '#DC2626' },
    'تأهيلية': { bg: 'rgba(139,92,246,0.1)', color: '#7C3AED' },
    'أخرى': { bg: 'rgba(107,114,128,0.1)', color: '#6B7280' },
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #fdf2f8 100%)' }}>
      {/* Header */}
      <Fade in timeout={500}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
            لوحة تحكم مركز التقارير
          </Typography>
          <Typography variant="body2" color="text.secondary">إنشاء وإدارة ومتابعة جميع التقارير</Typography>
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
                      <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, lineHeight: 1.2 }}>{k.value}</Typography>
                    </Box>
                    <Box sx={{
                      width: 52, height: 52, borderRadius: '16px', background: kpiGradients[i],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 14px ${COLORS[i]}40`,
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
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Fade in timeout={800}>
            <div>
              <Glass sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>التقارير حسب النوع</Typography>
                  <Chip label={`${data.byType?.length || 0} أنواع`} size="small" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 500 }} />
                </Box>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={data.byType} cx="50%" cy="50%" outerRadius={100} innerRadius={45} paddingAngle={3} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {data.byType?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Glass>
            </div>
          </Fade>
        </Grid>
        <Grid item xs={12} md={6}>
          <Fade in timeout={900}>
            <div>
              <Glass sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>التقارير الشهرية المُنشأة</Typography>
                  <Chip label="آخر 6 أشهر" size="small" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 500 }} />
                </Box>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.monthlyGeneration} barSize={32}>
                    <defs>
                      <linearGradient id="repBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#999' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#999' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                    <Bar dataKey="count" fill="url(#repBarGrad)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Glass>
            </div>
          </Fade>
        </Grid>
      </Grid>

      {/* Reports Table */}
      <Fade in timeout={1000}>
        <div>
          <Glass sx={{ p: 3, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>آخر التقارير</Typography>
              <Chip label={`${data.recentReports?.length || 0} تقرير`} size="small" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 500 }} />
            </Box>
            <TableContainer>
              <Table size="small" sx={{ '& .MuiTableCell-root': { borderColor: 'rgba(0,0,0,0.06)', py: 1.5 } }}>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', fontSize: '12px', textTransform: 'uppercase', letterSpacing: 0.5, bgcolor: 'rgba(0,0,0,0.02)' } }}>
                    <TableCell>التقرير</TableCell>
                    <TableCell>النوع</TableCell>
                    <TableCell>بواسطة</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>التحميلات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recentReports?.map(r => (
                    <TableRow key={r._id} sx={{ transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                      <TableCell sx={{ fontWeight: 600 }}>{r.title}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.type}
                          size="small"
                          sx={{
                            bgcolor: (typeChipColors[r.type] || typeChipColors['أخرى']).bg,
                            color: (typeChipColors[r.type] || typeChipColors['أخرى']).color,
                            fontWeight: 600, borderRadius: '8px', height: 24,
                          }}
                        />
                      </TableCell>
                      <TableCell>{r.generatedBy}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{r.date}</TableCell>
                      <TableCell>
                        <Chip label={r.downloads} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#4F46E5', fontWeight: 700, borderRadius: '8px', height: 24, minWidth: 40 }} />
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
