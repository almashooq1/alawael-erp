/**
 * Enterprise Ultra Service — خدمة المؤسسة الفائقة
 *
 * API methods for 6 Enterprise Ultra modules:
 *   1. Legal & CLM
 *   2. Corporate Governance
 *   3. Business Continuity
 *   4. Customer Experience
 *   5. Sustainability / ESG
 *   6. Digital Transformation
 */
import api from './api';

const EU = '/enterprise-ultra';

// ═══════════════ 1. LEGAL & CLM ═══════════════
export const getLegalCases = () => api.get(`${EU}/legal/cases`);
export const createLegalCase = data => api.post(`${EU}/legal/cases`, data);
export const getLegalCase = id => api.get(`${EU}/legal/cases/${id}`);
export const updateLegalCase = (id, data) => api.put(`${EU}/legal/cases/${id}`, data);
export const updateLegalCaseStatus = (id, status) =>
  api.patch(`${EU}/legal/cases/${id}/status`, { status });
export const getLegalDashboard = () => api.get(`${EU}/legal/cases/dashboard/stats`);

export const getCourtHearings = () => api.get(`${EU}/legal/hearings`);
export const createCourtHearing = data => api.post(`${EU}/legal/hearings`, data);
export const updateCourtHearing = (id, data) => api.put(`${EU}/legal/hearings/${id}`, data);

export const getPowerOfAttorneys = () => api.get(`${EU}/legal/poa`);
export const createPowerOfAttorney = data => api.post(`${EU}/legal/poa`, data);
export const updatePowerOfAttorney = (id, data) => api.put(`${EU}/legal/poa/${id}`, data);
export const revokePowerOfAttorney = id => api.patch(`${EU}/legal/poa/${id}/revoke`);

export const getLegalOpinions = () => api.get(`${EU}/legal/opinions`);
export const createLegalOpinion = data => api.post(`${EU}/legal/opinions`, data);
export const updateLegalOpinion = (id, data) => api.put(`${EU}/legal/opinions/${id}`, data);
export const deliverLegalOpinion = id => api.patch(`${EU}/legal/opinions/${id}/deliver`);

export const getRegulatoryFilings = () => api.get(`${EU}/legal/filings`);
export const createRegulatoryFiling = data => api.post(`${EU}/legal/filings`, data);
export const updateRegulatoryFiling = (id, data) => api.put(`${EU}/legal/filings/${id}`, data);
export const getOverdueFilings = () => api.get(`${EU}/legal/filings/overdue`);

// ═══════════════ 2. CORPORATE GOVERNANCE ═══════════════
export const getBoardMeetings = () => api.get(`${EU}/governance/meetings`);
export const createBoardMeeting = data => api.post(`${EU}/governance/meetings`, data);
export const getBoardMeeting = id => api.get(`${EU}/governance/meetings/${id}`);
export const updateBoardMeeting = (id, data) => api.put(`${EU}/governance/meetings/${id}`, data);
export const completeBoardMeeting = (id, data) =>
  api.patch(`${EU}/governance/meetings/${id}/complete`, data);

export const getBoardCommittees = () => api.get(`${EU}/governance/committees`);
export const createBoardCommittee = data => api.post(`${EU}/governance/committees`, data);
export const updateBoardCommittee = (id, data) =>
  api.put(`${EU}/governance/committees/${id}`, data);

export const getBoardResolutions = () => api.get(`${EU}/governance/resolutions`);
export const createBoardResolution = data => api.post(`${EU}/governance/resolutions`, data);
export const updateBoardResolution = (id, data) =>
  api.put(`${EU}/governance/resolutions/${id}`, data);
export const voteBoardResolution = (id, vote) =>
  api.patch(`${EU}/governance/resolutions/${id}/vote`, { vote });
export const implementResolution = (id, status) =>
  api.patch(`${EU}/governance/resolutions/${id}/implement`, { status });

export const getGovernancePolicies = () => api.get(`${EU}/governance/policies`);
export const createGovernancePolicy = data => api.post(`${EU}/governance/policies`, data);
export const updateGovernancePolicy = (id, data) =>
  api.put(`${EU}/governance/policies/${id}`, data);
export const acknowledgePolicy = id => api.post(`${EU}/governance/policies/${id}/acknowledge`);

export const getGovernanceReports = () => api.get(`${EU}/governance/reports`);
export const createGovernanceReport = data => api.post(`${EU}/governance/reports`, data);
export const getGovernanceDashboard = () => api.get(`${EU}/governance/dashboard/stats`);

