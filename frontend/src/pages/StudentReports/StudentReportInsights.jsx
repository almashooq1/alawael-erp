/**
 * StudentReportInsights — Insights, Risk Signals, Recommendations & Comparison
 */

import React from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack,
  Chip, Divider, LinearProgress, Alert, Paper,
} from '@mui/material';
import { Insights as InsightsIcon } from '@mui/icons-material';

const StudentReportInsights = ({
  safeInsights, safeRiskSignals, safeRecommendations,
  safeComparison, comparisonCurrentLabel, comparisonCurrentSummary,
  comparisonPreviousLabel, comparisonPreviousSummary, formatDeltaValue,
}) => (
  <>
    {/* Insights & Risk */}
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} md={7}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              💡 الرؤى الذكية
            </Typography>
            {safeInsights.length > 0 ? (
              <Stack spacing={2}>
                {safeInsights.map(item => (
                  <Alert key={item.title} severity={item.type} icon={<InsightsIcon />} sx={{ borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.title}</Typography>
                    <Typography variant="caption" color="textSecondary">{item.details}</Typography>
                  </Alert>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="textSecondary">
                لا توجد رؤى متاحة للفترة الحالية.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={5}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              🚦 مؤشرات المخاطر
            </Typography>
            {safeRiskSignals.length > 0 ? (
              <Stack spacing={2}>
                {safeRiskSignals.map(signal => (
                  <Box key={signal.label}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{signal.label}</Typography>
                      <Typography variant="caption" color="textSecondary">{signal.levelLabel}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={signal.score}
                      sx={{ height: 8, borderRadius: 3 }}
                      color={signal.level === 'low' ? 'success' : signal.level === 'medium' ? 'warning' : 'error'} />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="textSecondary">
                لا توجد مؤشرات مخاطر مسجلة حاليًا.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>

    {/* Recommendations */}
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          ✅ التوصيات وخطة التحسين
        </Typography>
        {safeRecommendations.length > 0 ? (
          <Grid container spacing={2}>
            {safeRecommendations.map(item => (
              <Grid item xs={12} md={6} key={item.title}>
                <Paper sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{item.title}</Typography>
                    <Typography variant="caption" color="textSecondary">الأولوية: {item.priority}</Typography>
                    <Divider />
                    <Stack spacing={0.5}>
                      {item.actions.length > 0 ? (
                        item.actions.map(action => (
                          <Typography key={action} variant="body2">• {action}</Typography>
                        ))
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          لا توجد إجراءات محددة بعد.
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" color="textSecondary">
            لا توجد توصيات متاحة حاليًا.
          </Typography>
        )}
      </CardContent>
    </Card>

    {/* Comparison Summary */}
    <Card sx={{ mt: 3, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          🧭 مقارنة الفترات
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="textSecondary">
              الفترة الحالية: {comparisonCurrentLabel}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {comparisonCurrentSummary}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="textSecondary">
              الفترة السابقة: {comparisonPreviousLabel}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {comparisonPreviousSummary}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack spacing={1}>
              {(safeComparison.delta || []).length > 0 ? (
                (safeComparison.delta || []).map(item => (
                  <Chip key={item.label}
                    label={`${item.label}: ${formatDeltaValue(item.value) ?? '—'}`}
                    color={item.type === 'positive' ? 'success' : 'warning'}
                    variant="outlined" />
                ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  لا توجد فروقات متاحة للمقارنة.
                </Typography>
              )}
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  </>
);

export default StudentReportInsights;
