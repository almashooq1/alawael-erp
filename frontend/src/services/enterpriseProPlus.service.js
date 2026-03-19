/**
 * Enterprise Pro Plus Service — خدمات الميزات المؤسسية الاحترافية المتقدمة
 *
 * Modules:
 *  1. Talent Acquisition & ATS
 *  2. Facility & Real Estate Management
 *  3. Vendor & Supplier Management
 *  4. IT Service Management (ITSM)
 *  5. EHS — Safety & Health
 *  6. Strategic Planning & OKR
 */

import api from './api';

const EP = '/enterprise-pro-plus';

// ─── 1. Talent Acquisition & ATS ──────────────────────────────────────────────

export const getJobPostings = params => api.get(`${EP}/talent/jobs`, { params });
export const createJobPosting = data => api.post(`${EP}/talent/jobs`, data);
export const getJobPosting = id => api.get(`${EP}/talent/jobs/${id}`);
export const updateJobPosting = (id, data) => api.put(`${EP}/talent/jobs/${id}`, data);
export const deleteJobPosting = id => api.delete(`${EP}/talent/jobs/${id}`);
export const getJobStatistics = () => api.get(`${EP}/talent/jobs/statistics/summary`);

export const getCandidates = params => api.get(`${EP}/talent/candidates`, { params });
export const createCandidate = data => api.post(`${EP}/talent/candidates`, data);
export const updateCandidate = (id, data) => api.put(`${EP}/talent/candidates/${id}`, data);

export const getApplications = params => api.get(`${EP}/talent/applications`, { params });
export const createApplication = data => api.post(`${EP}/talent/applications`, data);
export const updateApplicationStage = (id, stage) =>
  api.put(`${EP}/talent/applications/${id}/stage`, { stage });
export const getTalentPipeline = () => api.get(`${EP}/talent/pipeline`);

export const getInterviews = () => api.get(`${EP}/talent/interviews`);
export const createInterview = data => api.post(`${EP}/talent/interviews`, data);
export const updateInterview = (id, data) => api.put(`${EP}/talent/interviews/${id}`, data);

// ─── 2. Facility & Real Estate Management ─────────────────────────────────────

export const getFacilities = params => api.get(`${EP}/facilities`, { params });
export const createFacility = data => api.post(`${EP}/facilities`, data);
export const getFacility = id => api.get(`${EP}/facilities/${id}`);
export const updateFacility = (id, data) => api.put(`${EP}/facilities/${id}`, data);
export const deleteFacility = id => api.delete(`${EP}/facilities/${id}`);
export const getFacilityStatistics = () => api.get(`${EP}/facilities/statistics/summary`);

export const getSpaceBookings = params => api.get(`${EP}/facilities/bookings/list`, { params });
export const createSpaceBooking = data => api.post(`${EP}/facilities/bookings`, data);
export const updateSpaceBooking = (id, data) => api.put(`${EP}/facilities/bookings/${id}`, data);
export const deleteSpaceBooking = id => api.delete(`${EP}/facilities/bookings/${id}`);

export const getLeaseContracts = params => api.get(`${EP}/facilities/leases`, { params });
export const createLeaseContract = data => api.post(`${EP}/facilities/leases`, data);
export const updateLeaseContract = (id, data) => api.put(`${EP}/facilities/leases/${id}`, data);

export const getUtilityReadings = params => api.get(`${EP}/facilities/utilities`, { params });
export const createUtilityReading = data => api.post(`${EP}/facilities/utilities`, data);

// ─── 3. Vendor & Supplier Management ──────────────────────────────────────────

export const getVendors = params => api.get(`${EP}/vendors`, { params });
export const createVendor = data => api.post(`${EP}/vendors`, data);
export const getVendor = id => api.get(`${EP}/vendors/${id}`);
export const updateVendor = (id, data) => api.put(`${EP}/vendors/${id}`, data);
export const deleteVendor = id => api.delete(`${EP}/vendors/${id}`);
export const getVendorStatistics = () => api.get(`${EP}/vendors/statistics/summary`);

