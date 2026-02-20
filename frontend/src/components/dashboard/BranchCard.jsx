/**
 * Branch Card Component
 * Displays summary information for a single branch
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  LinearProgress,
  Skeleton,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Info,
  Edit,
  MoreVert,
  Refresh,
} from '@mui/icons-material';

const BranchCard = ({ branch, kpis, onSelect, onSync, loading = false }) => {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardHeader title={<Skeleton width="80%" />} />
        <CardContent>
          <Skeleton height={60} />
          <Skeleton height={40} style={{ marginTop: 10 }} />
        </CardContent>
      </Card>
    );
  }

  if (!branch) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">Branch data not available</Typography>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status) => {
    const statusMap = {
      ACTIVE: '#4caf50',
      INACTIVE: '#9e9e9e',
      CLOSED: '#f44336',
      SUSPENDED: '#ff9800',
      PLANNED: '#2196f3',
    };
    return statusMap[status] || '#757575';
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      ACTIVE: 'نشط',
      INACTIVE: 'غير نشط',
      CLOSED: 'مغلق',
      SUSPENDED: 'معلق',
      PLANNED: 'مخطط',
    };
    return labelMap[status] || status;
  };

  const overallScore = kpis?.overallScore || 0;
  const trend = kpis?.trend || 'stable';
  const trendIcon = trend === 'upward' ? <TrendingUp sx={{ color: 'green' }} /> : <TrendingDown sx={{ color: 'red' }} />;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-4px)',
        },
      }}
    >
      <CardHeader
        title={branch.name || branch.id}
        subheader={branch.location || branch.address}
        avatar={
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: getStatusColor(branch.status),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px',
              fontWeight: 'bold',
            }}
          >
            {branch.name?.charAt(0) || 'B'}
          </Box>
        }
        action={
          <Tooltip title="خيارات">
            <IconButton size="small">
              <MoreVert />
            </IconButton>
          </Tooltip>
        }
      />

      <CardContent sx={{ flex: 1 }}>
        <Grid container spacing={2}>
          {/* Status */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" color="textSecondary">
                الحالة:
              </Typography>
              <Chip
                label={getStatusLabel(branch.status)}
                size="small"
                sx={{
                  bgcolor: getStatusColor(branch.status),
                  color: 'white',
                }}
              />
            </Box>
          </Grid>

          {/* KPI Score */}
          <Grid item xs={12}>
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  درجة الأداء الإجمالية
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {overallScore}%
                  </Typography>
                  {trendIcon}
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={overallScore}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: overallScore >= 80 ? '#4caf50' : overallScore >= 60 ? '#ff9800' : '#f44336',
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          </Grid>

          {/* KPI Details */}
          {kpis?.kpis && (
            <Grid item xs={12}>
              <Grid container spacing={1}>
                {Object.entries(kpis.kpis).map(([key, value]) => (
                  <Grid item xs={6} key={key}>
                    <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'capitalize' }}>
                        {key}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          )}
        </Grid>
      </CardContent>

      <CardActions>
        <Button
          size="small"
          onClick={() => onSelect(branch.id)}
          variant="outlined"
        >
          عرض التفاصيل
        </Button>
        <Button
          size="small"
          onClick={() => onSync(branch.id)}
          startIcon={<Refresh />}
        >
          مزامنة
        </Button>
      </CardActions>
    </Card>
  );
};

export default BranchCard;
