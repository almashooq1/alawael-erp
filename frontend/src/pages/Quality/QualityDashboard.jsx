/**
 * لوحة تحكم الجودة والامتثال — Quality & Compliance Dashboard
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, CircularProgress, Chip, Fade, Grow,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, LinearProgress,
} from '@mui/material';
import {
  PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  VerifiedUser as QualityIcon,
  Gavel as ComplianceIcon,
  Assessment as AuditIcon,
  TrendingUp as IndicatorIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import apiClient from '../../services/api';

const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

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

export default function QualityDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/quality/dashboard')
      .then((r) => { setData(r.data?.data || r.data); setLoading(false); })
      .catch(() => {
        setData({
          totalStandards: 48, activeAudits: 6, complianceRate: 87, openFindings: 12,
          byCategory: [
            { category: 'معايير CBAHI', count: 18 }, { category: 'ISO 9001', count: 12 },
            { category: 'معايير داخلية', count: 10 }, { category: 'سلامة مرضى', count: 8 },
          ],
          complianceByDept: [
            { department: 'الإدارة', rate: 92 }, { department: 'التأهيل', rate: 88 },
            { department: 'التعليم', rate: 85 }, { department: 'تقنية المعلومات', rate: 90 },
            { department: 'المالية', rate: 82 }, { department: 'الخدمات', rate: 78 },
          ],
          recentAudits: [
            { auditNumber: 'AUD-2026-015', area: 'التأهيل الطبي', date: '2026-03-10', findings: 3, status: 'in_progress' },
            { auditNumber: 'AUD-2026-014', area: 'السلامة', date: '2026-03-05', findings: 1, status: 'completed' },
            { auditNumber: 'AUD-2026-013', area: 'الوثائق', date: '2026-02-28', findings: 5, status: 'completed' },
          ],
        });
        setLoading(false);
      });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" mt={10}><CircularProgress size={48} sx={{ color: '#8b5cf6' }} /></Box>;
  if (!data) return null;

  const kpiGradients = [
    'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  ];
  const kpiIcons = [
    <QualityIcon sx={{ fontSize: 28, color: '#fff' }} />,
    <AuditIcon sx={{ fontSize: 28, color: '#fff' }} />,
    <ComplianceIcon sx={{ fontSize: 28, color: '#fff' }} />,
    <IndicatorIcon sx={{ fontSize: 28, color: '#fff' }} />,
  ];
  const kpis = [
    { label: 'المعايير المعتمدة', value: data.totalStandards },
    { label: 'تدقيقات نشطة', value: data.activeAudits },
    { label: 'نسبة الامتثال', value: `${data.complianceRate}%` },
    { label: 'ملاحظات مفتوحة', value: data.openFindings },
  ];

  const categoryData = (data.byCategory || []).map((c) => ({ name: c.category, value: c.count }));
  const deptCompliance = (data.complianceByDept || []).map((d) => ({ name: d.department, rate: d.rate }));

  const deptGradients = [
    'linear-gradient(90deg, #8b5cf6, #a78bfa)',
    'linear-gradient(90deg, #3b82f6, #60a5fa)',
    'linear-gradient(90deg, #10b981, #34d399)',
    'linear-gradient(90deg, #f59e0b, #fbbf24)',
    'linear-gradient(90deg, #ec4899, #f472b6)',
    'linear-gradient(90deg, #6366f1, #818cf8)',
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', background: 'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 50%, #eef2ff 100%)' }}>
      {/* Header */}
      <Fade in timeout={500}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
                لوحة تحكم الجودة والامتثال
              </Typography>
              <Typography variant="body2" color="text.secondary">مراقبة المعايير ونسب الامتثال والتدقيقات</Typography>
            </Box>
            <Chip
              label={`نسبة الامتثال: ${data.complianceRate}%`}
              sx={{
                bgcolor: data.complianceRate >= 85 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                color: data.complianceRate >= 85 ? '#059669' : '#D97706',
                fontWeight: 700, fontSize: '14px', height: 36, borderRadius: '12px',
                border: `1px solid ${data.complianceRate >= 85 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
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
                      <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, lineHeight: 1.2 }}>{k.value}</Typography>
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
        <Grid item xs={12} md={5}>
          <Fade in timeout={800}>
            <div>
              <Glass sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>المعايير حسب الفئة</Typography>
                  <Chip label={`${categoryData.length} فئات`} size="small" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 500 }} />
                </Box>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={50} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>الامتثال حسب القسم</Typography>
                  <Chip label="الأقسام" size="small" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 500 }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {deptCompliance.map((d, idx) => (
                    <Box key={d.name} sx={{ p: 1.5, borderRadius: '14px', bgcolor: 'rgba(0,0,0,0.015)', transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.name}</Typography>
                        <Chip
                          label={`${d.rate}%`}
                          size="small"
                          sx={{
                            bgcolor: d.rate >= 90 ? 'rgba(16,185,129,0.1)' : d.rate >= 80 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                            color: d.rate >= 90 ? '#059669' : d.rate >= 80 ? '#D97706' : '#DC2626',
                            fontWeight: 700, borderRadius: '8px', height: 24,
                          }}
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={d.rate}
                        sx={{
                          height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.04)',
                          '& .MuiLinearProgress-bar': { borderRadius: 3, background: deptGradients[idx % deptGradients.length] },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Glass>
            </div>
          </Fade>
        </Grid>
      </Grid>

      {/* Audits Table */}
      <Fade in timeout={1000}>
        <div>
          <Glass sx={{ p: 3, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>آخر التدقيقات</Typography>
              <Chip label={`${(data.recentAudits || []).length} تدقيق`} size="small" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 500 }} />
            </Box>
            <TableContainer>
              <Table size="small" sx={{ '& .MuiTableCell-root': { borderColor: 'rgba(0,0,0,0.06)', py: 1.5 } }}>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', fontSize: '12px', textTransform: 'uppercase', letterSpacing: 0.5, bgcolor: 'rgba(0,0,0,0.02)' } }}>
                    <TableCell>رقم التدقيق</TableCell>
                    <TableCell>المجال</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>الملاحظات</TableCell>
                    <TableCell>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data.recentAudits || []).slice(0, 8).map((a, i) => (
                    <TableRow key={i} sx={{ transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                      <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{a.auditNumber}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{a.area}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{a.date}</TableCell>
                      <TableCell>
                        <Chip label={a.findings} size="small" sx={{ bgcolor: a.findings >= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: a.findings >= 3 ? '#DC2626' : '#D97706', fontWeight: 700, borderRadius: '8px', height: 24, minWidth: 32 }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={a.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
                          sx={{
                            bgcolor: a.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                            color: a.status === 'completed' ? '#059669' : '#D97706',
                            fontWeight: 600, borderRadius: '8px', height: 24,
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
