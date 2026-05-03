/**
 * SpecializedScalesLibrary — مكتبة مقاييس التأهيل المتخصصة
 * Specialized Assessment Scales Library — service-connected with local fallback
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Container,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Avatar,
  useTheme,
  alpha,
  Paper,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssessmentIcon from '@mui/icons-material/Assessment';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FunctionsIcon from '@mui/icons-material/Functions';
import { useNavigate } from 'react-router-dom';
import { specializedScalesService } from '../../services/specializedRehab.service';

/* ── Fallback catalog (used when API is unavailable / loading) ── */
const DATA_SCALES = [
  /* Functional Independence */
  {
    _id: 's1',
    nameEn: 'Functional Independence Measure (FIM)',
    nameAr: 'مقياس الاستقلالية الوظيفية',
    category: 'وظيفي',
    disabilityType: 'عام',
    items: 18,
    timeMin: 30,
    reliability: 'ممتازة',
    targetAgeGroup: 'بالغون',
    description: 'يقيس الاعتماد الوظيفي في 18 نشاطاً للرعاية الذاتية والحركة والإدراك.',
  },
  {
    _id: 's2',
    nameEn: 'WeeFIM',
    nameAr: 'مقياس الاستقلالية الوظيفية للأطفال',
    category: 'وظيفي',
    disabilityType: 'عام',
    items: 18,
    timeMin: 25,
    reliability: 'جيدة جداً',
    targetAgeGroup: 'أطفال',
    description: 'نسخة الأطفال من FIM للفئة العمرية 6 أشهر – 7 سنوات.',
  },
  {
    _id: 's3',
    nameEn: 'Barthel Index',
    nameAr: 'مؤشر بارثل',
    category: 'أنشطة يومية',
    disabilityType: 'حركي',
    items: 10,
    timeMin: 10,
    reliability: 'ممتازة',
    targetAgeGroup: 'بالغون',
    description: 'يقيس الاستقلالية في أنشطة الحياة اليومية الأساسية.',
  },
  {
    _id: 's4',
    nameEn: 'WHODAS 2.0 (36-item)',
    nameAr: 'جدول تقييم الإعاقة للمنظمة العالمية للصحة',
    category: 'إعاقة',
    disabilityType: 'عام',
    items: 36,
    timeMin: 20,
    reliability: 'ممتازة',
    targetAgeGroup: 'بالغون',
    description: 'يقيس الأداء الوظيفي والإعاقة في 6 مجالات.',
  },
  {
    _id: 's5',
    nameEn: 'WHODAS 2.0 (12-item)',
    nameAr: 'جدول تقييم الإعاقة (النسخة المختصرة)',
    category: 'إعاقة',
    disabilityType: 'عام',
    items: 12,
    timeMin: 8,
    reliability: 'جيدة جداً',
    targetAgeGroup: 'بالغون',
    description: 'النسخة المختصرة من WHODAS 2.0 للمسح السريع.',
  },
  /* Balance & Motor */
  {
    _id: 's6',
    nameEn: 'Berg Balance Scale',
    nameAr: 'مقياس بيرغ للتوازن',
    category: 'توازن',
    disabilityType: 'حركي',
    items: 14,
    timeMin: 15,
    reliability: 'ممتازة',
    targetAgeGroup: 'بالغون',
    description: 'يقيس التوازن الساكن والديناميكي في 14 مهمة.',
  },
  {
    _id: 's7',
    nameEn: 'Tinetti POMA',
    nameAr: 'مقياس تينيتي للتوازن والمشي',
    category: 'توازن',
    disabilityType: 'حركي',
    items: 28,
    timeMin: 15,
    reliability: 'جيدة جداً',
    targetAgeGroup: 'بالغون',
    description: 'يقيس التوازن والمشي مع تقييم خطر السقوط.',
  },
  {
    _id: 's8',
    nameEn: 'Modified Ashworth Scale (MAS)',
    nameAr: 'مقياس أشورث المعدّل للتشنج',
    category: 'تشنج',
    disabilityType: 'حركي',
    items: 1,
    timeMin: 5,
    reliability: 'جيدة',
    targetAgeGroup: 'بالغون',
    description: 'يقيس مقاومة العضلات أثناء الحركة السلبية (6 درجات).',
  },
  {
    _id: 's9',
    nameEn: 'Brunnstrom Recovery Stages',
    nameAr: 'مراحل التعافي الحركي لبرونستروم',
    category: 'حركي',
    disabilityType: 'حركي',
    items: 7,
    timeMin: 20,
    reliability: 'جيدة',
    targetAgeGroup: 'بالغون',
    description: 'يصنّف التعافي الحركي بعد السكتة الدماغية في 7 مراحل.',
  },
  {
    _id: 's10',
    nameEn: '10-Meter Walk Test (10MWT)',
    nameAr: 'اختبار المشي 10 أمتار',
    category: 'حركي',
    disabilityType: 'حركي',
    items: 1,
    timeMin: 5,
    reliability: 'ممتازة',
    targetAgeGroup: 'بالغون',
    description: 'يقيس سرعة المشي كمؤشر للوظيفة الحركية.',
  },
  {
    _id: 's11',
    nameEn: '6-Minute Walk Test (6MWT)',
    nameAr: 'اختبار المشي 6 دقائق',
    category: 'حركي',
    disabilityType: 'حركي',
    items: 1,
    timeMin: 10,
    reliability: 'ممتازة',
    targetAgeGroup: 'بالغون',
    description: 'يقيس تحمّل المريض للمجهود وقدرته الوظيفية.',
  },
  /* Cognitive */
  {
    _id: 's12',
    nameEn: 'Mini-Mental State Examination (MMSE)',
    nameAr: 'اختبار الحالة العقلية المصغّر',
    category: 'إدراكي',
    disabilityType: 'ذهني',
    items: 30,
    timeMin: 10,
    reliability: 'جيدة جداً',
    targetAgeGroup: 'بالغون',
    description: 'الفحص القياسي الأكثر استخداماً لتقييم الوظائف الإدراكية.',
  },
  {
    _id: 's13',
    nameEn: 'Montreal Cognitive Assessment (MoCA)',
    nameAr: 'تقييم مونتريال الإدراكي',
    category: 'إدراكي',
    disabilityType: 'ذهني',
    items: 30,
    timeMin: 12,
    reliability: 'جيدة جداً',
    targetAgeGroup: 'بالغون',
    description: 'أكثر حساسية من MMSE لاكتشاف الضعف الإدراكي الخفيف.',
  },
  {
    _id: 's14',
    nameEn: 'Rivermead Behavioural Memory Test (RBMT)',
    nameAr: 'اختبار ريفرميد السلوكي للذاكرة',
    category: 'إدراكي',
    disabilityType: 'ذهني',
    items: 11,
    timeMin: 25,
    reliability: 'جيدة',
    targetAgeGroup: 'بالغون',
    description: 'يقيس الذاكرة التطبيقية في سياقات الحياة اليومية.',
  },
  /* Communication */
  {
    _id: 's15',
    nameEn: 'Western Aphasia Battery (WAB)',
    nameAr: 'بطارية الحبسة الغربية',
    category: 'تواصل',
    disabilityType: 'تواصل',
    items: 42,
    timeMin: 45,
    reliability: 'ممتازة',
    targetAgeGroup: 'بالغون',
    description: 'يشخّص ويصنّف الحبسة الكلامية ويقيس معامل الحبسة.',
  },
  {
    _id: 's16',
    nameEn: 'Frenchay Dysarthria Assessment',
    nameAr: 'تقييم فرنشي لعسر التلفظ',
    category: 'تواصل',
    disabilityType: 'تواصل',
    items: 28,
    timeMin: 30,
    reliability: 'جيدة جداً',
    targetAgeGroup: 'بالغون',
    description: 'يقيم عسر التلفظ عبر تقييم الجهاز الناطق والنطق الفعلي.',
  },
  /* Pain */
  {
    _id: 's17',
    nameEn: 'Numerical Rating Scale — Pain (NRS)',
    nameAr: 'مقياس الألم العددي',
    category: 'ألم',
    disabilityType: 'عام',
    items: 1,
    timeMin: 1,
    reliability: 'جيدة جداً',
    targetAgeGroup: 'بالغون',
    description: 'يقيس شدة الألم على مقياس 0–10.',
  },
  {
    _id: 's18',
    nameEn: 'Faces Pain Scale — Revised (FPS-R)',
    nameAr: 'مقياس ألم الوجوه',
    category: 'ألم',
    disabilityType: 'عام',
    items: 1,
    timeMin: 1,
    reliability: 'جيدة',
    targetAgeGroup: 'أطفال',
    description: 'يقيس الألم عبر تعبيرات الوجه للأطفال وغير القادرين على التواصل اللفظي.',
  },
  /* Quality of Life */
  {
    _id: 's19',
    nameEn: 'WHOQOL-BREF',
    nameAr: 'مقياس جودة الحياة (المنظمة العالمية للصحة)',
    category: 'جودة الحياة',
    disabilityType: 'عام',
    items: 26,
    timeMin: 15,
    reliability: 'جيدة جداً',
    targetAgeGroup: 'بالغون',
    description: 'يقيس جودة الحياة في 4 مجالات: صحة جسدية، نفسية، اجتماعية، بيئية.',
  },
  {
    _id: 's20',
    nameEn: 'SF-36 Health Survey',
    nameAr: 'استبيان الصحة العامة SF-36',
    category: 'جودة الحياة',
    disabilityType: 'عام',
    items: 36,
    timeMin: 15,
    reliability: 'ممتازة',
    targetAgeGroup: 'بالغون',
    description: 'يقيس الحالة الصحية في 8 مجالات وظيفية.',
  },
  /* Pediatric */
  {
    _id: 's21',
    nameEn: 'PEDI-CAT',
    nameAr: 'تقييم الإعاقة في مرحلة الطفولة (محوسب)',
    category: 'أطفال',
    disabilityType: 'عام',
    items: 20,
    timeMin: 20,
    reliability: 'ممتازة',
    targetAgeGroup: 'أطفال',
    description:
      'يقيس الأداء الوظيفي للأطفال في مجالات الرعاية الذاتية والتنقل والوظيفة الاجتماعية.',
  },
  {
    _id: 's22',
    nameEn: 'Gross Motor Function Classification (GMFCS)',
    nameAr: 'تصنيف الوظيفة الحركية الكبرى',
    category: 'أطفال',
    disabilityType: 'حركي',
    items: 5,
    timeMin: 10,
    reliability: 'ممتازة',
    targetAgeGroup: 'أطفال',
    description: 'يصنّف الوظيفة الحركية الكبرى لأطفال الشلل الدماغي في 5 مستويات.',
  },
  {
    _id: 's23',
    nameEn: 'Manual Ability Classification System (MACS)',
    nameAr: 'تصنيف القدرة اليدوية',
    category: 'أطفال',
    disabilityType: 'حركي',
    items: 5,
    timeMin: 10,
    reliability: 'جيدة جداً',
    targetAgeGroup: 'أطفال',
    description: 'يصنّف كيفية استخدام أطفال الشلل الدماغي لأيديهم في التعامل مع الأشياء.',
  },
  /* Psychological */
  {
    _id: 's24',
    nameEn: 'PHQ-9',
    nameAr: 'استبيان صحة المريض (الاكتئاب)',
    category: 'نفسي',
    disabilityType: 'نفسي',
    items: 9,
    timeMin: 5,
    reliability: 'جيدة جداً',
    targetAgeGroup: 'بالغون',
    description: 'أداة فحص للاكتئاب مبنية على معايير DSM.',
  },
  {
    _id: 's25',
    nameEn: 'GAD-7',
    nameAr: 'مقياس القلق العام',
    category: 'نفسي',
    disabilityType: 'نفسي',
    items: 7,
    timeMin: 3,
    reliability: 'جيدة جداً',
    targetAgeGroup: 'بالغون',
    description: 'يفحص اضطراب القلق العام بـ7 بنود.',
  },
];

