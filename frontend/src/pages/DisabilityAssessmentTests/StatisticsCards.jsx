/**
 * StatisticsCards – 4 KPI cards for assessment tests
 */

import { gradients } from '../../theme/palette';
import {
  Card,
  CardContent,
  Grid,
  Typography
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';

const StatisticsCards = ({ statistics }) => (
  <Grid container spacing={2} sx={{ mb: 4 }}>
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ background: gradients.assessmentBlue }}>
        <CardContent sx={{ textAlign: 'center', color: '#fff' }}>
          <AssignmentIcon sx={{ fontSize: 40 }} />
          <Typography variant="h4" fontWeight="bold">{statistics.testAssessments}</Typography>
          <Typography variant="body2">اختبارات مكتملة</Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ background: gradients.greenStatus }}>
        <CardContent sx={{ textAlign: 'center', color: '#fff' }}>
          <PersonIcon sx={{ fontSize: 40 }} />
          <Typography variant="h4" fontWeight="bold">{statistics.totalBeneficiaries}</Typography>
          <Typography variant="body2">المستفيدون</Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ background: gradients.orangeStatus }}>
        <CardContent sx={{ textAlign: 'center', color: '#fff' }}>
          <TrendingUpIcon sx={{ fontSize: 40 }} />
          <Typography variant="h4" fontWeight="bold">{statistics.averageScore}%</Typography>
          <Typography variant="body2">متوسط الأداء</Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ background: gradients.assessmentPurple }}>
        <CardContent sx={{ textAlign: 'center', color: '#fff' }}>
          <BarChartIcon sx={{ fontSize: 40 }} />
          <Typography variant="h4" fontWeight="bold">{statistics.completionRate}%</Typography>
          <Typography variant="body2">معدل الإنجاز</Typography>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

export default StatisticsCards;
