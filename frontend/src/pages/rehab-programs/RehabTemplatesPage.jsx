/**
 * RehabTemplatesPage — مكتبة القوالب التأهيلية الذكية
 *
 * يتيح للأخصائي:
 *  Tab 0 — استعراض جميع القوالب المتاحة (بطاقات قابلة للتصفية)
 *  Tab 1 — مطابقة القوالب حسب بيانات المستفيد (تشخيص / عمر / مستوى وظيفي)
 *  Tab 2 — بناء خطة جلسات مخصصة من قالب محدد
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
  Stack,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  LinearProgress,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  AutoStories as TemplateIcon,
  Tune as MatchIcon,
  Build as BuildIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Warning as WarnIcon,
  Schedule as WeeksIcon,
  FitnessCenter as _ActivityIcon,
  Psychology as GoalIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  GetApp as _DownloadIcon,
} from '@mui/icons-material';
import { rehabTemplatesAPI } from '../../services/ddd';

/* ── palette ────────────────────────────────────────────────────────── */
const PRIMARY = '#1565c0';
const BG = '#e8f0fe';

/* ── helpers ─────────────────────────────────────────────────────────── */
const diagnoses = [
  'شلل دماغي',
  'اضطراب طيف التوحد',
  'إعاقة ذهنية',
  'متلازمة داون',
  'تأخر النطق واللغة',
  'إصابة نخاع شوكي',
  'إصابة دماغية مكتسبة',
  'اضطراب التعلم',
];

const functionalLevels = [
  { value: '', label: 'غير محدد' },
  { value: 'GMFCS_1', label: 'GMFCS I' },
  { value: 'GMFCS_2', label: 'GMFCS II' },
  { value: 'GMFCS_3', label: 'GMFCS III' },
  { value: 'GMFCS_4', label: 'GMFCS IV' },
  { value: 'CARS2_mild', label: 'CARS-2 خفيف-متوسط' },
  { value: 'CARS2_severe', label: 'CARS-2 حاد' },
  { value: 'Vineland3', label: 'Vineland-3' },
];

const specialtyColor = sp =>
  ({
    physioTherapy: '#1565c0',
    occupationalTherapy: '#2e7d32',
    speechTherapy: '#6a1b9a',
    behaviorTherapy: '#e65100',
    psychology: '#c62828',
  })[sp] || '#546e7a';

const specialtyLabel = sp =>
  ({
    physioTherapy: 'علاج طبيعي',
    occupationalTherapy: 'علاج وظيفي',
    speechTherapy: 'نطق ولغة',
    behaviorTherapy: 'تحليل سلوك',
    psychology: 'علم نفس',
  })[sp] || sp;

