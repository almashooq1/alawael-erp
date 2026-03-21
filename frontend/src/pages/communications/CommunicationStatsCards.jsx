/**
 * CommunicationStatsCards — 4 summary stat cards
 */


import {
  Card,
  CardContent,
  Grid,
  Typography
} from '@mui/material';
const CommunicationStatsCards = ({ stats }) => (
  <Grid container spacing={2} sx={{ mb: 3 }}>
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ bgcolor: 'primary.light', color: 'white' }}>
        <CardContent>
          <Typography variant="h6">إجمالي المراسلات</Typography>
          <Typography variant="h3">{stats.total}</Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ bgcolor: 'warning.light', color: 'white' }}>
        <CardContent>
          <Typography variant="h6">غير مقروءة</Typography>
          <Typography variant="h3">{stats.unread}</Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ bgcolor: 'info.light', color: 'white' }}>
        <CardContent>
          <Typography variant="h6">قيد الانتظار</Typography>
          <Typography variant="h3">{stats.pending}</Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
        <CardContent>
          <Typography variant="h6">اليوم</Typography>
          <Typography variant="h3">{stats.today}</Typography>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

export default CommunicationStatsCards;
