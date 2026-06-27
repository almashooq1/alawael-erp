import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Stack,
  Autocomplete,
  Chip,
  Container,
  IconButton,
  Fade,
  Slide,
  Tooltip,
} from '@mui/material';
import {
  Print as PrintIcon,
  Download as DownloadIcon,
  Preview as PreviewIcon,
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon,
  PictureAsPdf as PdfIcon,
  Code as CodeIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

// ───────────────────────────────────────────────────────────────────────────
// بيانات وهمية — المستفيدون
// ───────────────────────────────────────────────────────────────────────────
const MOCK_BENEFICIARIES = [
  { id: 1, name: 'أحمد محمد العلي', age: 32, fileNo: 'BA-2024-001' },
  { id: 2, name: 'سارة خالد الحسن', age: 28, fileNo: 'BA-2024-002' },
  { id: 3, name: 'عمر إبراهيم النعيمي', age: 45, fileNo: 'BA-2024-003' },
  { id: 4, name: 'ليلى عبدالرحمن الغانم', age: 19, fileNo: 'BA-2024-004' },
  { id: 5, name: 'محمد سعيد الكعبي', age: 37, fileNo: 'BA-2024-005' },
  { id: 6, name: 'فاطمة علي المنصوري', age: 24, fileNo: 'BA-2024-006' },
  { id: 7, name: 'يوسف أحمد الزهراني', age: 51, fileNo: 'BA-2024-007' },
  { id: 8, name: 'نورة خالد الدوسري', age: 33, fileNo: 'BA-2024-008' },
];

// ───────────────────────────────────────────────────────────────────────────
// خطوات المعالج
// ───────────────────────────────────────────────────────────────────────────
const STEPS = ['تهيئة التقرير', 'معاينة وتحميل'];

// ───────────────────────────────────────────────────────────────────────────
// أقسام التقرير المتاحة
// ───────────────────────────────────────────────────────────────────────────
const AVAILABLE_SECTIONS = [
  { key: 'icf', label: 'تقييم ICF', defaultChecked: true },
  { key: 'carePlan', label: 'خطة الرعاية', defaultChecked: true },
  { key: 'therapySessions', label: 'الجلسات العلاجية', defaultChecked: true },
  { key: 'mdtMeetings', label: 'اجتماعات MDT', defaultChecked: true },
  { key: 'smartMetrics', label: 'المقاييس الذكية', defaultChecked: true },
];

// ───────────────────────────────────────────────────────────────────────────
// توليد بيانات وهمية للتقرير
// ───────────────────────────────────────────────────────────────────────────
const generateMockReport = (beneficiary, sections, format) => {
  const today = new Date().toLocaleDateString('ar-SA');
  const included = sections.filter((s) => s.checked);

  if (format === 'json') {
    return JSON.stringify(
      {
        reportTitle: 'التقرير السريري المتكامل',
        generatedAt: new Date().toISOString(),
        beneficiary: {
          name: beneficiary.name,
          age: beneficiary.age,
          fileNo: beneficiary.fileNo,
        },
        sections: included.map((s) => ({
          title: s.label,
          data: `بيانات ${s.label} — نموذج وهمي`,
        })),
      },
      null,
      2
    );
  }

  // توليد HTML
  const sectionsHtml = included
    .map(
      (s, i) => `
    <div style="margin-bottom: 32px;">
      <h3 style="color: #1565c0; border-bottom: 2px solid #e3f2fd; padding-bottom: 8px; margin-bottom: 16px; font-size: 20px;">
        ${i + 1}. ${s.label}
      </h3>
      <div style="background: #fafafa; padding: 20px; border-radius: 12px; border-right: 4px solid #42a5f5;">
        <p style="margin: 0; color: #333; line-height: 1.8;">
          ${getMockSectionContent(s.key)}
        </p>
      </div>
    </div>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>التقرير السريري المتكامل</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; margin: 0; background: #f5f5f5; }
    .page { background: white; max-width: 900px; margin: 0 auto; padding: 48px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    @media print { .page { box-shadow: none; padding: 24px; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="page" dir="rtl">
    <div style="text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px double #e0e0e0;">
      <h1 style="margin: 0 0 8px 0; font-size: 28px; color: #1a237e;">التقرير السريري المتكامل</h1>
      <p style="margin: 0; color: #666; font-size: 14px;">مركز الأوائل للتأهيل — Al-Awael Rehabilitation Center</p>
    </div>

    <div style="display: flex; gap: 24px; margin-bottom: 32px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 200px; background: #e8f5e9; padding: 20px; border-radius: 12px;">
        <p style="margin: 0 0 8px 0; color: #2e7d32; font-weight: 600; font-size: 12px;">المستفيد</p>
        <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1b5e20;">${beneficiary.name}</p>
        <p style="margin: 8px 0 0 0; color: #555; font-size: 14px;">العمر: ${beneficiary.age} سنة | الملف: ${beneficiary.fileNo}</p>
      </div>
      <div style="flex: 1; min-width: 200px; background: #fff3e0; padding: 20px; border-radius: 12px;">
        <p style="margin: 0 0 8px 0; color: #e65100; font-weight: 600; font-size: 12px;">تاريخ التقرير</p>
        <p style="margin: 0; font-size: 18px; font-weight: 700; color: #bf360c;">${today}</p>
        <p style="margin: 8px 0 0 0; color: #555; font-size: 14px;">الأقسام المدرجة: ${included.length} قسم</p>
      </div>
    </div>

    ${sectionsHtml}

    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 12px;">
      <p>تم إنشاء هذا التقرير بشكل آلي من نظام Al-Awael ERP</p>
      <p>هذا التقرير هو نسخة مبدئية ويخضع للمراجعة الطبية</p>
    </div>
  </div>
</body>
</html>`;
};

function getMockSectionContent(key) {
  const contents = {
    icf: 'الدرجة الإجمالية: 2.3 (من 5.0). المجال البدني: 2.8، المجال النفسي: 1.9، المجال الاجتماعي: 2.1. المستخدم يواجه تحديات في الأنشطة اليومية والتفاعل الاجتماعي. يُنصح بزيادة الجلسات العلاجية الفردية.',
    carePlan: 'الهدف الأول: تحسين الحركة المستقلة خلال 3 أشهر. الهدف الثاني: تعزيز التواصل الاجتماعي. الإجراءات: جلسة علاج وظيفي أسبوعياً، جلستان نفسيتان شهرياً، متابعة عائلية منتظمة.',
    therapySessions: 'عدد الجلسات: 12 جلسة. معدل الحضور: 83%. الجلسة الأخيرة: 2024/06/15. الملاحظات: تحسن ملحوظ في الاستجابة للعلاج المعرفي السلوكي.',
    mdtMeetings: 'عدد الاجتماعات: 3 اجتماعات. أعضاء الفريق: أخصائي نفسي، أخصائي علاج وظيفي، أخصائي اجتماعي، ممرضة. القرارات: تعديل خطة الرعاية بناءً على التقييم الأخير.',
    smartMetrics: 'درجة الذكاء: 102 (متوسط). الانتباه: 85%. السرعة المعالجية: 78%. الذاكرة العاملة: 92%. النتائج تشير إلى أداء جيد في المهام المعرفية المعقدة.',
  };
  return contents[key] || 'بيانات القسم غير متوفرة حالياً.';
}

// ───────────────────────────────────────────────────────────────────────────
// المكون الرئيسي
// ───────────────────────────────────────────────────────────────────────────
export default function IntegratedReportGenerator() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sections, setSections] = useState(
    AVAILABLE_SECTIONS.map((s) => ({ ...s, checked: s.defaultChecked }))
  );
  const [format, setFormat] = useState('html');
  const [previewData, setPreviewData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const previewRef = useRef(null);

  // ───────────────────────────────────────────
  // تبديل حالة قسم
  // ───────────────────────────────────────────
  const handleSectionToggle = (index) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, checked: !s.checked } : s))
    );
  };

  // ───────────────────────────────────────────
  // الانتقال إلى خطوة المعاينة
  // ───────────────────────────────────────────
  const handlePreview = async () => {
    if (!selectedBeneficiary) {
      setError('يرجى اختيار مستفيد أولاً');
      return;
    }
    const checkedCount = sections.filter((s) => s.checked).length;
    if (checkedCount === 0) {
      setError('يرجى اختيار قسم واحد على الأقل');
      return;
    }

    setError('');
    setLoading(true);

    // محاكاة تأخير الاتصال بالخادم
    await new Promise((r) => setTimeout(r, 1200));

    const report = generateMockReport(selectedBeneficiary, sections, format);
    setPreviewData(report);
    setLoading(false);
    setActiveStep(1);
  };

  // ───────────────────────────────────────────
  // العودة إلى خطوة التهيئة
  // ───────────────────────────────────────────
  const handleBack = () => {
    setActiveStep(0);
    setError('');
    setSuccess('');
  };

  // ───────────────────────────────────────────
  // تحميل الملف
  // ───────────────────────────────────────────
  const handleDownload = (type) => {
    let blob;
    let filename;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (type === 'pdf') {
      // HTML مُغلّف بـ PDF (في الواقع نحفظ HTML كـ PDF وهمي)
      const htmlContent = format === 'html' ? previewData : generateMockReport(selectedBeneficiary, sections, 'html');
      blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      filename = `تقرير-${selectedBeneficiary.fileNo}-${timestamp}.html`;
    } else if (type === 'word') {
      const htmlContent = format === 'html' ? previewData : generateMockReport(selectedBeneficiary, sections, 'html');
      // تغليف بسيط كـ Word
      const wordDoc = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>تقرير</title></head>
        <body>${htmlContent}</body></html>
      `;
      blob = new Blob([wordDoc], { type: 'application/msword' });
      filename = `تقرير-${selectedBeneficiary.fileNo}-${timestamp}.doc`;
    } else if (type === 'json') {
      const jsonContent = format === 'json' ? previewData : generateMockReport(selectedBeneficiary, sections, 'json');
      blob = new Blob([jsonContent], { type: 'application/json' });
      filename = `تقرير-${selectedBeneficiary.fileNo}-${timestamp}.json`;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccess(`تم تحميل ${type === 'pdf' ? 'ملف HTML' : type === 'word' ? 'ملف Word' : 'ملف JSON'} بنجاح`);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ───────────────────────────────────────────
  // إرسال بالبريد (وهمي)
  // ───────────────────────────────────────────
  const handleEmail = () => {
    setSuccess('تم إرسال التقرير إلى البريد الإلكتروني (محاكاة)');
    setTimeout(() => setSuccess(''), 3000);
  };

  // ───────────────────────────────────────────
  // طباعة
  // ───────────────────────────────────────────
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(previewData);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  // ───────────────────────────────────────────
  // إعادة التوليد
  // ───────────────────────────────────────────
  const handleRegenerate = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const report = generateMockReport(selectedBeneficiary, sections, format);
    setPreviewData(report);
    setLoading(false);
    setSuccess('تم إعادة توليد التقرير');
    setTimeout(() => setSuccess(''), 3000);
  };

  // ───────────────────────────────────────────
  // صفحة التهيئة
  // ───────────────────────────────────────────
  const renderStep1 = () => (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.35 }}
    >
      <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>
          {/* عنوان القسم */}
          <Typography variant="h6" sx={{ mb: 3, color: '#1a237e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon />
            إعدادات التقرير
          </Typography>

          <Grid container spacing={3}>
            {/* اختيار المستفيد */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={MOCK_BENEFICIARIES}
                getOptionLabel={(option) => `${option.name} — ${option.fileNo}`}
                value={selectedBeneficiary}
                onChange={(_, newValue) => setSelectedBeneficiary(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="البحث عن المستفيد"
                    placeholder="اكتب اسم المستفيد أو رقم الملف..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <PersonIcon sx={{ color: 'action.active', mr: 1 }} />,
                    }}
                    fullWidth
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                      <PersonIcon fontSize="small" color="primary" />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight={600}>{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.fileNo} — {option.age} سنة
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                )}
                noOptionsText="لا يوجد مستفيد مطابق"
                loadingText="جاري البحث..."
              />
            </Grid>

            {/* الفترة الزمنية */}
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="تاريخ البداية"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  InputProps={{ startAdornment: <CalendarIcon sx={{ color: 'action.active', mr: 1 }} /> }}
                />
                <TextField
                  label="تاريخ النهاية"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  InputProps={{ startAdornment: <CalendarIcon sx={{ color: 'action.active', mr: 1 }} /> }}
                />
              </Stack>
            </Grid>

            {/* فاصل */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* الأقسام */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#333' }}>
                الأقسام المطلوبة في التقرير:
              </Typography>
              <Grid container spacing={1}>
                {sections.map((section, index) => (
                  <Grid item xs={12} sm={6} md={4} key={section.key}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        transition: 'all 0.2s',
                        borderColor: section.checked ? 'primary.main' : 'divider',
                        backgroundColor: section.checked ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                        '&:hover': { borderColor: 'primary.main' },
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={section.checked}
                            onChange={() => handleSectionToggle(index)}
                            color="primary"
                          />
                        }
                        label={
                          <Typography variant="body2" fontWeight={section.checked ? 600 : 400}>
                            {section.label}
                          </Typography>
                        }
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* فاصل */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* تنسيق التقرير */}
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                  تنسيق التقرير:
                </FormLabel>
                <RadioGroup
                  row
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  <FormControlLabel
                    value="html"
                    control={<Radio />}
                    label={
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <VisibilityIcon fontSize="small" color="primary" />
                        <span>HTML</span>
                      </Stack>
                    }
                  />
                  <FormControlLabel
                    value="pdf"
                    control={<Radio />}
                    label={
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <PdfIcon fontSize="small" color="error" />
                        <span>PDF</span>
                      </Stack>
                    }
                  />
                  <FormControlLabel
                    value="json"
                    control={<Radio />}
                    label={
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <CodeIcon fontSize="small" color="success" />
                        <span>JSON</span>
                      </Stack>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </Grid>
          </Grid>

          {/* زر المعاينة */}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-start' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handlePreview}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PreviewIcon />}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.2,
                fontWeight: 700,
                fontSize: '1.05rem',
                boxShadow: '0 4px 14px rgba(25, 118, 210, 0.35)',
              }}
            >
              {loading ? 'جاري المعاينة...' : 'معاينة التقرير'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  // ───────────────────────────────────────────
  // صفحة المعاينة
  // ───────────────────────────────────────────
  const renderStep2 = () => (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.35 }}
    >
      <Grid container spacing={3}>
        {/* أزرار التحكم */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2, borderRadius: 3, mb: 1 }}>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              justifyContent="flex-start"
              alignItems="center"
            >
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
                sx={{ borderRadius: 2, mb: { xs: 1, md: 0 } }}
              >
                تعديل الإعدادات
              </Button>

              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

              <Tooltip title="تحميل كـ HTML (مؤقت)" arrow>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<PdfIcon />}
                  onClick={() => handleDownload('pdf')}
                  sx={{ borderRadius: 2, mb: { xs: 1, md: 0 } }}
                >
                  تحميل PDF
                </Button>
              </Tooltip>

              <Tooltip title="تحميل كـ Word" arrow>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload('word')}
                  sx={{ borderRadius: 2, mb: { xs: 1, md: 0 } }}
                >
                  تحميل Word
                </Button>
              </Tooltip>

              {format === 'json' && (
                <Tooltip title="تحميل JSON" arrow>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CodeIcon />}
                    onClick={() => handleDownload('json')}
                    sx={{ borderRadius: 2, mb: { xs: 1, md: 0 } }}
                  >
                    تحميل JSON
                  </Button>
                </Tooltip>
              )}

              <Tooltip title="إرسال عبر البريد" arrow>
                <Button
                  variant="outlined"
                  startIcon={<EmailIcon />}
                  onClick={handleEmail}
                  sx={{ borderRadius: 2, mb: { xs: 1, md: 0 } }}
                >
                  إرسال بالبريد
                </Button>
              </Tooltip>

              <Tooltip title="طباعة" arrow>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                  sx={{ borderRadius: 2, mb: { xs: 1, md: 0 } }}
                >
                  طباعة
                </Button>
              </Tooltip>

              <Tooltip title="إعادة التوليد" arrow>
                <IconButton
                  color="secondary"
                  onClick={handleRegenerate}
                  disabled={loading}
                  sx={{ borderRadius: 2 }}
                >
                  {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Paper>
        </Grid>

        {/* ملخص التقرير */}
        <Grid item xs={12}>
          <Paper
            elevation={3}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid #e0e0e0',
            }}
          >
            {/* رأس التقرير */}
            <Box
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <CheckCircleIcon />
                <Typography variant="subtitle1" fontWeight={700}>
                  معاينة التقرير
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {selectedBeneficiary?.name} — {selectedBeneficiary?.fileNo}
              </Typography>
            </Box>

            {/* محتوى المعاينة */}
            <Box sx={{ p: { xs: 2, md: 4 }, background: '#f8f9fa' }}>
              {format === 'json' ? (
                <Box
                  component="pre"
                  sx={{
                    background: '#1e1e1e',
                    color: '#d4d4d4',
                    p: 3,
                    borderRadius: 2,
                    overflow: 'auto',
                    maxHeight: 600,
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    direction: 'ltr',
                    textAlign: 'left',
                    fontFamily: '"Fira Code", "Cascadia Code", monospace',
                  }}
                >
                  <code>{previewData}</code>
                </Box>
              ) : (
                <Box
                  sx={{
                    background: 'white',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid #e0e0e0',
                    minHeight: 400,
                  }}
                >
                  <Box
                    ref={previewRef}
                    component="div"
                    dangerouslySetInnerHTML={{ __html: previewData }}
                    sx={{
                      '& iframe': { width: '100%', minHeight: 600, border: 'none' },
                    }}
                  />
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </motion.div>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4, direction: 'rtl' }}>
      {/* رأس الصفحة */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              color: '#1a237e',
              mb: 1,
              fontSize: { xs: '1.75rem', md: '2.5rem' },
            }}
          >
            توليد التقارير المتكاملة
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            أنشئ تقارير سريرية شاملة تجمع بين تقييم ICF وخطة الرعاية والجلسات العلاجية واجتماعات MDT
          </Typography>
        </motion.div>
      </Box>

      {/* المعالج */}
      <Box sx={{ mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ direction: 'rtl' }}>
          {STEPS.map((label, index) => (
            <Step key={label}>
              <StepLabel
                StepIconProps={{
                  sx: {
                    '& .MuiStepIcon-root': {
                      color: activeStep >= index ? '#1a237e' : '#bdbdbd',
                    },
                  },
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={activeStep === index ? 700 : 400}
                  color={activeStep >= index ? 'primary' : 'text.secondary'}
                >
                  {label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* رسائل التنبيه */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* المحتوى */}
      <AnimatePresence mode="wait">
        {activeStep === 0 ? renderStep1() : renderStep2()}
      </AnimatePresence>

      {/* تذييل */}
      <Box sx={{ mt: 6, textAlign: 'center', color: 'text.disabled' }}>
        <Typography variant="caption">
          نظام Al-Awael ERP — مركز الأوائل للتأهيل © 2025
        </Typography>
      </Box>
    </Container>
  );
}
