/**
 * SidebarBrand — شعار القائمة الجانبية
 *
 * Premium dark sidebar logo area with:
 * - Gradient brand icon
 * - System name + tagline
 * - Smooth collapse animation
 * - Collapse toggle button
 */

import { Box, Typography, IconButton, Tooltip, useTheme, alpha } from '@mui/material';
import {
  MenuOpen as MenuOpenIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

// ─── Brand Icon (SVG) ─────────────────────────────────────────────────────────
function BrandIcon({ size = 36 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 16px rgba(99,102,241,0.45)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 'inherit',
        },
      }}
    >
      <Typography
        sx={{
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: size * 0.44,
          lineHeight: 1,
          letterSpacing: '-1px',
          fontFamily: 'Cairo, sans-serif',
          position: 'relative',
          zIndex: 1,
        }}
      >
        أ
      </Typography>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SidebarBrand({ collapsed, onToggleCollapse }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        height: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        px: collapsed ? 1 : 2,
        py: 1,
        // Header gradient — slightly lighter than sidebar bg
        background: 'linear-gradient(135deg, rgba(30,58,138,0.6) 0%, rgba(10,22,40,0) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        transition: 'padding 0.25s ease',
        position: 'relative',
        overflow: 'hidden',
        // Subtle top highlight line
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '10%',
          width: '80%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)',
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
          flex: 1,
          minWidth: 0,
        }}
      >
        <BrandIcon size={38} />

        {/* Text — hidden when collapsed */}
        <Box
          sx={{
            overflow: 'hidden',
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto',
            transition: 'opacity 0.2s ease, width 0.25s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Typography
            sx={{
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '1rem',
              lineHeight: 1.25,
              letterSpacing: '0.01em',
              fontFamily: 'Cairo, sans-serif',
            }}
          >
            مراكز الأوائل
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.45)',
              fontWeight: 400,
              fontSize: '0.68rem',
              lineHeight: 1.3,
              letterSpacing: '0.02em',
            }}
          >
            نظام إدارة متكامل
          </Typography>
        </Box>
      </Box>

      {/* Collapse Toggle — desktop only */}
      {!collapsed && (
        <Tooltip title="طي القائمة" placement="right">
          <IconButton
            onClick={onToggleCollapse}
            size="small"
            sx={{
              color: 'rgba(255,255,255,0.4)',
              flexShrink: 0,
              transition: 'color 0.15s, background-color 0.15s',
              '&:hover': {
                color: 'rgba(255,255,255,0.85)',
                backgroundColor: 'rgba(255,255,255,0.07)',
              },
              width: 32,
              height: 32,
              borderRadius: '8px',
            }}
          >
            <MenuOpenIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      )}

      {/* Expand toggle when collapsed */}
      {collapsed && (
        <Tooltip title="توسيع القائمة" placement="left">
          <IconButton
            onClick={onToggleCollapse}
            size="small"
            sx={{
              color: 'rgba(255,255,255,0.4)',
              transition: 'color 0.15s',
              '&:hover': {
                color: '#FFFFFF',
                backgroundColor: 'rgba(255,255,255,0.07)',
              },
              width: 32,
              height: 32,
              borderRadius: '8px',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <MenuIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
