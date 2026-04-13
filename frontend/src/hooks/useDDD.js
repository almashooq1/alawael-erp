/**
 * useDDD — React Hooks for DDD API
 *
 * Custom hooks for consuming the DDD API layer
 * with loading states, error handling, and caching
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import dddAPI from '../services/ddd';

/**
 * Generic async data-fetching hook
 * @param {Function} apiFn — the API function to call
 * @param {Object} options — { autoFetch, params, deps }
 */
export function useAsync(apiFn, options = {}) {
  const { autoFetch = false, params = null, deps = [] } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFn(...args);
        if (mountedRef.current) {
          const result = response?.data ?? response;
          setData(result);
          return result;
        }
      } catch (err) {
        if (mountedRef.current) {
          const msg = err?.response?.data?.message || err.message || 'Unknown error';
          setError(msg);
          throw err;
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
     
    [apiFn]
  );

  useEffect(() => {
    if (autoFetch) {
      execute(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, ...deps]);

  return { data, loading, error, execute, setData };
}

/**
 * Paginated list hook
 */
export function usePaginatedList(apiFn) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFn({ ...params, page: params.page || page });
        const result = response?.data ?? response;
        setItems(result.data || []);
        setTotal(result.total || 0);
        setPages(result.pages || 1);
        if (result.page) setPage(result.page);
        return result;
      } catch (err) {
        setError(err?.response?.data?.message || err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFn, page]
  );

  return { items, total, page, pages, loading, error, fetch, setPage };
}

/* ═══════════════════════════════════════════════════════════
 *  Domain-specific hooks
 * ═══════════════════════════════════════════════════════════ */

// Core / Beneficiary
export const useBeneficiaryList = () => usePaginatedList(dddAPI.core.list);
export const useBeneficiary = id =>
  useAsync(dddAPI.core.get, { autoFetch: !!id, params: id, deps: [id] });
export const useBeneficiary360 = id =>
  useAsync(dddAPI.core.get360, { autoFetch: !!id, params: id, deps: [id] });

// Episodes
export const useEpisodeList = () => usePaginatedList(dddAPI.episodes.list);
export const useEpisode = id =>
  useAsync(dddAPI.episodes.get, { autoFetch: !!id, params: id, deps: [id] });
export const useEpisodeDashboard = () => useAsync(dddAPI.episodes.getDashboard);

// Assessments
export const useAssessmentList = () => usePaginatedList(dddAPI.assessments.list);
export const useAssessment = id =>
  useAsync(dddAPI.assessments.get, { autoFetch: !!id, params: id, deps: [id] });

// Care Plans
export const useCarePlanList = () => usePaginatedList(dddAPI.carePlans.list);
export const useCarePlan = id =>
  useAsync(dddAPI.carePlans.get, { autoFetch: !!id, params: id, deps: [id] });

// Sessions
export const useSessionList = () => usePaginatedList(dddAPI.sessions.list);
export const useSession = id =>
  useAsync(dddAPI.sessions.get, { autoFetch: !!id, params: id, deps: [id] });
export const useSessionDashboard = () => useAsync(dddAPI.sessions.getDashboard);

// Goals
export const useGoalList = () => usePaginatedList(dddAPI.goals.list);
export const useGoal = id =>
  useAsync(dddAPI.goals.get, { autoFetch: !!id, params: id, deps: [id] });

// Workflow
export const useWorkflowTasks = () => usePaginatedList(dddAPI.workflow.listTasks);
export const useJourney = episodeId =>
  useAsync(dddAPI.workflow.getJourney, {
    autoFetch: !!episodeId,
    params: episodeId,
    deps: [episodeId],
  });

// Programs
export const useProgramList = () => usePaginatedList(dddAPI.programs.list);
export const useProgram = id =>
  useAsync(dddAPI.programs.get, { autoFetch: !!id, params: id, deps: [id] });

// AI Recommendations
export const useRecommendationList = () => usePaginatedList(dddAPI.aiRecommendations.list);
export const useRiskScore = beneficiaryId =>
  useAsync(dddAPI.aiRecommendations.getRiskScore, {
    autoFetch: !!beneficiaryId,
    params: beneficiaryId,
    deps: [beneficiaryId],
  });

// Quality
export const useAuditList = () => usePaginatedList(dddAPI.quality.listAudits);
export const useCorrectiveActions = () => usePaginatedList(dddAPI.quality.listActions);
export const useQualityDashboard = () => useAsync(dddAPI.quality.getDashboard);

// Family
export const useFamilyMembers = beneficiaryId =>
  useAsync(dddAPI.family.listMembers, {
    autoFetch: !!beneficiaryId,
    params: beneficiaryId,
    deps: [beneficiaryId],
  });
export const useFamilyCommunications = () => usePaginatedList(dddAPI.family.listCommunications);

// Reports
export const useReportTemplates = () => usePaginatedList(dddAPI.reports.listTemplates);
export const useGeneratedReports = () => usePaginatedList(dddAPI.reports.listGenerated);

// Group Therapy
export const useGroupTherapyList = () => usePaginatedList(dddAPI.groupTherapy.list);
export const useGroupTherapy = id =>
  useAsync(dddAPI.groupTherapy.get, { autoFetch: !!id, params: id, deps: [id] });

// Tele-Rehab
export const useTeleRehabList = () => usePaginatedList(dddAPI.teleRehab.list);
export const useTeleRehab = id =>
  useAsync(dddAPI.teleRehab.get, { autoFetch: !!id, params: id, deps: [id] });

// AR/VR
export const useArVrList = () => usePaginatedList(dddAPI.arVr.list);
export const useArVr = id => useAsync(dddAPI.arVr.get, { autoFetch: !!id, params: id, deps: [id] });
export const useArVrProgress = beneficiaryId =>
  useAsync(dddAPI.arVr.getProgress, {
    autoFetch: !!beneficiaryId,
    params: beneficiaryId,
    deps: [beneficiaryId],
  });

// Behavior
export const useBehaviorRecords = () => usePaginatedList(dddAPI.behavior.listRecords);
export const useBehaviorPlans = () => usePaginatedList(dddAPI.behavior.listPlans);
export const useBehaviorAnalytics = beneficiaryId =>
  useAsync(dddAPI.behavior.getAnalytics, {
    autoFetch: !!beneficiaryId,
    params: beneficiaryId,
    deps: [beneficiaryId],
  });

// Research
export const useResearchStudies = () => usePaginatedList(dddAPI.research.list);
export const useResearchStudy = id =>
  useAsync(dddAPI.research.get, { autoFetch: !!id, params: id, deps: [id] });

// Field Training
export const useTrainingPrograms = () => usePaginatedList(dddAPI.fieldTraining.listPrograms);
export const useTrainees = () => usePaginatedList(dddAPI.fieldTraining.listTrainees);
export const useTrainee = id =>
  useAsync(dddAPI.fieldTraining.getTrainee, { autoFetch: !!id, params: id, deps: [id] });

// Dashboards
export const useExecutiveSummary = () => useAsync(dddAPI.dashboards.getExecutiveSummary);
export const useDashboardConfigs = () => usePaginatedList(dddAPI.dashboards.listConfigs);
export const useKPIs = () => usePaginatedList(dddAPI.dashboards.listKPIs);
export const useLatestKPIs = () => useAsync(dddAPI.dashboards.getLatestKPIs);
export const useAlerts = () => usePaginatedList(dddAPI.dashboards.listAlerts);
export const useAlertAnalytics = () => useAsync(dddAPI.dashboards.getAlertAnalytics);
export const useDecisionRules = () => useAsync(dddAPI.dashboards.listRules);
