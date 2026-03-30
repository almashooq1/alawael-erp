/**
 * SidebarBrand — شعار القائمة الجانبية المحسّن
 *
 * Premium dark sidebar logo area with:
 * - Gradient brand icon with glass sheen
 * - System name + tagline with refined typography
 * - Smooth collapse animation
 * - Elegant collapse toggle button
 */

import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import {
  MenuOpen as MenuOpenIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

// ─── Brand Icon ───────────────────────────────────────────────────────────────
function BrandIcon({ size = 38 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '12px',
        background: 'linear-gradient(145deg, #5B4EF8 0%, #7C3AED 60%, #6D28D9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 20px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        // Glass top sheen
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '48%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 100%)',
          borderRadius: '12px 12px 0 0',
        },
        // Bottom reflection
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: '20%',
          width: '60%',
          height: '1px',
          background: 'rgba(255,255,255,0.1)',
        },
      }}
    >
      <Typography
        sx={{
          color: '#FFFFFF',
          fontWeight: 900,
          fontSize: size * 0.45,
          lineHeight: 1,
          letterSpacing: '-1px',
          fontFamily: 'Cairo, sans-serif',
          position: 'relative',
          zIndex: 1,
          textShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      >
        أ
      </Typography>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SidebarBrand({ collapsed, onToggleCollapse }) {
  return (
    <Box
      sx={{
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        px: collapsed ? 1.25 : 2.25,
        py: 1,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(30,58,138,0.5) 0%, rgba(10,22,40,0.1) 60%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        transition: 'padding 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        // Top accent line
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '5%',
          width: '90%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.6) 40%, rgba(139,92,246,0.6) 60%, transparent 100%)',
        },
      }}
    >
      {/* Logo + Text */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          overflow: 'hidden',
          flex: collapsed ? 0 : 1,
          minWidth: 0,
        }}
      >
        <BrandIcon size={38} />

        {/* Text — hidden when collapsed */}
        <Box
          sx={{
            overflow: 'hidden',
            opacity: collapsed ? 0 : 1,
            maxWidth: collapsed ? 0 : 160,
            transition: 'opacity 0.2s ease, max-width 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            whiteSpace: 'nowrap',
          }}
        >
          <Typography
            sx={{
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '1rem',
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
              fontFamily: 'Cairo, sans-serif',
              textShadow: '0 1px 6px rgba(0,0,0,0.3)',
            }}
          >
            مراكز الأوائل
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.2 }}>
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 5px rgba(16,185,129,0.7)',
                flexShrink: 0,
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                  '50%': { opacity: 0.6, transform: 'scale(0.85)' },
                },
              }}
            />
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.42)',
                fontWeight: 400,
                fontSize: '0.67rem',
                lineHeight: 1.3,
                letterSpacing: '0.03em',
              }}
            >
              نظام إدارة متكامل
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Collapse Toggle */}
      <Tooltip
        title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
        placement={collapsed ? 'left' : 'bottom'}
        arrow
      >
        <IconButton
          onClick={onToggleCollapse}
          size="small"
          sx={{
            color: 'rgba(255,255,255,0.35)',
            flexShrink: 0,
            width: 30,
            height: 30,
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
            transition: 'all 0.2s ease',
            ...(collapsed && {
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
            }),
            '&:hover': {
              color: 'rgba(255,255,255,0.9)',
              backgroundColor: 'rgba(99,102,241,0.2)',
              borderColor: 'rgba(99,102,241,0.4)',
              transform: collapsed ? 'translateX(-50%) scale(1.05)' : 'scale(1.05)',
            },
          }}
        >
          {collapsed ? (
            <MenuIcon sx={{ fontSize: 17 }} />
          ) : (
            <MenuOpenIcon sx={{ fontSize: 17 }} />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
