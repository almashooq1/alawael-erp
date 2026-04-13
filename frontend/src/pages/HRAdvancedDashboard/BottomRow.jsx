/**
 * BottomRow – Pending leaves list + Performance reviews list.
 */
import React from 'react';
import { statusColors } from '../../theme/palette';
import { STATUS_MAP } from './constants';

const BottomRow = ({ leaves, reviews, navigate }) => (
  <Grid container spacing={3}>
    {/* Pending Leaves */}
    <Grid item xs={12} md={6}>
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            طلبات الإجازات الأخيرة
          </Typography>
          <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate('/hr/leaves')}>
            عرض الكل
          </Button>
        </Box>
        {leaves.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            لا توجد طلبات إجازة
          </Typography>
        ) : (
          leaves.slice(0, 5).map((l, i) => {
            const st = STATUS_MAP[l.status] || { label: l.status, color: 'default' };
            return (
              <Box key={l._id || i}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1.2,
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {l.employeeName || l.employeeId?.firstName || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {l.leaveType || l.type || '—'} · {l.startDate} → {l.endDate}
                    </Typography>
                  </Box>
                  <Chip label={st.label} color={st.color} size="small" variant="outlined" />
                </Box>
                {i < Math.min(leaves.length, 5) - 1 && <Divider />}
              </Box>
            );
          })
        )}
      </Paper>
    </Grid>

    {/* Performance Reviews */}
    <Grid item xs={12} md={6}>
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            تقييمات الأداء
          </Typography>
          <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate('/performance')}>
            عرض الكل
          </Button>
        </Box>
        {reviews.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            لا توجد تقييمات
          </Typography>
        ) : (
          reviews.slice(0, 5).map((r, i) => {
            const rating = r.overallRating || 0;
            const rColor =
              rating >= 4
                ? statusColors.success
                : rating >= 3
                  ? statusColors.info
                  : rating >= 2
                    ? statusColors.warning
                    : statusColors.error;
            const st = STATUS_MAP[r.status] || { label: r.status, color: 'default' };
            return (
              <Box key={r._id || i}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1.2,
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {r.employeeName || r.employeeId?.firstName || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.reviewPeriod || '—'} · {r.type || '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`${rating.toFixed(1)}/5`}
                      size="small"
                      sx={{ bgcolor: rColor, color: '#fff', fontWeight: 700 }}
                    />
                    <Chip label={st.label} color={st.color} size="small" variant="outlined" />
                  </Box>
                </Box>
                {i < Math.min(reviews.length, 5) - 1 && <Divider />}
              </Box>
            );
          })
        )}
      </Paper>
    </Grid>
  </Grid>
);

export default React.memo(BottomRow);
