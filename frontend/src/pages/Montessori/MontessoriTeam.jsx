/**
 * MontessoriTeam — إدارة فريق العمل وأولياء الأمور (Professional v2)
 *
 * Features:
 *  - Gradient header with action buttons
 *  - Animated KPI cards with easeOutExpo counter
 *  - Professional pie chart with SVG gradients & glassmorphism tooltips
 *  - Tabbed interface: Team Members + Parents
 *  - Card-based team view with gradient role accents
 *  - Professional table for parents with alpha() hover
 *  - Full CRUD with ConfirmDialog
 *  - Export CSV support
 *
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Typography, Grid, Paper, Box, Avatar,
  Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Button, TextField, MenuItem, IconButton,
  Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Tab, Tabs, Stack, InputAdornment, Card, CardContent, CardActions,
  useTheme, alpha,
} from '@mui/material';
import {
  Group as TeamIcon,
  FamilyRestroom as ParentIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  SupervisorAccount as SupervisorIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ConfirmDialog, { useConfirmDialog } from '../../components/common/ConfirmDialog';
import { gradients, statusColors } from '../../theme/palette';
import { ChartTooltip } from '../../components/dashboard/shared/ChartTooltip';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';
import logger from '../../utils/logger';
import montessoriService from '../../services/montessoriService';

/* ─── Animated counter ─── */
const useAnimatedCounter = (endValue, duration = 1200) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !endValue) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ran.current) {
        ran.current = true;
        const t0 = Date.now();
        const step = () => {
          const p = Math.min((Date.now() - t0) / duration, 1);
          setCount(Math.floor((p === 1 ? 1 : 1 - Math.pow(2, -10 * p)) * endValue));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [endValue, duration]);
  return { count, ref };
};

const MiniKPI = ({ label, value, icon, gradient, delay = 0 }) => {
  const numVal = typeof value === 'number' ? value : parseInt(value) || 0;
  const { count, ref } = useAnimatedCounter(numVal, 1200);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }} whileHover={{ y: -4, scale: 1.02 }} style={{ height: '100%' }}>
      <Paper elevation={0} sx={{
        p: 2, borderRadius: 3, background: gradient, color: '#fff', height: '100%',
        position: 'relative', overflow: 'hidden',
        '&::after': { content: '""', position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 42, height: 42 }}>{icon}</Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>{count.toLocaleString('ar-SA')}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>{label}</Typography>
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

/* ── Demo / Constants ── */
const DEMO_TEAM = [
  { _id: 't1', name: 'أ. نورة محمد الشمري', role: 'معلم', contact: { phone: '0501234567', email: 'noura@alawael.com' } },
  { _id: 't2', name: 'د. فاطمة علي الأحمد', role: 'أخصائي', contact: { phone: '0509876543', email: 'fatima@alawael.com' } },
  { _id: 't3', name: 'أ. خالد سعد العتيبي', role: 'مشرف', contact: { phone: '0551112233', email: 'khaled@alawael.com' } },
  { _id: 't4', name: 'أ. سارة أحمد المنصور', role: 'معلم', contact: { phone: '0561234567', email: 'sara@alawael.com' } },
  { _id: 't5', name: 'أ. محمد عبدالله القحطاني', role: 'مدير', contact: { phone: '0541234567', email: 'mohammed@alawael.com' } },
];
const DEMO_PARENTS = [
  { _id: 'pr1', name: 'محمد العلي', phone: '0501111111', email: 'mali@gmail.com', students: [{ fullName: 'أحمد محمد العلي' }] },
  { _id: 'pr2', name: 'خالد المحمد', phone: '0502222222', email: 'km@gmail.com', students: [{ fullName: 'سارة خالد المحمد' }] },
  { _id: 'pr3', name: 'فهد الأحمد', phone: '0503333333', email: 'fa@gmail.com', students: [{ fullName: 'عبدالله فهد الأحمد' }] },
  { _id: 'pr4', name: 'سعد الحربي', phone: '0504444444', email: 'sh@gmail.com', students: [{ fullName: 'لمى سعد الحربي' }] },
];
const TEAM_ROLES = ['مدير', 'معلم', 'أخصائي', 'مشرف'];
const roleColors = { 'مدير': '#e91e63', 'معلم': '#2196f3', 'أخصائي': '#4caf50', 'مشرف': '#ff9800' };
const roleGradients = {
  'مدير': 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)',
  'معلم': 'linear-gradient(135deg, #2196f3 0%, #1565c0 100%)',
  'أخصائي': 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
  'مشرف': 'linear-gradient(135deg, #ff9800 0%, #e65100 100%)',
};
const roleIcons = { 'مدير': <SupervisorIcon />, 'معلم': <PersonIcon />, 'أخصائي': <BadgeIcon />, 'مشرف': <SupervisorIcon /> };
const CHART_COLORS = ['#e91e63', '#2196f3', '#4caf50', '#ff9800'];
const arr = (v) => (Array.isArray(v) ? v : []);

