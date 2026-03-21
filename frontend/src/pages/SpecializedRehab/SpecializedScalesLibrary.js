/**
 * 📊 مكتبة المقاييس المتخصصة — Specialized Assessment Scales Library
 * AlAwael ERP — Browse, filter, and manage specialized disability assessment scales
 */
import { useState, useMemo, useCallback } from 'react';
import {
  useTheme,
  alpha,
} from '@mui/material';


import {
  SPECIALIZED_SCALES_CATALOG,
  SCALE_CATEGORY_LABELS,
  DISABILITY_LABELS,
} from 'services/specializedRehab.service';

/* ───── icon lookup ───── */
const CATEGORY_ICONS = {
  autism: <PsychologyIcon />,
  motor: <MotorIcon />,
  intellectual: <MemoryIcon />,
  speech: <SpeechIcon />,
  behavioral: <BehaviorIcon />,
  developmental: <DevIcon />,
  sensory: <PsychologyIcon />,
  adaptive: <AdaptiveIcon />,
  vocational: <AssignmentIcon />,
  psychological: <PsychologyIcon />,
};

const SEVERITY_COLORS = {
  normal: '#4CAF50',
  above_average: '#2196F3',
  mild: '#8BC34A',
  at_risk: '#FFC107',
  moderate: '#FF9800',
  severe: '#F44336',
  profound: '#9C27B0',
};

const ADMIN_TYPE_LABELS = {
  observation: 'ملاحظة',
  individual: 'فردي',
  parent_report: 'تقرير الوالدين',
  teacher_report: 'تقرير المعلم',
  interview: 'مقابلة',
  mixed: 'مختلط',
};

