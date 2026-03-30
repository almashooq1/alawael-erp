/**
 * WatermarkBackground — العلامة المائية الخلفية
 *
 * System watermark overlay for authenticated pages:
 * - Diagonal repeating pattern of system name + logo
 * - Light mode: subtle gray opacity
 * - Dark mode: white ultra-low opacity
 * - Never blocks interaction (pointer-events: none)
 * - Optional logo SVG or text
 */

import { memo } from 'react';
import { Box, useTheme } from '@mui/material';

// ─── SVG Watermark tile ───────────────────────────────────────────────────────
function WatermarkTile({ isDark, text = 'مراكز الأوائل', opacity }) {
  const fillColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.045)';

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="260" height="160">
      <g transform="rotate(-30, 130, 80)" opacity="1">
        <!-- Brand icon -->
        <rect x="92" y="52" width="24" height="24" rx="6"
          fill="none" stroke="${fillColor}" stroke-width="1.2"/>
        <text x="104" y="68" text-anchor="middle" dominant-baseline="middle"
          font-family="Cairo, Tajawal, sans-serif" font-size="12" font-weight="700"
          fill="${fillColor}">أ</text>

        <!-- System name -->
        <text x="125" y="65" text-anchor="middle" dominant-baseline="middle"
          font-family="Cairo, Tajawal, sans-serif" font-size="11" font-weight="500"
          fill="${fillColor}" letter-spacing="1">${text}</text>

        <!-- Dotted separator -->
        <circle cx="86" cy="64" r="1.5" fill="${fillColor}"/>
        <circle cx="168" cy="64" r="1.5" fill="${fillColor}"/>
      </g>
    </svg>
  `;

  const encoded = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`;
  return encoded;
}

// ─────────────────────────────────────────────────────────────────────────────
const WatermarkBackground = memo(function WatermarkBackground({
  text = 'مراكز الأوائل',
  opacity,
  zIndex = 0,
  sx = {},
}) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Use CSS background-image with data URI for performance
  const svgFill = isDark ? 'rgba(255,255,255,0.055)' : 'rgba(15,23,42,0.04)';
  const finalOpacity = opacity ?? 1;

  const svgTemplate = `
<svg xmlns='http://www.w3.org/2000/svg' width='260' height='160'>
  <g transform='rotate(-28 130 80)'>
    <rect x='92' y='48' width='22' height='22' rx='5.5' fill='none' stroke='${svgFill}' stroke-width='1.2'/>
    <text x='103' y='63' text-anchor='middle' dominant-baseline='middle' font-family='Cairo,Tajawal,Arial,sans-serif' font-size='12' font-weight='700' fill='${svgFill}'>أ</text>
    <text x='130' y='63' text-anchor='middle' dominant-baseline='middle' font-family='Cairo,Tajawal,Arial,sans-serif' font-size='10' font-weight='500' fill='${svgFill}' letter-spacing='1'>${text}</text>
    <circle cx='86' cy='62' r='1.5' fill='${svgFill}'/>
    <circle cx='174' cy='62' r='1.5' fill='${svgFill}'/>
  </g>
</svg>`;

  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgTemplate)}`;

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex,
        pointerEvents: 'none',
        userSelect: 'none',
        opacity: finalOpacity,
        backgroundImage: `url("${dataUri}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '260px 160px',
        ...sx,
      }}
    />
  );
});

export default WatermarkBackground;
