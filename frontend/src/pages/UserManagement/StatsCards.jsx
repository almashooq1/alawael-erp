/**
 * StatsCards — بطاقات الإحصائيات
 */
import { Grid, Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import {
  People as PeopleIcon,
  CheckCircle as ActiveIcon,
  Block as InactiveIcon,
  Lock as LockedIcon,
  PersonAdd as NewIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';
import { gradients } from '../../theme/palette';

const statCards = [
  { key: 'total', label: 'إجمالي المستخدمين', icon: PeopleIcon, gradient: gradients.primary },
  { key: 'active', label: 'المستخدمون النشطون', icon: ActiveIcon, gradient: gradients.success },
  { key: 'inactive', label: 'المستخدمون المعطلون', icon: InactiveIcon, gradient: gradients.warning },
  { key: 'locked', label: 'الحسابات المقفلة', icon: LockedIcon, gradient: gradients.error },
  { key: 'newThisMonth', label: 'مستخدمون جدد (الشهر)', icon: NewIcon, gradient: gradients.info },
];

const StatsCards = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Grid item xs={6} sm={4} md key={i}>
            <Skeleton variant="rounded" height={100} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {statCards.map(({ key, label, icon: Icon, gradient }) => (
        <Grid item xs={6} sm={4} md key={key}>
          <Card
            sx={{
              background: gradient,
              color: 'white',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-2px)' },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Icon sx={{ fontSize: 28, opacity: 0.9 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats[key] ?? 0}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {label}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* إحصائيات الأدوار */}
      {stats.byRole?.length > 0 && (
        <Grid item xs={12}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
              <TrendIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
              توزيع المستخدمين حسب الدور
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {stats.byRole.map(r => (
                <Box
                  key={r.role}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {r.roleLabel || r.role}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({r.count})
                  </Typography>
                </Box>
              ))}
            </Box>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

export default StatsCards;
