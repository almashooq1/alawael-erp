/**
 * Analytics Tab — تحليلات المقاييس
 * Shows global analytics, comparison radar, and per-beneficiary profiles.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  LinearProgress,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  CompareArrows as CompareIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  Star as StarIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import assessmentService from 'services/assessmentService';
import logger from 'utils/logger';
import { TabPanel, SCALE_ICONS } from './constants';

/* ── Score bar with label ── */
const ScoreBar = ({ label, score, maxScore, color }) => {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" fontWeight="bold">{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {score}/{maxScore} ({pct}%)
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 10,
          borderRadius: 5,
          bgcolor: '#e0e0e0',
          '& .MuiLinearProgress-bar': { bgcolor: color || '#1976d2', borderRadius: 5 },
        }}
      />
    </Box>
  );
};

/* ── Severity distribution bar ── */
const SeverityBar = ({ data }) => {
  if (!data) return null;
  const total = (data.severe || 0) + (data.moderate || 0) + (data.mild || 0) + (data.normal || 0);
  if (total === 0) return <Typography variant="body2" color="text.secondary">لا توجد بيانات</Typography>;
  const items = [
    { key: 'severe', label: 'شديد', color: '#d32f2f', count: data.severe || 0 },
    { key: 'moderate', label: 'متوسط', color: '#ed6c02', count: data.moderate || 0 },
    { key: 'mild', label: 'خفيف', color: '#0288d1', count: data.mild || 0 },
    { key: 'normal', label: 'طبيعي', color: '#2e7d32', count: data.normal || 0 },
  ];
  return (
    <Box>
      <Box sx={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', mb: 1 }}>
        {items.map(i => (
          i.count > 0 ? (
            <Tooltip key={i.key} title={`${i.label}: ${i.count}`}>
              <Box sx={{ width: `${(i.count / total) * 100}%`, bgcolor: i.color }} />
            </Tooltip>
          ) : null
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {items.map(i => (
          <Chip
            key={i.key}
            label={`${i.label}: ${i.count}`}
            size="small"
            sx={{ bgcolor: i.color, color: 'white', fontSize: '0.7rem' }}
          />
        ))}
      </Box>
    </Box>
  );
};

const AnalyticsTab = ({ tabValue, scales, beneficiaries }) => {
  const [analytics, setAnalytics] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ── Load global analytics when tab becomes active ── */
  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await assessmentService.getAnalytics();
      setAnalytics(res?.data || res);
    } catch (err) {
      logger.warn('Analytics load error:', err?.message);
      setError('لم يتم جلب التحليلات — تحقق من الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tabValue === 2) loadAnalytics();
  }, [tabValue, loadAnalytics]);

  /* ── Load comparison + profile for a selected beneficiary ── */
  const handleBeneficiarySelect = async (beneficiaryId) => {
    setSelectedBeneficiary(beneficiaryId);
    if (!beneficiaryId) {
      setComparison(null);
      setProfile(null);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const [compRes, profRes] = await Promise.all([
        assessmentService.compareAssessments(beneficiaryId),
        assessmentService.getAssessmentProfile(beneficiaryId),
      ]);
      setComparison(compRes?.data || compRes);
      setProfile(profRes?.data || profRes);
    } catch (err) {
      logger.warn('Comparison/profile load error:', err?.message);
      setError('فشل جلب بيانات المقارنة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TabPanel value={tabValue} index={2}>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Section 1: Global Analytics ── */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AnalyticsIcon color="primary" /> التحليلات العامة
      </Typography>

      {analytics ? (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {/* Severity Distribution */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>توزيع مستويات الشدة</Typography>
                <SeverityBar data={analytics.bySeverity} />
              </CardContent>
            </Card>
          </Grid>

          {/* By Disability Type */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>حسب نوع الإعاقة</Typography>
                {analytics.byType && Object.entries(analytics.byType).length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(analytics.byType).map(([type, count]) => (
                      <Chip
                        key={type}
                        label={`${type}: ${count}`}
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">لا توجد بيانات</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* By Scale */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>عدد التقييمات لكل مقياس</Typography>
                <Grid container spacing={1}>
                  {analytics.byScale && Object.entries(analytics.byScale).map(([scaleKey, count]) => {
                    const scaleDef = scales.find(s => s.id === scaleKey);
                    return (
                      <Grid item xs={6} sm={4} md={3} key={scaleKey}>
                        <Paper
                          elevation={1}
                          sx={{ p: 1.5, textAlign: 'center', borderTop: `3px solid ${scaleDef?.color || '#666'}` }}
                        >
                          <Avatar sx={{ bgcolor: scaleDef?.color || '#666', mx: 'auto', mb: 0.5, width: 36, height: 36 }}>
                            {scaleDef ? (SCALE_ICONS[scaleDef.icon] || <AssessmentIcon fontSize="small" />) : <AssessmentIcon fontSize="small" />}
                          </Avatar>
                          <Typography variant="h6" fontWeight="bold">{count}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {scaleDef?.name || scaleKey}
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Score Distribution */}
          {analytics.scoreDistribution && (
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>توزيع الدرجات</Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {Object.entries(analytics.scoreDistribution).map(([range, count]) => (
                      <Chip key={range} label={`%${range}: ${count} تقييم`} variant="outlined" />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      ) : (
        !loading && (
          <Alert severity="info" sx={{ mb: 3 }}>
            لم يتم تحميل التحليلات بعد — سيتم التحميل تلقائياً عند فتح هذه التبويبة
          </Alert>
        )
      )}

      <Divider sx={{ my: 3 }} />

      {/* ── Section 2: Beneficiary Comparison & Profile ── */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CompareIcon color="secondary" /> مقارنة تقييمات المستفيد
      </Typography>

      <FormControl fullWidth sx={{ mb: 3, maxWidth: 400 }}>
        <InputLabel>اختر المستفيد للمقارنة</InputLabel>
        <Select
          value={selectedBeneficiary}
          onChange={(e) => handleBeneficiarySelect(e.target.value)}
          label="اختر المستفيد للمقارنة"
        >
          <MenuItem value="">— اختر —</MenuItem>
          {beneficiaries.map((b) => (
            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Comparison Results */}
      {comparison && comparison.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {comparison.map((item) => {
            const scaleDef = scales.find(s => s.id === item.scaleKey);
            return (
              <Grid item xs={12} sm={6} md={4} key={item.scaleKey}>
                <Card
                  elevation={2}
                  sx={{ borderTop: `4px solid ${scaleDef?.color || '#666'}` }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Avatar sx={{ bgcolor: scaleDef?.color || '#666', width: 32, height: 32 }}>
                        {scaleDef ? (SCALE_ICONS[scaleDef.icon] || <AssessmentIcon fontSize="small" />) : <AssessmentIcon fontSize="small" />}
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {scaleDef?.name || item.scaleKey}
                      </Typography>
                    </Box>
                    <ScoreBar
                      label="آخر درجة"
                      score={item.latestScore || 0}
                      maxScore={item.maxScore || scaleDef?.maxScore || 100}
                      color={scaleDef?.color}
                    />
                    {item.previousScore !== null && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                        {item.latestScore > item.previousScore ? (
                          <TrendingUpIcon color="success" fontSize="small" />
                        ) : item.latestScore < item.previousScore ? (
                          <TrendingDownIcon color="error" fontSize="small" />
                        ) : null}
                        <Typography variant="caption" color="text.secondary">
                          السابق: {item.previousScore}
                          {item.latestScore !== item.previousScore &&
                            ` (${item.latestScore > item.previousScore ? '+' : ''}${item.latestScore - item.previousScore})`
                          }
                        </Typography>
                      </Box>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      التقييمات: {item.assessmentCount || 1}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Beneficiary Assessment Profile */}
      {profile && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" /> الملف التقييمي الشامل
          </Typography>
          <Grid container spacing={2}>
            {/* Strengths */}
            <Grid item xs={12} md={6}>
              <Card elevation={2} sx={{ borderTop: '4px solid #2e7d32' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StarIcon /> نقاط القوة
                  </Typography>
                  {profile.strengths?.length > 0 ? (
                    <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                      {profile.strengths.map((s, i) => (
                        <li key={i}>
                          <Typography variant="body2">{s.domain || s}: {s.score !== null ? `${s.score}%` : ''}</Typography>
                        </li>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      لا توجد بيانات كافية
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            {/* Weaknesses */}
            <Grid item xs={12} md={6}>
              <Card elevation={2} sx={{ borderTop: '4px solid #d32f2f' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#d32f2f', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon /> نقاط تحتاج تحسين
                  </Typography>
                  {profile.weaknesses?.length > 0 ? (
                    <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                      {profile.weaknesses.map((w, i) => (
                        <li key={i}>
                          <Typography variant="body2">{w.domain || w}: {w.score !== null ? `${w.score}%` : ''}</Typography>
                        </li>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      لا توجد بيانات كافية
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {selectedBeneficiary && !comparison && !profile && !loading && (
        <Alert severity="info">لا توجد تقييمات سابقة لهذا المستفيد</Alert>
      )}
    </TabPanel>
  );
};

export default AnalyticsTab;
