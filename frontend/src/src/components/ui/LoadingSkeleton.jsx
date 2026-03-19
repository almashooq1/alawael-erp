/**
 * Loading Skeletons - Placeholder Components
 * هياكل التحميل - مكونات العناصر المؤقتة
 */

import React from 'react';
import { Box, Card, CardContent, Grid, Skeleton, Stack } from '@mui/material';

// Dashboard Loading Skeleton
export const DashboardSkeleton = () => (
  <Box sx={{ p: 3 }}>
    {/* Header */}
    <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 4, mb: 4 }} />
    
    {/* Stats Cards */}
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {[1, 2, 3, 4].map(i => (
        <Grid item xs={12} sm={6} md={3} key={i}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Skeleton variant="circular" width={56} height={56} />
                  <Skeleton variant="text" width={80} height={48} />
                </Stack>
                <Skeleton variant="text" width="80%" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
    
    {/* Charts */}
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Skeleton variant="rectangular" height={350} sx={{ borderRadius: 4 }} />
      </Grid>
      <Grid item xs={12} md={4}>
        <Skeleton variant="rectangular" height={350} sx={{ borderRadius: 4 }} />
      </Grid>
    </Grid>
  </Box>
);

// Report Loading Skeleton
export const ReportSkeleton = () => (
  <Box sx={{ p: 3 }}>
    {/* Header */}
    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 4, mb: 3 }} />
    
    {/* Filters */}
    <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 3, mb: 3 }} />
    
    {/* Summary Cards */}
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {[1, 2, 3, 4].map(i => (
        <Grid item xs={12} sm={6} md={3} key={i}>
          <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 4 }} />
        </Grid>
      ))}
    </Grid>
    
    {/* Charts */}
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} md={7}>
        <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 4 }} />
      </Grid>
      <Grid item xs={12} md={5}>
        <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 4 }} />
      </Grid>
    </Grid>
  </Box>
);

// Table Loading Skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <Box>
    <Skeleton variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 2 }} />
    {Array.from({ length: rows }).map((_, i) => (
      <Grid container spacing={2} key={i} sx={{ mb: 1 }}>
        {Array.from({ length: columns }).map((_, j) => (
          <Grid item xs={12 / columns} key={j}>
            <Skeleton variant="text" height={48} />
          </Grid>
        ))}
      </Grid>
    ))}
  </Box>
);

// Card Loading Skeleton
export const CardSkeleton = ({ height = 200 }) => (
  <Card sx={{ borderRadius: 4 }}>
    <CardContent>
      <Stack spacing={2}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="40%" height={24} />
        <Skeleton variant="rectangular" height={height - 100} sx={{ borderRadius: 2 }} />
      </Stack>
    </CardContent>
  </Card>
);

// List Loading Skeleton
export const ListSkeleton = ({ items = 5 }) => (
  <Stack spacing={2}>
    {Array.from({ length: items }).map((_, i) => (
      <Card key={i} sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={48} height={48} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="70%" height={24} />
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    ))}
  </Stack>
);

const loadingSkeletons = {
  DashboardSkeleton,
  ReportSkeleton,
  TableSkeleton,
  CardSkeleton,
  ListSkeleton,
};

export default loadingSkeletons;
