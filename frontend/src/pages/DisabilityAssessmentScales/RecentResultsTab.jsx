import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import { surfaceColors } from '../../theme/palette';
import { TabPanel } from './constants';

/**
 * Tab 1 — shows the most recent assessment results with domain mini‑bars.
 */
const RecentResultsTab = ({ tabValue, scales, scaleResults, onOpenDetail }) => (
  <TabPanel value={tabValue} index={1}>
    {scaleResults.length === 0 ? (
      <Alert severity="info">لا توجد نتائج تقييم بعد. ابدأ بتطبيق أحد المقاييس.</Alert>
    ) : (
      <Grid container spacing={2}>
        {scaleResults.map((result) => {
          const scale = scales.find((s) => s.id === result.scaleId);
          return (
            <Grid item xs={12} md={6} key={result.id}>
              <Card
                elevation={2}
                sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 } }}
                onClick={() => onOpenDetail(result)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {result.scaleName}
                    </Typography>
                    <Chip
                      label={result.level}
                      size="small"
                      sx={{ bgcolor: result.levelColor, color: 'white' }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {result.beneficiaryName} — {result.date}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">الدرجة الكلية</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {result.totalScore}/{result.maxScore} ({result.percentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={result.percentage}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: surfaceColors.divider,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: result.levelColor,
                          borderRadius: 5,
                        },
                      }}
                    />
                  </Box>
                  {/* Domain mini-bars */}
                  {scale && (
                    <Box sx={{ mt: 2 }}>
                      {scale.domains.map((d) => {
                        const domainScore = result.domainScores?.[d.key] || 0;
                        const pct = Math.round((domainScore / d.maxScore) * 100);
                        return (
                          <Box key={d.key} sx={{ mb: 0.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption">{d.name}</Typography>
                              <Typography variant="caption" fontWeight="bold">
                                {domainScore}/{d.maxScore}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: surfaceColors.divider,
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: scale.color,
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    )}
  </TabPanel>
);

export default RecentResultsTab;
