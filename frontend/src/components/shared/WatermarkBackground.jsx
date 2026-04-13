/**
 * WatermarkBackground — العلامة المائية الخلفية (Phase 2)
 *
 * System watermark overlay for authenticated pages:
 * - Diagonal repeating pattern of system name + logo
 * - Light mode: subtle gray opacity
 * - Dark mode: white ultra-low opacity
 * - Never blocks interaction (pointer-events: none)
 * - Optional logo SVG or text
 * - Phase 2: animated fade-in, print-aware, configurable density & angle
 */

import { memo, useMemo } from 'react';
import { useTheme } from '@mui/material';

// ─── Density presets ──────────────────────────────────────────────────────────
const DENSITY = {
  sparse:  { w: 340, h: 220 },
  normal:  { w: 260, h: 160 },
  dense:   { w: 180, h: 110 },
};

// ─────────────────────────────────────────────────────────────────────────────
const WatermarkBackground = memo(function WatermarkBackground({
  text = 'مراكز الأوائل',
  opacity,
  zIndex = 0,
  angle = -28,
  density = 'normal',
  showLogo = true,
  animated = true,
  printVisible = false,
  sx = {},
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { w, h } = DENSITY[density] || DENSITY.normal;
  const finalOpacity = opacity ?? 1;

  const svgDataUri = useMemo(() => {
    const fill = isDark ? 'rgba(255,255,255,0.055)' : 'rgba(15,23,42,0.04)';

    const logoMarkup = showLogo
      ? `<rect x='92' y='48' width='22' height='22' rx='5.5' fill='none' stroke='${fill}' stroke-width='1.2'/>
         <text x='103' y='63' text-anchor='middle' dominant-baseline='middle' font-family='Cairo,Tajawal,Arial,sans-serif' font-size='12' font-weight='700' fill='${fill}'>أ</text>
         <circle cx='86' cy='62' r='1.5' fill='${fill}'/>
         <circle cx='${w - 86}' cy='62' r='1.5' fill='${fill}'/>`
      : '';

    const textX = showLogo ? 130 : w / 2;

    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
  <g transform='rotate(${angle} ${w / 2} ${h / 2})'>
    ${logoMarkup}
    <text x='${textX}' y='63' text-anchor='middle' dominant-baseline='middle'
      font-family='Cairo,Tajawal,Arial,sans-serif' font-size='10' font-weight='500'
      fill='${fill}' letter-spacing='1'>${text}</text>
  </g>
</svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [isDark, text, angle, w, h, showLogo]);

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
        backgroundImage: `url("${svgDataUri}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: `${w}px ${h}px`,
        // Phase 2: smooth fade in
        ...(animated && {
          animation: 'watermarkFadeIn 0.8s ease-out',
          '@keyframes watermarkFadeIn': {
            from: { opacity: 0 },
            to: { opacity: finalOpacity },
          },
        }),
        // Phase 2: hide on print by default
        ...(!printVisible && {
          '@media print': {
            display: 'none',
          },
        }),
        ...sx,
      }}
    />
  );
});

export default WatermarkBackground;
