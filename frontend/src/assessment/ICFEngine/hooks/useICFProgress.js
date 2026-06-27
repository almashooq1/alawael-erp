import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * useICFProgress - Custom hook for tracking ICF assessment progress over time
 * Hook مخصص لتتبع تقدم تقييمات ICF عبر الزمن
 */
export const useICFProgress = ({ 
  patientId, 
  domain,
  timeRange = '6months', // '1month', '3months', '6months', '1year', 'all'
}) => {
  const [progressData, setProgressData] = useState([]);
  const [trends, setTrends] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch progress data
  const { data: assessments } = useQuery({
    queryKey: ['icf-progress', patientId, timeRange],
    queryFn: async () => {
      if (!patientId) return [];
      
      const response = await fetch(
        `${API_BASE_URL}/assessment/icf/patient/${patientId}?timeRange=${timeRange}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch progress data');
      
      const data = await response.json();
      return data.assessments || [];
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate trends when data changes
  useEffect(() => {
    if (!assessments || assessments.length === 0) return;
    
    const calculateTrends = () => {
      const trends = {};
      const domains = [
        'bodyFunctions',
        'bodyStructures',
        'activitiesAndParticipation',
        'environmentalFactors',
        'personalFactors',
      ];
      
      domains.forEach(domain => {
        const scores = assessments.map(a => a.domainScores?.[domain]).filter(Boolean);
        
        if (scores.length < 2) {
          trends[domain] = { trend: 'insufficient', change: 0 };
          return;
        }
        
        const first = scores[0];
        const last = scores[scores.length - 1];
        const change = last - first;
        
        let trend = 'stable';
        if (change < -0.5) trend = 'improving';
        else if (change > 0.5) trend = 'worsening';
        
        // Calculate rate of change (per month)
        const firstDate = new Date(assessments[0].date);
        const lastDate = new Date(assessments[assessments.length - 1].date);
        const monthsDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30);
        const rateOfChange = monthsDiff > 0 ? change / monthsDiff : 0;
        
        trends[domain] = {
          trend,
          change: Math.abs(change),
          rateOfChange: Math.abs(rateOfChange),
          direction: change < 0 ? 'improving' : change > 0 ? 'worsening' : 'stable',
          firstScore: first,
          lastScore: last,
          assessments: scores.length,
        };
      });
      
      setTrends(trends);
    };
    
    calculateTrends();
    setProgressData(assessments);
  }, [assessments]);

  // Get domain-specific progress
  const getDomainProgress = useCallback((targetDomain) => {
    if (!progressData || progressData.length === 0) return [];
    
    return progressData.map(assessment => ({
      date: assessment.date,
      score: assessment.domainScores?.[targetDomain] || 0,
      overall: assessment.overallScore || 0,
      status: assessment.status,
    }));
  }, [progressData]);

  // Get improvement summary
  const getImprovementSummary = useCallback(() => {
    if (!trends || Object.keys(trends).length === 0) return null;
    
    const improving = Object.entries(trends).filter(([_, t]) => t.trend === 'improving');
    const worsening = Object.entries(trends).filter(([_, t]) => t.trend === 'worsening');
    const stable = Object.entries(trends).filter(([_, t]) => t.trend === 'stable');
    
    return {
      improving: improving.map(([domain, trend]) => ({ domain, ...trend })),
      worsening: worsening.map(([domain, trend]) => ({ domain, ...trend })),
      stable: stable.map(([domain, trend]) => ({ domain, ...trend })),
      totalAssessments: progressData.length,
      timeRange,
    };
  }, [trends, progressData, timeRange]);

  // Get fastest improving domain
  const getFastestImproving = useCallback(() => {
    if (!trends) return null;
    
    const improving = Object.entries(trends)
      .filter(([_, t]) => t.trend === 'improving')
      .sort((a, b) => b[1].rateOfChange - a[1].rateOfChange);
    
    return improving.length > 0 ? { domain: improving[0][0], ...improving[0][1] } : null;
  }, [trends]);

  // Get fastest worsening domain
  const getFastestWorsening = useCallback(() => {
    if (!trends) return null;
    
    const worsening = Object.entries(trends)
      .filter(([_, t]) => t.trend === 'worsening')
      .sort((a, b) => b[1].rateOfChange - a[1].rateOfChange);
    
    return worsening.length > 0 ? { domain: worsening[0][0], ...worsening[0][1] } : null;
  }, [trends]);

  return {
    progressData,
    trends,
    loading,
    error,
    getDomainProgress,
    getImprovementSummary,
    getFastestImproving,
    getFastestWorsening,
  };
};

export default useICFProgress;
