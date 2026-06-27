import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Slider,
  Chip,
  Tooltip,
  Paper,
  Grid,
} from '@mui/material';
import { ICF_QUALIFIERS } from '../coreSets/icf-cy-codes';

/**
 * ICFQualifierSlider - Slider component for ICF qualifiers
 * مكون شريط التمرير لمؤهلات ICF
 */
const ICFQualifierSlider = ({ 
  qualifier, 
  value, 
  onChange, 
  readOnly = false 
}) => {
  const qualifierConfig = ICF_QUALIFIERS[qualifier];
  
  const scaleValues = useMemo(() => {
    if (qualifier === 'environmental') {
      return [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    }
    return [0, 1, 2, 3, 4];
  }, [qualifier]);

  const scaleLabels = useMemo(() => {
    return qualifierConfig.scale.filter(item => 
      scaleValues.includes(item.value)
    );
  }, [qualifierConfig, scaleValues]);

  const handleChange = useCallback((event, newValue) => {
    if (!readOnly && onChange) {
      onChange(newValue);
    }
  }, [readOnly, onChange]);

  const getValueLabel = (val) => {
    const scaleItem = qualifierConfig.scale.find(item => item.value === val);
    return scaleItem ? scaleItem.label : '';
  };

  const getValueColor = (val) => {
    const scaleItem = qualifierConfig.scale.find(item => item.value === val);
    return scaleItem ? scaleItem.color : '#94a3b8';
  };

  const getTrackColor = (val) => {
    if (qualifier === 'environmental') {
      if (val < 0) return '#ef4444'; // Red for barriers
      if (val > 0) return '#22c55e'; // Green for facilitators
      return '#94a3b8'; // Gray for neutral
    }
    if (val <= 1) return '#22c55e'; // Green
    if (val <= 2) return '#eab308'; // Yellow
    if (val <= 3) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const marks = useMemo(() => {
    return scaleLabels.map(item => ({
      value: item.value,
      label: (
        <Tooltip title={item.label}>
          <Chip
            label={item.value}
            size="small"
            sx={{
              bgcolor: item.color,
              color: 'white',
              fontWeight: 'bold',
              minWidth: 32,
              fontSize: '0.75rem',
            }}
          />
        </Tooltip>
      ),
    }));
  }, [scaleLabels]);

  const currentValue = value !== undefined ? value : (qualifier === 'environmental' ? 0 : 8);
  const isUnspecified = currentValue === 8;
  const isNotApplicable = currentValue === 9;

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box mb={2}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          {qualifierConfig.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {qualifierConfig.description}
        </Typography>
      </Box>

      <Box display="flex" alignItems="center" gap={2}>
        <Box flex={1}>
          <Slider
            value={isUnspecified || isNotApplicable ? 0 : currentValue}
            onChange={handleChange}
            step={1}
            marks={marks}
            min={scaleValues[0]}
            max={scaleValues[scaleValues.length - 1]}
            disabled={readOnly || isUnspecified || isNotApplicable}
            valueLabelDisplay="off"
            sx={{
              '& .MuiSlider-track': {
                bgcolor: getTrackColor(currentValue),
              },
              '& .MuiSlider-thumb': {
                bgcolor: getValueColor(currentValue),
                width: 24,
                height: 24,
              },
            }}
          />
        </Box>
        
        <Box minWidth={80} textAlign="center">
          {isUnspecified ? (
            <Chip label="غير محدد" color="default" size="small" />
          ) : isNotApplicable ? (
            <Chip label="غير قابل" color="default" size="small" />
          ) : (
            <Tooltip title={getValueLabel(currentValue)}>
              <Chip
                label={currentValue}
                sx={{
                  bgcolor: getValueColor(currentValue),
                  color: 'white',
                  fontWeight: 'bold',
                  minWidth: 40,
                }}
              />
            </Tooltip>
          )}
        </Box>
      </Box>

      <Box mt={2} display="flex" justifyContent="space-between" gap={1}>
        <Chip
          label="غير محدد"
          size="small"
          variant={isUnspecified ? 'filled' : 'outlined'}
          color={isUnspecified ? 'primary' : 'default'}
          onClick={() => !readOnly && onChange && onChange(8)}
          sx={{ cursor: readOnly ? 'default' : 'pointer' }}
        />
        <Chip
          label="غير قابل للتطبيق"
          size="small"
          variant={isNotApplicable ? 'filled' : 'outlined'}
          color={isNotApplicable ? 'primary' : 'default'}
          onClick={() => !readOnly && onChange && onChange(9)}
          sx={{ cursor: readOnly ? 'default' : 'pointer' }}
        />
      </Box>
    </Paper>
  );
};

export default ICFQualifierSlider;