const CATEGORY_COLORS = {
  وظيفي: '#1976d2',
  'أنشطة يومية': '#388e3c',
  إعاقة: '#7b1fa2',
  توازن: '#0097a7',
  تشنج: '#e64a19',
  حركي: '#f57c00',
  إدراكي: '#5c6bc0',
  تواصل: '#00897b',
  ألم: '#c62828',
  'جودة الحياة': '#558b2f',
  أطفال: '#ad1457',
  نفسي: '#6d4c41',
};

const ALL_CATEGORIES = ['الكل', ...Object.keys(CATEGORY_COLORS)];

export default function SpecializedScalesLibrary() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [scales, setScales] = useState(DATA_SCALES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await specializedScalesService.getAll({ limit: 200 });
      const data = res?.data?.data ?? res?.data ?? [];
      if (Array.isArray(data) && data.length > 0) setScales(data);
      else setScales(DATA_SCALES);
    } catch {
      setScales(DATA_SCALES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = scales.filter(s => {
    const matchCat = category === 'الكل' || (s.category || '') === category;
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      (s.nameEn || '').toLowerCase().includes(q) ||
      (s.nameAr || '').includes(search) ||
      (s.category || '').includes(search);
    return matchCat && matchQ;
  });

  const catColor = c => CATEGORY_COLORS[c] || theme.palette.primary.main;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          borderRadius: 3,
          p: 3,
          mb: 4,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 52, height: 52 }}>
            <AssessmentIcon sx={{ fontSize: 30, color: 'white' }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              مكتبة المقاييس المتخصصة
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {scales.length} مقياس تقييمي معياري لمجالات التأهيل المختلفة
            </Typography>
          </Box>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={load} disabled={loading} sx={{ color: 'white' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي المقاييس', value: scales.length, icon: <FunctionsIcon /> },
          {
            label: 'التصنيفات',
            value: Object.keys(CATEGORY_COLORS).length,
            icon: <AssessmentIcon />,
          },
          {
            label: 'مقاييس الأطفال',
            value: scales.filter(s => s.targetAgeGroup === 'أطفال').length,
            icon: <InfoOutlinedIcon />,
          },
          {
            label: 'مقاييس الكبار',
            value: scales.filter(s => s.targetAgeGroup === 'بالغون').length,
            icon: <PlayArrowIcon />,
          },
        ].map((stat, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                textAlign: 'center',
              }}
            >
              <Typography variant="h4" fontWeight={700} color="primary.main">
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          تعذّر تحميل البيانات من الخادم — يُعرض المحتوى المحلي
        </Alert>
      )}

      {/* Search + filter */}
      <Paper
        elevation={0}
        sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="ابحث بالاسم أو التصنيف..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ overflowX: 'auto' }}>
          <ToggleButtonGroup
            value={category}
            exclusive
            onChange={(_, v) => v && setCategory(v)}
            size="small"
          >
            {ALL_CATEGORIES.map(c => (
              <ToggleButton
                key={c}
                value={c}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.75rem',
                  borderRadius: '20px !important',
                  mx: 0.3,
                  border: '1px solid !important',
                  ...(category === c && c !== 'الكل'
                    ? {
                        bgcolor: `${catColor(c)}20 !important`,
                        color: `${catColor(c)} !important`,
                        borderColor: `${catColor(c)} !important`,
                      }
                    : {}),
                }}
              >
                {c}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map(scale => {
            const cc = catColor(scale.category);
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={scale._id || scale.id}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'box-shadow .2s, border-color .2s',
                    '&:hover': { boxShadow: 4, borderColor: cc },
                  }}
                >
                  <Box sx={{ height: 4, bgcolor: cc, borderRadius: '8px 8px 0 0' }} />
                  <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      gutterBottom
                      sx={{ lineHeight: 1.3 }}
                    >
                      {scale.nameAr || scale.name || scale.nameEn}
                    </Typography>
                    {scale.nameEn && scale.nameAr && (
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        {scale.nameEn}
                      </Typography>
                    )}
                    <Box display="flex" gap={0.75} flexWrap="wrap" mb={1.5}>
                      <Chip
                        label={scale.category}
                        size="small"
                        sx={{ bgcolor: `${cc}18`, color: cc, fontWeight: 600, fontSize: '0.7rem' }}
                      />
                      <Chip
                        label={`${scale.items} بند`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                      <Chip
                        label={`${scale.timeMin} د`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </Box>
                    {scale.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {scale.description}
                      </Typography>
                    )}
                    {scale.targetAgeGroup && (
                      <Box mt={1}>
                        <Chip
                          label={scale.targetAgeGroup}
                          size="small"
                          color={scale.targetAgeGroup === 'أطفال' ? 'secondary' : 'default'}
                          variant="outlined"
                          sx={{ fontSize: '0.68rem' }}
                        />
                        {scale.reliability && (
                          <Chip
                            label={`ثبات: ${scale.reliability}`}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, fontSize: '0.68rem' }}
                          />
                        )}
                      </Box>
                    )}
                  </CardContent>
                  <CardActions sx={{ p: 1.5, pt: 0 }}>
                    <Button
                      size="small"
                      variant="contained"
                      fullWidth
                      startIcon={<PlayArrowIcon />}
                      onClick={() => navigate(`/scale-administration/${scale._id || scale.id}`)}
                      sx={{
                        borderRadius: 2,
                        bgcolor: cc,
                        '&:hover': { bgcolor: cc, filter: 'brightness(0.88)' },
                      }}
                    >
                      تطبيق المقياس
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {!loading && filtered.length === 0 && (
        <Box textAlign="center" py={8}>
          <AssessmentIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">
            لا توجد مقاييس مطابقة للبحث أو الفلتر المحدد
          </Typography>
        </Box>
      )}
    </Container>
  );
}
