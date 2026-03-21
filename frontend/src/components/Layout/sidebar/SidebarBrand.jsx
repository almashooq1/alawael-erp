/**
 * SidebarBrand — Logo icon, system name, collapse toggle.
 * يدعم تحميل الشعار المخصص من إعدادات الهوية المؤسسية
 */



import { Box, IconButton, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
const LOGO_URL = '/logo.svg';

const SidebarBrand = ({ collapsed, isMobile, onToggleCollapse, theme, customLogo, customName }) => {
  const logoSrc = customLogo || LOGO_URL;
  const systemName = customName || 'مراكز الأوائل';

  return (
  <Box
    sx={{
      px: collapsed && !isMobile ? 1 : 2.5,
      py: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
      minHeight: theme.custom?.header?.height || 64,
      borderBottom: `1px solid ${theme.palette.divider}`,
    }}
  >
    {(!collapsed || isMobile) && (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          component="img"
          src={logoSrc}
          alt={systemName}
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            objectFit: 'cover',
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
          }}
        />
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1rem',
          }}
        >
          أ
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {systemName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            للرعاية النهارية
          </Typography>
        </Box>
      </Box>
    )}

    {collapsed && !isMobile && (
      <Box
        component="img"
        src={logoSrc}
        alt={systemName}
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          objectFit: 'cover',
        }}
      />
    )}

    {!isMobile && (
      <IconButton
        size="small"
        aria-label="تبديل القائمة"
        onClick={onToggleCollapse}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '8px',
          width: 28,
          height: 28,
          ml: collapsed ? 0 : 'auto',
        }}
      >
        {collapsed ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
      </IconButton>
    )}
  </Box>
  );
};

export default SidebarBrand;
