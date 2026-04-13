/**
 * Batch Assessment Dialog — تقييم جماعي متعدد المقاييس
 * Allows applying multiple scales in one session for a single beneficiary.
 */
import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Slider,
  Alert,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Checkbox,
  FormControlLabel,  LinearProgress,  Avatar,
  Divider,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Close as CloseIcon,
  PlaylistAddCheck as BatchIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import assessmentService from 'services/assessmentService';
import logger from 'utils/logger';
import { SCALE_ICONS } from './constants';

const BatchAssessmentDialog = ({
  open,
  onClose,
  scales,
  beneficiaries,
  onSuccess,
  showSnackbar,
}) => {
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [selectedScaleIds, setSelectedScaleIds] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [allDomainScores, setAllDomainScores] = useState({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ── Scales chosen by user ── */
  const selectedScales = useMemo(
    () => scales.filter(s => selectedScaleIds.includes(s.id)),
    [scales, selectedScaleIds]
  );

  const totalSteps = selectedScales.length + 1; // step 0 = config, steps 1..N = scales

  /* ── Toggle a scale checkbox ── */
  const toggleScale = (scaleId) => {
    setSelectedScaleIds(prev =>
      prev.includes(scaleId) ? prev.filter(id => id !== scaleId) : [...prev, scaleId]
    );
  };

  /* ── Initialize domain scores when moving to a scale step ── */
  const ensureDomainScores = (scale) => {
    if (!allDomainScores[scale.id]) {
      const initial = {};
      scale.domains.forEach(d => { initial[d.key] = 0; });
      setAllDomainScores(prev => ({ ...prev, [scale.id]: initial }));
    }
  };

  const handleDomainChange = (scaleId, domainKey, value) => {
    setAllDomainScores(prev => ({
      ...prev,
      [scaleId]: { ...prev[scaleId], [domainKey]: value },
    }));
  };

  /* ── Navigation ── */
  const handleNext = () => {
    if (activeStep === 0) {
      // Initialize scores for first scale
      if (selectedScales[0]) ensureDomainScores(selectedScales[0]);
    } else if (activeStep < totalSteps - 1) {
      ensureDomainScores(selectedScales[activeStep]);
    }
    setActiveStep(prev => Math.min(prev + 1, totalSteps - 1));
  };

  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  /* ── Submit batch ── */
  const handleSubmit = async () => {
    if (!selectedBeneficiary || selectedScales.length === 0) {
      showSnackbar('يرجى اختيار المستفيد ومقياس واحد على الأقل', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const scaleAssessments = selectedScales.map(scale => ({
        scaleKey: scale.id,
        domainScores: allDomainScores[scale.id] || {},
      }));

      await assessmentService.performBatchAssessment({
        beneficiaryId: selectedBeneficiary,
        scaleAssessments,
        metadata: { notes, assessorName: 'المقيّم الحالي' },
      });

      showSnackbar(`تم حفظ ${selectedScales.length} تقييم بنجاح`, 'success');
      handleReset();
      onSuccess?.();
      onClose();
    } catch (err) {
      logger.error('Batch submit error:', err);
      showSnackbar('فشل حفظ التقييم الجماعي', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedBeneficiary('');
    setSelectedScaleIds([]);
    setActiveStep(0);
    setAllDomainScores({});
    setNotes('');
  };

  /* ── Scale score summary ── */
  const getScaleTotal = (scaleId) => {
    const scores = allDomainScores[scaleId] || {};
    return Object.values(scores).reduce((a, b) => a + b, 0);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: '#5c6bc0',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BatchIcon />
          <span>تقييم جماعي — متعدد المقاييس</span>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, minHeight: 400 }}>
        {submitting && <LinearProgress sx={{ mb: 2 }} />}

        {activeStep === 0 ? (
          /* ── Step 0: Configuration ── */
          <Box>
            <Typography variant="h6" gutterBottom>1. اختر المستفيد والمقاييس</Typography>

            <FormControl fullWidth sx={{ mb: 3, mt: 1 }}>
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

            <Typography variant="subtitle1" gutterBottom>
              اختر المقاييس المراد تطبيقها ({selectedScaleIds.length} مختار):
            </Typography>
            <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
              {scales.map(scale => (
                <Paper key={scale.id} elevation={1} sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedScaleIds.includes(scale.id)}
                        onChange={() => toggleScale(scale.id)}
                        sx={{ color: scale.color, '&.Mui-checked': { color: scale.color } }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: scale.color, width: 28, height: 28 }}>
                          {SCALE_ICONS[scale.icon] || <AssessmentIcon fontSize="small" />}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{scale.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {scale.domains.length} مجالات — الحد الأقصى {scale.maxScore}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    sx={{ flex: 1, m: 0 }}
                  />
                </Paper>
              ))}
            </Box>
          </Box>
        ) : (
          /* ── Steps 1..N: Per-scale scoring ── */
          (() => {
            const scaleIndex = activeStep - 1;
            const scale = selectedScales[scaleIndex];
            if (!scale) return null;
            const scores = allDomainScores[scale.id] || {};
            const total = getScaleTotal(scale.id);
            const pct = Math.round((total / scale.maxScore) * 100);
            const interp = scale.interpretation?.find(i => total >= i.min && total <= i.max);

            return (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Avatar sx={{ bgcolor: scale.color }}>
                    {SCALE_ICONS[scale.icon] || <AssessmentIcon />}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">{scale.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      المقياس {scaleIndex + 1} من {selectedScales.length}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto', textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="bold" color={scale.color}>
                      {total}/{scale.maxScore}
                    </Typography>
                    <Typography variant="caption">({pct}%)</Typography>
                  </Box>
                </Box>

                {interp && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Chip label={interp.label} size="small" sx={{ bgcolor: interp.color, color: 'white' }} />
                  </Alert>
                )}

                {scale.domains.map(domain => {
                  const score = scores[domain.key] || 0;
                  const domPct = Math.round((score / domain.maxScore) * 100);
                  const pctColor = domPct < 25 ? '#d32f2f' : domPct < 50 ? '#ed6c02' : domPct < 75 ? '#0288d1' : '#2e7d32';
                  return (
                    <Paper key={domain.key} elevation={1} sx={{ p: 2, mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight="bold">{domain.name}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Chip label={`${domPct}%`} size="small" sx={{ bgcolor: pctColor, color: 'white', minWidth: 42 }} />
                          <Chip label={`${score}/${domain.maxScore}`} size="small" sx={{ bgcolor: scale.color, color: 'white' }} />
                        </Box>
                      </Box>
                      <Slider
                        value={score}
                        min={0}
                        max={domain.maxScore}
                        step={1}
                        onChange={(_, v) => handleDomainChange(scale.id, domain.key, v)}
                        valueLabelDisplay="auto"
                        sx={{ color: scale.color }}
                      />
                    </Paper>
                  );
                })}

                {/* Notes on last scale */}
                {scaleIndex === selectedScales.length - 1 && (
                  <TextField
                    label="ملاحظات عامة"
                    multiline
                    rows={2}
                    fullWidth
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    sx={{ mt: 2 }}
                  />
                )}
              </Box>
            );
          })()
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Box>
          {activeStep > 0 && (
            <Button startIcon={<BackIcon />} onClick={handleBack}>السابق</Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>إلغاء</Button>
          {activeStep < totalSteps - 1 ? (
            <Button
              variant="contained"
              endIcon={<NextIcon />}
              onClick={handleNext}
              disabled={
                activeStep === 0 && (!selectedBeneficiary || selectedScaleIds.length === 0)
              }
            >
              التالي
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
              disabled={submitting}
              color="success"
            >
              {submitting ? 'جاري الحفظ...' : `حفظ ${selectedScales.length} تقييم`}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default BatchAssessmentDialog;
