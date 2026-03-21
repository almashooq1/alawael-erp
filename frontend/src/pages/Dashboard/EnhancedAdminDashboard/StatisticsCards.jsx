

import { gradients } from 'theme/palette';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Typography
} from '@mui/material';
import People from '@mui/icons-material/People';
import AttachMoney from '@mui/icons-material/AttachMoney';
import CheckCircle from '@mui/icons-material/CheckCircle';
import TrendingUp from '@mui/icons-material/TrendingUp';
import TrendingDown from '@mui/icons-material/TrendingDown';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/** 4 KPI stat cards with skeleton loading state */
const StatisticsCards = ({ loading, statistics }) => (
  <Grid container spacing={3} sx={{ mb: 4 }}>
    {loading ? (
      [0, 1, 2, 3].map((i) => (
        <Grid item xs={12} sm={6} md={3} key={i}>
          <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
        </Grid>
      ))
    ) : [{
        title: 'إجمالي المستفيدين',
        value: statistics.beneficiaries.total,
        change: statistics.beneficiaries.change,
        trend: statistics.beneficiaries.trend,
        icon: <People fontSize="large" />,
        color: gradients.primary,
      },
      {
        title: 'الجلسات الشهرية',
        value: statistics.sessions.total,
        change: statistics.sessions.change,
        trend: statistics.sessions.trend,
        icon: <EventNote fontSize="large" />,
        color: gradients.warning,
      },
      {
        title: 'الإيرادات (ريال)',
        value: statistics.revenue.total.toLocaleString(),
        change: statistics.revenue.change,
        trend: statistics.revenue.trend,
        icon: <AttachMoney fontSize="large" />,
        color: gradients.info,
      },
      {
        title: 'نسبة الحضور',
        value: `${statistics.attendance.total}%`,
        change: statistics.attendance.change,
        trend: statistics.attendance.trend,
        icon: <CheckCircle fontSize="large" />,
        color: gradients.success,
      },
    ].map((stat, index) => (
      <Grid item xs={12} sm={6} md={3} key={index}>
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: index * 0.1 }}
        >
          <Card
            sx={{
              background: stat.color,
              color: 'white',
              height: '100%',
              transition: 'transform 0.3s',
              '&:hover': { transform: 'translateY(-8px)' },
            }}
            elevation={3}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stat.value}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  {stat.icon}
                </Avatar>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                {stat.trend === 'up' ? (
                  <TrendingUp fontSize="small" />
                ) : (
                  <TrendingDown fontSize="small" />
                )}
                <Typography variant="body2">
                  {stat.change > 0 ? '+' : ''}{stat.change}% من الشهر الماضي
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Grid>
    ))}
  </Grid>
);

export default StatisticsCards;
