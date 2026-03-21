/**
 * Progress Dialog — متابعة تقدم المقياس
 * Shows historical scores for a single scale/beneficiary over time.
 */
import { useState, useEffect } from 'react';




import assessmentService from 'services/assessmentService';
import logger from 'utils/logger';

const ProgressDialog = ({ open, onClose, scales, beneficiaries }) => {
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [selectedScaleKey, setSelectedScaleKey] = useState('');
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedScale = scales.find(s => s.id === selectedScaleKey);

  /* ── Fetch progress when both fields are selected ── */
  useEffect(() => {
    if (!selectedBeneficiary || !selectedScaleKey) {
      setProgress(null);
      return;
    }
    let cancelled = false;
    const fetchProgress = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await assessmentService.getScaleProgress(selectedBeneficiary, selectedScaleKey);
        if (!cancelled) setProgress(res?.data || res);
      } catch (err) {
        if (!cancelled) setError('فشل جلب بيانات التقدم');
        logger.warn('Progress fetch error:', err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProgress();
    return () => { cancelled = true; };
  }, [selectedBeneficiary, selectedScaleKey]);

  const trendIcon = {
    improving: <TrendingUpIcon color="success" />,
    declining: <TrendingDownIcon color="error" />,
    stable: <TrendingFlatIcon color="info" />,
  };

  const trendLabel = {
    improving: 'تحسّن',
    declining: 'تراجع',
    stable: 'مستقر',
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: '#00897b',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon />
          <span>متابعة تقدم المقياس عبر الزمن</span>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>اختر المستفيد</InputLabel>
              <Select
                value={selectedBeneficiary}
                onChange={(e) => setSelectedBeneficiary(e.target.value)}
                label="اختر المستفيد"
              >
                {beneficiaries.map((b) => (
                  <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>اختر المقياس</InputLabel>
              <Select
                value={selectedScaleKey}
                onChange={(e) => setSelectedScaleKey(e.target.value)}
                label="اختر المقياس"
              >
                {scales.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        {progress && (
          <>
            {/* Trend indicator */}
            {progress.trend && (
              <Alert
                severity={progress.trend === 'improving' ? 'success' : progress.trend === 'declining' ? 'error' : 'info'}
                sx={{ mb: 2 }}
                icon={trendIcon[progress.trend] || <TrendingFlatIcon />}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  الاتجاه العام: {trendLabel[progress.trend] || progress.trend}
                </Typography>
              </Alert>
            )}

            {/* Timeline of assessments */}
            {progress.assessments?.length > 0 ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  سجل التقييمات ({progress.assessments.length})
                </Typography>
                {progress.assessments.map((assessment, idx) => {
                  const pct = selectedScale
                    ? Math.round((assessment.totalScore / selectedScale.maxScore) * 100)
                    : assessment.percentage || 0;
                  const interp = selectedScale?.interpretation?.find(
                    i => assessment.totalScore >= i.min && assessment.totalScore <= i.max
                  );
                  const prevAssessment = idx < progress.assessments.length - 1
                    ? progress.assessments[idx + 1]
                    : null;
                  const diff = prevAssessment
                    ? assessment.totalScore - prevAssessment.totalScore
                    : null;

                  return (
                    <Paper key={idx} elevation={1} sx={{ p: 2, mb: 1.5, borderRight: `4px solid ${interp?.color || '#666'}` }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {assessment.date || assessment.createdAt?.split('T')[0] || `تقييم #${idx + 1}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {assessment.assessorName || ''}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight="bold" color={selectedScale?.color || '#333'}>
                            {assessment.totalScore}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            /{selectedScale?.maxScore || '?'} ({pct}%)
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          {interp && (
                            <Chip
                              label={interp.label}
                              size="small"
                              sx={{ bgcolor: interp.color, color: 'white', mb: 0.5 }}
                            />
                          )}
                          {diff != null && diff !== 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                              {diff > 0 ? (
                                <TrendingUpIcon color="success" fontSize="small" />
                              ) : (
                                <TrendingDownIcon color="error" fontSize="small" />
                              )}
                              <Typography
                                variant="caption"
                                color={diff > 0 ? 'success.main' : 'error.main'}
                                fontWeight="bold"
                              >
                                {diff > 0 ? '+' : ''}{diff}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      {/* Domain breakdown */}
                      {assessment.domainScores && (
                        <Box sx={{ mt: 1.5 }}>
                          <Divider sx={{ mb: 1 }} />
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {Object.entries(assessment.domainScores).map(([key, val]) => {
                              const domain = selectedScale?.domains?.find(d => d.key === key);
                              return (
                                <Chip
                                  key={key}
                                  label={`${domain?.name || key}: ${val}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ borderColor: selectedScale?.color }}
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            ) : (
              <Alert severity="info">لا توجد تقييمات سابقة لهذا المقياس/المستفيد</Alert>
            )}
          </>
        )}

        {!progress && selectedBeneficiary && selectedScaleKey && !loading && !error && (
          <Alert severity="info">لا توجد بيانات تقدم لهذه التركيبة</Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProgressDialog;
