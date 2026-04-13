/**
 * KPICard & QuickAction – presentational HR dashboard sub-components.
 */

export const KPICard = ({ title, value, subtitle, icon, color, onClick }) => (
  <Card
    elevation={0}
    onClick={onClick}
    sx={{
      borderRadius: 3,
      border: '1px solid',
      borderColor: 'divider',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s',
      '&:hover': onClick
        ? { borderColor: `${color}.main`, transform: 'translateY(-2px)', boxShadow: 3 }
        : {},
      height: '100%',
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.lighter`, color: `${color}.main`, width: 48, height: 48 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

export const QuickAction = ({ icon, label, onClick, color = 'primary' }) => (
  <Button
    variant="outlined"
    startIcon={icon}
    onClick={onClick}
    color={color}
    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 2.5, py: 1.2 }}
  >
    {label}
  </Button>
);