export const getRFQs = params => api.get(`${EP}/vendors/rfqs/list`, { params });
export const createRFQ = data => api.post(`${EP}/vendors/rfqs`, data);
export const updateRFQ = (id, data) => api.put(`${EP}/vendors/rfqs/${id}`, data);
export const awardRFQ = (id, vendorId) => api.put(`${EP}/vendors/rfqs/${id}/award`, { vendorId });

export const getVendorEvaluations = () => api.get(`${EP}/vendors/evaluations/list`);
export const createVendorEvaluation = data => api.post(`${EP}/vendors/evaluations`, data);

export const getPurchaseOrders = params => api.get(`${EP}/vendors/purchase-orders`, { params });
export const createPurchaseOrder = data => api.post(`${EP}/vendors/purchase-orders`, data);
export const getPurchaseOrder = id => api.get(`${EP}/vendors/purchase-orders/${id}`);
export const updatePurchaseOrderStatus = (id, data) =>
  api.put(`${EP}/vendors/purchase-orders/${id}`, data);

// ─── 4. IT Service Management (ITSM) ──────────────────────────────────────────

export const getITIncidents = params => api.get(`${EP}/itsm/incidents`, { params });
export const createITIncident = data => api.post(`${EP}/itsm/incidents`, data);
export const getITIncident = id => api.get(`${EP}/itsm/incidents/${id}`);
export const updateITIncident = (id, data) => api.put(`${EP}/itsm/incidents/${id}`, data);
export const addIncidentComment = (id, data) =>
  api.post(`${EP}/itsm/incidents/${id}/comments`, data);
export const resolveIncident = (id, resolution) =>
  api.put(`${EP}/itsm/incidents/${id}/resolve`, { resolution });
export const getITIncidentStats = () => api.get(`${EP}/itsm/incidents/statistics/summary`);

export const getITAssets = params => api.get(`${EP}/itsm/assets`, { params });
export const createITAsset = data => api.post(`${EP}/itsm/assets`, data);
export const updateITAsset = (id, data) => api.put(`${EP}/itsm/assets/${id}`, data);
export const deleteITAsset = id => api.delete(`${EP}/itsm/assets/${id}`);

export const getServiceCatalog = () => api.get(`${EP}/itsm/catalog`);
export const createServiceCatalogItem = data => api.post(`${EP}/itsm/catalog`, data);
export const updateServiceCatalogItem = (id, data) => api.put(`${EP}/itsm/catalog/${id}`, data);

export const getChangeRequests = params => api.get(`${EP}/itsm/changes`, { params });
export const createChangeRequest = data => api.post(`${EP}/itsm/changes`, data);
export const updateChangeRequest = (id, data) => api.put(`${EP}/itsm/changes/${id}`, data);
export const approveChangeRequest = (id, comments) =>
  api.put(`${EP}/itsm/changes/${id}/approve`, { comments });

// ITSM aliases used by ITSMPage
export const getITChangeRequests = getChangeRequests;
export const createITChangeRequest = createChangeRequest;
export const resolveITIncident = (id, data) => api.put(`${EP}/itsm/incidents/${id}/resolve`, data);
export const approveITChange = (id, data) => api.put(`${EP}/itsm/changes/${id}/approve`, data);
export const implementITChange = (id, data) => api.put(`${EP}/itsm/changes/${id}/implement`, data);
export const getSLAPolicies = () => api.get(`${EP}/itsm/sla-policies`);
export const createSLAPolicy = data => api.post(`${EP}/itsm/sla-policies`, data);

// ─── 5. EHS — Safety & Health ──────────────────────────────────────────────────

export const getSafetyIncidents = params => api.get(`${EP}/ehs/incidents`, { params });
export const createSafetyIncident = data => api.post(`${EP}/ehs/incidents`, data);
export const getSafetyIncident = id => api.get(`${EP}/ehs/incidents/${id}`);
export const updateSafetyIncident = (id, data) => api.put(`${EP}/ehs/incidents/${id}`, data);
export const getSafetyIncidentStats = () => api.get(`${EP}/ehs/incidents/statistics/summary`);

