/**
 * DisabilityAssessmentTests – custom hook
 * All state, data loading, and handlers for the tests page.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import assessmentService from '../../services/assessmentService';
import logger from '../../utils/logger';
import { useSnackbar } from '../../contexts/SnackbarContext';

const useAssessmentTests = () => {
  const showSnackbar = useSnackbar();

  /* ── Core data ── */
  const [tests] = useState(assessmentService.getTests());
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  /* ── Dialog states ── */
  const [testDialog, setTestDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);

  /* ── Test wizard states ── */
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [assessorNotes, setAssessorNotes] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  /* ── View/filter states ── */
  const [selectedResult, setSelectedResult] = useState(null);
  const [filterTest, setFilterTest] = useState('');
  const [filterBeneficiary, setFilterBeneficiary] = useState('');

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resultsRes, statsRes, beneficiariesRes] = await Promise.all([
        assessmentService.getTestResults(),
        assessmentService.getStatistics(),
        assessmentService.getBeneficiaries(),
      ]);
      setTestResults(resultsRes?.data || []);
      setStatistics(statsRes?.data || null);
      if (Array.isArray(beneficiariesRes)) setBeneficiaries(beneficiariesRes);
    } catch (error) {
      logger.error('Error loading test data:', error);
      showSnackbar('خطأ في تحميل بيانات الاختبارات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Test wizard handlers ── */
  const handleOpenTest = test => {
    setSelectedTest(test);
    setActiveStep(0);
    setSelectedBeneficiary('');
    setAssessorNotes('');
    const initial = {};
    test.categories.forEach(cat => {
      initial[cat.key] = {};
      cat.items.forEach(item => {
        initial[cat.key][item.key] = -1;
      });
    });
    setAnswers(initial);
    setTestDialog(true);
  };

  const handleCloseTest = () => {
    setTestDialog(false);
    setSelectedTest(null);
  };

  const handleAnswer = (catKey, itemKey, value) => {
    setAnswers(prev => ({
      ...prev,
      [catKey]: { ...prev[catKey], [itemKey]: Number(value) },
    }));
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedBeneficiary) return;
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => setActiveStep(prev => prev - 1);

  const handleSubmitTest = async () => {
    if (!selectedBeneficiary || !selectedTest) {
      showSnackbar('يرجى اختيار المستفيد والاختبار', 'warning');
      return;
    }
    setSubmitLoading(true);

    const scores = {};
    let totalScore = 0;
    let totalItems = 0;
    let maxPossible = 0;

    selectedTest.categories.forEach(cat => {
      scores[cat.key] = {};
      cat.items.forEach(item => {
        const val = answers[cat.key]?.[item.key] ?? 0;
        const score = val >= 0 ? val : 0;
        scores[cat.key][item.key] = score;
        totalScore += score;
        totalItems += 1;
        maxPossible += item.levels.length - 1;
      });
    });

    const percentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
    const beneficiary = beneficiaries.find(b => b.id === selectedBeneficiary);

    let overallLevel = 'ضعيف جداً';
    if (percentage >= 75) overallLevel = 'ممتاز';
    else if (percentage >= 50) overallLevel = 'جيد';
    else if (percentage >= 25) overallLevel = 'متوسط';
    else if (percentage > 0) overallLevel = 'ضعيف';

    const payload = {
      beneficiaryId: selectedBeneficiary,
      beneficiaryName: beneficiary?.name || '',
      testId: selectedTest.id,
      testName: selectedTest.name,
      scores,
      totalItems,
      totalScore,
      maxPossible,
      percentage,
      overallLevel,
      notes: assessorNotes,
      date: new Date().toISOString().split('T')[0],
      assessorName: 'المقيّم الحالي',
      status: 'completed',
    };

    try {
      await assessmentService.submitTestResult(payload);
      showSnackbar('تم حفظ نتيجة الاختبار بنجاح', 'success');
      handleCloseTest();
      loadData();
    } catch (error) {
      logger.error('Error submitting test result:', error);
      showSnackbar('خطأ في حفظ نتيجة الاختبار', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  /* ── View handlers ── */
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

  /* ── Derived / helpers ── */
  const filteredResults = useMemo(
    () =>
      testResults.filter(r => {
        if (filterTest && r.testId !== filterTest) return false;
        if (filterBeneficiary && r.beneficiaryId !== filterBeneficiary) return false;
        return true;
      }),
    [testResults, filterTest, filterBeneficiary]
  );

  const isStepComplete = stepIdx => {
    if (stepIdx === 0) return !!selectedBeneficiary;
    if (!selectedTest) return false;
    const cat = selectedTest.categories[stepIdx - 1];
    if (!cat) return false;
    return cat.items.every(item => answers[cat.key]?.[item.key] >= 0);
  };

  const getStepperSteps = () => {
    if (!selectedTest) return [];
    return ['اختيار المستفيد', ...selectedTest.categories.map(c => c.name), 'المراجعة والإرسال'];
  };

  return {
    /* data */
    tests,
    beneficiaries,
    testResults,
    statistics,
    loading,
    tabValue,
    setTabValue,
    /* dialogs */
    testDialog,
    historyDialog,
    detailDialog,
    /* wizard */
    selectedTest,
    selectedBeneficiary,
    setSelectedBeneficiary,
    activeStep,
    answers,
    assessorNotes,
    setAssessorNotes,
    submitLoading,
    /* view */
    selectedResult,
    filterTest,
    setFilterTest,
    filterBeneficiary,
    setFilterBeneficiary,
    /* handlers */
    handleOpenTest,
    handleCloseTest,
    handleAnswer,
    handleNext,
    handleBack,
    handleSubmitTest,
    handleOpenHistory,
    handleCloseHistory,
    handleOpenDetail,
    handleCloseDetail,
    /* derived */
    filteredResults,
    isStepComplete,
    getStepperSteps,
  };
};

export default useAssessmentTests;
