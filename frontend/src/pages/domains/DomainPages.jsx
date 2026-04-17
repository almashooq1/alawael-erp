/**
 * Unified Domain Pages — صفحات المجالات الموحدة
 *
 * كل صفحة تعتمد على نمط موحد: list + filter + detail dialog
 * يتم تصدير جميع الصفحات من هنا لسهولة الاستيراد
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Avatar,
  Button,
  IconButton,
  Stack,
  LinearProgress,
  Alert,
  TextField,
  InputAdornment,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
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
        if (data?.data) {
          setItems(data.data);
          setTotal(data.pagination?.total || data.total || data.data.length);
        } else if (Array.isArray(data)) {
          setItems(data);
          setTotal(data.length);
        } else {
          setItems([]);
          setTotal(0);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, [page, search]);

    useEffect(() => {
      load();
    }, [load]);

    const pageCount = Math.ceil(total / perPage);

    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {icon} {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {total} سجل
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" startIcon={<AddIcon />} size="small">
              إضافة
            </Button>
            <IconButton onClick={load}>
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Stats */}
        {statsConfig && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {statsConfig(items).map((s, i) => (
              <Grid item xs={6} md={3} key={i}>
                <Card variant="outlined" sx={{ borderRight: `4px solid ${s.color}` }}>
                  <CardContent
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      py: 1,
                      '&:last-child': { pb: 1 },
                    }}
                  >
                    <Avatar sx={{ bgcolor: `${s.color}20`, color: s.color, width: 36, height: 36 }}>
                      {s.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" sx={{ color: s.color }}>
                        {s.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.label}
                      </Typography>
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
              fullWidth
              size="small"
              placeholder="بحث..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {columns.map((c, i) => (
                  <TableCell key={i}>{c.label}</TableCell>
                ))}
                <TableCell align="center">عرض</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">لا توجد بيانات</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, i) => (
                  <TableRow
                    key={item._id || i}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setSelected(item)}
                  >
                    {columns.map((c, ci) => (
                      <TableCell key={ci}>
                        {c.chip ? (
                          <Chip
                            size="small"
                            label={c.render ? c.render(item) : item[c.field] || '-'}
                            color={c.chipColor?.(item) || 'default'}
                          />
                        ) : (
                          <Typography variant="body2">
                            {c.render ? c.render(item) : item[c.field] || '-'}
                          </Typography>
                        )}
                      </TableCell>
                    ))}
                    <TableCell align="center">
                      <IconButton size="small">
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {pageCount > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={pageCount}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              shape="rounded"
            />
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
                      <Typography variant="caption" color="text.secondary">
                        {f.label}
                      </Typography>
                      <Typography variant="body2">
                        {f.render ? f.render(selected) : selected[f.field] || '-'}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelected(null)}>إغلاق</Button>
                {selected.beneficiaryId && (
                  <Button
                    variant="contained"
                    onClick={() => {
                      setSelected(null);
                      navigate(`/beneficiaries/${selected.beneficiaryId}`);
                    }}
                  >
                    ملف المستفيد
                  </Button>
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
  assessmentsAPI,
  carePlansAPI,
  goalsAPI,
  groupTherapyAPI,
  teleRehabAPI,
  arVrAPI,
  behaviorAPI,
  familyAPI,
  programsAPI,
  aiRecommendationsAPI,
  researchAPI,
  fieldTrainingAPI,
  // Phase 29 – Workforce Development
  workforceAnalyticsAPI,
  credentialManagerAPI,
  mentorshipProgramAPI,
  careerPathwayAPI,
  // Phase 30 – Accreditation & Compliance
  accreditationManagerAPI,
  inspectionTrackerAPI,
  standardsComplianceAPI,
  licensureManagerAPI,
  // Phase 31 – Patient Engagement
  patientPortalAPI,
  healthEducationAPI,
  remoteMonitoringAPI,
  patientCommunityAPI,
  // Phase 32 – Interoperability
  fhirIntegrationAPI,
  hl7MessagingAPI,
  dataExchangeAPI,
  interoperabilityHubAPI,
  // Phase 33 – Disaster Recovery
  backupManagerAPI,
  businessContinuityAPI,
  systemFailoverAPI,
  incidentResponseAPI,
  // Phase 34 – Facility & Asset
  equipmentLifecycleAPI,
  environmentalMonitoringAPI,
  spaceManagementAPI,
  assetTrackingAPI,
  // Phase 35 – Clinical Research
  clinicalResearchAPI,
  clinicalTrialsAPI,
  outcomeResearchAPI,
  publicationManagerAPI,
  // Phase 36 – Community Engagement
  volunteerManagementAPI,
  communityOutreachAPI,
  donorRelationsAPI,
  advocacyProgramAPI,
} from '../../services/ddd';

import {
  Assignment as AssessIcon,
  ListAlt as PlanIcon,
  TrackChanges as GoalIcon,
  Groups as GroupIcon,
  Videocam as VideoIcon,
  Vrpano as VrIcon,
  Psychology as BehaviorIcon,
  FamilyRestroom as FamilyIcon,
  School as ProgramIcon,
  AutoAwesome as AIIcon,
  Biotech as ResearchIcon,
  ModelTraining as TrainingIcon,
  CheckCircle as CheckIcon,
  Warning as WarnIcon,
} from '@mui/icons-material';

const fmtDate = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '-');