/* ══════════════════════════════════════════════════════════════════ */
const MontessoriTeam = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const isDark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState([]);
  const [parents, setParents] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');

  // Team dialog
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editTeamMember, setEditTeamMember] = useState(null);
  const [teamForm, setTeamForm] = useState({ name: '', role: 'معلم', contact: { phone: '', email: '' } });

  // Parent dialog
  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [editParent, setEditParent] = useState(null);
  const [parentForm, setParentForm] = useState({ name: '', phone: '', email: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.allSettled([
        montessoriService.getTeamMembers(),
        montessoriService.getParents(),
      ]);
      setTeam(arr(t.status === 'fulfilled' && t.value?.length ? t.value : DEMO_TEAM));
      setParents(arr(p.status === 'fulfilled' && p.value?.length ? p.value : DEMO_PARENTS));
    } catch {
      setTeam(DEMO_TEAM);
      setParents(DEMO_PARENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredTeam = team.filter((t) => !search || t.name?.toLowerCase().includes(search.toLowerCase()));
  const filteredParents = parents.filter((p) => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

  /* ── Charts ── */
  const roleDistribution = TEAM_ROLES.map((r) => ({
    name: r, value: team.filter((t) => t.role === r).length,
  })).filter((d) => d.value > 0);

  /* ── Team CRUD ── */
  const openCreateTeam = () => { setEditTeamMember(null); setTeamForm({ name: '', role: 'معلم', contact: { phone: '', email: '' } }); setTeamDialogOpen(true); };
  const openEditTeam = (member) => {
    setEditTeamMember(member);
    setTeamForm({ name: member.name || '', role: member.role || 'معلم', contact: { phone: member.contact?.phone || '', email: member.contact?.email || '' } });
    setTeamDialogOpen(true);
  };
  const handleSaveTeam = async () => {
    try {
      if (editTeamMember) { await montessoriService.updateTeamMember(editTeamMember._id, teamForm); showSnackbar('تم تحديث بيانات العضو', 'success'); }
      else { await montessoriService.createTeamMember(teamForm); showSnackbar('تم إضافة العضو', 'success'); }
      setTeamDialogOpen(false); loadData();
    } catch { showSnackbar('فشل الحفظ', 'error'); }
  };
  const handleDeleteTeam = (member) => {
    showConfirm({ title: 'حذف عضو', message: `هل أنت متأكد من حذف "${member.name}"؟`, confirmText: 'حذف', confirmColor: 'error',
      onConfirm: async () => { try { await montessoriService.deleteTeamMember(member._id); showSnackbar('تم حذف العضو', 'success'); loadData(); } catch { showSnackbar('فشل الحذف', 'error'); } },
    });
  };

  /* ── Parent CRUD ── */
  const openCreateParent = () => { setEditParent(null); setParentForm({ name: '', phone: '', email: '' }); setParentDialogOpen(true); };
  const openEditParent = (parent) => {
    setEditParent(parent);
    setParentForm({ name: parent.name || '', phone: parent.phone || '', email: parent.email || '' });
    setParentDialogOpen(true);
  };
  const handleSaveParent = async () => {
    try {
      if (editParent) { await montessoriService.updateParent(editParent._id, parentForm); showSnackbar('تم تحديث بيانات ولي الأمر', 'success'); }
      else { await montessoriService.createParent(parentForm); showSnackbar('تم إضافة ولي الأمر', 'success'); }
      setParentDialogOpen(false); loadData();
    } catch { showSnackbar('فشل الحفظ', 'error'); }
  };
  const handleDeleteParent = (parent) => {
    showConfirm({ title: 'حذف ولي أمر', message: `هل أنت متأكد من حذف "${parent.name}"؟`, confirmText: 'حذف', confirmColor: 'error',
      onConfirm: async () => { try { await montessoriService.deleteParent(parent._id); showSnackbar('تم حذف ولي الأمر', 'success'); loadData(); } catch { showSnackbar('فشل الحذف', 'error'); } },
    });
  };

  /* ── Export CSV ── */
  const handleExport = () => {
    if (activeTab === 0) {
      const hdr = 'الاسم,الدور,الهاتف,البريد';
      const rows = team.map((m) => `"${m.name}",${m.role},"${m.contact?.phone || '-'}","${m.contact?.email || '-'}"`);
      const blob = new Blob(['\uFEFF' + [hdr, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `montessori_team_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    } else {
      const hdr = 'الاسم,الهاتف,البريد,الأبناء';
      const rows = parents.map((p) => `"${p.name}","${p.phone || '-'}","${p.email || '-'}","${(p.students || []).map((s) => s.fullName || s).join(' / ')}"`);
      const blob = new Blob(['\uFEFF' + [hdr, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `montessori_parents_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    }
    showSnackbar('تم التصدير بنجاح', 'success');
  };

  /* ═══════ Render ═══════ */
  return (
    <DashboardErrorBoundary>
      <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>

        {/* Gradient Header */}
        <Box sx={{ background: gradients.accent, py: 3, px: 3, mb: -3, borderRadius: '0 0 20px 20px', position: 'relative', overflow: 'hidden',
          '&::after': { content: '""', position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' } }}>
          <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <Box>
                <Button startIcon={<BackIcon />} onClick={() => navigate('/montessori')} sx={{ color: '#fff', mb: 0.5 }}>العودة للوحة التحكم</Button>
                <Typography variant="h5" fontWeight={800} color="#fff">فريق العمل وأولياء الأمور</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>إدارة أعضاء الفريق التعليمي والتواصل مع أولياء الأمور</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title="تصدير CSV">
                  <IconButton onClick={handleExport} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}><DownloadIcon /></IconButton>
                </Tooltip>
                <Tooltip title="تحديث">
                  <IconButton onClick={loadData} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}><RefreshIcon /></IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ pt: 5, pb: 4 }}>
          {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {/* KPIs */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}><MiniKPI label="أعضاء الفريق" value={team.length} icon={<TeamIcon />} gradient={gradients.primary} delay={0} /></Grid>
            <Grid item xs={6} sm={3}><MiniKPI label="المعلمون" value={team.filter((t) => t.role === 'معلم').length} icon={<PersonIcon />} gradient={gradients.success} delay={1} /></Grid>
            <Grid item xs={6} sm={3}><MiniKPI label="أولياء الأمور" value={parents.length} icon={<ParentIcon />} gradient={gradients.warning} delay={2} /></Grid>
            <Grid item xs={6} sm={3}><MiniKPI label="الأخصائيون" value={team.filter((t) => t.role === 'أخصائي').length} icon={<BadgeIcon />} gradient={gradients.assessmentPurple} delay={3} /></Grid>
          </Grid>

          {/* Role Chart */}
          {roleDistribution.length > 0 && (
            <Paper elevation={0} sx={{ p: 2.5, mb: 3, maxWidth: 420, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>توزيع الأدوار</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <defs>
                    {roleDistribution.map((_, idx) => (
                      <linearGradient key={idx} id={`teamPie${idx}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={1} />
                        <stop offset="100%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.6} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie data={roleDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={36} paddingAngle={3} cornerRadius={4}
                    label={({ name, value }) => `${name}: ${value}`}>
                    {roleDistribution.map((_, idx) => <Cell key={idx} fill={`url(#teamPie${idx})`} stroke="none" />)}
                  </Pie>
                  <RTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          )}

          {/* Tabs */}
          <Paper elevation={0} sx={{ mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth"
              sx={{ '& .MuiTab-root': { fontWeight: 700, py: 1.5 } }}>
              <Tab icon={<TeamIcon />} label={`الفريق (${team.length})`} />
              <Tab icon={<ParentIcon />} label={`أولياء الأمور (${parents.length})`} />
            </Tabs>
          </Paper>

          {/* Search + action */}
          <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={5} md={4}>
                <TextField fullWidth size="small" placeholder="بحث بالاسم..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
              </Grid>
              <Grid item>
                <Button variant="contained" size="small" startIcon={<AddIcon />}
                  onClick={activeTab === 0 ? openCreateTeam : openCreateParent}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                  {activeTab === 0 ? 'إضافة عضو' : 'إضافة ولي أمر'}
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Tab: Team */}
          {activeTab === 0 && (
            filteredTeam.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}><EmptyState title="لا يوجد أعضاء في الفريق" /></Paper>
            ) : (
              <Grid container spacing={2.5}>
                {filteredTeam.map((member, i) => (
                  <Grid item xs={12} sm={6} md={4} key={member._id || i}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.4 }} whileHover={{ y: -4 }}>
                      <Card elevation={0} sx={{
                        height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3,
                        border: '1px solid', borderColor: 'divider', overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        '&:hover': { boxShadow: '0 8px 28px rgba(0,0,0,0.1)', borderColor: roleColors[member.role] || 'primary.main' },
                      }}>
                        {/* Gradient role strip */}
                        <Box sx={{ height: 4, background: roleGradients[member.role] || gradients.primary }} />
                        <CardContent sx={{ flex: 1, p: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                            <Avatar sx={{
                              width: 50, height: 50, background: roleGradients[member.role] || gradients.primary, color: '#fff',
                            }}>
                              {roleIcons[member.role] || <PersonIcon />}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight={700}>{member.name}</Typography>
                              <Chip label={member.role} size="small"
                                sx={{ bgcolor: (roleColors[member.role] || '#999') + '22', color: roleColors[member.role] || '#999', fontWeight: 600, borderRadius: 2 }} />
                            </Box>
                          </Box>
                          <Stack spacing={0.8}>
                            {member.contact?.phone && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PhoneIcon fontSize="small" color="action" />
                                <Typography variant="body2" dir="ltr">{member.contact.phone}</Typography>
                              </Box>
                            )}
                            {member.contact?.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <EmailIcon fontSize="small" color="action" />
                                <Typography variant="body2" dir="ltr">{member.contact.email}</Typography>
                              </Box>
                            )}
                          </Stack>
                        </CardContent>
                        <CardActions sx={{ px: 2.5, pb: 2, pt: 0 }}>
                          <Tooltip title="تعديل"><IconButton size="small" onClick={() => openEditTeam(member)} color="primary"><EditIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDeleteTeam(member)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </CardActions>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            )
          )}

          {/* Tab: Parents */}
          {activeTab === 1 && (
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              {filteredParents.length === 0 ? (
                <Box sx={{ p: 4 }}><EmptyState title="لا يوجد أولياء أمور" /></Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: isDark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.04) }}>
                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>رقم الجوال</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>البريد الإلكتروني</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الأبناء</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">إجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredParents.map((p, i) => (
                        <TableRow key={p._id || i} hover sx={{ '&:hover': { bgcolor: isDark ? alpha('#fff', 0.03) : alpha(theme.palette.primary.main, 0.02) } }}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 34, height: 34, background: gradients.warning, color: '#fff' }}><ParentIcon fontSize="small" /></Avatar>
                              <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell dir="ltr">{p.phone || '-'}</TableCell>
                          <TableCell dir="ltr">{p.email || '-'}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {(p.students || []).map((s, si) => (
                                <Chip key={si} label={s.fullName || s} size="small" variant="outlined" sx={{ borderRadius: 2 }} />
                              ))}
                              {(!p.students || p.students.length === 0) && '-'}
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="تعديل"><IconButton size="small" onClick={() => openEditParent(p)} color="primary"><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDeleteParent(p)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          )}

          {/* Team Dialog */}
          <Dialog open={teamDialogOpen} onClose={() => setTeamDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>{editTeamMember ? 'تعديل عضو الفريق' : 'إضافة عضو جديد'}</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12}>
                  <TextField fullWidth label="الاسم الكامل" value={teamForm.name} onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))} required />
                </Grid>
                <Grid item xs={12}>
                  <TextField select fullWidth label="الدور" value={teamForm.role} onChange={(e) => setTeamForm((f) => ({ ...f, role: e.target.value }))}>
                    {TEAM_ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="رقم الجوال" value={teamForm.contact.phone}
                    onChange={(e) => setTeamForm((f) => ({ ...f, contact: { ...f.contact, phone: e.target.value } }))} dir="ltr" />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="البريد الإلكتروني" value={teamForm.contact.email}
                    onChange={(e) => setTeamForm((f) => ({ ...f, contact: { ...f.contact, email: e.target.value } }))} dir="ltr" />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTeamDialogOpen(false)}>إلغاء</Button>
              <Button variant="contained" onClick={handleSaveTeam} disabled={!teamForm.name}>حفظ</Button>
            </DialogActions>
          </Dialog>

          {/* Parent Dialog */}
          <Dialog open={parentDialogOpen} onClose={() => setParentDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>{editParent ? 'تعديل ولي الأمر' : 'إضافة ولي أمر جديد'}</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12}>
                  <TextField fullWidth label="الاسم الكامل" value={parentForm.name} onChange={(e) => setParentForm((f) => ({ ...f, name: e.target.value }))} required />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="رقم الجوال" value={parentForm.phone} onChange={(e) => setParentForm((f) => ({ ...f, phone: e.target.value }))} dir="ltr" />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="البريد الإلكتروني" value={parentForm.email} onChange={(e) => setParentForm((f) => ({ ...f, email: e.target.value }))} dir="ltr" />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setParentDialogOpen(false)}>إلغاء</Button>
              <Button variant="contained" onClick={handleSaveParent} disabled={!parentForm.name}>حفظ</Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
      <ConfirmDialog {...confirmState} />
    </DashboardErrorBoundary>
  );
};

export default MontessoriTeam;
