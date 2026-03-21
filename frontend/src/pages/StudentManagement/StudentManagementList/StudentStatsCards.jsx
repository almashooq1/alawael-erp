
/** 4 KPI stat cards for student management */
import {
  Avatar,
  Box,
  CardContent,
  Fade,
  Grid,
  Skeleton,
  Typography
} from '@mui/material';
const StudentStatsCards = ({ statCards, loading }) => (
  <Grid container spacing={2} sx={{ mb: 3 }}>
    {statCards.map((card, i) => (
      <Grid item xs={6} sm={3} key={i}>
        <Fade in timeout={400 + i * 150}>
          <StatCard gradient={card.gradient}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  sx={{
                    width: 44,
                    height: 44,
                    background: card.gradient,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {card.icon}
                </Avatar>
                <Box>
                  {loading ? (
                    <Skeleton width={60} height={32} />
                  ) : (
                    <Typography variant="h5" fontWeight="bold">
                      {card.value}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {card.label}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </StatCard>
        </Fade>
      </Grid>
    ))}
  </Grid>
);

export default StudentStatsCards;
