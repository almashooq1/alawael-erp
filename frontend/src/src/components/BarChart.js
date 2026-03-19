import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

const BarChart = ({ data = [], labels = [], height = 200, color = '#0f766e' }) => {
  const theme = useTheme();

  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 1);
  const barWidth = 100 / data.length;

  return (
    <Box sx={{ width: '100%', height, position: 'relative', pt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          height: '100%',
          borderBottom: `1px solid ${theme.palette.divider}`,
          pb: 3,
        }}
      >
        {data.map((value, idx) => {
          const barHeight = (value / max) * 100;
          return (
            <Box
              key={idx}
              sx={{
                width: `${barWidth * 0.7}%`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
              }}
            >
              <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: 'text.secondary' }}>
                {value}
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  height: `${barHeight}%`,
                  bgcolor: color,
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    opacity: 0.8,
                    transform: 'translateY(-2px)',
                  },
                }}
              />
              {labels[idx] && (
                <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary', fontSize: '0.7rem' }}>
                  {labels[idx]}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default BarChart;
