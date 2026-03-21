
/**
 * ChartCard — Wrapper card for Recharts charts with title, actions, and responsive container.
 *
 * @param {string}  title       — Chart title
 * @param {string}  [subtitle]  — Optional subtitle
 * @param {node}    children    — Recharts chart component
 * @param {number}  [height]    — Chart height (default 280)
 * @param {node}    [actions]   — Action buttons
 * @param {string}  [icon]      — Title emoji icon
 * @param {object}  [sx]        — Extra card styles
 */
const ChartCard = ({
  title,
  subtitle,
  children,
  height = 280,
  actions,
  icon,
  sx = {},
}) => {
  return (
    <Card sx={{ borderRadius: 2, boxShadow: 3, height: '100%', ...sx }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {icon && <span style={{ marginLeft: 4 }}>{icon}</span>} {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
            )}
          </Box>
          {actions && <Box sx={{ display: 'flex', gap: 0.5 }}>{actions}</Box>}
        </Box>
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ChartCard;