/* ── Assessments ── */
export const AssessmentsPage = createDomainPage({
  title: 'التقييمات السريرية',
  icon: '📊',
  apiModule: assessmentsAPI,
  columns: [
    { label: 'النوع', field: 'type', render: i => i.type || i.assessmentType || '-' },
    { label: 'الأداة', field: 'instrument', render: i => i.instrument || i.tool || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.date || i.createdAt) },
    { label: 'النتيجة', field: 'totalScore', render: i => i.totalScore ?? i.score ?? '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'completed' ? 'success' : 'default'),
    },
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
  title: 'خطط الرعاية',
  icon: '📋',
  apiModule: carePlansAPI,
  columns: [
    { label: 'العنوان', render: i => i.title || i.name || '-' },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    { label: 'المراجعة', render: i => fmtDate(i.reviewDate) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'active' ? 'success' : 'default'),
    },
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
  title: 'الأهداف والمقاييس',
  icon: '🎯',
  apiModule: goalsAPI,
  columns: [
    { label: 'الهدف', render: i => i.title || i.description || '-' },
    { label: 'المجال', field: 'domain' },
    { label: 'التقدم', render: i => (i.progressPercent != null ? `${i.progressPercent}%` : '-') },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'achieved' ? 'success' : i.status === 'in_progress' ? 'info' : 'default',
    },
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
  title: 'العلاج الجماعي',
  icon: '👥',
  apiModule: groupTherapyAPI,
  columns: [
    { label: 'اسم المجموعة', render: i => i.name || i.groupName || '-' },
    { label: 'النوع', field: 'type' },
    {
      label: 'المشاركون',
      render: i => `${i.currentSize || i.members?.length || 0}/${i.maxSize || '-'}`,
    },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'active' ? 'success' : 'default'),
    },
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
  title: 'التأهيل عن بُعد',
  icon: '📹',
  apiModule: teleRehabAPI,
  columns: [
    { label: 'المستفيد', render: i => i.beneficiary?.name?.full || i.beneficiaryName || '-' },
    { label: 'النوع', render: i => i.sessionType || i.type || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.scheduledDate || i.date) },
    { label: 'المدة', render: i => (i.duration ? `${i.duration} د` : '-') },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'completed' ? 'success' : 'info'),
    },
  ],
  detailFields: [
    { label: 'المستفيد', render: i => i.beneficiary?.name?.full || '-' },
    { label: 'النوع', render: i => i.sessionType || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.scheduledDate || i.date) },
    { label: 'المدة', render: i => (i.duration ? `${i.duration} دقيقة` : '-') },
    { label: 'المنصة', field: 'platform' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── AR/VR ── */
export const ARVRPage = createDomainPage({
  title: 'الواقع الافتراضي/المعزز',
  icon: '🥽',
  apiModule: arVrAPI,
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
    { label: 'المدة', render: i => (i.duration ? `${i.duration} دقيقة` : '-') },
    { label: 'الجهاز', field: 'device' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Behavior Management ── */
export const BehaviorPage = createDomainPage({
  title: 'إدارة السلوك',
  icon: '🧠',
  apiModule: behaviorAPI,
  columns: [
    { label: 'المستفيد', render: i => i.beneficiary?.name?.full || i.beneficiaryName || '-' },
    { label: 'السلوك', render: i => i.behaviorType || i.type || '-' },
    {
      label: 'الشدة',
      field: 'severity',
      chip: true,
      chipColor: i =>
        i.severity === 'high' ? 'error' : i.severity === 'medium' ? 'warning' : 'success',
    },
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
  title: 'بوابة الأسرة',
  icon: '👨‍👩‍👧‍👦',
  apiModule: familyAPI,
  columns: [
    { label: 'الاسم', render: i => i.name || i.fullName || '-' },
    { label: 'صلة القرابة', render: i => i.relationship || i.role || '-' },
    { label: 'الهاتف', field: 'phone' },
    { label: 'جهة اتصال أساسية', render: i => (i.isPrimaryContact ? 'نعم' : 'لا') },
  ],
  detailFields: [
    { label: 'الاسم', render: i => i.name || i.fullName || '-' },
    { label: 'صلة القرابة', field: 'relationship' },
    { label: 'الهاتف', field: 'phone' },
    { label: 'البريد', field: 'email' },
    { label: 'جهة اتصال أساسية', render: i => (i.isPrimaryContact ? 'نعم' : 'لا') },
    { label: 'ملاحظات', field: 'notes' },
  ],
});

/* ── Programs ── */
export const ProgramsPage = createDomainPage({
  title: 'البرامج',
  icon: '🎓',
  apiModule: programsAPI,
  columns: [
    { label: 'البرنامج', render: i => i.name || i.title || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'المسجلون', render: i => i.enrolledCount ?? i.currentEnrollment ?? '-' },
    { label: 'السعة', field: 'capacity' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'active' ? 'success' : 'default'),
    },
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
  title: 'التوصيات الذكية',
  icon: '✨',
  apiModule: aiRecommendationsAPI,
  columns: [
    { label: 'العنوان', render: i => i.title || i.text || i.description || '-' },
    { label: 'النوع', render: i => i.type || i.ruleId || '-' },
    {
      label: 'الأولوية',
      field: 'priority',
      chip: true,
      chipColor: i =>
        i.priority === 'high' ? 'error' : i.priority === 'medium' ? 'warning' : 'success',
    },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'accepted' ? 'success' : i.status === 'rejected' ? 'error' : 'info',
    },
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
  title: 'البحث السريري',
  icon: '🔬',
  apiModule: researchAPI,
  columns: [
    { label: 'عنوان الدراسة', render: i => i.title || i.name || '-' },
    { label: 'الباحث الرئيسي', render: i => i.principalInvestigator?.name || i.researcher || '-' },
    { label: 'النوع', field: 'studyType' },
    { label: 'المشاركون', render: i => i.participantCount || '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'active' ? 'success' : i.status === 'completed' ? 'default' : 'info',
    },
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
  title: 'التدريب الميداني',
  icon: '🏋️',
  apiModule: fieldTrainingAPI,
  columns: [
    { label: 'البرنامج', render: i => i.name || i.title || '-' },
    { label: 'المشرف', render: i => i.supervisor?.name || '-' },
    { label: 'المتدربون', render: i => i.traineeCount || i.trainees?.length || '-' },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'active' ? 'success' : 'default'),
    },
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

/* ══════════════════════════════════════════════════════════
   Phase 29 – Workforce Development & Training
   ══════════════════════════════════════════════════════════ */

/* ── Workforce Analytics ── */
export const WorkforceAnalyticsPage = createDomainPage({
  title: 'تحليلات القوى العاملة',
  icon: '📊',
  apiModule: workforceAnalyticsAPI,
  columns: [
    { label: 'المؤشر', render: i => i.name || i.title || '-' },
    { label: 'القيمة', render: i => i.value ?? i.score ?? '-' },
    { label: 'الفترة', render: i => i.period || '-' },
    {
      label: 'الاتجاه',
      field: 'trend',
      chip: true,
      chipColor: i => (i.trend === 'up' ? 'success' : i.trend === 'down' ? 'error' : 'default'),
    },
    { label: 'الحالة', field: 'status', chip: true },
  ],
  detailFields: [
    { label: 'المؤشر', render: i => i.name || '-' },
    { label: 'القيمة', render: i => `${i.value ?? '-'}` },
    { label: 'الفترة', field: 'period' },
    { label: 'الاتجاه', field: 'trend' },
    { label: 'التاريخ', render: i => fmtDate(i.createdAt) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Credential Manager ── */
export const CredentialManagerPage = createDomainPage({
  title: 'إدارة الشهادات',
  icon: '🏅',
  apiModule: credentialManagerAPI,
  columns: [
    { label: 'الموظف', render: i => i.employeeName || i.name || '-' },
    { label: 'الشهادة', render: i => i.credentialName || i.title || '-' },
    { label: 'تاريخ الإصدار', render: i => fmtDate(i.issueDate) },
    { label: 'تاريخ الانتهاء', render: i => fmtDate(i.expiryDate) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'active' ? 'success' : i.status === 'expired' ? 'error' : 'warning',
    },
  ],
  detailFields: [
    { label: 'الموظف', render: i => i.employeeName || '-' },
    { label: 'الشهادة', render: i => i.credentialName || '-' },
    { label: 'الجهة المانحة', field: 'issuingBody' },
    { label: 'تاريخ الإصدار', render: i => fmtDate(i.issueDate) },
    { label: 'تاريخ الانتهاء', render: i => fmtDate(i.expiryDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Mentorship Program ── */
export const MentorshipProgramPage = createDomainPage({
  title: 'برنامج التوجيه والإرشاد',
  icon: '🤝',
  apiModule: mentorshipProgramAPI,
  columns: [
    { label: 'البرنامج', render: i => i.name || i.title || '-' },
    { label: 'المرشد', render: i => i.mentorName || i.mentor?.name || '-' },
    { label: 'المتدرب', render: i => i.menteeName || i.mentee?.name || '-' },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'active' ? 'success' : 'default'),
    },
  ],
  detailFields: [
    { label: 'البرنامج', render: i => i.name || '-' },
    { label: 'المرشد', render: i => i.mentorName || '-' },
    { label: 'المتدرب', render: i => i.menteeName || '-' },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    { label: 'تاريخ الانتهاء', render: i => fmtDate(i.endDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Career Pathway ── */
export const CareerPathwayPage = createDomainPage({
  title: 'المسارات المهنية',
  icon: '🛤️',
  apiModule: careerPathwayAPI,
  columns: [
    { label: 'المسار', render: i => i.name || i.title || '-' },
    { label: 'المستوى', render: i => i.level || i.currentLevel || '-' },
    { label: 'المرحلة', field: 'stage' },
    { label: 'التقدم', render: i => (i.progressPercent != null ? `${i.progressPercent}%` : '-') },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'active' ? 'success' : 'default'),
    },
  ],
  detailFields: [
    { label: 'المسار', render: i => i.name || '-' },
    { label: 'الوصف', field: 'description' },
    { label: 'المستوى', render: i => i.level || '-' },
    { label: 'المرحلة', field: 'stage' },
    { label: 'التقدم', render: i => `${i.progressPercent || 0}%` },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ══════════════════════════════════════════════════════════
   Phase 30 – Accreditation & Compliance
   ══════════════════════════════════════════════════════════ */

/* ── Accreditation Manager ── */
export const AccreditationManagerPage = createDomainPage({
  title: 'إدارة الاعتماد المؤسسي',
  icon: '🏛️',
  apiModule: accreditationManagerAPI,
  columns: [
    { label: 'الجهة', render: i => i.body || i.organization || '-' },
    { label: 'المعيار', render: i => i.standard || i.name || '-' },
    { label: 'تاريخ التقديم', render: i => fmtDate(i.submissionDate) },
    { label: 'تاريخ الانتهاء', render: i => fmtDate(i.expiryDate) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'approved' ? 'success' : i.status === 'pending' ? 'warning' : 'default',
    },
  ],
  detailFields: [
    { label: 'الجهة', render: i => i.body || '-' },
    { label: 'المعيار', render: i => i.standard || '-' },
    { label: 'الوصف', field: 'description' },
    { label: 'تاريخ التقديم', render: i => fmtDate(i.submissionDate) },
    { label: 'تاريخ الانتهاء', render: i => fmtDate(i.expiryDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Inspection Tracker ── */
export const InspectionTrackerPage = createDomainPage({
  title: 'متابعة التفتيش',
  icon: '🔍',
  apiModule: inspectionTrackerAPI,
  columns: [
    { label: 'نوع التفتيش', render: i => i.type || i.inspectionType || '-' },
    { label: 'المفتش', render: i => i.inspectorName || i.inspector?.name || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.date || i.inspectionDate) },
    { label: 'النتيجة', render: i => i.result || i.outcome || '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'passed' ? 'success' : i.status === 'failed' ? 'error' : 'warning',
    },
  ],
  detailFields: [
    { label: 'نوع التفتيش', render: i => i.type || '-' },
    { label: 'المفتش', render: i => i.inspectorName || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.date) },
    { label: 'النتيجة', render: i => i.result || '-' },
    { label: 'الملاحظات', field: 'notes' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Standards Compliance ── */
export const StandardsCompliancePage = createDomainPage({
  title: 'الامتثال للمعايير',
  icon: '✅',
  apiModule: standardsComplianceAPI,
  columns: [
    { label: 'المعيار', render: i => i.name || i.standardName || '-' },
    { label: 'الفئة', field: 'category' },
    {
      label: 'نسبة الامتثال',
      render: i => (i.complianceRate != null ? `${i.complianceRate}%` : '-'),
    },
    { label: 'آخر مراجعة', render: i => fmtDate(i.lastReviewDate) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'compliant' ? 'success' : i.status === 'non_compliant' ? 'error' : 'warning',
    },
  ],
  detailFields: [
    { label: 'المعيار', render: i => i.name || '-' },
    { label: 'الفئة', field: 'category' },
    { label: 'الوصف', field: 'description' },
    { label: 'نسبة الامتثال', render: i => `${i.complianceRate || 0}%` },
    { label: 'آخر مراجعة', render: i => fmtDate(i.lastReviewDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Licensure Manager ── */
export const LicensureManagerPage = createDomainPage({
  title: 'إدارة التراخيص',
  icon: '📜',
  apiModule: licensureManagerAPI,
  columns: [
    { label: 'الترخيص', render: i => i.name || i.licenseName || '-' },
    { label: 'الجهة', render: i => i.issuingAuthority || i.authority || '-' },
    { label: 'تاريخ الإصدار', render: i => fmtDate(i.issueDate) },
    { label: 'تاريخ الانتهاء', render: i => fmtDate(i.expiryDate) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'active' ? 'success' : i.status === 'expired' ? 'error' : 'warning',
    },
  ],
  detailFields: [
    { label: 'الترخيص', render: i => i.name || '-' },
    { label: 'الجهة', render: i => i.issuingAuthority || '-' },
    { label: 'رقم الترخيص', field: 'licenseNumber' },
    { label: 'تاريخ الإصدار', render: i => fmtDate(i.issueDate) },
    { label: 'تاريخ الانتهاء', render: i => fmtDate(i.expiryDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ══════════════════════════════════════════════════════════
   Phase 31 – Patient Engagement & Portal
   ══════════════════════════════════════════════════════════ */

/* ── Patient Portal ── */
export const PatientPortalPage = createDomainPage({
  title: 'بوابة المريض',
  icon: '🏥',
  apiModule: patientPortalAPI,
  columns: [
    { label: 'المريض', render: i => i.patientName || i.name || '-' },
    { label: 'النوع', render: i => i.type || i.requestType || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.date || i.createdAt) },
    {
      label: 'الأولوية',
      field: 'priority',
      chip: true,
      chipColor: i =>
        i.priority === 'high' ? 'error' : i.priority === 'medium' ? 'warning' : 'success',
    },
    { label: 'الحالة', field: 'status', chip: true },
  ],
  detailFields: [
    { label: 'المريض', render: i => i.patientName || '-' },
    { label: 'النوع', render: i => i.type || '-' },
    { label: 'الوصف', field: 'description' },
    { label: 'التاريخ', render: i => fmtDate(i.date) },
    { label: 'الأولوية', field: 'priority' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Health Education ── */
export const HealthEducationPage = createDomainPage({
  title: 'التثقيف الصحي',
  icon: '📚',
  apiModule: healthEducationAPI,
  columns: [
    { label: 'العنوان', render: i => i.title || i.name || '-' },
    { label: 'الفئة', field: 'category' },
    { label: 'الجمهور المستهدف', render: i => i.targetAudience || '-' },
    { label: 'المشاهدات', render: i => i.viewCount ?? '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'published' ? 'success' : 'default'),
    },
  ],
  detailFields: [
    { label: 'العنوان', render: i => i.title || '-' },
    { label: 'الفئة', field: 'category' },
    { label: 'الوصف', field: 'description' },
    { label: 'الجمهور المستهدف', render: i => i.targetAudience || '-' },
    { label: 'المشاهدات', render: i => `${i.viewCount ?? 0}` },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Remote Monitoring ── */
export const RemoteMonitoringPage = createDomainPage({
  title: 'المراقبة عن بُعد',
  icon: '📡',
  apiModule: remoteMonitoringAPI,
  columns: [
    { label: 'المريض', render: i => i.patientName || i.name || '-' },
    { label: 'الجهاز', render: i => i.deviceType || i.device || '-' },
    { label: 'آخر قراءة', render: i => fmtDate(i.lastReading) },
    { label: 'القيمة', render: i => i.lastValue ?? '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'normal' ? 'success' : i.status === 'alert' ? 'error' : 'warning',
    },
  ],
  detailFields: [
    { label: 'المريض', render: i => i.patientName || '-' },
    { label: 'الجهاز', render: i => i.deviceType || '-' },
    { label: 'آخر قراءة', render: i => fmtDate(i.lastReading) },
    { label: 'القيمة', render: i => `${i.lastValue ?? '-'}` },
    { label: 'الحد الأعلى', render: i => `${i.upperThreshold ?? '-'}` },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Patient Community ── */
export const PatientCommunityPage = createDomainPage({
  title: 'مجتمع المرضى',
  icon: '💬',
  apiModule: patientCommunityAPI,
  columns: [
    { label: 'المجموعة', render: i => i.name || i.groupName || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'الأعضاء', render: i => i.memberCount ?? '-' },
    { label: 'المنشورات', render: i => i.postCount ?? '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'active' ? 'success' : 'default'),
    },
  ],
  detailFields: [
    { label: 'المجموعة', render: i => i.name || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'الوصف', field: 'description' },
    { label: 'الأعضاء', render: i => `${i.memberCount ?? 0}` },
    { label: 'المنشورات', render: i => `${i.postCount ?? 0}` },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ══════════════════════════════════════════════════════════
   Phase 32 – Interoperability & Data Exchange
   ══════════════════════════════════════════════════════════ */

/* ── FHIR Integration ── */
export const FhirIntegrationPage = createDomainPage({
  title: 'تكامل FHIR',
  icon: '🔗',
  apiModule: fhirIntegrationAPI,
  columns: [
    { label: 'المورد', render: i => i.resourceType || i.name || '-' },
    { label: 'الإجراء', render: i => i.action || i.operation || '-' },
    { label: 'المصدر', render: i => i.source || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.date || i.createdAt) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'success' ? 'success' : i.status === 'failed' ? 'error' : 'info',
    },
  ],
  detailFields: [
    { label: 'المورد', render: i => i.resourceType || '-' },
    { label: 'الإجراء', render: i => i.action || '-' },
    { label: 'المصدر', field: 'source' },
    { label: 'الوجهة', field: 'destination' },
    { label: 'التاريخ', render: i => fmtDate(i.date) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── HL7 Messaging ── */
export const HL7MessagingPage = createDomainPage({
  title: 'رسائل HL7',
  icon: '📨',
  apiModule: hl7MessagingAPI,
  columns: [
    { label: 'نوع الرسالة', render: i => i.messageType || i.type || '-' },
    { label: 'المرسل', render: i => i.sender || '-' },
    { label: 'المستقبل', render: i => i.receiver || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.date || i.createdAt) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'delivered' ? 'success' : i.status === 'failed' ? 'error' : 'info',
    },
  ],
  detailFields: [
    { label: 'نوع الرسالة', render: i => i.messageType || '-' },
    { label: 'المرسل', field: 'sender' },
    { label: 'المستقبل', field: 'receiver' },
    { label: 'الحجم', render: i => (i.size ? `${i.size} bytes` : '-') },
    { label: 'التاريخ', render: i => fmtDate(i.date) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Data Exchange ── */
export const DataExchangePage = createDomainPage({
  title: 'تبادل البيانات',
  icon: '🔄',
  apiModule: dataExchangeAPI,
  columns: [
    { label: 'العملية', render: i => i.name || i.operationType || '-' },
    { label: 'المصدر', render: i => i.source || '-' },
    { label: 'الوجهة', render: i => i.destination || '-' },
    { label: 'السجلات', render: i => i.recordCount ?? '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'completed' ? 'success' : i.status === 'failed' ? 'error' : 'info',
    },
  ],
  detailFields: [
    { label: 'العملية', render: i => i.name || '-' },
    { label: 'المصدر', field: 'source' },
    { label: 'الوجهة', field: 'destination' },
    { label: 'السجلات', render: i => `${i.recordCount ?? 0}` },
    { label: 'التاريخ', render: i => fmtDate(i.date) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Interoperability Hub ── */
export const InteroperabilityHubPage = createDomainPage({
  title: 'مركز التشغيل البيني',
  icon: '🌐',
  apiModule: interoperabilityHubAPI,
  columns: [
    { label: 'النظام', render: i => i.systemName || i.name || '-' },
    { label: 'البروتوكول', render: i => i.protocol || '-' },
    { label: 'آخر مزامنة', render: i => fmtDate(i.lastSyncDate) },
    {
      label: 'الاتصال',
      field: 'connectionStatus',
      chip: true,
      chipColor: i => (i.connectionStatus === 'connected' ? 'success' : 'error'),
    },
    { label: 'الحالة', field: 'status', chip: true },
  ],
  detailFields: [
    { label: 'النظام', render: i => i.systemName || '-' },
    { label: 'البروتوكول', field: 'protocol' },
    { label: 'العنوان', field: 'endpoint' },
    { label: 'آخر مزامنة', render: i => fmtDate(i.lastSyncDate) },
    { label: 'الاتصال', field: 'connectionStatus' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ══════════════════════════════════════════════════════════
   Phase 33 – Disaster Recovery & Business Continuity
   ══════════════════════════════════════════════════════════ */

/* ── Backup Manager ── */
export const BackupManagerPage = createDomainPage({
  title: 'إدارة النسخ الاحتياطي',
  icon: '💾',
  apiModule: backupManagerAPI,
  columns: [
    { label: 'النسخة', render: i => i.name || i.backupId || '-' },
    { label: 'النوع', render: i => i.type || i.backupType || '-' },
    { label: 'الحجم', render: i => i.size || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.date || i.createdAt) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'completed' ? 'success' : i.status === 'failed' ? 'error' : 'info',
    },
  ],
  detailFields: [
    { label: 'النسخة', render: i => i.name || '-' },
    { label: 'النوع', render: i => i.type || '-' },
    { label: 'الحجم', render: i => i.size || '-' },
    { label: 'المسار', field: 'path' },
    { label: 'التاريخ', render: i => fmtDate(i.date) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Business Continuity ── */
export const BusinessContinuityPage = createDomainPage({
  title: 'استمرارية الأعمال',
  icon: '🔄',
  apiModule: businessContinuityAPI,
  columns: [
    { label: 'الخطة', render: i => i.name || i.planName || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'آخر اختبار', render: i => fmtDate(i.lastTestDate) },
    { label: 'RTO', render: i => i.rto || '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'active' ? 'success' : 'default'),
    },
  ],
  detailFields: [
    { label: 'الخطة', render: i => i.name || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'الوصف', field: 'description' },
    { label: 'RTO', render: i => i.rto || '-' },
    { label: 'RPO', render: i => i.rpo || '-' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── System Failover ── */
export const SystemFailoverPage = createDomainPage({
  title: 'تجاوز الأعطال',
  icon: '⚡',
  apiModule: systemFailoverAPI,
  columns: [
    { label: 'النظام', render: i => i.systemName || i.name || '-' },
    { label: 'النوع', render: i => i.failoverType || i.type || '-' },
    { label: 'آخر اختبار', render: i => fmtDate(i.lastTestDate) },
    { label: 'وقت التبديل', render: i => i.switchoverTime || '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'ready' ? 'success' : i.status === 'active' ? 'warning' : 'error',
    },
  ],
  detailFields: [
    { label: 'النظام', render: i => i.systemName || '-' },
    { label: 'النوع', render: i => i.failoverType || '-' },
    { label: 'آخر اختبار', render: i => fmtDate(i.lastTestDate) },
    { label: 'وقت التبديل', render: i => i.switchoverTime || '-' },
    { label: 'النظام البديل', field: 'backupSystem' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Incident Response ── */
export const IncidentResponsePage = createDomainPage({
  title: 'الاستجابة للحوادث',
  icon: '🚨',
  apiModule: incidentResponseAPI,
  columns: [
    { label: 'الحادثة', render: i => i.title || i.name || '-' },
    {
      label: 'الشدة',
      field: 'severity',
      chip: true,
      chipColor: i =>
        i.severity === 'critical' ? 'error' : i.severity === 'high' ? 'warning' : 'info',
    },
    { label: 'التاريخ', render: i => fmtDate(i.date || i.reportedAt) },
    { label: 'المسؤول', render: i => i.assignee || i.responder || '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'resolved' ? 'success' : i.status === 'open' ? 'error' : 'warning',
    },
  ],
  detailFields: [
    { label: 'الحادثة', render: i => i.title || '-' },
    { label: 'الوصف', field: 'description' },
    { label: 'الشدة', field: 'severity' },
    { label: 'التاريخ', render: i => fmtDate(i.date) },
    { label: 'المسؤول', render: i => i.assignee || '-' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ══════════════════════════════════════════════════════════
   Phase 34 – Environmental & Facility Management
   ══════════════════════════════════════════════════════════ */

/* ── Equipment Lifecycle ── */
export const EquipmentLifecyclePage = createDomainPage({
  title: 'دورة حياة المعدات',
  icon: '🔧',
  apiModule: equipmentLifecycleAPI,
  columns: [
    { label: 'المعدة', render: i => i.name || i.equipmentName || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'الموقع', render: i => i.location || '-' },
    { label: 'آخر صيانة', render: i => fmtDate(i.lastMaintenanceDate) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'operational' ? 'success' : i.status === 'maintenance' ? 'warning' : 'error',
    },
  ],
  detailFields: [
    { label: 'المعدة', render: i => i.name || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'الرقم التسلسلي', field: 'serialNumber' },
    { label: 'الموقع', render: i => i.location || '-' },
    { label: 'آخر صيانة', render: i => fmtDate(i.lastMaintenanceDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Environmental Monitoring ── */
export const EnvironmentalMonitoringPage = createDomainPage({
  title: 'المراقبة البيئية',
  icon: '🌡️',
  apiModule: environmentalMonitoringAPI,
  columns: [
    { label: 'الموقع', render: i => i.location || i.name || '-' },
    { label: 'المؤشر', render: i => i.parameter || i.metric || '-' },
    { label: 'القيمة', render: i => i.value ?? '-' },
    { label: 'آخر قراءة', render: i => fmtDate(i.lastReading) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'normal' ? 'success' : i.status === 'alert' ? 'error' : 'warning',
    },
  ],
  detailFields: [
    { label: 'الموقع', render: i => i.location || '-' },
    { label: 'المؤشر', render: i => i.parameter || '-' },
    { label: 'القيمة', render: i => `${i.value ?? '-'}` },
    { label: 'الحد الأعلى', render: i => `${i.upperLimit ?? '-'}` },
    { label: 'الحد الأدنى', render: i => `${i.lowerLimit ?? '-'}` },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Space Management ── */
export const SpaceManagementPage = createDomainPage({
  title: 'إدارة المساحات',
  icon: '🏢',
  apiModule: spaceManagementAPI,
  columns: [
    { label: 'المساحة', render: i => i.name || i.spaceName || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'السعة', render: i => i.capacity ?? '-' },
    { label: 'الطابق', render: i => i.floor || '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'available' ? 'success' : i.status === 'occupied' ? 'info' : 'warning',
    },
  ],
  detailFields: [
    { label: 'المساحة', render: i => i.name || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'السعة', render: i => `${i.capacity ?? '-'}` },
    { label: 'الطابق', render: i => i.floor || '-' },
    { label: 'المبنى', field: 'building' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Asset Tracking ── */
export const AssetTrackingPage = createDomainPage({
  title: 'تتبع الأصول',
  icon: '📦',
  apiModule: assetTrackingAPI,
  columns: [
    { label: 'الأصل', render: i => i.name || i.assetName || '-' },
    { label: 'الرمز', render: i => i.assetTag || i.code || '-' },
    { label: 'الموقع', render: i => i.location || '-' },
    { label: 'القيمة', render: i => (i.value ? `${i.value} ر.س` : '-') },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'active' ? 'success' : i.status === 'retired' ? 'default' : 'warning',
    },
  ],
  detailFields: [
    { label: 'الأصل', render: i => i.name || '-' },
    { label: 'الرمز', render: i => i.assetTag || '-' },
    { label: 'الموقع', render: i => i.location || '-' },
    { label: 'القيمة', render: i => (i.value ? `${i.value} ر.س` : '-') },
    { label: 'تاريخ الشراء', render: i => fmtDate(i.purchaseDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ══════════════════════════════════════════════════════════
   Phase 35 – Clinical Research & Evidence-Based Practice
   ══════════════════════════════════════════════════════════ */

/* ── Clinical Research (Advanced) ── */
export const ClinicalResearchPage = createDomainPage({
  title: 'البحث السريري المتقدم',
  icon: '🧬',
  apiModule: clinicalResearchAPI,
  columns: [
    { label: 'الدراسة', render: i => i.title || i.name || '-' },
    { label: 'الباحث', render: i => i.principalInvestigator || i.researcher || '-' },
    { label: 'المنهجية', field: 'methodology' },
    { label: 'المشاركون', render: i => i.participantCount ?? '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'active' ? 'success' : i.status === 'completed' ? 'default' : 'info',
    },
  ],
  detailFields: [
    { label: 'الدراسة', render: i => i.title || '-' },
    { label: 'الباحث', render: i => i.principalInvestigator || '-' },
    { label: 'المنهجية', field: 'methodology' },
    { label: 'المشاركون', render: i => `${i.participantCount ?? 0}` },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Clinical Trials ── */
export const ClinicalTrialsPage = createDomainPage({
  title: 'التجارب السريرية',
  icon: '🧪',
  apiModule: clinicalTrialsAPI,
  columns: [
    { label: 'التجربة', render: i => i.title || i.name || '-' },
    { label: 'المرحلة', render: i => i.phase || '-' },
    { label: 'الراعي', render: i => i.sponsor || '-' },
    { label: 'المشاركون', render: i => i.enrolledCount ?? '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'recruiting' ? 'success' : i.status === 'completed' ? 'default' : 'info',
    },
  ],
  detailFields: [
    { label: 'التجربة', render: i => i.title || '-' },
    { label: 'المرحلة', render: i => i.phase || '-' },
    { label: 'الراعي', render: i => i.sponsor || '-' },
    { label: 'المشاركون', render: i => `${i.enrolledCount ?? 0}` },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Outcome Research ── */
export const OutcomeResearchPage = createDomainPage({
  title: 'بحوث النتائج',
  icon: '📈',
  apiModule: outcomeResearchAPI,
  columns: [
    { label: 'الدراسة', render: i => i.title || i.name || '-' },
    { label: 'المقياس', render: i => i.outcomeMeasure || '-' },
    { label: 'حجم العينة', render: i => i.sampleSize ?? '-' },
    { label: 'النتيجة', render: i => i.result || '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'published' ? 'success' : i.status === 'analysis' ? 'info' : 'default',
    },
  ],
  detailFields: [
    { label: 'الدراسة', render: i => i.title || '-' },
    { label: 'المقياس', render: i => i.outcomeMeasure || '-' },
    { label: 'حجم العينة', render: i => `${i.sampleSize ?? 0}` },
    { label: 'النتيجة', render: i => i.result || '-' },
    { label: 'التاريخ', render: i => fmtDate(i.completionDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Publication Manager ── */
export const PublicationManagerPage = createDomainPage({
  title: 'إدارة المنشورات العلمية',
  icon: '📄',
  apiModule: publicationManagerAPI,
  columns: [
    { label: 'العنوان', render: i => i.title || i.name || '-' },
    { label: 'المجلة', render: i => i.journal || '-' },
    { label: 'المؤلفون', render: i => i.authors?.join(', ') || i.authorName || '-' },
    { label: 'تاريخ النشر', render: i => fmtDate(i.publicationDate) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'published' ? 'success' : i.status === 'submitted' ? 'info' : 'default',
    },
  ],
  detailFields: [
    { label: 'العنوان', render: i => i.title || '-' },
    { label: 'المجلة', render: i => i.journal || '-' },
    { label: 'المؤلفون', render: i => i.authors?.join(', ') || '-' },
    { label: 'DOI', field: 'doi' },
    { label: 'تاريخ النشر', render: i => fmtDate(i.publicationDate) },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ══════════════════════════════════════════════════════════
   Phase 36 – Community Engagement & Outreach
   ══════════════════════════════════════════════════════════ */

/* ── Volunteer Management ── */
export const VolunteerManagementPage = createDomainPage({
  title: 'إدارة المتطوعين',
  icon: '🙋',
  apiModule: volunteerManagementAPI,
  columns: [
    { label: 'المتطوع', render: i => i.name || i.volunteerName || '-' },
    { label: 'المهارة', render: i => i.skill || i.specialty || '-' },
    { label: 'الساعات', render: i => i.totalHours ?? '-' },
    { label: 'تاريخ التسجيل', render: i => fmtDate(i.registrationDate) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'active' ? 'success' : 'default'),
    },
  ],
  detailFields: [
    { label: 'المتطوع', render: i => i.name || '-' },
    { label: 'المهارة', render: i => i.skill || '-' },
    { label: 'الساعات', render: i => `${i.totalHours ?? 0}` },
    { label: 'الهاتف', field: 'phone' },
    { label: 'البريد', field: 'email' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Community Outreach ── */
export const CommunityOutreachPage = createDomainPage({
  title: 'التواصل المجتمعي',
  icon: '📢',
  apiModule: communityOutreachAPI,
  columns: [
    { label: 'البرنامج', render: i => i.name || i.title || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'الجمهور', render: i => i.targetAudience || '-' },
    { label: 'المشاركون', render: i => i.participantCount ?? '-' },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i =>
        i.status === 'active' ? 'success' : i.status === 'completed' ? 'default' : 'info',
    },
  ],
  detailFields: [
    { label: 'البرنامج', render: i => i.name || '-' },
    { label: 'النوع', field: 'type' },
    { label: 'الوصف', field: 'description' },
    { label: 'الجمهور', render: i => i.targetAudience || '-' },
    { label: 'المشاركون', render: i => `${i.participantCount ?? 0}` },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Donor Relations ── */
export const DonorRelationsPage = createDomainPage({
  title: 'علاقات المانحين',
  icon: '💝',
  apiModule: donorRelationsAPI,
  columns: [
    { label: 'المانح', render: i => i.name || i.donorName || '-' },
    { label: 'النوع', render: i => i.type || i.donorType || '-' },
    { label: 'إجمالي التبرعات', render: i => (i.totalDonations ? `${i.totalDonations} ر.س` : '-') },
    { label: 'آخر تبرع', render: i => fmtDate(i.lastDonationDate) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'active' ? 'success' : 'default'),
    },
  ],
  detailFields: [
    { label: 'المانح', render: i => i.name || '-' },
    { label: 'النوع', render: i => i.type || '-' },
    { label: 'إجمالي التبرعات', render: i => (i.totalDonations ? `${i.totalDonations} ر.س` : '-') },
    { label: 'الهاتف', field: 'phone' },
    { label: 'البريد', field: 'email' },
    { label: 'الحالة', field: 'status' },
  ],
});

/* ── Advocacy Program ── */
export const AdvocacyProgramPage = createDomainPage({
  title: 'برنامج المناصرة',
  icon: '📣',
  apiModule: advocacyProgramAPI,
  columns: [
    { label: 'البرنامج', render: i => i.name || i.title || '-' },
    { label: 'القضية', render: i => i.cause || i.issue || '-' },
    { label: 'المؤيدون', render: i => i.supporterCount ?? '-' },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    {
      label: 'الحالة',
      field: 'status',
      chip: true,
      chipColor: i => (i.status === 'active' ? 'success' : 'default'),
    },
  ],
  detailFields: [
    { label: 'البرنامج', render: i => i.name || '-' },
    { label: 'القضية', render: i => i.cause || '-' },
    { label: 'الوصف', field: 'description' },
    { label: 'المؤيدون', render: i => `${i.supporterCount ?? 0}` },
    { label: 'تاريخ البدء', render: i => fmtDate(i.startDate) },
    { label: 'الحالة', field: 'status' },
  ],
});
