/**
 * صفحة قوالب نماذج المستفيدين للطباعة والحفظ
 * Beneficiary Print Templates Gallery — v1.0
 *
 * يعرض مكتبة من القوالب الجاهزة للطباعة والحفظ كـ PDF
 * يدعم: نموذج تسجيل، بطاقة مستفيد، تقرير تقدم، شهادة حضور،
 *        تقييم دوري، خطاب تحويل، بطاقة بيانات شاملة، تقرير اجتماع أسرة
 *
 * @version 1.0.0
 * @date 2026-03-23
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Grid, Card, CardContent, CardActions, Typography, Button,
  Stack, Chip, Avatar, TextField, InputAdornment, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Skeleton,
  ToggleButton, ToggleButtonGroup, Divider, Alert,
} from '@mui/material';
import {
  Print, PictureAsPdf, Description, Badge, School, Assignment,
  MedicalServices, FamilyRestroom, TransferWithinAStation, Search,
  Close, Refresh, GridView, ViewList, Download, AssignmentInd,
  LocalHospital, EmojiEvents, Groups,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { gradients, brandColors, surfaceColors, statusColors } from 'theme/palette';
import beneficiaryService from 'services/beneficiaryService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// ── Template Definitions ──────────────────────────
export const TEMPLATES = [
  {
    id: 'registration',
    name: 'نموذج التسجيل',
    nameEn: 'Registration Form',
    description: 'نموذج تسجيل مستفيد جديد يحتوي على كافة البيانات الشخصية والعائلية',
    icon: <Description />,
    color: brandColors.primary,
    category: 'forms',
    requiresBeneficiary: false,
  },
  {
    id: 'id-card',
    name: 'بطاقة المستفيد',
    nameEn: 'Beneficiary ID Card',
    description: 'بطاقة تعريفية للمستفيد مع صورة شخصية ومعلومات أساسية ورمز QR',
    icon: <Badge />,
    color: '#2196f3',
    category: 'cards',
    requiresBeneficiary: true,
  },
  {
    id: 'data-sheet',
    name: 'بطاقة بيانات شاملة',
    nameEn: 'Full Data Sheet',
    description: 'صفحة بيانات كاملة للمستفيد تشمل جميع الأقسام: شخصية، عائلية، صحية، تعليمية',
    icon: <AssignmentInd />,
    color: '#00897b',
    category: 'reports',
    requiresBeneficiary: true,
  },
  {
    id: 'progress-report',
    name: 'تقرير التقدم',
    nameEn: 'Progress Report',
    description: 'تقرير تقدم المستفيد يتضمن مستوى الأداء والجلسات والتوصيات',
    icon: <Assignment />,
    color: '#ff9800',
    category: 'reports',
    requiresBeneficiary: true,
  },
  {
    id: 'attendance-cert',
    name: 'شهادة حضور',
    nameEn: 'Attendance Certificate',
    description: 'شهادة تثبت انتظام المستفيد في الحضور لفترة محددة',
    icon: <EmojiEvents />,
    color: '#4caf50',
    category: 'certificates',
    requiresBeneficiary: true,
  },
  {
    id: 'medical-report',
    name: 'التقرير الطبي',
    nameEn: 'Medical Report',
    description: 'تقرير طبي للمستفيد يتضمن الحالة الصحية والتشخيص والعلاج',
    icon: <LocalHospital />,
    color: '#e91e63',
    category: 'reports',
    requiresBeneficiary: true,
  },
  {
    id: 'transfer-letter',
    name: 'خطاب تحويل',
    nameEn: 'Transfer / Referral Letter',
    description: 'خطاب رسمي لتحويل المستفيد إلى جهة أخرى مع ملخص الحالة',
    icon: <TransferWithinAStation />,
    color: '#9c27b0',
    category: 'letters',
    requiresBeneficiary: true,
  },
  {
    id: 'family-meeting',
    name: 'تقرير اجتماع الأسرة',
    nameEn: 'Family Meeting Report',
    description: 'محضر اجتماع مع ولي أمر المستفيد يتضمن النقاط والقرارات',
    icon: <FamilyRestroom />,
    color: '#795548',
    category: 'reports',
    requiresBeneficiary: true,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'الكل' },
  { id: 'forms', label: 'نماذج' },
  { id: 'cards', label: 'بطاقات' },
  { id: 'reports', label: 'تقارير' },
  { id: 'certificates', label: 'شهادات' },
  { id: 'letters', label: 'خطابات' },
];

// ── Styled Components ───────────────────────────
const GradientHeader = styled(Box)(() => ({
  background: gradients.primary,
  borderRadius: '0 0 28px 28px',
  padding: '28px 24px 52px',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""', position: 'absolute', top: -30, right: -30,
    width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
  },
}));

const TemplateCard = styled(Card)(({ theme, selected }) => ({
  borderRadius: 16,
  transition: 'all 0.3s',
  cursor: 'pointer',
  border: selected ? `2px solid ${brandColors.primary}` : '2px solid transparent',
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
  },
}));

// ── Helper: normalize beneficiary ─────────────
const normalizeBeneficiary = (b) => ({
  id: b._id || b.id,
  name: b.fullName || b.name || b.fullNameArabic || `${b.firstName_ar || b.firstName || ''} ${b.lastName_ar || b.lastName || ''}`.trim() || '—',
  nameEn: b.fullNameEnglish || b.nameEn || `${b.firstName_en || b.firstName || ''} ${b.lastName_en || b.lastName || ''}`.trim() || '',
  nationalId: b.nationalId || '',
  dateOfBirth: b.dateOfBirth || '',
  gender: b.gender || '',
  bloodType: b.bloodType || '',
  nationality: b.nationality || 'سعودي',
  religion: b.religion || 'مسلم',
  phone: b.contactInfo?.primaryPhone || b.phone || '',
  altPhone: b.contactInfo?.alternatePhone || '',
  email: b.contactInfo?.email || b.email || '',
  address: b.address || {},
  familyMembers: b.familyMembers || [],
  emergencyContacts: b.emergencyContacts || [],
  housing: b.housing || {},
  socioEconomic: b.socioEconomic || {},
  insurance: b.insurance || {},
  category: b.category || b.disability?.type || 'other',
  status: b.status || 'active',
  progress: b.progress || 0,
  sessions: b.sessions || b.totalSessions || 0,
  completedSessions: b.completedSessions || 0,
  attendanceRate: b.attendanceRate || 0,
  academicScore: b.academicScore || 0,
  behaviorRating: b.behaviorRating || 0,
  joinDate: b.registrationDate || b.joinDate || b.createdAt || '',
  lastVisit: b.lastVisit || '',
  therapist: b.therapist || '',
  generalNotes: b.generalNotes || b.notes || '',
  profilePhoto: b.profilePhoto || '',
  preferences: b.preferences || {},
  documents: b.documents || [],
  raw: b,
});

// ═════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════
const BeneficiaryPrintTemplates = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [beneficiaryDialogOpen, setBeneficiaryDialogOpen] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [benSearch, setBenSearch] = useState('');

  // ── Load Beneficiaries for selection ─────────
  const loadBeneficiaries = useCallback(async (search = '') => {
    setLoadingList(true);
    try {
      const res = await beneficiaryService.getAll({ limit: 50, search });
      const list = res?.data?.data || res?.data || [];
      setBeneficiaries(Array.isArray(list) ? list.map(normalizeBeneficiary) : []);
    } catch { setBeneficiaries([]); }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { loadBeneficiaries(); }, [loadBeneficiaries]);

  // ── Filter Templates ─────────────────────────
  const filteredTemplates = TEMPLATES.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.name.includes(q) || t.nameEn.toLowerCase().includes(q) || t.description.includes(q);
    }
    return true;
  });

  // ── Handle Template Click ────────────────────
  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
    if (template.requiresBeneficiary) {
      setBeneficiaryDialogOpen(true);
    } else {
      setSelectedBeneficiary(null);
      setPreviewOpen(true);
    }
  };

  const handleBeneficiarySelect = (ben) => {
    setSelectedBeneficiary(ben);
    setBeneficiaryDialogOpen(false);
    setPreviewOpen(true);
  };

  // ── Print ────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ── Save as PDF ──────────────────────────────
  const handleSavePDF = async () => {
    const el = document.getElementById('print-template-content');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;

      let heightLeft = imgH;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgW, imgH);
      heightLeft -= (pageH - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgH + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgW, imgH);
        heightLeft -= (pageH - 20);
      }

      const name = selectedBeneficiary?.name || 'نموذج';
      pdf.save(`${selectedTemplate?.name || 'template'} - ${name}.pdf`);
    } catch (err) {
      console.error('PDF generation failed', err);
    }
  };

  // ═════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: surfaceColors.brandTint }}>
      {/* Header */}
      <GradientHeader>
        <Container maxWidth="xl">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                قوالب النماذج والطباعة
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                مكتبة قوالب جاهزة لطباعة وحفظ نماذج المستفيدين — تسجيل، بطاقات، تقارير، شهادات، خطابات
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                <Chip label={`${TEMPLATES.length} قالب`} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }} />
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </GradientHeader>

      <Container maxWidth="xl" sx={{ mt: -3, position: 'relative', zIndex: 2, pb: 6 }}>
        {/* Search + Category Filter */}
        <Card elevation={0} sx={{ borderRadius: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ py: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <TextField
                placeholder="ابحث عن قالب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}><Close fontSize="small" /></IconButton>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{ maxWidth: { md: 350 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <ToggleButtonGroup size="small" value={categoryFilter} exclusive
                onChange={(_, v) => { if (v) setCategoryFilter(v); }}
                sx={{ '& .MuiToggleButton-root': { borderRadius: 2, px: 2 } }}>
                {CATEGORIES.map(c => (
                  <ToggleButton key={c.id} value={c.id}>{c.label}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          </CardContent>
        </Card>

        {/* Template Grid */}
        <Grid container spacing={3}>
          {filteredTemplates.map((t) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={t.id}>
              <TemplateCard elevation={0} onClick={() => handleTemplateClick(t)}
                sx={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box display="flex" gap={2} mb={2}>
                    <Avatar sx={{ bgcolor: t.color, width: 52, height: 52 }}>
                      {t.icon}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.3 }}>
                        {t.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.nameEn}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {t.description}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Chip size="small" label={CATEGORIES.find(c => c.id === t.category)?.label}
                      sx={{ bgcolor: `${t.color}15`, color: t.color, fontWeight: 600 }} />
                    {t.requiresBeneficiary && (
                      <Chip size="small" variant="outlined" label="يتطلب اختيار مستفيد" sx={{ fontSize: 10 }} />
                    )}
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button fullWidth variant="contained" startIcon={<Print />}
                    sx={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}cc)`, borderRadius: 2 }}>
                    فتح القالب
                  </Button>
                </CardActions>
              </TemplateCard>
            </Grid>
          ))}
        </Grid>

        {filteredTemplates.length === 0 && (
          <Box textAlign="center" py={8}>
            <Description sx={{ fontSize: 56, color: 'grey.300', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">لا يوجد قوالب مطابقة</Typography>
          </Box>
        )}
      </Container>

      {/* ── Beneficiary Selection Dialog ──── */}
      <Dialog open={beneficiaryDialogOpen} onClose={() => setBeneficiaryDialogOpen(false)}
        maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>اختر المستفيد</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth placeholder="ابحث بالاسم أو رقم الهوية..."
            value={benSearch}
            onChange={(e) => { setBenSearch(e.target.value); loadBeneficiaries(e.target.value); }}
            size="small"
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
            sx={{ mb: 2, mt: 1 }}
          />
          {loadingList && [1, 2, 3].map(i => <Skeleton key={i} height={60} sx={{ mb: 1 }} />)}
          {!loadingList && beneficiaries.length === 0 && (
            <Alert severity="info">لا يوجد مستفيدين — جرب تغيير البحث</Alert>
          )}
          <Stack spacing={1} sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {beneficiaries.map((b) => (
              <Card key={b.id} variant="outlined" sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.main' } }}
                onClick={() => handleBeneficiarySelect(b)}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: brandColors.primary, width: 40, height: 40, fontSize: 14 }}>
                      {(b.name || '?').charAt(0)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="subtitle2" fontWeight="bold">{b.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {b.nationalId || '—'} • {b.gender === 'male' ? 'ذكر' : b.gender === 'female' ? 'أنثى' : '—'}
                        {b.phone && ` • ${b.phone}`}
                      </Typography>
                    </Box>
                    <Chip size="small" label={b.status === 'active' ? 'نشط' : b.status === 'pending' ? 'انتظار' : b.status}
                      color={b.status === 'active' ? 'success' : b.status === 'pending' ? 'warning' : 'default'} />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBeneficiaryDialogOpen(false)}>إلغاء</Button>
        </DialogActions>
      </Dialog>

      {/* ── Preview Dialog ───────────────── */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)}
        maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '95vh' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            {selectedTemplate?.name}
            {selectedBeneficiary && ` — ${selectedBeneficiary.name}`}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Print />} onClick={handlePrint} size="small">
              طباعة
            </Button>
            <Button variant="contained" startIcon={<PictureAsPdf />} onClick={handleSavePDF} size="small"
              sx={{ background: gradients.primary }}>
              حفظ PDF
            </Button>
            <IconButton onClick={() => setPreviewOpen(false)} size="small"><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box id="print-template-content" sx={{ p: 4, bgcolor: 'white', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
            <TemplateRenderer templateId={selectedTemplate?.id} beneficiary={selectedBeneficiary} />
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── Hidden Print Area ────────────── */}
      <Box sx={{
        '@media screen': { display: 'none' },
        '@media print': {
          display: 'block', p: 0,
          '& *': { color: '#000 !important' },
        },
      }}>
        <Box sx={{ p: 4, direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
          <TemplateRenderer templateId={selectedTemplate?.id} beneficiary={selectedBeneficiary} />
        </Box>
      </Box>
    </Box>
  );
};

// ═════════════════════════════════════════════════
//  TEMPLATE RENDERER
// ═════════════════════════════════════════════════
const TemplateRenderer = ({ templateId, beneficiary }) => {
  switch (templateId) {
    case 'registration': return <RegistrationFormTemplate beneficiary={beneficiary} />;
    case 'id-card': return <IdCardTemplate beneficiary={beneficiary} />;
    case 'data-sheet': return <DataSheetTemplate beneficiary={beneficiary} />;
    case 'progress-report': return <ProgressReportTemplate beneficiary={beneficiary} />;
    case 'attendance-cert': return <AttendanceCertTemplate beneficiary={beneficiary} />;
    case 'medical-report': return <MedicalReportTemplate beneficiary={beneficiary} />;
    case 'transfer-letter': return <TransferLetterTemplate beneficiary={beneficiary} />;
    case 'family-meeting': return <FamilyMeetingTemplate beneficiary={beneficiary} />;
    default: return <Typography color="text.secondary" textAlign="center" py={8}>اختر قالباً للمعاينة</Typography>;
  }
};

// ── Shared Styles ──────────────────────────────
const headerStyle = {
  background: 'linear-gradient(135deg, #1a237e, #283593)',
  color: 'white', p: 3, borderRadius: '12px 12px 0 0',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const sectionTitle = {
  bgcolor: '#f5f5f5', p: 1.5, mb: 2, borderRadius: 1,
  borderRight: '4px solid #1a237e', fontWeight: 'bold',
};
const fieldRow = { display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap' };
const fieldBox = (flex = 1) => ({ flex, minWidth: 150 });
const label = { fontSize: 11, color: '#666', mb: 0.3 };
const value = { fontSize: 13, fontWeight: 600, borderBottom: '1px dotted #ccc', pb: 0.5, minHeight: 24 };
const emptyLine = { borderBottom: '1px dotted #999', pb: 0.5, minHeight: 24, display: 'block' };

const formatDate = (d) => {
  if (!d) return '....../....../......';
  try { return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d)); }
  catch { return String(d).slice(0, 10); }
};

const OrgHeader = ({ title, subtitle }) => (
  <Box sx={headerStyle}>
    <Box>
      <Typography variant="h5" fontWeight="bold">مركز الأوائل للتأهيل</Typography>
      <Typography variant="body2" sx={{ opacity: 0.9 }}>AlAwael Rehabilitation Center</Typography>
    </Box>
    <Box textAlign="left">
      <Typography variant="h6" fontWeight="bold">{title}</Typography>
      {subtitle && <Typography variant="caption">{subtitle}</Typography>}
    </Box>
  </Box>
);

const OrgFooter = () => (
  <Box sx={{ mt: 4, pt: 2, borderTop: '2px solid #1a237e', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666' }}>
    <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</span>
    <span>مركز الأوائل للتأهيل — نظام الأوائل ERP</span>
    <span>صفحة 1 من 1</span>
  </Box>
);

const SignatureBlock = ({ signatures = ['المسؤول', 'ولي الأمر'] }) => (
  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-around' }}>
    {signatures.map((s, i) => (
      <Box key={i} textAlign="center" sx={{ minWidth: 150 }}>
        <Box sx={{ borderBottom: '1px solid #333', mb: 1, height: 40 }} />
        <Typography variant="caption" fontWeight="bold">{s}</Typography>
      </Box>
    ))}
  </Box>
);

// ═════════════════════════════════════════════════
//  1. REGISTRATION FORM
// ═════════════════════════════════════════════════
const RegistrationFormTemplate = ({ beneficiary: b }) => (
  <Box sx={{ border: '2px solid #1a237e', borderRadius: 3, overflow: 'hidden' }}>
    <OrgHeader title="نموذج التسجيل" subtitle="Registration Form" />
    <Box sx={{ p: 3 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        رقم النموذج: REG-{new Date().getFullYear()}-________ &nbsp;&nbsp; التاريخ: {formatDate(new Date())}
      </Typography>

      {/* Personal */}
      <Typography sx={sectionTitle}>البيانات الشخصية</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox(2)}><Typography sx={label}>الاسم الكامل (عربي)</Typography><Typography sx={value}>{b?.name || ''}</Typography></Box>
        <Box sx={fieldBox(2)}><Typography sx={label}>الاسم الكامل (إنجليزي)</Typography><Typography sx={value}>{b?.nameEn || ''}</Typography></Box>
      </Box>
      <Box sx={fieldRow}>
        <Box sx={fieldBox()}><Typography sx={label}>رقم الهوية / الإقامة</Typography><Typography sx={value}>{b?.nationalId || ''}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>تاريخ الميلاد</Typography><Typography sx={value}>{formatDate(b?.dateOfBirth)}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>الجنس</Typography><Typography sx={value}>{b?.gender === 'male' ? 'ذكر' : b?.gender === 'female' ? 'أنثى' : ''}</Typography></Box>
      </Box>
      <Box sx={fieldRow}>
        <Box sx={fieldBox()}><Typography sx={label}>الجنسية</Typography><Typography sx={value}>{b?.nationality || ''}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>فصيلة الدم</Typography><Typography sx={value}>{b?.bloodType || ''}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>الديانة</Typography><Typography sx={value}>{b?.religion || ''}</Typography></Box>
      </Box>

      {/* Contact */}
      <Typography sx={sectionTitle}>بيانات الاتصال</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox()}><Typography sx={label}>رقم الجوال</Typography><Typography sx={value}>{b?.phone || ''}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>رقم بديل</Typography><Typography sx={value}>{b?.altPhone || ''}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>البريد الإلكتروني</Typography><Typography sx={value}>{b?.email || ''}</Typography></Box>
      </Box>

      {/* Address */}
      <Typography sx={sectionTitle}>العنوان</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox()}><Typography sx={label}>المدينة</Typography><Typography sx={value}>{b?.address?.city || ''}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>الحي</Typography><Typography sx={value}>{b?.address?.district || ''}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>الشارع</Typography><Typography sx={value}>{b?.address?.street || ''}</Typography></Box>
      </Box>
      <Box sx={fieldRow}>
        <Box sx={fieldBox()}><Typography sx={label}>الرمز البريدي</Typography><Typography sx={value}>{b?.address?.postalCode || ''}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>رقم المبنى</Typography><Typography sx={value}>{b?.address?.buildingNumber || ''}</Typography></Box>
      </Box>

      {/* Guardian */}
      <Typography sx={sectionTitle}>بيانات ولي الأمر</Typography>
      {(b?.familyMembers || [{}]).slice(0, 2).map((fm, i) => (
        <Box key={i} sx={{ mb: 2 }}>
          <Box sx={fieldRow}>
            <Box sx={fieldBox(2)}><Typography sx={label}>الاسم</Typography><Typography sx={value}>{fm.name || ''}</Typography></Box>
            <Box sx={fieldBox()}><Typography sx={label}>صلة القرابة</Typography><Typography sx={value}>{fm.relationship || ''}</Typography></Box>
            <Box sx={fieldBox()}><Typography sx={label}>الجوال</Typography><Typography sx={value}>{fm.phone || ''}</Typography></Box>
          </Box>
        </Box>
      ))}

      {/* Emergency */}
      <Typography sx={sectionTitle}>جهة الاتصال في الطوارئ</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox(2)}><Typography sx={label}>الاسم</Typography><Typography sx={value}>{b?.emergencyContacts?.[0]?.name || ''}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>القرابة</Typography><Typography sx={value}>{b?.emergencyContacts?.[0]?.relationship || ''}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>الهاتف</Typography><Typography sx={value}>{b?.emergencyContacts?.[0]?.phone || ''}</Typography></Box>
      </Box>

      {/* Housing */}
      <Typography sx={sectionTitle}>السكن والنقل</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox()}><Typography sx={label}>نوع السكن</Typography><Typography sx={value}>{b?.housing?.type === 'own' ? 'ملك' : b?.housing?.type === 'rent' ? 'إيجار' : b?.housing?.type || ''}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>وسيلة النقل</Typography><Typography sx={value}>{b?.housing?.transportationMethod || ''}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>يحتاج مساعدة نقل</Typography><Typography sx={value}>{b?.housing?.needsTransportationAssistance ? 'نعم' : 'لا'}</Typography></Box>
      </Box>

      {/* Insurance */}
      <Typography sx={sectionTitle}>التأمين الصحي</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox()}><Typography sx={label}>لديه تأمين</Typography><Typography sx={value}>{b?.insurance?.hasInsurance ? 'نعم' : 'لا'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>شركة التأمين</Typography><Typography sx={value}>{b?.insurance?.provider || ''}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>رقم البوليصة</Typography><Typography sx={value}>{b?.insurance?.policyNumber || ''}</Typography></Box>
      </Box>

      {/* Notes */}
      <Typography sx={sectionTitle}>ملاحظات</Typography>
      <Box sx={{ border: '1px dotted #999', borderRadius: 1, p: 2, minHeight: 60 }}>
        <Typography variant="body2">{b?.generalNotes || ''}</Typography>
      </Box>

      {/* Declaration */}
      <Box sx={{ mt: 3, p: 2, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #ddd' }}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>إقرار وتعهد:</Typography>
        <Typography variant="caption" sx={{ lineHeight: 2 }}>
          أقر أنا الموقع أدناه بأن جميع البيانات المذكورة أعلاه صحيحة ودقيقة، وأتعهد بإبلاغ المركز فوراً عند حدوث أي تغيير في البيانات المذكورة.
          وأوافق على الالتزام بأنظمة ولوائح مركز الأوائل للتأهيل.
        </Typography>
      </Box>

      <SignatureBlock signatures={['ولي الأمر / الوصي', 'مسؤول التسجيل', 'مدير المركز']} />
      <OrgFooter />
    </Box>
  </Box>
);

// ═════════════════════════════════════════════════
//  2. ID CARD
// ═════════════════════════════════════════════════
const IdCardTemplate = ({ beneficiary: b }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
    <Box sx={{ width: 400, border: '3px solid #1a237e', borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
      {/* Front */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a237e, #283593)', color: 'white', p: 2.5, textAlign: 'center' }}>
        <Typography variant="h6" fontWeight="bold">مركز الأوائل للتأهيل</Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>AlAwael Rehabilitation Center</Typography>
        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.3)' }} />
        <Typography variant="subtitle2" fontWeight="bold">بطاقة تعريف المستفيد</Typography>
      </Box>
      <Box sx={{ p: 2.5, bgcolor: 'white' }}>
        <Box display="flex" gap={2} mb={2}>
          <Avatar sx={{ width: 72, height: 72, bgcolor: '#1a237e', fontSize: 28, fontWeight: 'bold' }}>
            {(b?.name || '?').charAt(0)}
          </Avatar>
          <Box flex={1}>
            <Typography variant="subtitle1" fontWeight="bold">{b?.name || '—'}</Typography>
            {b?.nameEn && <Typography variant="caption" color="text.secondary">{b.nameEn}</Typography>}
            <Box mt={0.5}>
              <Chip size="small" label={b?.category === 'physical' ? 'حركية' : b?.category === 'mental' ? 'ذهنية' : b?.category === 'sensory' ? 'حسية' : b?.category || '—'}
                sx={{ fontSize: 10, height: 20 }} />
            </Box>
          </Box>
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        <Grid container spacing={1}>
          {[
            ['رقم الهوية', b?.nationalId || '—'],
            ['تاريخ الميلاد', formatDate(b?.dateOfBirth)],
            ['الجنس', b?.gender === 'male' ? 'ذكر' : b?.gender === 'female' ? 'أنثى' : '—'],
            ['فصيلة الدم', b?.bloodType || '—'],
            ['الهاتف', b?.phone || '—'],
            ['تاريخ التسجيل', formatDate(b?.joinDate)],
          ].map(([lbl, val], i) => (
            <Grid item xs={6} key={i}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{lbl}</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>{val}</Typography>
            </Grid>
          ))}
        </Grid>
        <Divider sx={{ my: 1.5 }} />
        <Box sx={{ bgcolor: '#fff3e0', p: 1.5, borderRadius: 1, border: '1px solid #ffcc80' }}>
          <Typography variant="caption" fontWeight="bold" color="error">في حالة الطوارئ:</Typography>
          <Typography variant="body2" sx={{ fontSize: 11 }}>
            {b?.emergencyContacts?.[0]?.name || b?.familyMembers?.[0]?.name || '—'} —{' '}
            {b?.emergencyContacts?.[0]?.phone || b?.familyMembers?.[0]?.phone || '—'}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ background: '#1a237e', color: 'white', p: 1, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ fontSize: 9 }}>
          هذه البطاقة ملك لمركز الأوائل للتأهيل — يرجى إعادتها في حال العثور عليها
        </Typography>
      </Box>
    </Box>
  </Box>
);

// ═════════════════════════════════════════════════
//  3. DATA SHEET
// ═════════════════════════════════════════════════
const DataSheetTemplate = ({ beneficiary: b }) => (
  <Box sx={{ border: '2px solid #1a237e', borderRadius: 3, overflow: 'hidden' }}>
    <OrgHeader title="بطاقة بيانات شاملة" subtitle="Comprehensive Data Sheet" />
    <Box sx={{ p: 3 }}>
      {/* Photo + Basic */}
      <Box display="flex" gap={3} mb={3}>
        <Box sx={{ width: 100, height: 120, border: '2px dashed #ccc', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {b?.profilePhoto ? <img src={b.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
            : <Typography variant="caption" color="text.secondary" textAlign="center">صورة<br />شخصية</Typography>}
        </Box>
        <Box flex={1}>
          <Typography variant="h6" fontWeight="bold">{b?.name || '—'}</Typography>
          {b?.nameEn && <Typography variant="body2" color="text.secondary">{b.nameEn}</Typography>}
          <Box sx={fieldRow} mt={1}>
            <Box sx={fieldBox()}><Typography sx={label}>رقم الهوية</Typography><Typography sx={value}>{b?.nationalId || '—'}</Typography></Box>
            <Box sx={fieldBox()}><Typography sx={label}>الحالة</Typography><Typography sx={value}>{b?.status === 'active' ? 'نشط' : b?.status || '—'}</Typography></Box>
            <Box sx={fieldBox()}><Typography sx={label}>الفئة</Typography><Typography sx={value}>{b?.category || '—'}</Typography></Box>
          </Box>
        </Box>
      </Box>

      {/* Personal */}
      <Typography sx={sectionTitle}>البيانات الشخصية</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox()}><Typography sx={label}>تاريخ الميلاد</Typography><Typography sx={value}>{formatDate(b?.dateOfBirth)}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>الجنس</Typography><Typography sx={value}>{b?.gender === 'male' ? 'ذكر' : b?.gender === 'female' ? 'أنثى' : '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>الجنسية</Typography><Typography sx={value}>{b?.nationality || '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>فصيلة الدم</Typography><Typography sx={value}>{b?.bloodType || '—'}</Typography></Box>
      </Box>

      {/* Contact */}
      <Typography sx={sectionTitle}>الاتصال والعنوان</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox()}><Typography sx={label}>الجوال</Typography><Typography sx={value}>{b?.phone || '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>البريد</Typography><Typography sx={value}>{b?.email || '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>المدينة</Typography><Typography sx={value}>{b?.address?.city || '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>الحي</Typography><Typography sx={value}>{b?.address?.district || '—'}</Typography></Box>
      </Box>

      {/* Family */}
      <Typography sx={sectionTitle}>أفراد الأسرة</Typography>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right' }}>الاسم</th>
            <th style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right' }}>القرابة</th>
            <th style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right' }}>الجوال</th>
            <th style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right' }}>وصي</th>
          </tr>
        </thead>
        <tbody>
          {(b?.familyMembers || []).length === 0 && (
            <tr><td colSpan={4} style={{ border: '1px solid #ddd', padding: 8, textAlign: 'center', color: '#999' }}>لا يوجد بيانات</td></tr>
          )}
          {(b?.familyMembers || []).map((fm, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>{fm.name || '—'}</td>
              <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>{fm.relationship || '—'}</td>
              <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>{fm.phone || '—'}</td>
              <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>{fm.hasLegalGuardianship ? '✓' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Insurance */}
      <Typography sx={sectionTitle}>التأمين الصحي</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox()}><Typography sx={label}>شركة التأمين</Typography><Typography sx={value}>{b?.insurance?.provider || '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>رقم البوليصة</Typography><Typography sx={value}>{b?.insurance?.policyNumber || '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>نوع التغطية</Typography><Typography sx={value}>{b?.insurance?.coverageType || '—'}</Typography></Box>
      </Box>

      {/* Performance */}
      <Typography sx={sectionTitle}>مؤشرات الأداء</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox()}><Typography sx={label}>نسبة التقدم</Typography><Typography sx={value}>{b?.progress || 0}%</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>الجلسات</Typography><Typography sx={value}>{b?.completedSessions || 0} / {b?.sessions || 0}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>نسبة الحضور</Typography><Typography sx={value}>{b?.attendanceRate || 0}%</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>تقييم السلوك</Typography><Typography sx={value}>{b?.behaviorRating || '—'}/5</Typography></Box>
      </Box>

      {/* Notes */}
      <Typography sx={sectionTitle}>ملاحظات عامة</Typography>
      <Box sx={{ border: '1px dotted #999', borderRadius: 1, p: 2, minHeight: 50 }}>
        <Typography variant="body2">{b?.generalNotes || 'لا توجد ملاحظات'}</Typography>
      </Box>

      <OrgFooter />
    </Box>
  </Box>
);

// ═════════════════════════════════════════════════
//  4. PROGRESS REPORT
// ═════════════════════════════════════════════════
const ProgressReportTemplate = ({ beneficiary: b }) => (
  <Box sx={{ border: '2px solid #1a237e', borderRadius: 3, overflow: 'hidden' }}>
    <OrgHeader title="تقرير التقدم" subtitle="Progress Report" />
    <Box sx={{ p: 3 }}>
      {/* Beneficiary Info */}
      <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2, mb: 3 }}>
        <Box sx={fieldRow}>
          <Box sx={fieldBox(2)}><Typography sx={label}>اسم المستفيد</Typography><Typography sx={value}>{b?.name || '—'}</Typography></Box>
          <Box sx={fieldBox()}><Typography sx={label}>رقم الهوية</Typography><Typography sx={value}>{b?.nationalId || '—'}</Typography></Box>
          <Box sx={fieldBox()}><Typography sx={label}>الفئة</Typography><Typography sx={value}>{b?.category || '—'}</Typography></Box>
        </Box>
        <Box sx={fieldRow}>
          <Box sx={fieldBox()}><Typography sx={label}>تاريخ التسجيل</Typography><Typography sx={value}>{formatDate(b?.joinDate)}</Typography></Box>
          <Box sx={fieldBox()}><Typography sx={label}>المعالج</Typography><Typography sx={value}>{b?.therapist || '________'}</Typography></Box>
          <Box sx={fieldBox()}><Typography sx={label}>فترة التقرير</Typography><Typography sx={value}>من ....../...... إلى ....../......</Typography></Box>
        </Box>
      </Box>

      {/* Performance Summary */}
      <Typography sx={sectionTitle}>ملخص الأداء</Typography>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#e8eaf6' }}>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>المؤشر</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'center', width: 100 }}>النسبة / القيمة</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'center', width: 100 }}>التقييم</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['نسبة التقدم العام', `${b?.progress || 0}%`, b?.progress >= 70 ? 'ممتاز' : b?.progress >= 40 ? 'جيد' : 'يحتاج تحسين'],
            ['نسبة الحضور', `${b?.attendanceRate || 0}%`, b?.attendanceRate >= 80 ? 'ممتاز' : b?.attendanceRate >= 60 ? 'جيد' : 'ضعيف'],
            ['الدرجة الأكاديمية', `${b?.academicScore || 0}%`, b?.academicScore >= 70 ? 'ممتاز' : b?.academicScore >= 50 ? 'جيد' : 'ضعيف'],
            ['تقييم السلوك', `${b?.behaviorRating || 0}/5`, b?.behaviorRating >= 4 ? 'ممتاز' : b?.behaviorRating >= 3 ? 'جيد' : 'يحتاج متابعة'],
            ['الجلسات المكتملة', `${b?.completedSessions || 0} / ${b?.sessions || 0}`, ''],
          ].map(([ind, val, ev], i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 600 }}>{ind}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'center' }}>{val}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'center', color: ev === 'ممتاز' ? '#2e7d32' : ev?.includes('ضعيف') || ev?.includes('يحتاج') ? '#c62828' : '#f57f17' }}>{ev}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Detailed Assessment */}
      <Typography sx={sectionTitle}>التقييم التفصيلي</Typography>
      {['المهارات الحركية', 'المهارات الذهنية', 'المهارات الاجتماعية', 'مهارات التواصل', 'الاستقلالية'].map((skill, i) => (
        <Box key={i} sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2" fontWeight={600}>{skill}</Typography>
            <Typography variant="caption">□  ممتاز &nbsp;&nbsp; □  جيد جداً &nbsp;&nbsp; □  جيد &nbsp;&nbsp; □  مقبول &nbsp;&nbsp; □  ضعيف</Typography>
          </Box>
          <Box sx={{ borderBottom: '1px dotted #999', mb: 0.5, fontSize: 11 }}>ملاحظات: </Box>
        </Box>
      ))}

      {/* Recommendations */}
      <Typography sx={sectionTitle}>التوصيات</Typography>
      <Box sx={{ border: '1px dotted #999', borderRadius: 1, p: 2, minHeight: 80 }}>
        <Typography variant="body2" sx={{ lineHeight: 2.5 }}>
          1. ________________________________________<br />
          2. ________________________________________<br />
          3. ________________________________________
        </Typography>
      </Box>

      {/* Goals */}
      <Typography sx={{ ...sectionTitle, mt: 2 }}>أهداف الفترة القادمة</Typography>
      <Box sx={{ border: '1px dotted #999', borderRadius: 1, p: 2, minHeight: 80 }}>
        <Typography variant="body2" sx={{ lineHeight: 2.5 }}>
          1. ________________________________________<br />
          2. ________________________________________<br />
          3. ________________________________________
        </Typography>
      </Box>

      <SignatureBlock signatures={['المعالج / الأخصائي', 'مشرف القسم', 'ولي الأمر']} />
      <OrgFooter />
    </Box>
  </Box>
);

// ═════════════════════════════════════════════════
//  5. ATTENDANCE CERTIFICATE
// ═════════════════════════════════════════════════
const AttendanceCertTemplate = ({ beneficiary: b }) => (
  <Box sx={{ border: '3px double #1a237e', borderRadius: 3, overflow: 'hidden', minHeight: 600 }}>
    {/* Ornamental Header */}
    <Box sx={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)', color: 'white', py: 4, px: 3, textAlign: 'center' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>مركز الأوائل للتأهيل</Typography>
      <Typography variant="body1" sx={{ opacity: 0.9 }}>AlAwael Rehabilitation Center</Typography>
      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
      <Typography variant="h5" fontWeight="bold" sx={{ letterSpacing: 2 }}>شهادة حضور وانتظام</Typography>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>Certificate of Attendance</Typography>
    </Box>

    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="body1" sx={{ lineHeight: 2.5, fontSize: 15, mt: 3 }}>
        يشهد مركز الأوائل للتأهيل بأن المستفيد / المستفيدة:
      </Typography>

      <Typography variant="h4" fontWeight="bold" sx={{ my: 3, color: '#1a237e', borderBottom: '2px solid #1a237e', display: 'inline-block', pb: 1, px: 4 }}>
        {b?.name || '________________________'}
      </Typography>

      <Box sx={{ my: 3, textAlign: 'right', maxWidth: 500, mx: 'auto' }}>
        <Box sx={fieldRow}><Box sx={fieldBox()}><Typography sx={label}>رقم الهوية</Typography><Typography sx={value}>{b?.nationalId || '____________'}</Typography></Box></Box>
        <Box sx={fieldRow}><Box sx={fieldBox()}><Typography sx={label}>الفئة</Typography><Typography sx={value}>{b?.category || '____________'}</Typography></Box></Box>
      </Box>

      <Typography variant="body1" sx={{ lineHeight: 2.5, fontSize: 15 }}>
        قد حضر / حضرت بانتظام برنامج التأهيل في المركز خلال الفترة من
        <br />
        <strong>....../....../......</strong> إلى <strong>....../....../......</strong>
        <br />
        بنسبة حضور: <strong>{b?.attendanceRate || '___'}%</strong>
      </Typography>

      <Typography variant="body2" sx={{ mt: 4, color: '#666' }}>
        وقد أُعطيت هذه الشهادة بناءً على طلبه/ها لتقديمها لمن يهمه الأمر.
      </Typography>

      <Box sx={{ mt: 6, display: 'flex', justifyContent: 'space-around' }}>
        <Box textAlign="center">
          <Box sx={{ borderBottom: '1px solid #333', mb: 1, height: 40, minWidth: 150 }} />
          <Typography variant="caption" fontWeight="bold">مدير المركز</Typography>
        </Box>
        <Box textAlign="center">
          <Box sx={{ width: 80, height: 80, border: '2px dashed #ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto' }}>
            <Typography variant="caption" color="text.secondary">الختم</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #ddd', fontSize: 11, color: '#999', textAlign: 'center' }}>
        التاريخ: {new Date().toLocaleDateString('ar-SA')} &nbsp;&nbsp;|&nbsp;&nbsp; رقم الشهادة: ATT-{new Date().getFullYear()}-________
      </Box>
    </Box>
  </Box>
);

// ═════════════════════════════════════════════════
//  6. MEDICAL REPORT
// ═════════════════════════════════════════════════
const MedicalReportTemplate = ({ beneficiary: b }) => (
  <Box sx={{ border: '2px solid #c62828', borderRadius: 3, overflow: 'hidden' }}>
    <Box sx={{ ...headerStyle, background: 'linear-gradient(135deg, #c62828, #e53935)' }}>
      <Box>
        <Typography variant="h5" fontWeight="bold">مركز الأوائل للتأهيل</Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>القسم الطبي</Typography>
      </Box>
      <Box textAlign="left">
        <Typography variant="h6" fontWeight="bold">التقرير الطبي</Typography>
        <Typography variant="caption">Medical Report</Typography>
      </Box>
    </Box>
    <Box sx={{ p: 3 }}>
      <Alert severity="info" sx={{ mb: 2, fontSize: 11 }}>سري — للاستخدام الطبي فقط — CONFIDENTIAL</Alert>

      {/* Patient Info */}
      <Typography sx={{ ...sectionTitle, borderRight: '4px solid #c62828' }}>بيانات المريض</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox(2)}><Typography sx={label}>الاسم</Typography><Typography sx={value}>{b?.name || '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>رقم الهوية</Typography><Typography sx={value}>{b?.nationalId || '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>تاريخ الميلاد</Typography><Typography sx={value}>{formatDate(b?.dateOfBirth)}</Typography></Box>
      </Box>
      <Box sx={fieldRow}>
        <Box sx={fieldBox()}><Typography sx={label}>الجنس</Typography><Typography sx={value}>{b?.gender === 'male' ? 'ذكر' : b?.gender === 'female' ? 'أنثى' : '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>فصيلة الدم</Typography><Typography sx={value}>{b?.bloodType || '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>الحساسية</Typography><Typography sx={value}>{b?.preferences?.allergies?.join(', ') || 'لا يوجد'}</Typography></Box>
      </Box>

      {/* Insurance */}
      <Typography sx={{ ...sectionTitle, borderRight: '4px solid #c62828' }}>التأمين</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox()}><Typography sx={label}>شركة التأمين</Typography><Typography sx={value}>{b?.insurance?.provider || '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>رقم البوليصة</Typography><Typography sx={value}>{b?.insurance?.policyNumber || '—'}</Typography></Box>
      </Box>

      {/* Diagnosis */}
      <Typography sx={{ ...sectionTitle, borderRight: '4px solid #c62828' }}>التشخيص</Typography>
      <Box sx={{ border: '1px solid #ddd', borderRadius: 1, p: 2, minHeight: 60, mb: 2 }}>
        <Typography variant="body2">التشخيص الرئيسي: ________________________________</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>التشخيصات المصاحبة: ________________________________</Typography>
      </Box>

      {/* Examination */}
      <Typography sx={{ ...sectionTitle, borderRight: '4px solid #c62828' }}>الفحص السريري</Typography>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
        <tbody>
          {['الحالة العامة', 'الجهاز العصبي', 'الجهاز الحركي', 'السمع والنطق', 'البصر', 'الحالة النفسية'].map((item, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 600, width: 150, background: '#fce4ec' }}>{item}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Treatment Plan */}
      <Typography sx={{ ...sectionTitle, borderRight: '4px solid #c62828' }}>الخطة العلاجية</Typography>
      <Box sx={{ border: '1px dotted #999', borderRadius: 1, p: 2, minHeight: 80, mb: 2 }}>
        <Typography variant="body2" sx={{ lineHeight: 2.5 }}>
          1. ________________________________________<br />
          2. ________________________________________<br />
          3. ________________________________________
        </Typography>
      </Box>

      {/* Medications */}
      <Typography sx={{ ...sectionTitle, borderRight: '4px solid #c62828' }}>الأدوية الموصوفة</Typography>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#fce4ec' }}>
            <th style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right' }}>الدواء</th>
            <th style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right' }}>الجرعة</th>
            <th style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right' }}>المدة</th>
            <th style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right' }}>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map(i => (
            <tr key={i}>
              <td style={{ border: '1px solid #ddd', padding: 6 }}></td>
              <td style={{ border: '1px solid #ddd', padding: 6 }}></td>
              <td style={{ border: '1px solid #ddd', padding: 6 }}></td>
              <td style={{ border: '1px solid #ddd', padding: 6 }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      <SignatureBlock signatures={['الطبيب المعالج', 'رئيس القسم الطبي']} />
      <OrgFooter />
    </Box>
  </Box>
);

// ═════════════════════════════════════════════════
//  7. TRANSFER LETTER
// ═════════════════════════════════════════════════
const TransferLetterTemplate = ({ beneficiary: b }) => (
  <Box sx={{ border: '2px solid #1a237e', borderRadius: 3, overflow: 'hidden' }}>
    <OrgHeader title="خطاب تحويل" subtitle="Transfer / Referral Letter" />
    <Box sx={{ p: 3 }}>
      <Box sx={{ textAlign: 'left', mb: 3 }}>
        <Typography variant="body2">التاريخ: {new Date().toLocaleDateString('ar-SA')}</Typography>
        <Typography variant="body2">الرقم المرجعي: TRF-{new Date().getFullYear()}-________</Typography>
      </Box>

      <Typography variant="body1" fontWeight="bold" gutterBottom>
        إلى: ________________________________________
      </Typography>
      <Typography variant="body1" gutterBottom>
        عناية: ________________________________________
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Typography variant="body1" gutterBottom fontWeight="bold">
        الموضوع: تحويل مستفيد
      </Typography>

      <Typography variant="body1" sx={{ lineHeight: 2.2, mt: 2 }}>
        السلام عليكم ورحمة الله وبركاته،
        <br /><br />
        نفيدكم بأننا نقوم بتحويل المستفيد/ة: <strong>{b?.name || '____________'}</strong>
        {' '}رقم الهوية: <strong>{b?.nationalId || '____________'}</strong>
        <br />
        المسجل/ة في مركز الأوائل للتأهيل منذ تاريخ: <strong>{formatDate(b?.joinDate)}</strong>
        <br /><br />
        <strong>الفئة:</strong> {b?.category || '____________'}
        <br />
        <strong>سبب التحويل:</strong> ________________________________________
        <br /><br />
      </Typography>

      <Typography sx={sectionTitle}>ملخص الحالة</Typography>
      <Box sx={{ border: '1px dotted #999', borderRadius: 1, p: 2, minHeight: 80, mb: 2 }}>
        <Typography variant="body2" sx={{ lineHeight: 2.5 }}>
          ________________________________________<br />
          ________________________________________<br />
          ________________________________________
        </Typography>
      </Box>

      <Typography sx={sectionTitle}>الخدمات المقدمة سابقاً</Typography>
      <Box sx={{ border: '1px dotted #999', borderRadius: 1, p: 2, minHeight: 60, mb: 2 }}>
        <Typography variant="body2" sx={{ lineHeight: 2.5 }}>
          • الجلسات المنفذة: {b?.completedSessions || '___'} جلسة<br />
          • نسبة التقدم: {b?.progress || '___'}%<br />
          • ________________________________________
        </Typography>
      </Box>

      <Typography sx={sectionTitle}>التوصيات</Typography>
      <Box sx={{ border: '1px dotted #999', borderRadius: 1, p: 2, minHeight: 60, mb: 2 }}>
        <Typography variant="body2" sx={{ lineHeight: 2.5 }}>
          1. ________________________________________<br />
          2. ________________________________________
        </Typography>
      </Box>

      <Typography variant="body1" sx={{ mt: 2, lineHeight: 2.2 }}>
        نأمل منكم التكرم بتقديم الخدمات اللازمة للمستفيد/ة المذكور/ة أعلاه.
        <br />
        وتفضلوا بقبول فائق الاحترام والتقدير.
      </Typography>

      <SignatureBlock signatures={['مدير المركز', 'الختم الرسمي']} />
      <OrgFooter />
    </Box>
  </Box>
);

// ═════════════════════════════════════════════════
//  8. FAMILY MEETING
// ═════════════════════════════════════════════════
const FamilyMeetingTemplate = ({ beneficiary: b }) => (
  <Box sx={{ border: '2px solid #1a237e', borderRadius: 3, overflow: 'hidden' }}>
    <OrgHeader title="تقرير اجتماع الأسرة" subtitle="Family Meeting Report" />
    <Box sx={{ p: 3 }}>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        رقم المحضر: FM-{new Date().getFullYear()}-________ &nbsp;&nbsp; التاريخ: {formatDate(new Date())} &nbsp;&nbsp; الساعة: ________
      </Typography>

      {/* Beneficiary Info */}
      <Typography sx={sectionTitle}>بيانات المستفيد</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox(2)}><Typography sx={label}>اسم المستفيد</Typography><Typography sx={value}>{b?.name || '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>رقم الهوية</Typography><Typography sx={value}>{b?.nationalId || '—'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>الفئة</Typography><Typography sx={value}>{b?.category || '—'}</Typography></Box>
      </Box>

      {/* Guardian Info */}
      <Typography sx={sectionTitle}>بيانات ولي الأمر / الحاضر</Typography>
      <Box sx={fieldRow}>
        <Box sx={fieldBox(2)}><Typography sx={label}>اسم ولي الأمر</Typography><Typography sx={value}>{b?.familyMembers?.[0]?.name || '________'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>صلة القرابة</Typography><Typography sx={value}>{b?.familyMembers?.[0]?.relationship || '________'}</Typography></Box>
        <Box sx={fieldBox()}><Typography sx={label}>الجوال</Typography><Typography sx={value}>{b?.familyMembers?.[0]?.phone || '________'}</Typography></Box>
      </Box>

      {/* Present */}
      <Typography sx={sectionTitle}>الحاضرون من المركز</Typography>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right' }}>الاسم</th>
            <th style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right' }}>المسمى الوظيفي</th>
            <th style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right' }}>التوقيع</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map(i => (
            <tr key={i}>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{i === 1 ? (b?.therapist || '') : ''}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{i === 1 ? 'المعالج' : ''}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Agenda */}
      <Typography sx={sectionTitle}>محاور الاجتماع</Typography>
      <Box sx={{ border: '1px dotted #999', borderRadius: 1, p: 2, minHeight: 80, mb: 2 }}>
        <Typography variant="body2" sx={{ lineHeight: 2.5 }}>
          1. مناقشة تقدم المستفيد (التقدم الحالي: {b?.progress || '___'}%)<br />
          2. ________________________________________<br />
          3. ________________________________________<br />
          4. ________________________________________
        </Typography>
      </Box>

      {/* Discussion */}
      <Typography sx={sectionTitle}>ملخص النقاش</Typography>
      <Box sx={{ border: '1px dotted #999', borderRadius: 1, p: 2, minHeight: 100, mb: 2 }}>
        <Typography variant="body2" sx={{ lineHeight: 2.5 }}>
          ________________________________________<br />
          ________________________________________<br />
          ________________________________________<br />
          ________________________________________
        </Typography>
      </Box>

      {/* Decisions */}
      <Typography sx={sectionTitle}>القرارات والتوصيات</Typography>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#e8f5e9' }}>
            <th style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right', width: 30 }}>#</th>
            <th style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right' }}>القرار / التوصية</th>
            <th style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right', width: 120 }}>المسؤول</th>
            <th style={{ border: '1px solid #ddd', padding: 6, textAlign: 'right', width: 100 }}>الموعد</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4].map(i => (
            <tr key={i}>
              <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>{i}</td>
              <td style={{ border: '1px solid #ddd', padding: 6 }}></td>
              <td style={{ border: '1px solid #ddd', padding: 6 }}></td>
              <td style={{ border: '1px solid #ddd', padding: 6 }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Next Meeting */}
      <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 2 }}>
        <Typography variant="body2" fontWeight="bold">
          موعد الاجتماع القادم: ....../....../...... الساعة: ________
        </Typography>
      </Box>

      <SignatureBlock signatures={['ولي الأمر', 'المعالج / الأخصائي', 'مشرف القسم']} />
      <OrgFooter />
    </Box>
  </Box>
);

export default BeneficiaryPrintTemplates;
