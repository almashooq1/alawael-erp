/**
 * Disability Assessment Scales Page — Orchestrator
 * صفحة مقاييس التقييم لذوي الإعاقة
 *
 * Displays 22 assessment scales, allows conducting scale assessments,
 * batch assessments, progress tracking, recommended scales,
 * analytics/comparison, and viewing historical results with domain-level scoring.
 */

import useDisabilityAssessment from './useDisabilityAssessment';
import { Container, LinearProgress, Typography } from '@mui/material';

const DisabilityAssessmentScales = () => {
  const state = useDisabilityAssessment();

  if (state.loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>
          جاري تحميل بيانات المقاييس...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PageHeader
        statistics={state.statistics}
        tabValue={state.tabValue}
        onTabChange={state.setTabValue}
        onOpenHistory={state.handleOpenHistory}
        onOpenBatch={state.handleOpenBatch}
        onOpenProgress={state.handleOpenProgress}
        onOpenRecommended={state.handleOpenRecommended}
      />

      <ScaleCardsTab
        tabValue={state.tabValue}
        scales={state.scales}
        onOpenAssessment={state.handleOpenAssessment}
      />

      <RecentResultsTab
        tabValue={state.tabValue}
        scales={state.scales}
        scaleResults={state.scaleResults}
        onOpenDetail={state.handleOpenDetail}
      />

      <AnalyticsTab
        tabValue={state.tabValue}
        scales={state.scales}
        beneficiaries={state.beneficiaries}
      />

      <AssessmentDialog
        open={state.assessDialog}
        selectedScale={state.selectedScale}
        beneficiaries={state.beneficiaries}
        selectedBeneficiary={state.selectedBeneficiary}
        domainScores={state.domainScores}
        assessorNotes={state.assessorNotes}
        submitLoading={state.submitLoading}
        getTotalScore={state.getTotalScore}
        getInterpretation={state.getInterpretation}
        onClose={state.handleCloseAssessment}
        onBeneficiaryChange={state.setSelectedBeneficiary}
        onDomainScoreChange={state.handleDomainScoreChange}
        onNotesChange={state.setAssessorNotes}
        onSubmit={state.handleSubmitAssessment}
      />

      <HistoryDialog
        open={state.historyDialog}
        scales={state.scales}
        beneficiaries={state.beneficiaries}
        filteredResults={state.filteredResults}
        filterScale={state.filterScale}
        filterBeneficiary={state.filterBeneficiary}
        onFilterScaleChange={state.setFilterScale}
        onFilterBeneficiaryChange={state.setFilterBeneficiary}
        onClose={state.handleCloseHistory}
        onOpenDetail={state.handleOpenDetail}
      />

      <DetailDialog
        open={state.detailDialog}
        selectedResult={state.selectedResult}
        scales={state.scales}
        onClose={state.handleCloseDetail}
      />

      <BatchAssessmentDialog
        open={state.batchDialog}
        onClose={state.handleCloseBatch}
        scales={state.scales}
        beneficiaries={state.beneficiaries}
        onSuccess={state.loadData}
        showSnackbar={state.showSnackbar}
      />

      <ProgressDialog
        open={state.progressDialog}
        onClose={state.handleCloseProgress}
        scales={state.scales}
        beneficiaries={state.beneficiaries}
      />

      <RecommendedScalesDialog
        open={state.recommendedDialog}
        onClose={state.handleCloseRecommended}
        scales={state.scales}
        onOpenAssessment={state.handleOpenAssessment}
      />
    </Container>
  );
};

export default DisabilityAssessmentScales;
