import { alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { gradients } from 'theme/palette';

/**
 * PageHeader — Standard gradient header used across all portal pages.
 *
 * @param {object}  props
 * @param {string}  props.title        — Page title
 * @param {string}  [props.subtitle]   — Optional subtitle
 * @param {string}  [props.gradient]   — Override gradient (default: primary)
 * @param {Array}   [props.breadcrumbs]— [{label,path},...] breadcrumb items
 * @param {Array}   [props.chips]      — [{label,icon?,color?},...] info chips
 * @param {node}    [props.actions]    — Right-side action buttons
 * @param {node}    [props.avatar]     — Left avatar / icon
 * @param {boolean} [props.showBack]   — Show back button
 * @param {object}  [props.sx]         — Extra sx styles
 */
const PageHeader = ({
  title,
  subtitle,
  gradient: gradientProp,
  breadcrumbs = [],
  chips = [],
  actions,
  avatar,
  showBack = false,
  sx = {},
}) => {
  const navigate = useNavigate();
  const bg = gradientProp || gradients.primary;

  return (
    <Box
      sx={{
        background: bg,
        borderRadius: 3,
        p: { xs: 2, md: 3 },
        mb: 3,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {/* Decorative circles */}
      <Box sx={{ position: 'absolute', top: -40, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
      <Box sx={{ position: 'absolute', bottom: -60, right: -30, width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <Breadcrumbs
            separator={<NextIcon sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }} />}
            sx={{ mb: 1.5, '& .MuiBreadcrumbs-li': { color: 'rgba(255,255,255,0.7)' } }}
          >
            <Link
              underline="hover"
              sx={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.85rem' }}
              onClick={() => navigate('/')}
            >
              <HomeIcon sx={{ mr: 0.5, fontSize: 16 }} />
              الرئيسية
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <Link
                key={i}
                underline={crumb.path ? 'hover' : 'none'}
                sx={{ color: i === breadcrumbs.length - 1 ? 'white' : 'rgba(255,255,255,0.7)', cursor: crumb.path ? 'pointer' : 'default', fontSize: '0.85rem', fontWeight: i === breadcrumbs.length - 1 ? 600 : 400 }}
                onClick={() => crumb.path && navigate(crumb.path)}
              >
                {crumb.label}
              </Link>
            ))}
          </Breadcrumbs>
        )}

        {/* Main row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {showBack && (
            <Tooltip title="رجوع">
              <IconButton sx={{ color: 'white', background: 'rgba(255,255,255,0.1)', '&:hover': { background: 'rgba(255,255,255,0.2)' } }} onClick={() => navigate(-1)}>
                <BackIcon />
              </IconButton>
            </Tooltip>
          )}

          {avatar && <Box sx={{ flexShrink: 0 }}>{avatar}</Box>}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: subtitle ? 0.5 : 0, lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.3 }}>
                {subtitle}
              </Typography>
            )}
            {chips.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {chips.map((chip, i) => (
                  <Chip
                    key={i}
                    label={chip.label}
                    icon={chip.icon || undefined}
                    size="small"
                    sx={{
                      background: chip.color ? alpha(chip.color, 0.2) : 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontSize: '0.75rem',
                      '& .MuiChip-icon': { color: 'white' },
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {actions && <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>{actions}</Box>}
        </Box>
      </Box>
    </Box>
  );
};

export default PageHeader;
