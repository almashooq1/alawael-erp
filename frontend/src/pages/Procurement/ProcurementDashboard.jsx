/**
 * لوحة تحكم المشتريات — Procurement Dashboard
 */
import { useState, useEffect } from 'react';




import { motion } from 'framer-motion';
import { getDashboard } from '../../services/procurement.service';

const statusLabels = { draft: 'مسودة', submitted: 'مقدّم', approved: 'معتمد', ordered: 'تم الطلب', received: 'مستلم' };
const PIE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

/* Glass card style */
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

export default function ProcurementDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then((r) => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" mt={10}><CircularProgress size={48} sx={{ color: '#6366f1' }} /></Box>;
  if (!data) return null;

  const kpiGradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ];
  const kpiIcons = [
    <OrderIcon sx={{ fontSize: 28, color: '#fff' }} />,
    <RequestIcon sx={{ fontSize: 28, color: '#fff' }} />,
    <VendorIcon sx={{ fontSize: 28, color: '#fff' }} />,
    <SpendIcon sx={{ fontSize: 28, color: '#fff' }} />,
  ];
  const kpis = [
    { label: 'أوامر الشراء', value: data.totalOrders },
    { label: 'طلبات معلّقة', value: data.pendingRequests },
    { label: 'الموردون', value: data.totalVendors },
    { label: 'إجمالي الإنفاق', value: `${(data.totalSpend || 0).toLocaleString()} ر.س` },
  ];

  const statusData = (data.byStatus || []).map((s, i) => ({
    name: statusLabels[s.status] || s.status, value: s.count, color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const vendorData = (data.topVendors || []).map((v) => ({ name: v.name, total: v.total }));

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%)' }}>
      {/* Header */}
      <Fade in timeout={500}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
            لوحة تحكم المشتريات
          </Typography>
          <Typography variant="body2" color="text.secondary">نظرة شاملة على أوامر الشراء والموردين والإنفاق</Typography>
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
                sx={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  position: 'relative',
                }}
              >
                <Box sx={{ height: 4, background: kpiGradients[i] }} />
                <CardContent sx={{ p: '20px 24px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, mb: 0.5, lineHeight: 1.2 }}>{k.value}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingUpIcon sx={{ fontSize: 14, color: '#10b981' }} />
                        <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>+12%</Typography>
                      </Box>
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
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Fade in timeout={800}>
            <div>
              <Glass sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>حسب الحالة</Typography>
                  <Chip label={`${statusData.length} حالات`} size="small" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 500 }} />
                </Box>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={50} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {statusData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Glass>
            </div>
          </Fade>
        </Grid>

        <Grid item xs={12} md={7}>
          <Fade in timeout={900}>
            <div>
              <Glass sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>أكبر الموردين</Typography>
                  <Chip label="إنفاق" size="small" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 500 }} />
                </Box>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={vendorData} barSize={32}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="100%" stopColor="#764ba2" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#999' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#999' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                    <Bar dataKey="total" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Glass>
            </div>
          </Fade>
        </Grid>
      </Grid>
    </Box>
  );
}
