/**
 * RehabProgramsLibrary — مكتبة البرامج التأهيلية
 * Rehabilitation Programs Library — service-connected
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
  CircularProgress,
  Tooltip,
  useTheme,
  alpha,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupIcon from '@mui/icons-material/Group';
import { useNavigate } from 'react-router-dom';
import {
  rehabProgramTemplatesService,
  REHAB_PROGRAM_TEMPLATES_CATALOG,
  PROGRAM_CATEGORY_LABELS,
} from '../../services/specializedRehab.service';

const CATEGORY_COLOR = {
  early_intervention: 'success',
  physical: 'primary',
  vocational: 'warning',
  cognitive: 'secondary',
  communication: 'info',
  independent_living: 'error',
  sensory: 'default',
};

export default function RehabProgramsLibrary() {
  const theme = useTheme();
  const navigate = useNavigate();

  const [programs, setPrograms] = useState(REHAB_PROGRAM_TEMPLATES_CATALOG ?? []);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rehabProgramTemplatesService.getAll({ limit: 100 });
      const d = res?.data?.data ?? res?.data ?? [];
      if (Array.isArray(d) && d.length > 0) setPrograms(d);
    } catch {
      /* keep catalog fallback */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = ['all', ...new Set(programs.map(p => p.category).filter(Boolean))];

  const filtered = programs.filter(p => {
    const text =
      `${p.nameAr || ''} ${p.nameEn || ''} ${(p.targetDisabilities ?? []).join(' ')}`.toLowerCase();
    const matchSearch = !search || text.includes(search.toLowerCase());
    const matchCat = category === 'all' || p.category === category;
    return matchSearch && matchCat;
  });

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
          borderRadius: 3,
          p: 3,
          mb: 4,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 52, height: 52 }}>
          <LibraryBooksIcon sx={{ fontSize: 30, color: 'white' }} />
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            مكتبة البرامج التأهيلية
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            {loading ? 'جاري التحميل…' : `${filtered.length} برنامج متاح`}
          </Typography>
        </Box>
      </Box>

      {/* Search + filter */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
        <TextField
          placeholder="ابحث في البرامج..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          size="small"
        />
        <ToggleButtonGroup
          value={category}
          exclusive
          onChange={(_, v) => v && setCategory(v)}
          size="small"
        >
          {categories.map(c => (
            <ToggleButton key={c} value={c}>
              {c === 'all' ? 'الكل' : (PROGRAM_CATEGORY_LABELS?.[c] ?? c)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Cards */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filtered.map((program, i) => {
            const catColor = CATEGORY_COLOR[program.category] ?? 'default';
            return (
              <Grid item xs={12} sm={6} md={4} key={program._id || program.programCode || i}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'box-shadow .2s',
                    '&:hover': { boxShadow: 4 },
                  }}
                >
                  {/* Colored top bar */}
                  <Box
                    sx={{
                      height: 6,
                      borderRadius: '8px 8px 0 0',
                      bgcolor: `${catColor}.main`,
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={1}
                    >
                      <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1, mr: 1 }}>
                        {program.nameAr || program.name}
                      </Typography>
                      {program.abbreviation && (
                        <Chip label={program.abbreviation} size="small" color={catColor} />
                      )}
                    </Box>

                    {program.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        mb={1.5}
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {program.description}
                      </Typography>
                    )}

                    <Box display="flex" gap={1} flexWrap="wrap" mb={1.5}>
                      {program.category && (
                        <Chip
                          label={PROGRAM_CATEGORY_LABELS?.[program.category] ?? program.category}
                          color={catColor}
                          size="small"
                        />
                      )}
                    </Box>

                    <Box display="flex" gap={2} flexWrap="wrap">
                      {program.totalDurationWeeks && (
                        <Tooltip title="مدة البرنامج">
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <CalendarMonthIcon fontSize="small" color="action" />
                            <Typography variant="caption">
                              {program.totalDurationWeeks} أسبوع
                            </Typography>
                          </Box>
                        </Tooltip>
                      )}
                      {program.sessionsPerWeek && (
                        <Tooltip title="الجلسات أسبوعياً">
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <GroupIcon fontSize="small" color="action" />
                            <Typography variant="caption">
                              {program.sessionsPerWeek} جلسات/أسبوع
                            </Typography>
                          </Box>
                        </Tooltip>
                      )}
                    </Box>

                    {program.targetAgeRange?.label && (
                      <Paper
                        elevation={0}
                        sx={{
                          mt: 1.5,
                          px: 1.5,
                          py: 0.5,
                          bgcolor: alpha(theme.palette.info.main, 0.08),
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="caption" color="info.main">
                          الفئة العمرية: {program.targetAgeRange.label}
                        </Typography>
                      </Paper>
                    )}
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      fullWidth
                      onClick={() =>
                        navigate(`/program-enrollment/${program._id || program.programCode}`)
                      }
                    >
                      تسجيل مستفيد
                    </Button>
                    <Button size="small" variant="outlined" fullWidth>
                      عرض التفاصيل
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}

          {filtered.length === 0 && (
            <Grid item xs={12}>
              <Box textAlign="center" py={8}>
                <LibraryBooksIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">لا توجد برامج تطابق البحث</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </Container>
  );
}