// ═══════════════ 3. BUSINESS CONTINUITY ═══════════════
export const getBCPPlans = () => api.get(`${EU}/bcp/plans`);
export const createBCPPlan = data => api.post(`${EU}/bcp/plans`, data);
export const getBCPPlan = id => api.get(`${EU}/bcp/plans/${id}`);
export const updateBCPPlan = (id, data) => api.put(`${EU}/bcp/plans/${id}`, data);
export const activateBCPPlan = id => api.patch(`${EU}/bcp/plans/${id}/activate`);

export const getBIAs = () => api.get(`${EU}/bcp/bia`);
export const createBIA = data => api.post(`${EU}/bcp/bia`, data);
export const updateBIA = (id, data) => api.put(`${EU}/bcp/bia/${id}`, data);

export const getCrisisIncidents = () => api.get(`${EU}/bcp/crises`);
export const createCrisisIncident = data => api.post(`${EU}/bcp/crises`, data);
export const getCrisisIncident = id => api.get(`${EU}/bcp/crises/${id}`);
export const updateCrisisIncident = (id, data) => api.put(`${EU}/bcp/crises/${id}`, data);
export const escalateCrisis = (id, data) => api.patch(`${EU}/bcp/crises/${id}/escalate`, data);
export const resolveCrisis = (id, data) => api.patch(`${EU}/bcp/crises/${id}/resolve`, data);

export const getBCDrills = () => api.get(`${EU}/bcp/drills`);
export const createBCDrill = data => api.post(`${EU}/bcp/drills`, data);
export const updateBCDrill = (id, data) => api.put(`${EU}/bcp/drills/${id}`, data);
export const scoreBCDrill = (id, score) => api.patch(`${EU}/bcp/drills/${id}/score`, { score });

export const getDRPs = () => api.get(`${EU}/bcp/drp`);
export const createDRP = data => api.post(`${EU}/bcp/drp`, data);
export const updateDRP = (id, data) => api.put(`${EU}/bcp/drp/${id}`, data);
export const getBCPDashboard = () => api.get(`${EU}/bcp/dashboard/stats`);

// Aliases used by BusinessContinuityPage
export const getBusinessImpactAnalyses = getBIAs;
export const createBusinessImpactAnalysis = createBIA;
export const getDisasterRecoveryPlans = getDRPs;
export const createDisasterRecoveryPlan = createDRP;

// ═══════════════ 4. CUSTOMER EXPERIENCE ═══════════════
export const getCXSurveys = () => api.get(`${EU}/cx/surveys`);
export const createCXSurvey = data => api.post(`${EU}/cx/surveys`, data);
export const getCXSurvey = id => api.get(`${EU}/cx/surveys/${id}`);
export const updateCXSurvey = (id, data) => api.put(`${EU}/cx/surveys/${id}`, data);
export const activateCXSurvey = id => api.patch(`${EU}/cx/surveys/${id}/activate`);

export const getCXFeedback = () => api.get(`${EU}/cx/feedback`);
export const createCXFeedback = data => api.post(`${EU}/cx/feedback`, data);
export const updateCXFeedback = (id, data) => api.put(`${EU}/cx/feedback/${id}`, data);
export const getCXFeedbackAnalytics = () => api.get(`${EU}/cx/feedback/analytics`);

export const getCXComplaints = () => api.get(`${EU}/cx/complaints`);
export const createCXComplaint = data => api.post(`${EU}/cx/complaints`, data);
export const updateCXComplaint = (id, data) => api.put(`${EU}/cx/complaints/${id}`, data);
export const escalateCXComplaint = (id, data) =>
  api.patch(`${EU}/cx/complaints/${id}/escalate`, data);
export const resolveCXComplaint = (id, resolution) =>
  api.patch(`${EU}/cx/complaints/${id}/resolve`, { resolution });

export const getCustomerJourneys = () => api.get(`${EU}/cx/journeys`);
export const createCustomerJourney = data => api.post(`${EU}/cx/journeys`, data);
export const updateCustomerJourney = (id, data) => api.put(`${EU}/cx/journeys/${id}`, data);

export const getServiceBenchmarks = () => api.get(`${EU}/cx/benchmarks`);
export const createServiceBenchmark = data => api.post(`${EU}/cx/benchmarks`, data);
export const updateServiceBenchmark = (id, data) => api.put(`${EU}/cx/benchmarks/${id}`, data);
export const getCXDashboard = () => api.get(`${EU}/cx/dashboard/stats`);

