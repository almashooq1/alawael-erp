/**
 * 📋 مكتبة برامج التأهيل — Rehabilitation Programs Library
 * AlAwael ERP — Browse, filter, and view rehabilitation program templates
 */
import { useState, useMemo } from 'react';
import {
  useTheme,
  alpha,
} from '@mui/material';


import {
  REHAB_PROGRAM_TEMPLATES_CATALOG,
  PROGRAM_CATEGORY_LABELS,
  DISABILITY_LABELS,
} from 'services/specializedRehab.service';

/* ───── helpers ───── */
const CATEGORY_ICONS = {
  early_intervention: <EarlyIcon />,
  aba_therapy: <PsychologyIcon />,
  sensory_integration: <PsychologyIcon />,
  speech_language: <SpeechIcon />,
  physical_therapy: <FitnessIcon />,
  occupational_therapy: <OccupationalIcon />,
  cognitive_rehab: <MemoryIcon />,
  vocational_rehab: <WorkIcon />,
  life_skills: <HomeIcon />,
  social_skills: <GroupsIcon />,
  family_training: <FamilyIcon />,
  community_integration: <PublicIcon />,
  assistive_technology: <DevicesIcon />,
  transition_planning: <ArrowIcon />,
  behavioral_support: <PsychologyIcon />,
};

