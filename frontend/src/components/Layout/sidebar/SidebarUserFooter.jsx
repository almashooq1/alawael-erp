/**
 * SidebarUserFooter — تذييل معلومات المستخدم
 *
 * Premium user info footer at the bottom of the sidebar:
 * - Avatar with gradient
 * - Name + role
 * - Quick action: settings & logout
 * - Smooth collapse animation
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  SettingsOutlined,
  LogoutOutlined,
  MoreHoriz as MoreIcon,
  AccountCircleOutlined,
} from '@mui/icons-material';
import { useAuth } from 'contexts/AuthContext';

export default function SidebarUserFooter({ collapsed }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth() || {};
  const [menuAnchor, setMenuAnchor] = useState(null);

  const displayName = currentUser?.name || currentUser?.username || 'مدير النظام';
  const displayRole = currentUser?.role || 'مدير';
  const displayEmail = currentUser?.email || '';
  const avatarLetter = displayName.charAt(0) || 'م';

  const handleLogout = async () => {
    setMenuAnchor(null);
    try { await logout?.(); } catch (_) {}
    navigate('/login');
  };

  return (
    <>
      {/* Top border */}
      <Box
        sx={{
          mx: 2,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)',
          mb: 0,
        }}
      />

      <Box
        sx={{
          p: collapsed ? 1 : 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 1.25,
          justifyContent: collapsed ? 'center' : 'flex-start',
          transition: 'padding 0.25s',
          // Subtle glass effect
          background: 'rgba(255,255,255,0.03)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Avatar */}
        <Tooltip title={collapsed ? `${displayName} — ${displayRole}` : ''} placement="left" arrow>
          <Avatar
            onClick={() => collapsed && setMenuAnchor(null)}
            sx={{
              width: 36,
              height: 36,
              fontSize: '0.875rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
              cursor: 'pointer',
              flexShrink: 0,
              border: '2px solid rgba(255,255,255,0.12)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 4px 12px rgba(99,102,241,0.5)',
              },
            }}
          >
            {avatarLetter}
          </Avatar>
        </Tooltip>

        {/* User info — hidden when collapsed */}
        {!collapsed && (
          <>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </Typography>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.7rem',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayRole}
              </Typography>
            </Box>

            {/* More options */}
            <Tooltip title="خيارات">
              <IconButton
                size="small"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{
                  color: 'rgba(255,255,255,0.4)',
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  borderRadius: '7px',
                  '&:hover': {
                    color: 'rgba(255,255,255,0.85)',
                    backgroundColor: 'rgba(255,255,255,0.07)',
                  },
                }}
              >
                <MoreIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: 200,
              mb: 1,
              // Override to match sidebar's dark style
              backgroundColor: '#0D1E38',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
              color: 'rgba(255,255,255,0.85)',
            },
          },
        }}
      >
        {/* User info header */}
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF' }}>
            {displayName}
          </Typography>
          {displayEmail && (
            <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', mt: 0.25 }}>
              {displayEmail}
            </Typography>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 0.5 }} />

        <MenuItem
          onClick={() => { setMenuAnchor(null); navigate('/profile'); }}
          sx={{
            fontSize: '0.8125rem',
            color: 'rgba(255,255,255,0.75)',
            borderRadius: '6px',
            mx: 0.75,
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.07)', color: '#FFFFFF' },
          }}
        >
          <AccountCircleOutlined sx={{ fontSize: 17, marginInlineEnd: 12, opacity: 0.7 }} />
          الملف الشخصي
        </MenuItem>

        <MenuItem
          onClick={() => { setMenuAnchor(null); navigate('/settings'); }}
          sx={{
            fontSize: '0.8125rem',
            color: 'rgba(255,255,255,0.75)',
            borderRadius: '6px',
            mx: 0.75,
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.07)', color: '#FFFFFF' },
          }}
        >
          <SettingsOutlined sx={{ fontSize: 17, marginInlineEnd: 12, opacity: 0.7 }} />
          الإعدادات
        </MenuItem>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mt: 0.5, mb: 0.5 }} />

        <MenuItem
          onClick={handleLogout}
          sx={{
            fontSize: '0.8125rem',
            color: '#FDA4AF',
            borderRadius: '6px',
            mx: 0.75,
            mb: 0.5,
            '&:hover': { backgroundColor: 'rgba(244,63,94,0.1)', color: '#FCA5A5' },
          }}
        >
          <LogoutOutlined sx={{ fontSize: 17, marginInlineEnd: 12 }} />
          تسجيل الخروج
        </MenuItem>
      </Menu>
    </>
  );
}
