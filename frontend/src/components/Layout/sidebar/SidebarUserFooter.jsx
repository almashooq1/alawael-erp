/**
 * SidebarUserFooter — User avatar, name, and role at sidebar bottom.
 */
import { Box, Avatar, Typography, Tooltip } from '@mui/material';

const SidebarUserFooter = ({ collapsed, isMobile, currentUser, onNavigate, theme }) => {
  if (!currentUser) return null;

  // Collapsed view — avatar only
  if (collapsed && !isMobile) {
    return (
      <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'center' }}>
        <Tooltip title={currentUser.name || 'الملف الشخصي'} placement="left" arrow>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              fontSize: '0.875rem',
              cursor: 'pointer',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            }}
            onClick={() => onNavigate('/profile')}
          >
            {currentUser.name?.[0] || 'م'}
          </Avatar>
        </Tooltip>
      </Box>
    );
  }

  // Expanded view
  return (
    <Box
      sx={{
        p: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': { backgroundColor: theme.palette.action.hover },
      }}
      onClick={() => onNavigate('/profile')}
    >
      <Avatar
        sx={{
          width: 36,
          height: 36,
          fontSize: '0.875rem',
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        }}
      >
        {currentUser.name?.[0] || currentUser.email?.[0] || 'م'}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {currentUser.name || currentUser.fullName || 'المستخدم'}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {currentUser.role || 'مستخدم'}
        </Typography>
      </Box>
    </Box>
  );
};

export default SidebarUserFooter;