export default function RehabProgramsLibrary() {
  const theme = useTheme();
  const g = theme.palette.gradients || {};

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  /* ───── category tabs ───── */
  const categories = useMemo(() => {
    const cats = {};
    REHAB_PROGRAM_TEMPLATES_CATALOG.forEach(p => {
      cats[p.category] = (cats[p.category] || 0) + 1;
    });
    return [
      { key: 'all', label: 'جميع البرامج', count: REHAB_PROGRAM_TEMPLATES_CATALOG.length },
      ...Object.entries(cats).map(([k, c]) => ({
        key: k,
        label: PROGRAM_CATEGORY_LABELS[k]?.nameAr || k,
        count: c,
        color: PROGRAM_CATEGORY_LABELS[k]?.color,
      })),
    ];
  }, []);

  /* ───── filtered programs ───── */
  const filtered = useMemo(() => {
    let list = REHAB_PROGRAM_TEMPLATES_CATALOG;
    if (activeCategory !== 'all') list = list.filter(p => p.category === activeCategory);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        p =>
          p.nameAr.includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.programCode.toLowerCase().includes(q) ||
          p.description.includes(q)
      );
    }
    return list;
  }, [activeCategory, search]);

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
          background: g.success || 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
          color: '#fff',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: alpha('#fff', 0.2) }}>
            <FitnessIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              مكتبة برامج التأهيل
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {REHAB_PROGRAM_TEMPLATES_CATALOG.length} برنامج تأهيلي متخصص — قوالب جاهزة للتسجيل
              والمتابعة
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
        {filtered.map(prog => {
          const catMeta = PROGRAM_CATEGORY_LABELS[prog.category] || {};
          const _totalSessionsEst = prog.totalDurationWeeks * prog.sessionsPerWeek;
          return (
            <Grid item xs={12} sm={6} md={4} key={prog.programCode}>
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
                      sx={{ width: 40, height: 40, bgcolor: alpha(catMeta.color || '#666', 0.15) }}
                    >
                      {CATEGORY_ICONS[prog.category] || <FitnessIcon />}
                    </Avatar>
                    <Box>
                      <Chip
                        label={prog.abbreviation}
                        size="small"
                        sx={{ fontWeight: 700, bgcolor: alpha(catMeta.color || '#666', 0.1) }}
                      />
                      <Chip
                        label={catMeta.nameAr || prog.category}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, fontSize: '0.65rem' }}
                      />
                    </Box>
                  </Stack>

                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    gutterBottom
                    sx={{ lineHeight: 1.4 }}
                  >
                    {prog.nameAr}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    {prog.nameEn}
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
                    {prog.description}
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  {/* Stats row */}
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Stack alignItems="center">
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="caption" fontWeight={700}>
                          {prog.totalDurationWeeks} أسبوع
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={4}>
                      <Stack alignItems="center">
                        <SpeedIcon fontSize="small" color="action" />
                        <Typography variant="caption" fontWeight={700}>
                          {prog.sessionsPerWeek}×/أسبوع
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={4}>
                      <Stack alignItems="center">
                        <ClockIcon fontSize="small" color="action" />
                        <Typography variant="caption" fontWeight={700}>
                          {prog.sessionDuration} د
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 1 }} />

                  {/* Phases summary */}
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    المراحل: {prog.phases.length}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.3, mt: 0.5 }}>
                    {prog.phases.map((ph, i) => (
                      <Tooltip key={i} title={`${ph.nameAr} (${ph.durationWeeks} أسبوع)`} arrow>
                        <Box
                          sx={{
                            flex: ph.durationWeeks,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(catMeta.color || '#666', 0.2 + i * 0.2),
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>

                  {/* Disabilities */}
                  <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {prog.targetDisabilities.slice(0, 3).map(d => (
                      <Chip
                        key={d}
                        label={DISABILITY_LABELS[d] || d}
                        size="small"
                        sx={{
                          fontSize: '0.6rem',
                          height: 20,
                          bgcolor: alpha(catMeta.color || '#999', 0.08),
                        }}
                      />
                    ))}
                    {prog.targetDisabilities.length > 3 && (
                      <Chip
                        label={`+${prog.targetDisabilities.length - 3}`}
                        size="small"
                        sx={{ fontSize: '0.6rem', height: 20 }}
                      />
                    )}
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<InfoIcon />}
                    onClick={() => {
                      setSelectedProgram(prog);
                      setDetailOpen(true);
                    }}
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
                لا توجد برامج مطابقة
              </Typography>
              <Typography color="text.secondary">حاول تغيير معايير البحث أو الفلتر</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* ═══════ Detail Dialog ═══════ */}
      <ProgramDetailDialog
        open={detailOpen}
        program={selectedProgram}
        onClose={() => {
          setDetailOpen(false);
          setSelectedProgram(null);
        }}
        theme={theme}
      />
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  Program Detail Dialog
 * ═══════════════════════════════════════════════════════════════════════════ */
function ProgramDetailDialog({ open, program, onClose, theme: _theme }) {
  const [phasesOpen, setPhasesOpen] = useState(true);
  const [teamOpen, setTeamOpen] = useState(true);

  if (!program) return null;
  const catMeta = PROGRAM_CATEGORY_LABELS[program.category] || {};
  const totalSessions = program.totalDurationWeeks * program.sessionsPerWeek;
  const totalHours = Math.round((totalSessions * program.sessionDuration) / 60);

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
          background: `linear-gradient(135deg, ${catMeta.color || '#11998e'} 0%, ${alpha(catMeta.color || '#11998e', 0.7)} 100%)`,
          color: '#fff',
          pb: 2,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {program.nameAr}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {program.nameEn}
            </Typography>
            <Stack direction="row" spacing={1} mt={1}>
              <Chip
                label={program.abbreviation}
                size="small"
                sx={{ bgcolor: alpha('#fff', 0.2), color: '#fff', fontWeight: 700 }}
              />
              <Chip
                label={catMeta.nameAr || program.category}
                size="small"
                sx={{ bgcolor: alpha('#fff', 0.15), color: '#fff' }}
              />
            </Stack>
          </Box>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        {/* Stats Cards */}
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'المدة الكلية',
              value: `${program.totalDurationWeeks} أسبوع`,
              icon: <CalendarIcon />,
              color: '#7C4DFF',
            },
            {
              label: 'الجلسات / أسبوع',
              value: program.sessionsPerWeek,
              icon: <SpeedIcon />,
              color: '#00BCD4',
            },
            {
              label: 'مدة الجلسة',
              value: `${program.sessionDuration} د`,
              icon: <ClockIcon />,
              color: '#FF9800',
            },
            {
              label: 'إجمالي الجلسات',
              value: totalSessions,
              icon: <CheckIcon />,
              color: '#4CAF50',
            },
            {
              label: 'إجمالي الساعات',
              value: `${totalHours} ساعة`,
              icon: <ClockIcon />,
              color: '#E91E63',
            },
            {
              label: 'عدد المراحل',
              value: program.phases.length,
              icon: <PhaseIcon />,
              color: '#3F51B5',
            },
          ].map((info, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <Paper
                sx={{
                  p: 1.5,
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: alpha(info.color, 0.06),
                }}
              >
                <Box sx={{ color: info.color, mb: 0.5 }}>{info.icon}</Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  {info.label}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: info.color }}>
                  {info.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Typography variant="body1" mb={2}>
          {program.description}
        </Typography>

        {/* Target Disabilities */}
        <Typography variant="subtitle2" fontWeight={700} mb={1}>
          الإعاقات المستهدفة
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          {program.targetDisabilities.map(d => (
            <Chip
              key={d}
              label={DISABILITY_LABELS[d] || d}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>

        {/* Target Age */}
        <Typography variant="subtitle2" fontWeight={700} mb={1}>
          الفئة العمرية المستهدفة
        </Typography>
        <Chip label={program.targetAgeRange?.label} icon={<PeopleIcon />} sx={{ mb: 2 }} />

        {/* Phases Stepper */}
        <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
          <Box
            onClick={() => setPhasesOpen(!phasesOpen)}
            sx={{
              p: 2,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              مراحل البرنامج ({program.phases.length})
            </Typography>
            {phasesOpen ? <CollapseIcon /> : <ExpandIcon />}
          </Box>
          <Collapse in={phasesOpen}>
            <Box sx={{ p: 2, pt: 0 }}>
              <Stepper orientation="vertical" activeStep={-1}>
                {program.phases.map((phase, i) => (
                  <Step key={i} active>
                    <StepLabel
                      StepIconProps={{
                        sx: {
                          color: `${alpha(catMeta.color || '#666', 0.3 + i * 0.2)} !important`,
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2" fontWeight={700}>
                          {phase.nameAr}
                        </Typography>
                        <Chip
                          label={`${phase.durationWeeks} أسبوع`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </StepLabel>
                    <StepContent>
                      <List dense disablePadding>
                        {phase.objectives.map((obj, j) => (
                          <ListItem key={j} disableGutters>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <GoalIcon fontSize="small" sx={{ color: catMeta.color || '#666' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={obj.textAr}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Box>
          </Collapse>
        </Paper>

        {/* Required Team */}
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Box
            onClick={() => setTeamOpen(!teamOpen)}
            sx={{
              p: 2,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              الفريق المطلوب ({program.requiredTeam.length})
            </Typography>
            {teamOpen ? <CollapseIcon /> : <ExpandIcon />}
          </Box>
          <Collapse in={teamOpen}>
            <Box sx={{ p: 2, pt: 0, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {program.requiredTeam.map((member, i) => (
                <Chip
                  key={i}
                  icon={<TeamIcon />}
                  label={member.roleNameAr}
                  variant={member.isPrimary ? 'filled' : 'outlined'}
                  color={member.isPrimary ? 'primary' : 'default'}
                  sx={{ fontWeight: member.isPrimary ? 700 : 400 }}
                />
              ))}
            </Box>
          </Collapse>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}
