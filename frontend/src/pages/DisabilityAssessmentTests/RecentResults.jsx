/**
 * RecentResults – Tab 1: Recent test results
 */

import { surfaceColors } from '../../theme/palette';
import { getLevelColor } from './constants';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Typography
} from '@mui/material';

const RecentResults = ({ testResults, onOpenDetail }) => {
  if (testResults.length === 0) {
    return <Alert severity="info">لا توجد نتائج اختبارات بعد. ابدأ بتطبيق أحد الاختبارات.</Alert>;
  }

  return (
    <Grid container spacing={2}>
      {testResults.map((result) => (
        <Grid item xs={12} md={6} key={result.id}>
          <Card
            elevation={2}
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 } }}
            onClick={() => onOpenDetail(result)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">{result.testName}</Typography>
                <Chip
                  label={result.overallLevel}
                  size="small"
                  sx={{ bgcolor: getLevelColor(result.percentage), color: '#fff' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {result.beneficiaryName} — {result.date}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">الدرجة الكلية</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {result.totalScore}/{result.maxPossible} ({result.percentage}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={result.percentage}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: surfaceColors.divider,
                    '& .MuiLinearProgress-bar': { bgcolor: getLevelColor(result.percentage), borderRadius: 5 },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default RecentResults;