export const getSafetyInspections = params => api.get(`${EP}/ehs/inspections`, { params });
export const createSafetyInspection = data => api.post(`${EP}/ehs/inspections`, data);
export const updateSafetyInspection = (id, data) => api.put(`${EP}/ehs/inspections/${id}`, data);

export const getHazards = params => api.get(`${EP}/ehs/hazards`, { params });
export const createHazard = data => api.post(`${EP}/ehs/hazards`, data);
export const updateHazard = (id, data) => api.put(`${EP}/ehs/hazards/${id}`, data);

export const getPPERecords = params => api.get(`${EP}/ehs/ppe`, { params });
export const createPPERecord = data => api.post(`${EP}/ehs/ppe`, data);
export const updatePPERecord = (id, data) => api.put(`${EP}/ehs/ppe/${id}`, data);

// EHS aliases used by EHSSafetyPage
export const getEHSIncidents = getSafetyIncidents;
export const createEHSIncident = createSafetyIncident;
export const investigateEHSIncident = (id, data) =>
  api.put(`${EP}/ehs/incidents/${id}/investigate`, data);
export const getOSHADashboard = () => api.get(`${EP}/ehs/osha-dashboard`);
export const getEHSInspections = getSafetyInspections;
export const createEHSInspection = createSafetyInspection;
export const getSafetyTrainings = params => api.get(`${EP}/ehs/trainings`, { params });
export const createSafetyTraining = data => api.post(`${EP}/ehs/trainings`, data);
export const completeSafetyTraining = (id, data) =>
  api.put(`${EP}/ehs/trainings/${id}/complete`, data);
export const getRiskMatrix = () => api.get(`${EP}/ehs/hazards/risk-matrix`);

// ─── 6. Strategic Planning & OKR ──────────────────────────────────────────────

export const getStrategicObjectives = params => api.get(`${EP}/strategy/objectives`, { params });
export const createStrategicObjective = data => api.post(`${EP}/strategy/objectives`, data);
export const getStrategicObjective = id => api.get(`${EP}/strategy/objectives/${id}`);
export const updateStrategicObjective = (id, data) =>
  api.put(`${EP}/strategy/objectives/${id}`, data);
export const deleteStrategicObjective = id => api.delete(`${EP}/strategy/objectives/${id}`);
export const updateKeyResult = (objId, krIndex, data) =>
  api.put(`${EP}/strategy/objectives/${objId}/key-results/${krIndex}`, data);
export const getStrategyStats = () => api.get(`${EP}/strategy/objectives/statistics/summary`);

export const getStrategicInitiatives = params => api.get(`${EP}/strategy/initiatives`, { params });
export const createStrategicInitiative = data => api.post(`${EP}/strategy/initiatives`, data);
export const updateStrategicInitiative = (id, data) =>
  api.put(`${EP}/strategy/initiatives/${id}`, data);
export const deleteStrategicInitiative = id => api.delete(`${EP}/strategy/initiatives/${id}`);

export const getSWOTAnalyses = () => api.get(`${EP}/strategy/swot`);
export const createSWOTAnalysis = data => api.post(`${EP}/strategy/swot`, data);
export const updateSWOTAnalysis = (id, data) => api.put(`${EP}/strategy/swot/${id}`, data);
export const deleteSWOTAnalysis = id => api.delete(`${EP}/strategy/swot/${id}`);

// Strategic aliases used by StrategicPlanningPage
export const getKeyResults = params => api.get(`${EP}/strategy/key-results`, { params });
export const createKeyResult = data => api.post(`${EP}/strategy/key-results`, data);
export const checkInKeyResult = (id, data) =>
  api.put(`${EP}/strategy/key-results/${id}/check-in`, data);
export const getScorecardEntries = params => api.get(`${EP}/strategy/scorecard`, { params });
export const createScorecardEntry = data => api.post(`${EP}/strategy/scorecard`, data);
export const getScorecardSummary = () => api.get(`${EP}/strategy/scorecard/summary`);
export const getObjectiveCascade = id => api.get(`${EP}/strategy/objectives/${id}/cascade`);
