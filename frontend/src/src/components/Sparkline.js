import React from 'react';
import { Box } from '@mui/material';

const Sparkline = ({ data = [], color = '#0f766e', height = 40, width = 100 }) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1 || 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Box sx={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    </Box>
  );
};

export default Sparkline;
