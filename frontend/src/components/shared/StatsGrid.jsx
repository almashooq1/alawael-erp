import { Box, Card, CardContent, Typography, Avatar, Grid, alpha } from '@mui/material';
import { TrendingUp as UpIcon, TrendingDown as DownIcon, TrendingFlat as FlatIcon } from '@mui/icons-material';

/**
 * StatsGrid — Displays a grid of stat cards with icons, values, trends.
 *
 * @param {Array}  stats      — [{label, value, sub?, icon?, gradient?, color?, trend?, path?, onClick?}]
 * @param {number} [columns]  — Grid columns per stat (default auto-calculated)
 * @param {object} [sx]       — Extra sx styles
 */
const StatsGrid = ({ stats = [], columns, sx = {} }) => {
  const getGridSize = () => {
    const len = stats.length;
    if (columns) return columns;
    if (len <= 4) return 3;
    if (len <= 6) return 2;
    if (len <= 8) return 1.5;
    return 1.5;
  };

  const gridSize = getGridSize();

  return (
    <Grid container spacing={2} sx={sx}>
      {stats.map((stat, i) => (
        <Grid item xs={6} sm={4} md={gridSize} key={stat.label || i}>
          <Card
            sx={{
              height: '100%',
              background: stat.gradient || undefined,
              backgroundColor: !stat.gradient ? (stat.color ? alpha(stat.color, 0.06) : '#fff') : undefined,
              color: stat.gradient ? 'white' : 'inherit',
              borderRadius: 2,
              boxShadow: stat.gradient ? 3 : 1,
              cursor: stat.onClick || stat.path ? 'pointer' : 'default',
              transition: 'all .3s',
              border: !stat.gradient ? `1px solid ${alpha(stat.color || '#1E88E5', 0.15)}` : 'none',
              '&:hover': (stat.onClick || stat.path) ? { transform: 'translateY(-4px)', boxShadow: 6 } : {},
            }}
            onClick={stat.onClick}
          >
            <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
              {stat.icon && (
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    mx: 'auto',
                    mb: 1,
                    background: stat.gradient ? 'rgba(255,255,255,0.25)' : alpha(stat.color || '#1E88E5', 0.1),
                    color: stat.gradient ? 'white' : (stat.color || '#1E88E5'),
                  }}
                >
                  {stat.icon}
                </Avatar>
              )}
              <Typography variant="h5" sx={{ fontWeight: 'bold', lineHeight: 1.1 }}>{stat.value}</Typography>
              <Typography variant="caption" sx={{ opacity: stat.gradient ? 0.85 : 0.7, display: 'block', mt: 0.3 }}>
                {stat.label}
              </Typography>
              {stat.sub && (
                <Typography variant="caption" sx={{ opacity: stat.gradient ? 0.6 : 0.5, fontSize: '0.65rem', display: 'block' }}>
                  {stat.sub}
                </Typography>
              )}
              {stat.trend !== undefined && stat.trend !== null && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5, gap: 0.3 }}>
                  {stat.trend > 0 && <UpIcon sx={{ fontSize: 14, color: stat.gradient ? 'rgba(255,255,255,0.9)' : '#43A047' }} />}
                  {stat.trend < 0 && <DownIcon sx={{ fontSize: 14, color: stat.gradient ? 'rgba(255,255,255,0.9)' : '#E53935' }} />}
                  {stat.trend === 0 && <FlatIcon sx={{ fontSize: 14, color: stat.gradient ? 'rgba(255,255,255,0.7)' : '#9E9E9E' }} />}
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, color: stat.gradient ? 'rgba(255,255,255,0.9)' : (stat.trend > 0 ? '#43A047' : stat.trend < 0 ? '#E53935' : '#9E9E9E') }}>
                    {stat.trend > 0 ? '+' : ''}{stat.trend}%
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default StatsGrid;