// ═══════════════ 5. SUSTAINABILITY / ESG ═══════════════
export const getEnergyReadings = () => api.get(`${EU}/sustainability/energy`);
export const createEnergyReading = data => api.post(`${EU}/sustainability/energy`, data);
export const updateEnergyReading = (id, data) => api.put(`${EU}/sustainability/energy/${id}`, data);
export const getEnergySummary = () => api.get(`${EU}/sustainability/energy/summary`);

export const getCarbonFootprints = () => api.get(`${EU}/sustainability/carbon`);
export const createCarbonFootprint = data => api.post(`${EU}/sustainability/carbon`, data);
export const updateCarbonFootprint = (id, data) =>
  api.put(`${EU}/sustainability/carbon/${id}`, data);

export const getWasteRecords = () => api.get(`${EU}/sustainability/waste`);
export const createWasteRecord = data => api.post(`${EU}/sustainability/waste`, data);
export const updateWasteRecord = (id, data) => api.put(`${EU}/sustainability/waste/${id}`, data);
export const getWasteSummary = () => api.get(`${EU}/sustainability/waste/summary`);

export const getESGReports = () => api.get(`${EU}/sustainability/esg`);
export const createESGReport = data => api.post(`${EU}/sustainability/esg`, data);
export const updateESGReport = (id, data) => api.put(`${EU}/sustainability/esg/${id}`, data);

export const getSustainabilityGoals = () => api.get(`${EU}/sustainability/goals`);
export const createSustainabilityGoal = data => api.post(`${EU}/sustainability/goals`, data);
export const updateSustainabilityGoal = (id, data) =>
  api.put(`${EU}/sustainability/goals/${id}`, data);
export const updateGoalProgress = (id, value, progress) =>
  api.patch(`${EU}/sustainability/goals/${id}/progress`, { value, progress });
export const getSustainabilityDashboard = () => api.get(`${EU}/sustainability/dashboard/stats`);

// ═══════════════ 6. DIGITAL TRANSFORMATION ═══════════════
export const getMaturityAssessments = () => api.get(`${EU}/dt/assessments`);
export const createMaturityAssessment = data => api.post(`${EU}/dt/assessments`, data);
export const getMaturityAssessment = id => api.get(`${EU}/dt/assessments/${id}`);
export const updateMaturityAssessment = (id, data) => api.put(`${EU}/dt/assessments/${id}`, data);

export const getInnovationIdeas = () => api.get(`${EU}/dt/ideas`);
export const createInnovationIdea = data => api.post(`${EU}/dt/ideas`, data);
export const updateInnovationIdea = (id, data) => api.put(`${EU}/dt/ideas/${id}`, data);
export const voteInnovationIdea = (id, direction) =>
  api.post(`${EU}/dt/ideas/${id}/vote`, { direction });
export const updateIdeaStatus = (id, status) =>
  api.patch(`${EU}/dt/ideas/${id}/status`, { status });

export const getInnovationProjects = () => api.get(`${EU}/dt/projects`);
export const createInnovationProject = data => api.post(`${EU}/dt/projects`, data);
export const getInnovationProject = id => api.get(`${EU}/dt/projects/${id}`);
export const updateInnovationProject = (id, data) => api.put(`${EU}/dt/projects/${id}`, data);
export const updateProjectStage = (id, stage, status) =>
  api.patch(`${EU}/dt/projects/${id}/stage`, { stage, status });

export const getTechRadar = () => api.get(`${EU}/dt/radar`);
export const createTechRadarEntry = data => api.post(`${EU}/dt/radar`, data);
export const updateTechRadarEntry = (id, data) => api.put(`${EU}/dt/radar/${id}`, data);
export const moveTechRadarEntry = (id, quadrant) =>
  api.patch(`${EU}/dt/radar/${id}/move`, { quadrant });

export const getTransformationKPIs = () => api.get(`${EU}/dt/kpis`);
export const createTransformationKPI = data => api.post(`${EU}/dt/kpis`, data);
export const updateTransformationKPI = (id, data) => api.put(`${EU}/dt/kpis/${id}`, data);
export const updateKPIValue = (id, actual, trend) =>
  api.patch(`${EU}/dt/kpis/${id}/update-value`, { actual, trend });
export const getDTDashboard = () => api.get(`${EU}/dt/dashboard/stats`);

// Alias used by DigitalTransformationPage
export const getTechRadarEntries = getTechRadar;
