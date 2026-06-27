import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestCache } from '../utils/cache';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * useICFAssessment - Custom hook for ICF assessment management
 * Hook مخصص لإدارة تقييمات ICF
 */
export const useICFAssessment = ({ 
  beneficiaryId, 
  assessmentId,
  initialData,
  coreSetType = 'rehab',
}) => {
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  // Initialize scores from initial data
  useEffect(() => {
    if (initialData?.scores) {
      setScores(initialData.scores);
    }
  }, [initialData]);

  // Fetch assessment data
  const { data: assessmentData } = useQuery({
    queryKey: ['icf-assessment', beneficiaryId, assessmentId],
    queryFn: async () => {
      if (!assessmentId) return null;
      
      const cacheKey = `icf-assessment-${assessmentId}`;
      const cached = requestCache.get(cacheKey);
      if (cached) return cached;
      
      const response = await fetch(`${API_BASE_URL}/assessment/icf/${assessmentId}`);
      if (!response.ok) throw new Error('Failed to fetch assessment');
      
      const data = await response.json();
      requestCache.set(cacheKey, data, 5 * 60 * 1000); // 5 minutes
      return data;
    },
    enabled: !!assessmentId,
    staleTime: 5 * 60 * 1000,
  });

  // Update score
  const updateScore = useCallback((code, qualifier, value) => {
    setScores(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        [qualifier]: value,
      },
    }));
  }, []);

  // Calculate domain score
  const calculateDomainScore = useCallback((domain) => {
    const domainScores = Object.entries(scores)
      .filter(([code, score]) => {
        // Filter by domain prefix
        const prefix = code.charAt(0);
        const domainMap = {
          'b': 'bodyFunctions',
          's': 'bodyStructures',
          'd': 'activitiesAndParticipation',
          'e': 'environmentalFactors',
          'p': 'personalFactors',
        };
        return domainMap[prefix] === domain;
      })
      .map(([_, score]) => score.performance)
      .filter(val => val !== undefined && val !== 8 && val !== 9);
    
    if (domainScores.length === 0) return 0;
    
    const sum = domainScores.reduce((a, b) => a + b, 0);
    return sum / domainScores.length;
  }, [scores]);

  // Calculate overall score
  const calculateOverallScore = useCallback(() => {
    const domains = [
      'bodyFunctions',
      'bodyStructures',
      'activitiesAndParticipation',
      'environmentalFactors',
      'personalFactors',
    ];
    
    const domainScores = domains.map(domain => calculateDomainScore(domain));
    const validScores = domainScores.filter(score => score > 0);
    
    if (validScores.length === 0) return 0;
    
    const sum = validScores.reduce((a, b) => a + b, 0);
    return sum / validScores.length;
  }, [calculateDomainScore]);

  // Get progress data
  const getProgressData = useCallback(() => {
    // This would fetch historical assessments from the API
    // For now, return mock data or empty array
    return [];
  }, []);

  // Validate assessment
  const validateAssessment = useCallback(() => {
    const errors = [];
    const warnings = [];
    
    // Check if all required codes have scores
    const requiredCodes = getRequiredCodes(coreSetType);
    requiredCodes.forEach(code => {
      const score = scores[code];
      if (!score) {
        errors.push(`الكود ${code} لم يتم تقييمه`);
      } else if (score.performance === undefined || score.performance === 8) {
        warnings.push(`مؤهل الأداء للكود ${code} غير محدد`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [scores, coreSetType]);

  // Save assessment
  const saveAssessment = useMutation({
    mutationFn: async () => {
      setLoading(true);
      setError(null);
      
      try {
        const payload = {
          beneficiaryId,
          assessmentId,
          coreSetType,
          scores,
          overallScore: calculateOverallScore(),
          domainScores: {
            bodyFunctions: calculateDomainScore('bodyFunctions'),
            bodyStructures: calculateDomainScore('bodyStructures'),
            activitiesAndParticipation: calculateDomainScore('activitiesAndParticipation'),
            environmentalFactors: calculateDomainScore('environmentalFactors'),
            personalFactors: calculateDomainScore('personalFactors'),
          },
          status: 'draft',
        };
        
        const url = assessmentId 
          ? `${API_BASE_URL}/assessment/icf/${assessmentId}`
          : `${API_BASE_URL}/assessment/icf`;
        
        const method = assessmentId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save assessment');
        }
        
        const data = await response.json();
        
        // Invalidate cache
        queryClient.invalidateQueries(['icf-assessment', beneficiaryId]);
        
        return { success: true, data };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
  });

  // Submit assessment
  const submitAssessment = useMutation({
    mutationFn: async () => {
      setLoading(true);
      setError(null);
      
      try {
        const validation = validateAssessment();
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        
        const payload = {
          beneficiaryId,
          assessmentId,
          coreSetType,
          scores,
          overallScore: calculateOverallScore(),
          domainScores: {
            bodyFunctions: calculateDomainScore('bodyFunctions'),
            bodyStructures: calculateDomainScore('bodyStructures'),
            activitiesAndParticipation: calculateDomainScore('activitiesAndParticipation'),
            environmentalFactors: calculateDomainScore('environmentalFactors'),
            personalFactors: calculateDomainScore('personalFactors'),
          },
          status: 'completed',
          submittedAt: new Date().toISOString(),
        };
        
        const response = await fetch(`${API_BASE_URL}/assessment/icf/${assessmentId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to submit assessment');
        }
        
        const data = await response.json();
        
        // Invalidate cache
        queryClient.invalidateQueries(['icf-assessment', beneficiaryId]);
        
        return { success: true, data };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
  });

  return {
    assessment: assessmentData,
    scores,
    loading,
    error,
    updateScore,
    saveAssessment: saveAssessment.mutateAsync,
    submitAssessment: submitAssessment.mutateAsync,
    calculateDomainScore,
    calculateOverallScore,
    getProgressData,
    validateAssessment,
  };
};

/**
 * Helper function to get required codes for a core set type
 */
function getRequiredCodes(coreSetType) {
  // This would be imported from the core set files
  // For now, return a basic set
  const basicCodes = [
    'b110', 'b114', 'b117', 'b130', 'b140', 'b152', 'b210', 'b230',
    'b310', 'b320', 'b330', 'b340', 'b710', 'b730', 'b760', 'b770',
    's110', 's210', 's310', 's710', 's720', 's730', 's740', 's750',
    'd110', 'd115', 'd130', 'd140', 'd160', 'd162', 'd163', 'd164',
    'd310', 'd315', 'd330', 'd335', 'd350', 'd410', 'd415', 'd440',
    'd510', 'd520', 'd540', 'd550', 'd560', 'd570', 'd710', 'd720',
    'd730', 'd740', 'd810', 'd820', 'd830', 'd910', 'd920', 'd930',
    'e110', 'e115', 'e120', 'e310', 'e315', 'e320', 'e410', 'e420',
    'e500', 'e510', 'e520',
  ];
  
  return basicCodes;
}

export default useICFAssessment;
