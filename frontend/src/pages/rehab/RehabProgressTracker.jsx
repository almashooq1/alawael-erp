/**
 * RehabProgressTracker — متتبع التقدم في برامج التأهيل
 *
 * يعرض:
 *  1. مخططات خطية لمسيرة الدرجات عبر الزمن (لكل مقياس)
 *  2. بطاقات ملخص: الاتجاه (تحسن/مستقر/تراجع) + نسبة التحقق من الأهداف
 *  3. قائمة الأهداف مع شريط تقدم نحو كل هدف
 *  4. عرض مبسّط للأسرة (Family View)
 *  5. مقارنة بين قياسين (نقطتا بداية / نهاية)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button as _Button,
  IconButton,
  Divider as _Divider,
  LinearProgress,
  CircularProgress,
  Alert,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar as _Avatar,
  Stack,
} from '@mui/material';
import {
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  TrendingFlat as TrendFlatIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as EmptyCircleIcon,
  FamilyRestroom as FamilyIcon,
  BarChart as BarChartIcon,
  Refresh as RefreshIcon,
  EmojiEvents as TrophyIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
  LineChart as _LineChart,
  Line as _Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  Legend as _Legend,
} from 'recharts';
import { rehabMeasuresAPI } from '../../services/ddd';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TREND_CONFIG = {
  improving: { label: 'تحسن', color: '#43a047', Icon: TrendUpIcon },
  stable: { label: 'مستقر', color: '#ffa726', Icon: TrendFlatIcon },
  declining: { label: 'تراجع', color: '#e53935', Icon: TrendDownIcon },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function TrendBadge({ trend }) {
  const cfg = TREND_CONFIG[trend] || TREND_CONFIG.stable;
  const { Icon } = cfg;
  return (
    <Chip
      icon={<Icon sx={{ fontSize: 16 }} />}
      label={cfg.label}
      size="small"
      sx={{ bgcolor: `${cfg.color}20`, color: cfg.color, fontWeight: 700 }}
    />
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MeasureProgressCard({ measureKey, sessions, maxScore, measureName, familyView }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = useCallback(async () => {
    if (!sessions?.length) return;
    setLoading(true);
    try {
      const res = await rehabMeasuresAPI.analyzeProgress(measureKey, { sessions });
      setAnalysis(res.data?.data || null);
    } catch {
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [measureKey, sessions]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const chartData = (sessions || [])
    .map(s => ({
      date: formatDate(s.date),
      score: s.score ?? s.rawScore ?? null,
      fullDate: s.date,
    }))
    .filter(d => d.score !== null);

  const first = chartData[0]?.score;
  const last = chartData[chartData.length - 1]?.score;
  const change = first != null && last != null ? last - first : null;

  if (familyView) {
    // Simplified family view
    const percent = maxScore ? Math.round((last / maxScore) * 100) : null;
    return (
      <Card sx={{ borderRadius: 3, border: '1px solid #e0e0e0' }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            {measureName}
          </Typography>
          {percent !== null && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {percent}%
                </Typography>
                {analysis?.trend && <TrendBadge trend={analysis.trend} />}
              </Box>
              <LinearProgress
                variant="determinate"
                value={percent}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </>
          )}
          {change !== null && (
            <Typography
              variant="body2"
              sx={{
                mt: 1,
                color: change > 0 ? 'success.main' : change < 0 ? 'error.main' : 'text.secondary',
              }}
            >
              {change > 0
                ? `تحسّن بمقدار ${change}`
                : change < 0
                  ? `تراجع بمقدار ${Math.abs(change)}`
                  : 'لم يتغير'}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {measureName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {loading && <CircularProgress size={16} />}
            {analysis?.trend && <TrendBadge trend={analysis.trend} />}
            <IconButton size="small" onClick={runAnalysis}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Key stats */}
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          {first !== null && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                البداية
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {first}
              </Typography>
            </Box>
          )}
          {last !== null && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                الأخير
              </Typography>
              <Typography variant="h6" fontWeight={700} color="primary">
                {last}
              </Typography>
            </Box>
          )}
          {change !== null && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                التغيير
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{
                  color: change > 0 ? 'success.main' : change < 0 ? 'error.main' : 'text.secondary',
                }}
              >
                {change > 0 ? `+${change}` : change}
              </Typography>
            </Box>
          )}
          {analysis?.slopePerWeek !== undefined && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                التحسن/أسبوع
              </Typography>
              <Typography variant="h6" fontWeight={700} color="success.main">
                {analysis.slopePerWeek > 0
                  ? `+${analysis.slopePerWeek.toFixed(1)}`
                  : analysis.slopePerWeek.toFixed(1)}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Line chart */}
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${measureKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1976d2" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1976d2" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, maxScore || 'auto']} tick={{ fontSize: 11 }} />
              <RTooltip formatter={v => [v, 'الدرجة']} contentStyle={{ fontSize: 12 }} />
              {maxScore && (
                <ReferenceLine
                  y={maxScore}
                  stroke="#e0e0e0"
                  strokeDasharray="4 4"
                  label={{ value: 'الحد الأعلى', fontSize: 10 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="score"
                stroke="#1976d2"
                strokeWidth={2}
                fill={`url(#grad-${measureKey})`}
                dot={{ r: 4, fill: '#1976d2' }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Alert severity="info" sx={{ fontSize: 12 }}>
            يلزم قياسان على الأقل لعرض مخطط التقدم
          </Alert>
        )}

        {/* AI Insights */}
        {analysis?.insights?.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {analysis.insights.map((ins, i) => (
              <Typography key={i} variant="caption" color="text.secondary" display="block">
                • {ins}
              </Typography>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function GoalsProgressSection({ goals }) {
  if (!goals?.length) return null;

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TrophyIcon color="warning" />
          <Typography variant="subtitle1" fontWeight={700}>
            الأهداف العلاجية
          </Typography>
          <Chip
            label={`${goals.filter(g => g.achieved).length}/${goals.length} محقق`}
            size="small"
            color="success"
            variant="outlined"
          />
        </Box>
        <List dense>
          {goals.map((goal, i) => (
            <ListItem key={i} alignItems="flex-start" sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                {goal.achieved ? (
                  <CheckIcon fontSize="small" color="success" />
                ) : (
                  <EmptyCircleIcon fontSize="small" color="disabled" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={goal.name_ar}
                secondary={
                  goal.progress !== undefined && (
                    <Box sx={{ mt: 0.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(goal.progress, 100)}
                        color={
                          goal.progress >= 80
                            ? 'success'
                            : goal.progress >= 40
                              ? 'warning'
                              : 'error'
                        }
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {goal.progress}% من الهدف
                      </Typography>
                    </Box>
                  )
                }
                primaryTypographyProps={{ fontSize: 13 }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Props:
 *   beneficiaryId  — string (optional, for data fetching)
 *   programData    — { measures: [{ key, name_ar, sessions, maxScore }], goals: [...] }
 *                    If not provided, shows demo/empty state
 *   programName    — string
 */
export default function RehabProgressTracker({
  beneficiaryId: _beneficiaryId,
  programData,
  programName,
}) {
  const [viewMode, setViewMode] = useState('clinical'); // 'clinical' | 'family'
  const [selectedMeasure, setSelectedMeasure] = useState('all');

  const measures = programData?.measures || [];
  const goals = programData?.goals || [];

  const overallProgress =
    goals.length > 0
      ? Math.round((goals.filter(g => g.achieved).length / goals.length) * 100)
      : null;

  const shownMeasures =
    selectedMeasure === 'all' ? measures : measures.filter(m => m.key === selectedMeasure);

  return (
    <Box sx={{ direction: 'rtl' }}>
      {/* Header bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            {programName || 'متتبع التقدم'}
          </Typography>
          {overallProgress !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                إجمالي التقدم:
              </Typography>
              <Typography variant="body2" fontWeight={700} color="primary">
                {overallProgress}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={overallProgress}
                sx={{ width: 120, height: 6, borderRadius: 3 }}
              />
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Measure filter */}
          {measures.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>المقياس</InputLabel>
              <Select
                label="المقياس"
                value={selectedMeasure}
                onChange={e => setSelectedMeasure(e.target.value)}
              >
                <MenuItem value="all">جميع المقاييس</MenuItem>
                {measures.map(m => (
                  <MenuItem key={m.key} value={m.key}>
                    {m.name_ar}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {/* View toggle */}
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
          >
            <ToggleButton value="clinical">
              <Tooltip title="عرض سريري">
                <BarChartIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="family">
              <Tooltip title="عرض الأسرة">
                <FamilyIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Family view banner */}
      {viewMode === 'family' && (
        <Alert severity="info" icon={<FamilyIcon />} sx={{ mb: 2 }}>
          <strong>عرض الأسرة:</strong> يُظهر هذا الوضع ملخصاً مبسطاً لتقدم المستفيد يمكن مشاركته مع
          الأسرة.
        </Alert>
      )}

      {/* No data state */}
      {measures.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            bgcolor: '#fafafa',
            border: '1px dashed #ccc',
          }}
        >
          <TimelineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            لا توجد بيانات مقاييس بعد. يمكن إضافة بيانات بعد إجراء التقييمات من شاشة التقييم الذكي.
          </Typography>
        </Paper>
      )}

      {/* Measures grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {shownMeasures.map(m => (
          <Grid
            item
            xs={12}
            sm={viewMode === 'family' ? 6 : 12}
            md={viewMode === 'family' ? 4 : 6}
            key={m.key}
          >
            <MeasureProgressCard
              measureKey={m.key}
              sessions={m.sessions}
              maxScore={m.maxScore}
              measureName={m.name_ar}
              familyView={viewMode === 'family'}
            />
          </Grid>
        ))}
      </Grid>

      {/* Goals section — clinical only */}
      {viewMode === 'clinical' && goals.length > 0 && <GoalsProgressSection goals={goals} />}

      {/* Family view goals summary */}
      {viewMode === 'family' && goals.length > 0 && overallProgress !== null && (
        <Card sx={{ borderRadius: 3, bgcolor: overallProgress >= 70 ? '#e8f5e9' : '#fff8e1' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <TrophyIcon
              sx={{ fontSize: 40, color: overallProgress >= 70 ? 'success.main' : 'warning.main' }}
            />
            <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
              {overallProgress >= 70
                ? 'تقدم ممتاز!'
                : overallProgress >= 40
                  ? 'تقدم جيد — استمر!'
                  : 'بداية جيدة — نحتاج مزيداً من الجلسات'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
              تم تحقيق {goals.filter(g => g.achieved).length} من أصل {goals.length} هدف علاجي
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
