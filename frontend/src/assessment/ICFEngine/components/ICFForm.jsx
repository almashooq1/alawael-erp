import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Fade,
  Badge,
} from '@mui/material';
import {
  Save as SaveIcon,
  Print as PrintIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Link as LinkIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Psychology as PsychologyIcon,
  AccessibilityNew as AccessibilityIcon,
  Group as GroupIcon,
  Nature as NatureIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ICFDomainSelector from './ICFDomainSelector';
import ICFQualifierSlider from './ICFQualifierSlider';
import ICFGoalLinker from './ICFGoalLinker';
import ICFProgressChart from './ICFProgressChart';
import { useICFAssessment } from '../hooks/useICFAssessment';
import { ICF_QUALIFIERS } from '../coreSets/icf-cy-codes';

const DOMAIN_ICONS = {
  bodyFunctions: <PsychologyIcon />,
  bodyStructures: <AccessibilityIcon />,
  activitiesAndParticipation: <GroupIcon />,
  environmentalFactors: <NatureIcon />,
  personalFactors: <PersonIcon />,
};

const DOMAIN_LABELS = {
  bodyFunctions: 'وظائف الجسم',
  bodyStructures: 'أجزاء الجسم',
  activitiesAndParticipation: 'الأنشطة والمشاركة',
  environmentalFactors: 'العوامل البيئية',
  personalFactors: 'العوامل الشخصية',
};

const STEPS = [
  { label: 'اختيار المجال', description: 'اختر المجال الذي تريد تقييمه' },
  { label: 'تقييم الأكواد', description: 'قيّم كل كود باستخدام المؤهلات' },
  { label: 'ربط الأهداف', description: 'اربط الأهداف العلاجية بالأكواد' },
  { label: 'مراجعة التقرير', description: 'راجع ووثّق التقييم' },
];

/**
 * ICFForm - Main ICF Assessment Form Component
 * النموذج الرئيسي لتقييم ICF
 */
const ICFForm = ({ 
  beneficiaryId, 
  assessmentId,
  initialData,
  onSave,
  onSubmit,
  readOnly = false,
  coreSetType = 'rehab', // 'rehab', 'autism', 'cp'
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDomain, setSelectedDomain] = useState('bodyFunctions');
  const [showGoalLinker, setShowGoalLinker] = useState(false);
  const [showProgressChart, setShowProgressChart] = useState(false);
  const [linkedGoals, setLinkedGoals] = useState({});
  
  const {
    assessment,
    scores,
    loading,
    error,
    updateScore,
    saveAssessment,
    submitAssessment,
    calculateDomainScore,
    calculateOverallScore,
    getProgressData,
    validateAssessment,
  } = useICFAssessment({
    beneficiaryId,
    assessmentId,
    initialData,
    coreSetType,
  });

  const domains = useMemo(() => [
    'bodyFunctions',
    'bodyStructures', 
    'activitiesAndParticipation',
    'environmentalFactors',
    'personalFactors',
  ], []);

  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
    setSelectedDomain(domains[newValue]);
  }, [domains]);

  const handleScoreChange = useCallback((code, qualifier, value) => {
    updateScore(code, qualifier, value);
  }, [updateScore]);

  const handleGoalLink = useCallback((code, goalId) => {
    setLinkedGoals(prev => ({
      ...prev,
      [code]: [...(prev[code] || []), goalId],
    }));
  }, []);

  const handleGoalUnlink = useCallback((code, goalId) => {
    setLinkedGoals(prev => ({
      ...prev,
      [code]: (prev[code] || []).filter(id => id !== goalId),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    const result = await saveAssessment();
    if (result.success && onSave) {
      onSave(result.data);
    }
  }, [saveAssessment, onSave]);

  const handleSubmit = useCallback(async () => {
    const validation = validateAssessment();
    if (!validation.isValid) {
      // Show validation errors
      return;
    }
    
    const result = await submitAssessment();
    if (result.success && onSubmit) {
      onSubmit(result.data);
    }
  }, [submitAssessment, validateAssessment, onSubmit]);

  const handleNextStep = useCallback(() => {
    setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, []);

  const handleBackStep = useCallback(() => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const domainScore = useMemo(() => 
    calculateDomainScore(selectedDomain),
    [calculateDomainScore, selectedDomain]
  );

  const overallScore = useMemo(() => 
    calculateOverallScore(),
    [calculateOverallScore]
  );

  const progressData = useMemo(() => 
    getProgressData(),
    [getProgressData]
  );

  const getScoreColor = (score) => {
    if (score <= 1) return 'success';
    if (score <= 2) return 'warning';
    if (score <= 3) return 'error';
    return 'error';
  };

  const getScoreLabel = (score) => {
    if (score === 0) return 'لا إعاقة';
    if (score === 1) return 'خفيف';
    if (score === 2) return 'متوسط';
    if (score === 3) return 'شديد';
    if (score === 4) return 'شديد جداً';
    return 'غير محدد';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              تقييم ICF-CY
            </Typography>
            <Typography variant="body1" color="text.secondary">
              التصنيف الدولي للأداء الوظيفي والإعاقة للأطفال والشباب
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Tooltip title="حفظ التقييم">
                <IconButton 
                  color="primary" 
                  onClick={handleSave}
                  disabled={readOnly}
                >
                  <SaveIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="طباعة التقييم">
                <IconButton color="primary">
                  <PrintIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="عرض التقدم">
                <IconButton 
                  color="primary" 
                  onClick={() => setShowProgressChart(!showProgressChart)}
                >
                  <TrendingUpIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>

        {/* Overall Score */}
        <Box mt={3} p={2} bgcolor="background.paper" borderRadius={2}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant="h6">النتيجة الإجمالية</Typography>
              <Typography variant="body2" color="text.secondary">
                متوسط درجات جميع المجالات
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h3" fontWeight="bold" color={getScoreColor(overallScore)}>
                  {overallScore.toFixed(1)}
                </Typography>
                <Chip 
                  label={getScoreLabel(Math.round(overallScore))}
                  color={getScoreColor(overallScore)}
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" justifyContent="flex-end" gap={1}>
                {domains.map((domain, index) => (
                  <Tooltip key={domain} title={DOMAIN_LABELS[domain]}>
                    <Badge 
                      badgeContent={calculateDomainScore(domain).toFixed(1)}
                      color={getScoreColor(Math.round(calculateDomainScore(domain)))}
                    >
                      <IconButton size="small" color={activeTab === index ? 'primary' : 'default'}>
                        {DOMAIN_ICONS[domain]}
                      </IconButton>
                    </Badge>
                  </Tooltip>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Progress Chart */}
      <AnimatePresence>
        {showProgressChart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
              <ICFProgressChart data={progressData} />
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stepper */}
      <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 3 }}>
        {STEPS.map((step, index) => (
          <Step key={step.label}>
            <StepLabel
              optional={
                index === STEPS.length - 1 ? (
                  <Typography variant="caption">آخر خطوة</Typography>
                ) : null
              }
            >
              {step.label}
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {step.description}
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleNextStep}
                  sx={{ mt: 1, mr: 1 }}
                >
                  {index === STEPS.length - 1 ? 'إنهاء' : 'التالي'}
                </Button>
                <Button
                  disabled={index === 0}
                  onClick={handleBackStep}
                  sx={{ mt: 1, mr: 1 }}
                >
                  السابق
                </Button>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {/* Domain Tabs */}
      <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {domains.map((domain, index) => (
            <Tab
              key={domain}
              icon={DOMAIN_ICONS[domain]}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  {DOMAIN_LABELS[domain]}
                  <Chip
                    label={calculateDomainScore(domain).toFixed(1)}
                    color={getScoreColor(Math.round(calculateDomainScore(domain)))}
                    size="small"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Box>
              }
              iconPosition="start"
            />
          ))}
        </Tabs>

        {/* Domain Content */}
        <Box p={3}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                  {DOMAIN_LABELS[selectedDomain]}
                </Typography>
                <Box display="flex" gap={1}>
                  <Tooltip title="ربط الأهداف">
                    <Button
                      variant="outlined"
                      startIcon={<LinkIcon />}
                      onClick={() => setShowGoalLinker(!showGoalLinker)}
                      disabled={readOnly}
                    >
                      ربط الأهداف
                    </Button>
                  </Tooltip>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <ICFDomainSelector
                domain={selectedDomain}
                coreSetType={coreSetType}
                scores={scores}
                onScoreChange={handleScoreChange}
                readOnly={readOnly}
              />

              {/* Goal Linker */}
              <AnimatePresence>
                {showGoalLinker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Box mt={3} p={3} bgcolor="background.paper" borderRadius={2}>
                      <Typography variant="h6" gutterBottom>
                        <LinkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        ربط الأهداف بالأكواد
                      </Typography>
                      <ICFGoalLinker
                        domain={selectedDomain}
                        linkedGoals={linkedGoals}
                        onLink={handleGoalLink}
                        onUnlink={handleGoalUnlink}
                      />
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box mt={3} display="flex" justifyContent="space-between">
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleBackStep}
          disabled={activeStep === 0}
        >
          السابق
        </Button>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={readOnly}
          >
            حفظ
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={handleSubmit}
            disabled={readOnly}
          >
            إرسال التقييم
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ICFForm;
