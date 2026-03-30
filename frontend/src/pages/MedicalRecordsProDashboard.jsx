/**
 * MedicalRecordsProDashboard — لوحة السجلات الطبية البريميوم
 * Premium Glassmorphism Dashboard for Medical Records Management
 *
 * Gradient: #06b6d4 → #6366f1 → #10b981
 */

import { useState } from 'react';
import {
  Box, Typography, Grid, Card, useTheme, alpha, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import DescriptionIcon from '@mui/icons-material/Description';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VerifiedIcon from '@mui/icons-material/Verified';
import FindInPageIcon from '@mui/icons-material/FindInPage';

// ─── Fake Data ──────────────────────────────────────────────────────────────
const KPI_DATA = [
  { title: 'سجل طبي فعّال', value: '٤,٨٤٢', change: '+٣٤', icon: FolderSharedIcon, color: '#06b6d4' },
  { title: 'مستند مرفوع اليوم', value: '١٨٧', change: '+٢٣', icon: CloudUploadIcon, color: '#6366f1' },
  { title: 'طلب استرجاع', value: '٤٥', change: '+٧', icon: FindInPageIcon, color: '#10b981' },
  { title: 'نسبة الرقمنة', value: '٨٧٪', change: '+٢٪', icon: QrCodeScannerIcon, color: '#f59e0b' },
];

const monthlyRecords = [
  { month: 'يناير', created: 245, updated: 412, archived: 56 },
  { month: 'فبراير', created: 268, updated: 445, archived: 62 },
  { month: 'مارس', created: 312, updated: 520, archived: 78 },
  { month: 'أبريل', created: 287, updated: 478, archived: 65 },
  { month: 'مايو', created: 334, updated: 556, archived: 82 },
  { month: 'يونيو', created: 356, updated: 590, archived: 91 },
];

const recordTypes = [
  { name: 'ملفات مرضى', value: 2400, color: '#06b6d4' },
  { name: 'تقارير طبية', value: 1200, color: '#6366f1' },
  { name: 'نتائج مخبرية', value: 800, color: '#10b981' },
  { name: 'تقارير أشعة', value: 520, color: '#f59e0b' },
  { name: 'وصفات طبية', value: 380, color: '#ec4899' },
];

const complianceRadar = [
  { metric: 'اكتمال البيانات', value: 92 },
  { metric: 'دقة الترميز', value: 95 },
  { metric: 'التوقيع الطبي', value: 88 },
  { metric: 'سرعة الإدخال', value: 85 },
  { metric: 'حماية البيانات', value: 97 },
  { metric: 'الأرشفة', value: 90 },
];

const deptProgress = [
  { dept: 'التأهيل', records: 1240, digitized: 1180, color: '#06b6d4' },
  { dept: 'الباطنة', records: 980, digitized: 890, color: '#6366f1' },
  { dept: 'الجراحة', records: 720, digitized: 680, color: '#10b981' },
  { dept: 'الأطفال', records: 540, digitized: 470, color: '#f59e0b' },
];

const deptDocuments = [
  { dept: 'التأهيل', count: 3420 },
  { dept: 'الباطنة', count: 2840 },
  { dept: 'الجراحة', count: 2150 },
  { dept: 'العيادات', count: 1890 },
  { dept: 'الطوارئ', count: 1560 },
];

const recentRecords = [
  { id: 'MR-4842', patient: 'محمد العتيبي', type: 'ملف مريض', action: 'تحديث', dept: 'التأهيل', time: '٠٩:١٥' },
  { id: 'MR-4841', patient: 'سارة الشمري', type: 'تقرير طبي', action: 'إنشاء', dept: 'الباطنة', time: '٠٩:٣٠' },
  { id: 'MR-4840', patient: 'عبدالله القحطاني', type: 'نتائج مخبرية', action: 'أرشفة', dept: 'المختبر', time: '١٠:٠٠' },
  { id: 'MR-4839', patient: 'نورة الدوسري', type: 'تقرير أشعة', action: 'تحديث', dept: 'الأشعة', time: '١٠:٤٥' },
  { id: 'MR-4838', patient: 'فهد المطيري', type: 'وصفة طبية', action: 'إنشاء', dept: 'العيادات', time: '١١:١٥' },
];

// ─── Glassmorphism Card ─────────────────────────────────────────────────────
function GlassCard({ children, sx = {}, delay = 0 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card
        elevation={0}
        sx={{
          borderRadius: '20px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
          background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
          p: 2.5, height: '100%', ...sx,
        }}
      >
        {children}
      </Card>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function MedicalRecordsProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const GRADIENT = 'linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #10b981 100%)';

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh', p: { xs: 2, md: 3 } }}>
      {/* ── Hero Header ───────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box sx={{
          borderRadius: '24px', overflow: 'hidden', mb: 3, p: { xs: 3, md: 4 },
          background: isDark
            ? 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(99,102,241,0.15) 50%, rgba(16,185,129,0.1) 100%)'
            : 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(99,102,241,0.07) 50%, rgba(16,185,129,0.05) 100%)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(6,182,212,0.15)'}`,
          backdropFilter: 'blur(20px)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: '14px', background: GRADIENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(6,182,212,0.4)',
            }}>
              <FolderSharedIcon sx={{ fontSize: 26, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.7rem' },
                background: GRADIENT, WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                لوحة السجلات الطبية
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
                إدارة الملفات الطبية والرقمنة والأرشفة والامتثال
              </Typography>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {KPI_DATA.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <GlassCard delay={0.1 * i}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.78rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', mb: 0.5 }}>
                      {kpi.title}
                    </Typography>
                    <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      {kpi.value}
                    </Typography>
                    <Chip label={kpi.change} size="small" sx={{
                      mt: 0.5, height: 20, fontSize: '0.68rem', fontWeight: 700,
                      backgroundColor: alpha(kpi.color, 0.12), color: kpi.color,
                    }} />
                  </Box>
                  <Box sx={{
                    width: 44, height: 44, borderRadius: '12px',
                    background: `${kpi.color}18`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon sx={{ fontSize: 22, color: kpi.color }} />
                  </Box>
                </Box>
              </GlassCard>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Charts Row 1 ─────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <GlassCard delay={0.3}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              حركة السجلات الشهرية
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyRecords}>
                <defs>
                  <linearGradient id="mrCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mrUpdated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
                <Legend />
                <Area type="monotone" dataKey="created" name="إنشاء" stroke="#06b6d4" fill="url(#mrCreated)" strokeWidth={2} />
                <Area type="monotone" dataKey="updated" name="تحديث" stroke="#6366f1" fill="url(#mrUpdated)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <GlassCard delay={0.4}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              أنواع السجلات
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={recordTypes} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {recordTypes.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Charts Row 2 ─────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <GlassCard delay={0.5}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              مؤشرات الامتثال
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={complianceRadar}>
                <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} />
                <Radar name="الامتثال" dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <GlassCard delay={0.6}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              تقدم الرقمنة حسب القسم
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {deptProgress.map((d, i) => (
                <Box key={i}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
                      {d.dept}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
                      {Math.round((d.digitized / d.records) * 100)}٪
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(d.digitized / d.records) * 100}
                    sx={{
                      height: 8, borderRadius: 4,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      '& .MuiLinearProgress-bar': { borderRadius: 4, background: `linear-gradient(90deg, ${d.color}, ${d.color}CC)` },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <GlassCard delay={0.7}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              المستندات حسب القسم
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptDocuments} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} width={60} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                <Bar dataKey="count" name="مستندات" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Recent Records Table ──────────────────────────────────── */}
      <GlassCard delay={0.8}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
          آخر حركات السجلات
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['رقم السجل', 'المريض', 'النوع', 'الإجراء', 'القسم', 'الوقت'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {recentRecords.map((row) => (
                <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#06b6d4', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.id}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#E2E8F0' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.patient}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#E2E8F0' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.type}</TableCell>
                  <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <Chip label={row.action} size="small" sx={{
                      height: 22, fontSize: '0.7rem', fontWeight: 600,
                      backgroundColor: row.action === 'إنشاء' ? alpha('#10b981', 0.12) : row.action === 'تحديث' ? alpha('#06b6d4', 0.12) : alpha('#f59e0b', 0.12),
                      color: row.action === 'إنشاء' ? '#10b981' : row.action === 'تحديث' ? '#06b6d4' : '#f59e0b',
                    }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.dept}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassCard>
    </Box>
  );
}