/* ══════════════════════════════════════════════════════════════════════ */
/* TemplateCard                                                          */
/* ══════════════════════════════════════════════════════════════════════ */
function TemplateCard({ tpl, onSelect, matchScore }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        border: matchScore > 0 ? `2px solid ${PRIMARY}` : '1px solid #e0e0e0',
        transition: 'box-shadow .2s',
        '&:hover': { boxShadow: 4 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="subtitle1" fontWeight={700} color={PRIMARY}>
            {tpl.name_ar || tpl.name}
          </Typography>
          {matchScore > 0 && (
            <Chip
              label={`تطابق ${matchScore}`}
              color="primary"
              size="small"
              icon={<MatchIcon fontSize="small" />}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={0.5} flexWrap="wrap" mb={1.5}>
          {tpl.targetDiagnoses?.map(d => (
            <Chip key={d} label={d} size="small" variant="outlined" />
          ))}
        </Stack>

        <Stack direction="row" spacing={1} mb={1}>
          <Chip
            icon={<WeeksIcon fontSize="small" />}
            label={`${tpl.durationWeeks} أسبوع`}
            size="small"
            sx={{ bgcolor: '#f3f4f6' }}
          />
          {tpl.ageRanges &&
            tpl.ageRanges.map((r, i) => (
              <Chip
                key={i}
                label={`${r.min}–${r.max} سنة`}
                size="small"
                sx={{ bgcolor: '#f3f4f6' }}
              />
            ))}
        </Stack>

        {tpl.disciplines && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {tpl.disciplines.map(d => (
              <Chip
                key={d}
                label={specialtyLabel(d)}
                size="small"
                sx={{ bgcolor: specialtyColor(d), color: '#fff', fontSize: 11 }}
              />
            ))}
          </Stack>
        )}

        {tpl.evidenceBase && (
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            المرجع: {tpl.evidenceBase}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant="contained"
          size="small"
          fullWidth
          startIcon={<BuildIcon />}
          onClick={() => onSelect(tpl)}
          sx={{ bgcolor: PRIMARY, borderRadius: 2 }}
        >
          بناء خطة مخصصة
        </Button>
      </CardActions>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* PlanPhaseAccordion                                                    */
/* ══════════════════════════════════════════════════════════════════════ */
function PlanPhaseAccordion({ phase, index }) {
  return (
    <Accordion
      defaultExpanded={index === 0}
      disableGutters
      elevation={0}
      sx={{ border: '1px solid #e0e0e0', borderRadius: '8px !important', mb: 1 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 28, height: 28, bgcolor: PRIMARY, fontSize: 13 }}>
            {index + 1}
          </Avatar>
          <Typography fontWeight={600}>{phase.name_ar || phase.name}</Typography>
          <Chip label={`${phase.durationWeeks} أسبوع`} size="small" />
          <Chip label={phase.frequency} size="small" variant="outlined" />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {phase.goals && (
          <Box mb={1.5}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              display="block"
              mb={0.5}
            >
              الأهداف
            </Typography>
            <List dense disablePadding>
              {phase.goals.map((g, i) => (
                <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <GoalIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={g} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          display="block"
          mb={0.5}
        >
          الأنشطة العلاجية
        </Typography>
        <Grid container spacing={1}>
          {phase.activities?.map((act, i) => (
            <Grid item xs={12} sm={6} key={i}>
              <Paper
                variant="outlined"
                sx={{ p: 1, borderRadius: 2, borderColor: specialtyColor(act.specialty || '') }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {act.name_ar || act.name || act.id}
                </Typography>
                {act.specialty && (
                  <Chip
                    label={specialtyLabel(act.specialty)}
                    size="small"
                    sx={{
                      bgcolor: specialtyColor(act.specialty),
                      color: '#fff',
                      fontSize: 10,
                      mt: 0.5,
                    }}
                  />
                )}
                {act.duration && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    المدة: {act.duration} دقيقة
                  </Typography>
                )}
                {act.description_ar && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {act.description_ar}
                  </Typography>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* Tab panels helper                                                     */
/* ══════════════════════════════════════════════════════════════════════ */
function TabPanel({ value, index, children }) {
  return value === index ? <Box pt={2}>{children}</Box> : null;
}

/* ══════════════════════════════════════════════════════════════════════ */
/* MAIN PAGE                                                             */
/* ══════════════════════════════════════════════════════════════════════ */
export default function RehabTemplatesPage() {
  const [tab, setTab] = useState(0);

  /* ── Tab 0 — catalog ─────────────────────── */
  const [templates, setTemplates] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [filterDx, setFilterDx] = useState('');

  /* ── Tab 1 — match ───────────────────────── */
  const [matchForm, setMatchForm] = useState({ diagnosis: '', age: '', functionalLevel: '' });
  const [matchResults, setMatchResults] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [matchError, setMatchError] = useState('');

  /* ── Tab 2 — build plan ──────────────────── */
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [buildForm, setBuildForm] = useState({ beneficiaryName: '', startDate: '' });
  const [builtPlan, setBuiltPlan] = useState(null);
  const [loadingBuild, setLoadingBuild] = useState(false);
  const [buildError, setBuildError] = useState('');

  /* ── copy/download state ─────────────────── */
  const [copied, setCopied] = useState(false);

  /* ─── Load catalog ──────────────────────── */
  const loadTemplates = useCallback(async () => {
    setLoadingAll(true);
    try {
      const res = await rehabTemplatesAPI.list();
      setTemplates(Array.isArray(res.data) ? res.data : res.data?.templates || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  /* ─── Match ─────────────────────────────── */
  const handleMatch = async () => {
    if (!matchForm.diagnosis) {
      setMatchError('يرجى إدخال التشخيص');
      return;
    }
    setMatchError('');
    setLoadingMatch(true);
    try {
      const payload = {
        diagnosis: matchForm.diagnosis,
        age: matchForm.age ? Number(matchForm.age) : undefined,
        functionalLevel: matchForm.functionalLevel || undefined,
      };
      const res = await rehabTemplatesAPI.match(payload);
      setMatchResults(Array.isArray(res.data) ? res.data : res.data?.matches || []);
    } catch (err) {
      setMatchError(err?.response?.data?.message || 'حدث خطأ أثناء المطابقة');
    } finally {
      setLoadingMatch(false);
    }
  };

  /* ─── Build Plan ─────────────────────────── */
  const handleBuildPlan = async () => {
    if (!selectedTpl) return;
    setBuildError('');
    setLoadingBuild(true);
    try {
      const payload = {
        beneficiary: { name: buildForm.beneficiaryName || 'مستفيد', ...matchForm },
        startDate: buildForm.startDate || new Date().toISOString().split('T')[0],
      };
      const res = await rehabTemplatesAPI.buildPlan(selectedTpl.key || selectedTpl.id, payload);
      setBuiltPlan(res.data);
    } catch (err) {
      setBuildError(err?.response?.data?.message || 'حدث خطأ أثناء بناء الخطة');
    } finally {
      setLoadingBuild(false);
    }
  };

  const selectAndBuild = tpl => {
    setSelectedTpl(tpl);
    setTab(2);
    setBuiltPlan(null);
    setBuildError('');
  };

  const copyPlan = () => {
    if (!builtPlan) return;
    navigator.clipboard.writeText(JSON.stringify(builtPlan, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ─── Filtered catalog ──────────────────── */
  const filtered = templates.filter(
    t => !filterDx || t.targetDiagnoses?.some(d => d.includes(filterDx))
  );

  /* ══════ RENDER ══════════════════════════════════════════════════════ */
  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* ── Header ───────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 48, height: 48 }}>
          <TemplateIcon />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700} color={PRIMARY}>
            مكتبة القوالب التأهيلية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            قوالب مبنية على الأدلة العلمية الدولية — APTA CPG · NICE · EIBI · SCIRE
          </Typography>
        </Box>
        <Box flexGrow={1} />
        <Tooltip title="تحديث">
          <IconButton onClick={loadTemplates} disabled={loadingAll}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 0, '& .MuiTab-root': { fontWeight: 600 } }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab
          icon={<TemplateIcon fontSize="small" />}
          iconPosition="start"
          label="المكتبة الكاملة"
        />
        <Tab icon={<MatchIcon fontSize="small" />} iconPosition="start" label="مطابقة ذكية" />
        <Tab
          icon={<BuildIcon fontSize="small" />}
          iconPosition="start"
          label={selectedTpl ? `بناء: ${selectedTpl.name_ar || selectedTpl.name}` : 'بناء خطة'}
        />
      </Tabs>
      <Divider sx={{ mb: 2 }} />

      {/* ══ TAB 0 — CATALOG ════════════════════════════════════════════ */}
      <TabPanel value={tab} index={0}>
        <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
          <Chip
            label="الكل"
            onClick={() => setFilterDx('')}
            variant={filterDx === '' ? 'filled' : 'outlined'}
            color={filterDx === '' ? 'primary' : 'default'}
          />
          {diagnoses.map(d => (
            <Chip
              key={d}
              label={d}
              onClick={() => setFilterDx(filterDx === d ? '' : d)}
              variant={filterDx === d ? 'filled' : 'outlined'}
              color={filterDx === d ? 'primary' : 'default'}
            />
          ))}
        </Stack>

        {loadingAll && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

        {!loadingAll && filtered.length === 0 && (
          <Alert severity="info">لا توجد قوالب مطابقة للتصفية الحالية.</Alert>
        )}

        <Grid container spacing={2}>
          {filtered.map(tpl => (
            <Grid item xs={12} sm={6} md={4} key={tpl.key || tpl.id}>
              <TemplateCard tpl={tpl} onSelect={selectAndBuild} matchScore={0} />
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* ══ TAB 1 — MATCH ══════════════════════════════════════════════ */}
      <TabPanel value={tab} index={1}>
        <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>
            بيانات المستفيد للمطابقة
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="التشخيص"
                value={matchForm.diagnosis}
                onChange={e => setMatchForm(p => ({ ...p, diagnosis: e.target.value }))}
                fullWidth
                size="small"
              >
                {diagnoses.map(d => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="العمر (سنوات)"
                type="number"
                value={matchForm.age}
                onChange={e => setMatchForm(p => ({ ...p, age: e.target.value }))}
                fullWidth
                size="small"
                inputProps={{ min: 0, max: 25 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="المستوى الوظيفي (اختياري)"
                value={matchForm.functionalLevel}
                onChange={e => setMatchForm(p => ({ ...p, functionalLevel: e.target.value }))}
                fullWidth
                size="small"
              >
                {functionalLevels.map(l => (
                  <MenuItem key={l.value} value={l.value}>
                    {l.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {matchError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {matchError}
            </Alert>
          )}

          <Button
            variant="contained"
            sx={{ mt: 2, bgcolor: PRIMARY, borderRadius: 2 }}
            onClick={handleMatch}
            disabled={loadingMatch}
            startIcon={
              loadingMatch ? <CircularProgress size={16} color="inherit" /> : <MatchIcon />
            }
          >
            {loadingMatch ? 'جاري المطابقة...' : 'ابحث عن القوالب المناسبة'}
          </Button>
        </Card>

        {matchResults !== null && (
          <>
            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
              {matchResults.length > 0
                ? `${matchResults.length} قالب مناسب مرتب حسب درجة التطابق`
                : 'لم يُعثر على قوالب مناسبة'}
            </Typography>
            <Grid container spacing={2}>
              {matchResults.map(m => (
                <Grid item xs={12} sm={6} md={4} key={m.key || m.id}>
                  <TemplateCard
                    tpl={m}
                    onSelect={selectAndBuild}
                    matchScore={m.score || m.matchScore || 0}
                  />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </TabPanel>

      {/* ══ TAB 2 — BUILD PLAN ═════════════════════════════════════════ */}
      <TabPanel value={tab} index={2}>
        {!selectedTpl ? (
          <Alert severity="info">
            اختر قالباً من المكتبة أو نتائج المطابقة ثم اضغط &quot;بناء خطة مخصصة&quot;.
          </Alert>
        ) : (
          <>
            {/* Build form */}
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                {selectedTpl.name_ar || selectedTpl.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                مدة البرنامج: {selectedTpl.durationWeeks} أسبوع
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="اسم المستفيد"
                    value={buildForm.beneficiaryName}
                    onChange={e => setBuildForm(p => ({ ...p, beneficiaryName: e.target.value }))}
                    fullWidth
                    size="small"
                    placeholder="اختياري"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="تاريخ البداية"
                    type="date"
                    value={buildForm.startDate}
                    onChange={e => setBuildForm(p => ({ ...p, startDate: e.target.value }))}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              {buildError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {buildError}
                </Alert>
              )}

              <Button
                variant="contained"
                sx={{ mt: 2, bgcolor: PRIMARY, borderRadius: 2 }}
                onClick={handleBuildPlan}
                disabled={loadingBuild}
                startIcon={
                  loadingBuild ? <CircularProgress size={16} color="inherit" /> : <BuildIcon />
                }
              >
                {loadingBuild ? 'جاري البناء...' : 'بناء الخطة الآن'}
              </Button>
            </Card>

            {/* Built plan result */}
            {builtPlan && (
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <CheckIcon color="success" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    الخطة التأهيلية المخصصة جاهزة
                  </Typography>
                  <Box flexGrow={1} />
                  <Tooltip title={copied ? 'تم النسخ!' : 'نسخ JSON'}>
                    <IconButton onClick={copyPlan} size="small">
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {/* Summary */}
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#f8f9fa' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        المستفيد
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {builtPlan.beneficiaryName || builtPlan.beneficiary?.name || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        تاريخ البداية
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {builtPlan.startDate || buildForm.startDate || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        تاريخ النهاية
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {builtPlan.endDate || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        إجمالي الأسابيع
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {builtPlan.totalWeeks || selectedTpl.durationWeeks}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Goals */}
                {builtPlan.goals?.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>
                      الأهداف العلاجية
                    </Typography>
                    <List dense disablePadding>
                      {builtPlan.goals.map((g, i) => (
                        <ListItem key={i} disablePadding sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <GoalIcon fontSize="small" color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={g.goal_ar || g.goal || g}
                            secondary={g.outcome}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Phases */}
                {builtPlan.sessionPlan?.phases?.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>
                      مراحل التدخل ({builtPlan.sessionPlan.phases.length} مراحل)
                    </Typography>
                    {builtPlan.sessionPlan.phases.map((ph, i) => (
                      <PlanPhaseAccordion key={i} phase={ph} index={i} />
                    ))}
                  </Box>
                )}

                {/* Exit criteria */}
                {builtPlan.exitCriteria?.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>
                      معايير الخروج
                    </Typography>
                    <List dense disablePadding>
                      {builtPlan.exitCriteria.map((c, i) => (
                        <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <CheckIcon fontSize="small" color="success" />
                          </ListItemIcon>
                          <ListItemText primary={c} primaryTypographyProps={{ variant: 'body2' }} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Escalation triggers */}
                {builtPlan.escalationTriggers?.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>
                      مؤشرات التصعيد
                    </Typography>
                    <List dense disablePadding>
                      {builtPlan.escalationTriggers.map((t, i) => (
                        <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <WarnIcon fontSize="small" color="warning" />
                          </ListItemIcon>
                          <ListItemText primary={t} primaryTypographyProps={{ variant: 'body2' }} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </TabPanel>
    </Box>
  );
}
