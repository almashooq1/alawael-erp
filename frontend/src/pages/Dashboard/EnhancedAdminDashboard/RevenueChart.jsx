

import { statusColors } from 'theme/palette';

/** Revenue & expenses area chart with time-range chips */
const RevenueChart = ({ revenueData, timeRange, setTimeRange }) => (
  <Card elevation={3}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          الإيرادات والمصروفات
        </Typography>
        <Stack direction="row" spacing={1}>
          {['أسبوع', 'شهر', 'سنة'].map((range) => (
            <Chip
              key={range}
              label={range}
              onClick={() => setTimeRange(range)}
              variant={timeRange === range ? 'filled' : 'outlined'}
              color="primary"
              size="small"
            />
          ))}
        </Stack>
      </Box>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={revenueData}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={statusColors.info} stopOpacity={0.8} />
              <stop offset="95%" stopColor={statusColors.info} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={statusColors.error} stopOpacity={0.8} />
              <stop offset="95%" stopColor={statusColors.error} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <ChartTooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={statusColors.info}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            name="الإيرادات"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke={statusColors.error}
            fillOpacity={1}
            fill="url(#colorExpenses)"
            name="المصروفات"
          />
        </AreaChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default RevenueChart;
