import React, { useMemo, useCallback } from 'react';
import {
  Box,
  Grid,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Badge,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PriorityHigh as PriorityHighIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import ICFQualifierSlider from './ICFQualifierSlider';
import { ICF_QUALIFIERS } from '../coreSets/icf-cy-codes';
import icfCyRehab from '../coreSets/icf-cy-rehab.json';
import icfCyAutism from '../coreSets/icf-cy-autism.json';
import icfCyCp from '../coreSets/icf-cy-cp.json';

const CORE_SETS = {
  rehab: icfCyRehab,
  autism: icfCyAutism,
  cp: icfCyCp,
};

/**
 * ICFDomainSelector - Component for selecting and scoring ICF domain codes
 * مكون لاختيار وتقييم أكواد مجال ICF
 */
const ICFDomainSelector = ({ 
  domain, 
  coreSetType = 'rehab',
  scores = {},
  onScoreChange,
  readOnly = false,
}) => {
  const coreSet = CORE_SETS[coreSetType] || CORE_SETS.rehab;
  
  const domainData = useMemo(() => {
    const required = coreSet.requiredCodes[domain] || [];
    const optional = coreSet.optionalCodes[domain] || [];
    return { required, optional };
  }, [coreSet, domain]);

  const getCodeScore = useCallback((code) => {
    return scores[code] || {};
  }, [scores]);

  const getCodeStatus = useCallback((code) => {
    const score = getCodeScore(code);
    const hasPerformance = score.performance !== undefined && score.performance !== 8 && score.performance !== 9;
    const hasCapacity = score.capacity !== undefined && score.capacity !== 8 && score.capacity !== 9;
    
    if (hasPerformance && hasCapacity) return 'complete';
    if (hasPerformance || hasCapacity) return 'partial';
    return 'none';
  }, [getCodeScore]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'partial':
        return <WarningIcon color="warning" fontSize="small" />;
      default:
        return <PriorityHighIcon color="error" fontSize="small" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'success';
      case 'partial':
        return 'warning';
      default:
        return 'error';
    }
  };

  const renderCodeItem = (code, index, isOptional = false) => {
    const score = getCodeScore(code.code);
    const status = getCodeStatus(code.code);
    
    return (
      <motion.div
        key={code.code}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Accordion 
          sx={{ 
            mb: 1, 
            borderRadius: 2,
            '&:before': { display: 'none' },
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              '&.Mui-expanded': {
                minHeight: 48,
              },
            }}
          >
            <Box display="flex" alignItems="center" width="100%" gap={2}>
              <Badge 
                badgeContent={getStatusIcon(status)} 
                color={getStatusColor(status)}
                sx={{ '& .MuiBadge-badge': { position: 'relative', transform: 'none' } }}
              />
              
              <Box flex={1}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {code.code} - {code.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {code.labelEn}
                </Typography>
              </Box>

              <Box display="flex" gap={1} alignItems="center">
                {code.priority === 'high' && (
                  <Tooltip title="أولوية عالية">
                    <Chip 
                      label="أولوية" 
                      color="error" 
                      size="small" 
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Tooltip>
                )}
                
                {isOptional && (
                  <Chip 
                    label="اختياري" 
                    variant="outlined" 
                    size="small"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}

                {score.performance !== undefined && score.performance !== 8 && score.performance !== 9 && (
                  <Chip 
                    label={`أداء: ${score.performance}`}
                    color={score.performance <= 1 ? 'success' : score.performance <= 2 ? 'warning' : 'error'}
                    size="small"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}

                {score.capacity !== undefined && score.capacity !== 8 && score.capacity !== 9 && (
                  <Chip 
                    label={`قدرة: ${score.capacity}`}
                    color={score.capacity <= 1 ? 'success' : score.capacity <= 2 ? 'warning' : 'error'}
                    size="small"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <ICFQualifierSlider
                  qualifier="performance"
                  value={score.performance}
                  onChange={(value) => onScoreChange(code.code, 'performance', value)}
                  readOnly={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <ICFQualifierSlider
                  qualifier="capacity"
                  value={score.capacity}
                  onChange={(value) => onScoreChange(code.code, 'capacity', value)}
                  readOnly={readOnly}
                />
              </Grid>
              {domain === 'environmentalFactors' && (
                <Grid item xs={12}>
                  <ICFQualifierSlider
                    qualifier="environmental"
                    value={score.environmental}
                    onChange={(value) => onScoreChange(code.code, 'environmental', value)}
                    readOnly={readOnly}
                  />
                </Grid>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </motion.div>
    );
  };

  return (
    <Box>
      {/* Required Codes */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
          الأكواد الأساسية (مطلوبة)
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          يجب تقييم جميع الأكواد الأساسية لإكمال التقييم
        </Typography>
        <Box mt={2}>
          {domainData.required.map((code, index) => 
            renderCodeItem(code, index, false)
          )}
        </Box>
      </Box>

      {/* Optional Codes */}
      {domainData.optional.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="text.secondary">
            الأكواد الاختيارية
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            أكواد إضافية يمكن تقييمها حسب الحالة
          </Typography>
          <Box mt={2}>
            {domainData.optional.map((code, index) => 
              renderCodeItem(code, index, true)
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ICFDomainSelector;