export default function SpecializedScalesLibrary() {
  const theme = useTheme();
  const g = theme.palette.gradients || {};

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedScale, setSelectedScale] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  /* ───── category tabs ───── */
  const categories = useMemo(() => {
    const cats = {};
    SPECIALIZED_SCALES_CATALOG.forEach(s => {
      cats[s.category] = (cats[s.category] || 0) + 1;
    });
    return [
      { key: 'all', label: 'جميع المقاييس', count: SPECIALIZED_SCALES_CATALOG.length },
      ...Object.entries(cats).map(([k, c]) => ({
        key: k,
        label: SCALE_CATEGORY_LABELS[k]?.nameAr || k,
        count: c,
        color: SCALE_CATEGORY_LABELS[k]?.color,
      })),
    ];
  }, []);

  /* ───── filtered scales ───── */
  const filtered = useMemo(() => {
    let list = SPECIALIZED_SCALES_CATALOG;
    if (activeCategory !== 'all') list = list.filter(s => s.category === activeCategory);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        s =>
          s.nameAr.includes(q) ||
          s.nameEn.toLowerCase().includes(q) ||
          s.scaleCode.toLowerCase().includes(q) ||
          s.description.includes(q)
      );
    }
    return list;
  }, [activeCategory, search]);

  const openDetail = useCallback(scale => {
    setSelectedScale(scale);
    setDetailOpen(true);
  }, []);

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: g.primary || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: alpha('#fff', 0.2) }}>
            <PsychologyIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              مكتبة المقاييس المتخصصة
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {SPECIALIZED_SCALES_CATALOG.length} مقياس متخصص لتقييم ذوي الإعاقة — مصنفة حسب نوع
              الإعاقة والفئة
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* ── Search + Filter ── */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          placeholder="ابحث بالاسم أو الرمز أو الوصف..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {categories.map(cat => (
            <Chip
              key={cat.key}
              label={`${cat.label} (${cat.count})`}
              icon={CATEGORY_ICONS[cat.key] || <FilterIcon />}
              onClick={() => setActiveCategory(cat.key)}
              variant={activeCategory === cat.key ? 'filled' : 'outlined'}
              color={activeCategory === cat.key ? 'primary' : 'default'}
              sx={{
                fontWeight: activeCategory === cat.key ? 700 : 400,
                ...(cat.color && activeCategory === cat.key
                  ? {
                      bgcolor: cat.color,
                      color: '#fff',
                      '& .MuiChip-icon': { color: '#fff' },
                    }
                  : {}),
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* ── Cards Grid ── */}
      <Grid container spacing={2}>
        {filtered.map(scale => {
          const catMeta = SCALE_CATEGORY_LABELS[scale.category] || {};
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={scale.scaleCode}>
              <Card
                elevation={2}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  transition: 'all .2s',
                  borderTop: `4px solid ${catMeta.color || theme.palette.primary.main}`,
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: theme.shadows[8] },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <Avatar
                      sx={{ width: 36, height: 36, bgcolor: alpha(catMeta.color || '#666', 0.15) }}
                    >
                      {CATEGORY_ICONS[scale.category] || <AssignmentIcon />}
                    </Avatar>
                    <Chip
                      label={scale.abbreviation}
                      size="small"
                      sx={{ fontWeight: 700, bgcolor: alpha(catMeta.color || '#666', 0.1) }}
                    />
                  </Stack>
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    gutterBottom
                    sx={{ lineHeight: 1.4 }}
                  >
                    {scale.nameAr}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    {scale.nameEn}
                  </Typography>
                  <Typography
                    variant="body2"
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
                  <Divider sx={{ my: 1.5 }} />
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      icon={<ClockIcon />}
                      label={`${scale.administrationTime} د`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={
                        ADMIN_TYPE_LABELS[scale.administrationType] || scale.administrationType
                      }
                      size="small"
                      variant="outlined"
                    />
                    <Chip label={scale.ageRange?.label} size="small" variant="outlined" />
                  </Stack>
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {scale.targetDisabilities.slice(0, 3).map(d => (
                      <Chip
                        key={d}
                        label={DISABILITY_LABELS[d] || d}
                        size="small"
                        sx={{
                          fontSize: '0.65rem',
                          height: 20,
                          bgcolor: alpha(catMeta.color || '#999', 0.08),
                        }}
                      />
                    ))}
                    {scale.targetDisabilities.length > 3 && (
                      <Chip
                        label={`+${scale.targetDisabilities.length - 3}`}
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    )}
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<InfoIcon />}
                    onClick={() => openDetail(scale)}
                  >
                    التفاصيل
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
        {filtered.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <SearchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                لا توجد مقاييس مطابقة
              </Typography>
              <Typography color="text.secondary">حاول تغيير معايير البحث أو الفلتر</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* ═══════ Detail Dialog ═══════ */}
      <ScaleDetailDialog
        open={detailOpen}
        scale={selectedScale}
        onClose={() => {
          setDetailOpen(false);
          setSelectedScale(null);
        }}
        theme={theme}
      />
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  Scale Detail Dialog
 * ═══════════════════════════════════════════════════════════════════════════ */
function ScaleDetailDialog({ open, scale, onClose, theme: _theme }) {
  const [domainsOpen, setDomainsOpen] = useState(true);
  const [interpOpen, setInterpOpen] = useState(true);

  if (!scale) return null;
  const catMeta = SCALE_CATEGORY_LABELS[scale.category] || {};

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${catMeta.color || '#667eea'} 0%, ${alpha(catMeta.color || '#667eea', 0.7)} 100%)`,
          color: '#fff',
          pb: 2,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {scale.nameAr}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {scale.nameEn}
            </Typography>
            <Chip
              label={scale.abbreviation}
              size="small"
              sx={{ mt: 1, bgcolor: alpha('#fff', 0.2), color: '#fff', fontWeight: 700 }}
            />
          </Box>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        {/* Info Cards */}
        <Grid container spacing={2} mb={3}>
          {[
            { label: 'الحد الأقصى للدرجة', value: scale.totalMaxScore, color: '#7C4DFF' },
            { label: 'وقت التطبيق', value: `${scale.administrationTime} دقيقة`, color: '#00BCD4' },
            { label: 'الفئة العمرية', value: scale.ageRange?.label, color: '#FF9800' },
            {
              label: 'نوع التطبيق',
              value: ADMIN_TYPE_LABELS[scale.administrationType],
              color: '#4CAF50',
            },
          ].map((info, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Paper
                sx={{
                  p: 1.5,
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: alpha(info.color, 0.06),
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {info.label}
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ color: info.color }}>
                  {info.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Typography variant="body1" mb={2}>
          {scale.description}
        </Typography>

        {/* Target Disabilities */}
        <Typography variant="subtitle2" fontWeight={700} mb={1}>
          الإعاقات المستهدفة
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          {scale.targetDisabilities.map(d => (
            <Chip
              key={d}
              label={DISABILITY_LABELS[d] || d}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>

        {/* Domains */}
        <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
          <Box
            onClick={() => setDomainsOpen(!domainsOpen)}
            sx={{
              p: 2,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              المجالات ({scale.domains.length})
            </Typography>
            {domainsOpen ? <CollapseIcon /> : <ExpandIcon />}
          </Box>
          <Collapse in={domainsOpen}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>المجال</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الاسم بالإنجليزية</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      الدرجة القصوى
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scale.domains.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.nameAr}</TableCell>
                      <TableCell sx={{ direction: 'ltr' }}>{d.nameEn || d.key}</TableCell>
                      <TableCell align="center">
                        <Chip label={d.maxScore} size="small" color="primary" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>
        </Paper>

        {/* Interpretation */}
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Box
            onClick={() => setInterpOpen(!interpOpen)}
            sx={{
              p: 2,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              التفسير ({scale.interpretation.length} مستويات)
            </Typography>
            {interpOpen ? <CollapseIcon /> : <ExpandIcon />}
          </Box>
          <Collapse in={interpOpen}>
            <Box sx={{ p: 2, pt: 0 }}>
              {scale.interpretation.map((lvl, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1,
                    borderBottom: i < scale.interpretation.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: SEVERITY_COLORS[lvl.severity] || '#999',
                    }}
                  />
                  <Typography variant="body2" fontWeight={700} sx={{ minWidth: 140 }}>
                    {lvl.labelAr}
                  </Typography>
                  <Chip
                    label={`${lvl.min} — ${lvl.max}`}
                    size="small"
                    variant="outlined"
                    sx={{ minWidth: 80, justifyContent: 'center' }}
                  />
                  <LinearProgress
                    variant="determinate"
                    value={(lvl.max / scale.totalMaxScore) * 100}
                    sx={{
                      flexGrow: 1,
                      height: 8,
                      borderRadius: 4,
                      bgcolor: alpha(SEVERITY_COLORS[lvl.severity] || '#999', 0.15),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: SEVERITY_COLORS[lvl.severity] || '#999',
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Collapse>
        </Paper>

        {/* Developer / Qualification */}
        <Stack direction="row" spacing={2} mt={2}>
          <Chip icon={<StarIcon />} label={`المطور: ${scale.developer}`} variant="outlined" />
          <Chip
            icon={<AssignmentIcon />}
            label={`التأهيل: ${scale.requiredQualification}`}
            variant="outlined"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}
