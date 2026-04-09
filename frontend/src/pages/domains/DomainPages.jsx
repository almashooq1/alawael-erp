/**
 * Unified Domain Pages — صفحات المجالات الموحدة
 *
 * كل صفحة تعتمد على نمط موحد: list + filter + detail dialog
 * يتم تصدير جميع الصفحات من هنا لسهولة الاستيراد
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Avatar,
  Button, IconButton, Stack, LinearProgress, Alert, TextField,
  InputAdornment, Pagination, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, List, ListItem,
  ListItemText, ListItemIcon, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider,
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon, Add as AddIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

/* ── Generic Domain Page Factory ── */
function createDomainPage({ title, titleEn, icon, apiModule, columns, detailFields, statsConfig }) {
  return function DomainPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const perPage = 20;

    const load = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { page, limit: perPage, ...(search && { search }) };
        const res = await apiModule.list(params);
        const data = res?.data;
        if (data?.data) { setItems(data.data); setTotal(data.pagination?.total || data.total || data.data.length); }
        else if (Array.isArray(data)) { setItems(data); setTotal(data.length); }
        else { setItems([]); setTotal(0); }
      } catch (err) { setError(err.message); } finally { setLoading(false); }
    }, [page, search]);

    useEffect(() => { load(); }, [load]);

    const pageCount = Math.ceil(total / perPage);

    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold">{icon} {title}</Typography>
            <Typography variant="body2" color="text.secondary">{total} سجل</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" startIcon={<AddIcon />} size="small">إضافة</Button>
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </Stack>
        </Box>

        {/* Stats */}
        {statsConfig && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {statsConfig(items).map((s, i) => (
              <Grid item xs={6} md={3} key={i}>
                <Card variant="outlined" sx={{ borderRight: `4px solid ${s.color}` }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, '&:last-child': { pb: 1 } }}>
                    <Avatar sx={{ bgcolor: `${s.color}20`, color: s.color, width: 36, height: 36 }}>{s.icon}</Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" sx={{ color: s.color }}>{s.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Search */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <TextField
              fullWidth size="small" placeholder="بحث..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
          </CardContent>
        </Card>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {columns.map((c, i) => <TableCell key={i}>{c.label}</TableCell>)}
                <TableCell align="center">عرض</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 && !loading ? (
                <TableRow><TableCell colSpan={columns.length + 1} align="center" sx={{ py: 3 }}><Typography color="text.secondary">لا توجد بيانات</Typography></TableCell></TableRow>
              ) : items.map((item, i) => (
                <TableRow key={item._id || i} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(item)}>
                  {columns.map((c, ci) => (
                    <TableCell key={ci}>
                      {c.chip ? (
                        <Chip size="small" label={c.render ? c.render(item) : (item[c.field] || '-')} color={c.chipColor?.(item) || 'default'} />
                      ) : (
                        <Typography variant="body2">{c.render ? c.render(item) : (item[c.field] || '-')}</Typography>
                      )}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <IconButton size="small"><ViewIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {pageCount > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
          </Box>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
          {selected && (
            <>
              <DialogTitle>{title} — التفاصيل</DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2}>
                  {detailFields.map((f, i) => (
                    <Grid item xs={6} key={i}>
                      <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                      <Typography variant="body2">{f.render ? f.render(selected) : (selected[f.field] || '-')}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelected(null)}>إغلاق</Button>
                {selected.beneficiaryId && (
                  <Button variant="contained" onClick={() => { setSelected(null); navigate(`/beneficiaries/${selected.beneficiaryId}`); }}>ملف المستفيد</Button>
                )}
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    );
  };
}

/* ══════════════════════════════════════════════════════════════
   Exported Domain Pages
   ══════════════════════════════════════════════════════════════ */

import {
  assessmentsAPI, carePlansAPI, goalsAPI, groupTherapyAPI,
  teleRehabAPI, arVrAPI, behaviorAPI, familyAPI, programsAPI,
  aiRecommendationsAPI, researchAPI, fieldTrainingAPI,
} from '../../services/ddd';

import {
  Assignment as AssessIcon, ListAlt as PlanIcon,
  TrackChanges as GoalIcon, Groups as GroupIcon,
  Videocam as VideoIcon, Vrpano as VrIcon,
  Psychology as BehaviorIcon, FamilyRestroom as FamilyIcon,
  School as ProgramIcon, AutoAwesome as AIIcon,
  Biotech as ResearchIcon, ModelTraining as TrainingIcon,
  CheckCircle as CheckIcon, Warning as WarnIcon,
} from '@mui/icons-material';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ar-SA') : '-';

/* ── Assessments ── */
export const AssessmentsPage = createDomainPage({
  title: 'التقييمات السريرية', icon: '📊', apiModule: assessmentsAPI,
  columns: [
    { label: 'النوع', field: 'type', render: i => i.type || i.assessmentType || '-' },
    { label: 'الأداة', field: 'instrument', render: i => i.instrument || i.tool || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.date || i.createdAt) },
    { label: 'النتيجة', field: 'totalScore', render: i => i.totalScore ?? i.score ?? '-' },
    { label: 'الحالة', field: 'status', chip: true, chipColor: i => i.status === 'completed' ? 'success' : 'default' },
  ],
  detailFields: [
    { label: 'النوع', render: i => i.type || i.assessmentType || '-' },
    { label: 'الأداة', render: i => i.instrument || i.tool || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.date) },
    { label: 'النتيجة', render: i => `${i.totalScore ?? i.score ?? '-'}` },
    { label: 'المقيّم', render: i => i.assessor?.name || '-' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Care Plans ── */
export const CarePlansPage = createDomainPage({
  title: 'خطط الرعاية', icon: '📋', apiModule: carePlansAPI,
  columns: [
    { label: 'العنوان', render: i => i.title || i.name || '-' },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    { label: 'المراجعة', render: i => fmtDate(i.reviewDate) },
    { label: 'الحالة', field: 'status', chip: true, chipColor: i => i.status === 'active' ? 'success' : 'default' },
  ],
  detailFields: [
    { label: 'العنوان', render: i => i.title || '-' },
    { label: 'الوصف', render: i => i.description || '-' },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    { label: 'تاريخ المراجعة', render: i => fmtDate(i.reviewDate) },
    { label: 'المؤلف', render: i => i.author?.name || '-' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Goals & Measures ── */
export const GoalsPage = createDomainPage({
  title: 'الأهداف والمقاييس', icon: '🎯', apiModule: goalsAPI,
  columns: [
    { label: 'الهدف', render: i => i.title || i.description || '-' },
    { label: 'المجال', field: 'domain' },
    { label: 'التقدم', render: i => i.progressPercent != null ? `${i.progressPercent}%` : '-' },
    { label: 'الحالة', field: 'status', chip: true, chipColor: i => i.status === 'achieved' ? 'success' : i.status === 'in_progress' ? 'info' : 'default' },
  ],
  detailFields: [
    { label: 'الهدف', render: i => i.title || i.description || '-' },
    { label: 'المجال', field: 'domain' },
    { label: 'المستوى', field: 'targetLevel' },
    { label: 'التقدم', render: i => `${i.progressPercent || 0}%` },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Group Therapy ── */
export const GroupTherapyPage = createDomainPage({
  title: 'العلاج الجماعي', icon: '👥', apiModule: groupTherapyAPI,
  columns: [
    { label: 'اسم المجموعة', render: i => i.name || i.groupName || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'المشاركون', render: i => `${i.currentSize || i.members?.length || 0}/${i.maxSize || '-'}` },
    { label: 'الحالة', field: 'status', chip: true, chipColor: i => i.status === 'active' ? 'success' : 'default' },
  ],
  detailFields: [
    { label: 'اسم المجموعة', render: i => i.name || i.groupName || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'الوصف', field: 'description' },
    { label: 'المشاركون', render: i => `${i.currentSize || 0}/${i.maxSize || '-'}` },
    { label: 'الميسر', render: i => i.facilitator?.name || '-' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Tele-Rehabilitation ── */
export const TeleRehabPage = createDomainPage({
  title: 'التأهيل عن بُعد', icon: '📹', apiModule: teleRehabAPI,
  columns: [
    { label: 'المستفيد', render: i => i.beneficiary?.name?.full || i.beneficiaryName || '-' },
    { label: 'النوع', render: i => i.sessionType || i.type || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.scheduledDate || i.date) },
    { label: 'المدة', render: i => i.duration ? `${i.duration} د` : '-' },
    { label: 'الحالة', field: 'status', chip: true, chipColor: i => i.status === 'completed' ? 'success' : 'info' },
  ],
  detailFields: [
    { label: 'المستفيد', render: i => i.beneficiary?.name?.full || '-' },
    { label: 'النوع', render: i => i.sessionType || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.scheduledDate || i.date) },
    { label: 'المدة', render: i => i.duration ? `${i.duration} دقيقة` : '-' },
    { label: 'المنصة', field: 'platform' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── AR/VR ── */
export const ARVRPage = createDomainPage({
  title: 'الواقع الافتراضي/المعزز', icon: '🥽', apiModule: arVrAPI,
  columns: [
    { label: 'المستفيد', render: i => i.beneficiary?.name?.full || i.beneficiaryName || '-' },
    { label: 'السيناريو', render: i => i.scenario || i.programName || '-' },
    { label: 'النوع', render: i => i.type || i.modality || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.date || i.createdAt) },
    { label: 'الحالة', field: 'status', chip: true },
  ],
  detailFields: [
    { label: 'المستفيد', render: i => i.beneficiary?.name?.full || '-' },
    { label: 'السيناريو', render: i => i.scenario || '-' },
    { label: 'النوع', render: i => i.type || i.modality || '-' },
    { label: 'المدة', render: i => i.duration ? `${i.duration} دقيقة` : '-' },
    { label: 'الجهاز', field: 'device' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Behavior Management ── */
export const BehaviorPage = createDomainPage({
  title: 'إدارة السلوك', icon: '🧠', apiModule: behaviorAPI,
  columns: [
    { label: 'المستفيد', render: i => i.beneficiary?.name?.full || i.beneficiaryName || '-' },
    { label: 'السلوك', render: i => i.behaviorType || i.type || '-' },
    { label: 'الشدة', field: 'severity', chip: true, chipColor: i => i.severity === 'high' ? 'error' : i.severity === 'medium' ? 'warning' : 'success' },
    { label: 'التاريخ', render: i => fmtDate(i.date || i.createdAt) },
    { label: 'الحالة', field: 'status', chip: true },
  ],
  detailFields: [
    { label: 'المستفيد', render: i => i.beneficiary?.name?.full || '-' },
    { label: 'السلوك', render: i => i.behaviorType || '-' },
    { label: 'الشدة', field: 'severity' },
    { label: 'المُحفز', render: i => i.trigger || i.antecedent || '-' },
    { label: 'التدخل', render: i => i.intervention || '-' },
    { label: 'النتيجة', render: i => i.consequence || i.outcome || '-' },
  ],
});

/* ── Family Portal ── */
export const FamilyPage = createDomainPage({
  title: 'بوابة الأسرة', icon: '👨‍👩‍👧‍👦', apiModule: familyAPI,
  columns: [
    { label: 'الاسم', render: i => i.name || i.fullName || '-' },
    { label: 'صلة القرابة', render: i => i.relationship || i.role || '-' },
    { label: 'الهاتف', field: 'phone' },
    { label: 'جهة اتصال أساسية', render: i => i.isPrimaryContact ? 'نعم' : 'لا' },
  ],
  detailFields: [
    { label: 'الاسم', render: i => i.name || i.fullName || '-' },
    { label: 'صلة القرابة', field: 'relationship' },
    { label: 'الهاتف', field: 'phone' },
    { label: 'البريد', field: 'email' },
    { label: 'جهة اتصال أساسية', render: i => i.isPrimaryContact ? 'نعم' : 'لا' },
    { label: 'ملاحظات', field: 'notes' },
  ],
});

/* ── Programs ── */
export const ProgramsPage = createDomainPage({
  title: 'البرامج', icon: '🎓', apiModule: programsAPI,
  columns: [
    { label: 'البرنامج', render: i => i.name || i.title || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'المسجلون', render: i => i.enrolledCount ?? i.currentEnrollment ?? '-' },
    { label: 'السعة', field: 'capacity' },
    { label: 'الحالة', field: 'status', chip: true, chipColor: i => i.status === 'active' ? 'success' : 'default' },
  ],
  detailFields: [
    { label: 'البرنامج', render: i => i.name || '-' },
    { label: 'الوصف', field: 'description' },
    { label: 'النوع', field: 'type' },
    { label: 'المسجلون / السعة', render: i => `${i.enrolledCount || 0} / ${i.capacity || '-'}` },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── AI Recommendations ── */
export const AIRecommendationsPage = createDomainPage({
  title: 'التوصيات الذكية', icon: '✨', apiModule: aiRecommendationsAPI,
  columns: [
    { label: 'العنوان', render: i => i.title || i.text || i.description || '-' },
    { label: 'النوع', render: i => i.type || i.ruleId || '-' },
    { label: 'الأولوية', field: 'priority', chip: true, chipColor: i => i.priority === 'high' ? 'error' : i.priority === 'medium' ? 'warning' : 'success' },
    { label: 'الحالة', field: 'status', chip: true, chipColor: i => i.status === 'accepted' ? 'success' : i.status === 'rejected' ? 'error' : 'info' },
  ],
  detailFields: [
    { label: 'العنوان', render: i => i.title || '-' },
    { label: 'الوصف', render: i => i.text || i.description || '-' },
    { label: 'النوع', render: i => i.type || '-' },
    { label: 'الأولوية', field: 'priority' },
    { label: 'التفسير', render: i => i.rationale || i.explanation || '-' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Research ── */
export const ResearchPage = createDomainPage({
  title: 'البحث السريري', icon: '🔬', apiModule: researchAPI,
  columns: [
    { label: 'عنوان الدراسة', render: i => i.title || i.name || '-' },
    { label: 'الباحث الرئيسي', render: i => i.principalInvestigator?.name || i.researcher || '-' },
    { label: 'النوع', field: 'studyType' },
    { label: 'المشاركون', render: i => i.participantCount || '-' },
    { label: 'الحالة', field: 'status', chip: true, chipColor: i => i.status === 'active' ? 'success' : i.status === 'completed' ? 'default' : 'info' },
  ],
  detailFields: [
    { label: 'العنوان', render: i => i.title || '-' },
    { label: 'الوصف', field: 'description' },
    { label: 'الباحث الرئيسي', render: i => i.principalInvestigator?.name || '-' },
    { label: 'النوع', field: 'studyType' },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Field Training ── */
export const FieldTrainingPage = createDomainPage({
  title: 'التدريب الميداني', icon: '🏋️', apiModule: fieldTrainingAPI,
  columns: [
    { label: 'البرنامج', render: i => i.name || i.title || '-' },
    { label: 'المشرف', render: i => i.supervisor?.name || '-' },
    { label: 'المتدربون', render: i => i.traineeCount || i.trainees?.length || '-' },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    { label: 'الحالة', field: 'status', chip: true, chipColor: i => i.status === 'active' ? 'success' : 'default' },
  ],
  detailFields: [
    { label: 'البرنامج', render: i => i.name || '-' },
    { label: 'الوصف', field: 'description' },
    { label: 'المشرف', render: i => i.supervisor?.name || '-' },
    { label: 'المتدربون', render: i => `${i.traineeCount || 0}` },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    { label: 'الحالة', field: 'status' },
  ],
});
