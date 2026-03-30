/**
 * SidebarUserFooter — تذييل معلومات المستخدم (محسّن)
 *
 * Premium user info footer at the bottom of the sidebar:
 * - Avatar with gradient & ring
 * - Name + role with elegant typography
 * - Quick action: settings & logout
 * - Smooth collapse animation
 * - Status indicator dot
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
  Chip,
} from '@mui/material';
import {
  SettingsOutlined,
  LogoutOutlined,
  MoreVert as MoreIcon,
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
      {/* Gradient separator */}
      <Box
        sx={{
          mx: 2,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.35) 40%, rgba(139,92,246,0.35) 60%, transparent 100%)',
          mb: 0,
        }}
      />

      <Box
        sx={{
          p: collapsed ? 1.25 : 1.75,
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 1.25,
          justifyContent: collapsed ? 'center' : 'flex-start',
          transition: 'padding 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'linear-gradient(135deg, rgba(10,22,40,0.4) 0%, rgba(15,23,42,0.6) 100%)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          minHeight: 64,
        }}
      >
        {/* Avatar with online status */}
        <Tooltip
          title={collapsed ? `${displayName} — ${displayRole}` : ''}
          placement="left"
          arrow
        >
          <Box
            sx={{ position: 'relative', flexShrink: 0, cursor: collapsed ? 'pointer' : 'default' }}
            onClick={() => collapsed && setMenuAnchor(null)}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                fontSize: '0.9rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                boxShadow: '0 2px 10px rgba(99,102,241,0.45)',
                border: '2px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(99,102,241,0.55)',
                  transform: 'scale(1.06)',
                  border: '2px solid rgba(255,255,255,0.18)',
                },
              }}
            >
              {avatarLetter}
            </Avatar>
            {/* Online indicator */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 1,
                left: 1,
                width: 9,
                height: 9,
                borderRadius: '50%',
                backgroundColor: '#10B981',
                border: '1.5px solid #0A1628',
                boxShadow: '0 0 6px rgba(16,185,129,0.6)',
              }}
            />
          </Box>
        </Tooltip>

        {/* User info — hidden when collapsed */}
        {!collapsed && (
          <>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.92)',
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.2 }}>
                <Box
                  sx={{
                    px: 0.75,
                    py: 0.1,
                    borderRadius: '4px',
                    backgroundColor: 'rgba(99,102,241,0.18)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    display: 'inline-flex',
                  }}
                >
                  <Typography
                    sx={{
                      color: 'rgba(165,180,252,0.9)',
                      fontSize: '0.64rem',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      lineHeight: 1.4,
                    }}
                  >
                    {displayRole}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* More options button */}
            <Tooltip title="خيارات">
              <IconButton
                size="small"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{
                  color: 'rgba(255,255,255,0.35)',
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: 'rgba(255,255,255,0.85)',
                    backgroundColor: 'rgba(99,102,241,0.15)',
                    borderColor: 'rgba(99,102,241,0.35)',
                  },
                }}
              >
                <MoreIcon sx={{ fontSize: 16 }} />
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
            elevation: 0,
            sx: {
              width: 210,
              mb: 1,
              backgroundColor: '#0D1E38',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '14px',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
              color: 'rgba(255,255,255,0.85)',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* User info header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
          }}
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              fontSize: '0.875rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
            }}
          >
            {avatarLetter}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#FFFFFF',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </Typography>
            {displayEmail && (
              <Typography
                sx={{
                  fontSize: '0.67rem',
                  color: 'rgba(255,255,255,0.38)',
                  mt: 0.15,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayEmail}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ p: 0.75 }}>
          <MenuItem
            onClick={() => { setMenuAnchor(null); navigate('/profile'); }}
            sx={{
              fontSize: '0.8125rem',
              color: 'rgba(255,255,255,0.72)',
              borderRadius: '8px',
              gap: 1.25,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)', color: '#FFFFFF' },
            }}
          >
            <AccountCircleOutlined sx={{ fontSize: 17 }} />
            الملف الشخصي
          </MenuItem>

          <MenuItem
            onClick={() => { setMenuAnchor(null); navigate('/settings'); }}
            sx={{
              fontSize: '0.8125rem',
              color: 'rgba(255,255,255,0.72)',
              borderRadius: '8px',
              gap: 1.25,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)', color: '#FFFFFF' },
            }}
          >
            <SettingsOutlined sx={{ fontSize: 17 }} />
            الإعدادات
          </MenuItem>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mx: 0.75 }} />

        <Box sx={{ p: 0.75 }}>
          <MenuItem
            onClick={handleLogout}
            sx={{
              fontSize: '0.8125rem',
              color: '#FDA4AF',
              borderRadius: '8px',
              gap: 1.25,
              '&:hover': { backgroundColor: 'rgba(244,63,94,0.1)', color: '#FCA5A5' },
            }}
          >
            <LogoutOutlined sx={{ fontSize: 17 }} />
            تسجيل الخروج
          </MenuItem>
        </Box>
      </Menu>
    </>
  );
}
