/**
 * Disability Assessment Tests Page (Orchestrator)
 * صفحة اختبارات التقييم لذوي الإعاقة
 *
 * Displays the 3 assessment tools (social development, daily living skills,
 * adaptive behavior), allows conducting tests with item-level scoring,
 * viewing results and tracking progress.
 */

import { gradients } from '../../theme/palette';
import useAssessmentTests from './useAssessmentTests';
import {
  Box,
  Button,
  Container,
  LinearProgress,
  Paper,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import HistoryIcon from '@mui/icons-material/History';

const DisabilityAssessmentTests = () => {
  const h = useAssessmentTests();

  if (h.loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>جاري تحميل بيانات الاختبارات...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssignmentIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>اختبارات تقييم الإعاقة</Typography>
            <Typography variant="body2">إدارة اختبارات ومقاييس تقييم الإعاقة</Typography>
          </Box>
        </Box>
      </Box>

      {/* Sub-header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            <QuizIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            اختبارات التقييم لذوي الإعاقة
          </Typography>
          <Typography variant="body1" color="text.secondary">
            تطبيق اختبارات تفصيلية لتقييم المهارات والقدرات في مجالات متعددة
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<HistoryIcon />} onClick={h.handleOpenHistory}>
          سجل الاختبارات
        </Button>
      </Box>

      {h.statistics && <StatisticsCards statistics={h.statistics} />}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={h.tabValue} onChange={(_, v) => h.setTabValue(v)} variant="fullWidth">
          <Tab icon={<QuizIcon />} label="الاختبارات المتاحة" />
          <Tab icon={<HistoryIcon />} label="آخر النتائج" />
        </Tabs>
      </Paper>

      <TabPanel value={h.tabValue} index={0}>
        <TestCards tests={h.tests} onOpenTest={h.handleOpenTest} />
      </TabPanel>

      <TabPanel value={h.tabValue} index={1}>
        <RecentResults testResults={h.testResults} onOpenDetail={h.handleOpenDetail} />
      </TabPanel>

      <TestWizardDialog
        open={h.testDialog}
        onClose={h.handleCloseTest}
        selectedTest={h.selectedTest}
        beneficiaries={h.beneficiaries}
        selectedBeneficiary={h.selectedBeneficiary}
        onSelectBeneficiary={h.setSelectedBeneficiary}
        activeStep={h.activeStep}
        answers={h.answers}
        assessorNotes={h.assessorNotes}
        onNotesChange={h.setAssessorNotes}
        submitLoading={h.submitLoading}
        onAnswer={h.handleAnswer}
        onNext={h.handleNext}
        onBack={h.handleBack}
        onSubmit={h.handleSubmitTest}
        isStepComplete={h.isStepComplete}
        getStepperSteps={h.getStepperSteps}
      />

      <HistoryDialog
        open={h.historyDialog}
        onClose={h.handleCloseHistory}
        tests={h.tests}
        beneficiaries={h.beneficiaries}
        filteredResults={h.filteredResults}
        filterTest={h.filterTest}
        onFilterTest={h.setFilterTest}
        filterBeneficiary={h.filterBeneficiary}
        onFilterBeneficiary={h.setFilterBeneficiary}
        onRowClick={(r) => { h.handleCloseHistory(); h.handleOpenDetail(r); }}
      />

      <DetailDialog
        open={h.detailDialog}
        onClose={h.handleCloseDetail}
        selectedResult={h.selectedResult}
        tests={h.tests}
      />
    </Container>
  );
};

export default DisabilityAssessmentTests;
