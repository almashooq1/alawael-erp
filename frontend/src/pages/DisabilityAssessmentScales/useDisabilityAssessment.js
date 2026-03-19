import { useState, useEffect, useCallback } from 'react';
import assessmentService from 'services/assessmentService';
import logger from 'utils/logger';
import { neutralColors } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

/**
 * Custom hook encapsulating all state, data-fetching, handlers and helpers
 * for the Disability Assessment Scales page.
 */
const useDisabilityAssessment = () => {
  const [scales] = useState(assessmentService.getScales());
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [scaleResults, setScaleResults] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [assessDialog, setAssessDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [batchDialog, setBatchDialog] = useState(false);
  const [progressDialog, setProgressDialog] = useState(false);
  const [recommendedDialog, setRecommendedDialog] = useState(false);

  // Form states
  const [selectedScale, setSelectedScale] = useState(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [domainScores, setDomainScores] = useState({});
  const [assessorNotes, setAssessorNotes] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [filterScale, setFilterScale] = useState('');
  const [filterBeneficiary, setFilterBeneficiary] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const showSnackbar = useSnackbar();

  /* ── Load data ── */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resultsRes, statsRes, beneficiariesRes] = await Promise.all([
        assessmentService.getScaleResults(),
        assessmentService.getStatistics(),
        assessmentService.getBeneficiaries(),
      ]);
      setScaleResults(resultsRes?.data || []);
      setStatistics(statsRes?.data || null);
      if (Array.isArray(beneficiariesRes)) setBeneficiaries(beneficiariesRes);
    } catch (error) {
      logger.error('Error loading assessment data:', error);
      showSnackbar('خطأ في تحميل بيانات التقييم', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Handlers ── */

  const handleOpenAssessment = scale => {
    setSelectedScale(scale);
    const initialScores = {};
    scale.domains.forEach(d => {
      initialScores[d.key] = 0;
    });
    setDomainScores(initialScores);
    setSelectedBeneficiary('');
    setAssessorNotes('');
    setAssessDialog(true);
  };

  const handleCloseAssessment = () => {
    setAssessDialog(false);
    setSelectedScale(null);
  };

  const handleDomainScoreChange = (domainKey, value) => {
    setDomainScores(prev => ({ ...prev, [domainKey]: value }));
  };

  const handleSubmitAssessment = async () => {
    if (!selectedBeneficiary || !selectedScale) {
      showSnackbar('يرجى اختيار المستفيد والمقياس', 'warning');
      return;
    }
    setSubmitLoading(true);

    const totalScore = Object.values(domainScores).reduce((sum, v) => sum + v, 0);
    const beneficiary = beneficiaries.find(b => b.id === selectedBeneficiary);
    const interpretation = selectedScale.interpretation.find(
      i => totalScore >= i.min && totalScore <= i.max
    );

    const payload = {
      beneficiaryId: selectedBeneficiary,
      beneficiaryName: beneficiary?.name || '',
      scaleId: selectedScale.id,
      scaleName: selectedScale.name,
      domainScores,
      totalScore,
      maxScore: selectedScale.maxScore,
      percentage: Math.round((totalScore / selectedScale.maxScore) * 100),
      level: interpretation?.label || '',
      levelColor: interpretation?.color || neutralColors.textDisabled,
      notes: assessorNotes,
      date: new Date().toISOString().split('T')[0],
      assessorName: 'المقيّم الحالي',
    };

    try {
      await assessmentService.submitScaleResult(payload);
      showSnackbar('تم حفظ نتيجة التقييم بنجاح', 'success');
      handleCloseAssessment();
      loadData();
    } catch (error) {
      logger.error('Error submitting assessment:', error);
      showSnackbar('خطأ في حفظ نتيجة التقييم', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenHistory = () => setHistoryDialog(true);
  const handleCloseHistory = () => setHistoryDialog(false);
  const handleOpenDetail = result => {
    setSelectedResult(result);
    setDetailDialog(true);
  };
  const handleCloseDetail = () => {
    setDetailDialog(false);
    setSelectedResult(null);
  };

  const handleOpenBatch = () => setBatchDialog(true);
  const handleCloseBatch = () => setBatchDialog(false);
  const handleOpenProgress = () => setProgressDialog(true);
  const handleCloseProgress = () => setProgressDialog(false);
  const handleOpenRecommended = () => setRecommendedDialog(true);
  const handleCloseRecommended = () => setRecommendedDialog(false);

  /* ── Helpers ── */

  const getTotalScore = () => Object.values(domainScores).reduce((sum, v) => sum + v, 0);

  const getInterpretation = (scale, score) =>
    scale?.interpretation?.find(i => score >= i.min && score <= i.max);

  const filteredResults = scaleResults.filter(r => {
    if (filterScale && r.scaleId !== filterScale) return false;
    if (filterBeneficiary && r.beneficiaryId !== filterBeneficiary) return false;
    return true;
  });

  return {
    // Data
    scales,
    beneficiaries,
    scaleResults,
    statistics,
    loading,
    tabValue,
    setTabValue,
    // Dialog flags
    assessDialog,
    historyDialog,
    detailDialog,
    batchDialog,
    progressDialog,
    recommendedDialog,
    // Form state
    selectedScale,
    selectedBeneficiary,
    setSelectedBeneficiary,
    domainScores,
    assessorNotes,
    setAssessorNotes,
    selectedResult,
    filterScale,
    setFilterScale,
    filterBeneficiary,
    setFilterBeneficiary,
    submitLoading,
    // Handlers
    handleOpenAssessment,
    handleCloseAssessment,
    handleDomainScoreChange,
    handleSubmitAssessment,
    handleOpenHistory,
    handleCloseHistory,
    handleOpenDetail,
    handleCloseDetail,
    handleOpenBatch,
    handleCloseBatch,
    handleOpenProgress,
    handleCloseProgress,
    handleOpenRecommended,
    handleCloseRecommended,
    // Helpers
    getTotalScore,
    getInterpretation,
    filteredResults,
    showSnackbar,
    loadData,
  };
};

export default useDisabilityAssessment;
