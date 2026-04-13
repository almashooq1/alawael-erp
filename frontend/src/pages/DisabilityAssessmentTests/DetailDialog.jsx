/**
 * DetailDialog – detailed view of a single test result
 */
import {
  Box, Grid, Dialog, DialogTitle, DialogContent,
  Typography, IconButton, Chip, Tooltip, Alert,
  Paper, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  Print as PrintIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { surfaceColors } from '../../theme/palette';
import { getLevelColor } from './constants';

const DetailDialog = ({ open, onClose, selectedResult, tests }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    {selectedResult && (() => {
      const test = tests.find((t) => t.id === selectedResult.testId);
      return (
        <>
          <DialogTitle sx={{ bgcolor: getLevelColor(selectedResult.percentage), color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>تفاصيل اختبار: {selectedResult.testName}</span>
            <Box>
              <Tooltip title="طباعة">
                <IconButton sx={{ color: '#fff' }} onClick={() => window.print()} aria-label="طباعة">
                  <PrintIcon />
                </IconButton>
              </Tooltip>
              <IconButton sx={{ color: '#fff' }} onClick={onClose} aria-label="إغلاق"><CloseIcon /></IconButton>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ pt: 3 }}>
            {/* Header info */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">المستفيد</Typography>
                <Typography fontWeight="bold">{selectedResult.beneficiaryName}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">التاريخ</Typography>
                <Typography fontWeight="bold">{selectedResult.date}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">المقيّم</Typography>
                <Typography fontWeight="bold">{selectedResult.assessorName}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">المستوى</Typography>
                <Chip label={selectedResult.overallLevel} sx={{ bgcolor: getLevelColor(selectedResult.percentage), color: '#fff' }} />
              </Grid>
            </Grid>

            {/* Overall Score */}
            <Paper elevation={1} sx={{ p: 2, mb: 3, textAlign: 'center' }}>
              <Typography variant="h3" fontWeight="bold" color={getLevelColor(selectedResult.percentage)}>
                {selectedResult.percentage}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedResult.totalScore} من {selectedResult.maxPossible} ({selectedResult.totalItems} عنصر)
              </Typography>
              <LinearProgress
                variant="determinate"
                value={selectedResult.percentage}
                sx={{
                  height: 12, borderRadius: 6, mt: 1, bgcolor: surfaceColors.divider,
                  '& .MuiLinearProgress-bar': { bgcolor: getLevelColor(selectedResult.percentage), borderRadius: 6 },
                }}
              />
            </Paper>

            {/* Category breakdown */}
            {test && test.categories.map((cat) => {
              const catScores = selectedResult.scores?.[cat.key] || {};
              return (
                <Box key={cat.key} sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>{cat.name}</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: surfaceColors.lightGray }}>
                          <TableCell>العنصر</TableCell>
                          <TableCell align="center">الدرجة</TableCell>
                          <TableCell>المستوى</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cat.items.map((item) => {
                          const score = catScores[item.key] ?? 0;
                          const levelLabel = item.levels[score] || item.levels[0];
                          return (
                            <TableRow key={item.key}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell align="center">{score}/{item.levels.length - 1}</TableCell>
                              <TableCell>
                                <Chip label={levelLabel} size="small" variant="outlined" />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              );
            })}

            {/* Notes & Recommendations */}
            {selectedResult.notes && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2">الملاحظات:</Typography>
                <Typography variant="body2">{selectedResult.notes}</Typography>
              </Alert>
            )}
            {selectedResult.recommendations?.length > 0 && (
              <Alert severity="warning">
                <Typography variant="subtitle2">التوصيات:</Typography>
                <Box component="ul" sx={{ margin: 0, paddingInlineStart: '20px' }}>
                  {selectedResult.recommendations.map((rec, i) => (
                    <li key={i}><Typography variant="body2">{rec}</Typography></li>
                  ))}
                </Box>
              </Alert>
            )}
          </DialogContent>
        </>
      );
    })()}
  </Dialog>
);

export default DetailDialog;
