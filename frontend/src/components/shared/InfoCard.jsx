import {
  Box,
  Card,
  CardContent,
  Typography,
  alpha
} from '@mui/material';

/**
 * InfoCard — Informational display card with icon, title, and content.
 *
 * @param {string} title     — Card title
 * @param {string} [subtitle]— Optional subtitle
 * @param {node}   [icon]    — Icon element
 * @param {string} [color]   — Accent color
 * @param {node}   children  — Card body content
 * @param {node}   [actions] — Footer actions
 * @param {object} [sx]      — Extra styles
 */
const InfoCard = ({
  title,
  subtitle,
  icon,
  color = '#1E88E5',
  children,
  actions,
  variant = 'default',
  sx = {},
}) => {
  const styles = {
    default: {},
    bordered: { borderRight: `4px solid ${color}` },
    elevated: { boxShadow: 4 },
    outlined: { border: `1px solid ${alpha(color, 0.3)}`, boxShadow: 'none' },
    gradient: { background: `linear-gradient(135deg, ${alpha(color, 0.04)} 0%, ${alpha(color, 0.01)} 100%)` },
  };

  return (
    <Card sx={{ borderRadius: 2, boxShadow: 2, height: '100%', ...styles[variant], ...sx }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: children ? 1.5 : 0 }}>
          {icon && (
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', background: alpha(color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
              {icon}
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{title}</Typography>
            {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
          </Box>
        </Box>
        {children}
        {actions && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
            {actions}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default InfoCard;
