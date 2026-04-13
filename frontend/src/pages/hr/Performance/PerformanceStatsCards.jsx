/**
 * PerformanceStatsCards.jsx — Stats cards grid
 * Extracted from PerformanceEvaluation.js
 */

const PerformanceStatsCards = ({ stats }) => (
  <Grid container spacing={2} sx={{ mb: 3 }}>
    {stats.map((s, i) => (
      <Grid item xs={6} sm={3} key={i}>
        <Card sx={{ borderRadius: 3, borderTop: `4px solid ${s.color}` }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <Avatar sx={{ bgcolor: `${s.color}15`, color: s.color, width: 44, height: 44 }}>
              {s.icon}
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                {s.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {s.label}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

export default PerformanceStatsCards;
