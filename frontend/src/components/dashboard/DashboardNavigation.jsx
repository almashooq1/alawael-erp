/**
 * Dashboard Navigation Components
 * مكونات التنقل في لوحة التحكم
 *
 * SectionDivider — collapsible section heading with IO animation
 * SectionNav — sticky nav bar for jumping between dashboard sections
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Divider,
  Chip,
  Tooltip,
  useTheme,
} from '@mui/material';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { motion } from 'framer-motion';
import { SECTIONS } from './dashboardConstants';

// ── Section Divider (memo'd, collapsible, IO-animated) ────────────
export const SectionDivider = React.memo(({ label, id, collapsed, onToggle }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      id={id}
      initial={{ opacity: 0, x: -30 }}
      animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
      transition={{ duration: 0.5 }}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 3.5, cursor: 'pointer', userSelect: 'none' }}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'عرض' : 'إخفاء'} قسم ${label}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.(); } }}
      >
        <Typography
          id={`${id}-heading`}
          variant="h6"
          sx={{
            fontWeight: 800,
            fontSize: 'clamp(0.85rem, 2vw, 1.05rem)',
            color: 'text.primary',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Typography>
        <Divider sx={{ flexGrow: 1 }} />
        {onToggle && (
          <Box sx={{ color: 'text.disabled', transition: 'transform 0.3s', display: 'flex' }}>
            {collapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
          </Box>
        )}
      </Box>
    </motion.div>
  );
});

// ── Section Quick Nav Bar (memo'd) ────────────────────────────────
export const SectionNav = React.memo(({ activeSection, collapsedSections = {}, onToggleAll }) => {
  const theme = useTheme();
  const allCollapsed = SECTIONS.every(s => collapsedSections[s.id]);

  const scrollTo = (id) => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
    >
      <Box
        role="navigation"
        aria-label="التنقل بين أقسام لوحة التحكم"
        sx={{
          display: 'flex',
          gap: 0.8,
          mb: 2.5,
          flexWrap: { xs: 'nowrap', md: 'wrap' },
          overflowX: { xs: 'auto', md: 'visible' },
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          position: 'sticky',
          top: 64,
          zIndex: 10,
          py: 1.5,
          px: 0.5,
          mx: -0.5,
          borderRadius: 3,
          backdropFilter: 'blur(12px)',
          background: theme.palette.mode === 'dark'
            ? 'rgba(26,26,46,0.85)'
            : 'rgba(248,249,252,0.85)',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.06) 0%, transparent 100%)',
            pointerEvents: 'none',
            opacity: 0.6,
          },
        }}
      >
        {/* Expand/Collapse All toggle */}
        {onToggleAll && (
          <Tooltip title={allCollapsed ? 'عرض جميع الأقسام' : 'طي جميع الأقسام'} arrow placement="bottom">
            <Chip
              icon={allCollapsed ? <UnfoldMoreIcon sx={{ fontSize: 16 }} /> : <UnfoldLessIcon sx={{ fontSize: 16 }} />}
              label={allCollapsed ? 'عرض الكل' : 'طي الكل'}
              size="small"
              onClick={onToggleAll}
              sx={{
                fontWeight: 700,
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '1px solid',
                borderColor: 'rgba(102,126,234,0.25)',
                background: 'rgba(102,126,234,0.08)',
                color: '#667eea',
                '&:hover': { background: 'rgba(102,126,234,0.15)' },
                mr: 1,
              }}
            />
          </Tooltip>
        )}
        {SECTIONS.map((sec, idx) => (
          <Tooltip key={sec.id} title={`اضغط ${idx + 1} للتنقل`} arrow placement="bottom" enterDelay={600}>
            <Chip
              icon={sec.icon}
              label={sec.label}
              size="small"
              onClick={() => scrollTo(sec.id)}
              sx={{
                fontWeight: 700,
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '1px solid',
                borderColor: activeSection === sec.id ? `${sec.color}40` : 'transparent',
                background: activeSection === sec.id ? `${sec.color}15` : 'transparent',
                color: activeSection === sec.id ? sec.color : 'text.secondary',
                '&:hover': {
                  background: `${sec.color}12`,
                  borderColor: `${sec.color}30`,
                },
                '& .MuiChip-icon': {
                  color: activeSection === sec.id ? sec.color : 'text.disabled',
                },
              }}
            />
          </Tooltip>
        ))}
      </Box>
    </motion.div>
  );
});
