

import { surfaceColors } from '../../theme/palette';
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Tooltip,
  Typography
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Dialog showing the full detail of a single assessment result:
 * header info, radar chart, overall score bar, per-domain breakdown,
 * notes & recommendations.
 */
const DetailDialog = ({ open, selectedResult, scales, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    {selectedResult &&
      (() => {
        const scale = scales.find((s) => s.id === selectedResult.scaleId);
        /* Build radar data from domains */
        const radarData = scale
          ? scale.domains.map((d) => ({
              domain: d.name,
              score: selectedResult.domainScores?.[d.key] || 0,
              max: d.maxScore,
              pct: Math.round(((selectedResult.domainScores?.[d.key] || 0) / d.maxScore) * 100),
            }))
          : [];
        return (
          <>
            <DialogTitle
              sx={{
                bgcolor: selectedResult.levelColor,
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>تفاصيل تقييم: {selectedResult.scaleName}</span>
              <Box>
                <Tooltip title="طباعة">
                  <IconButton
                    sx={{ color: 'white' }}
                    onClick={() => window.print()}
                    aria-label="طباعة"
                  >
                    <PrintIcon />
                  </IconButton>
                </Tooltip>
                <IconButton sx={{ color: 'white' }} onClick={onClose} aria-label="إغلاق">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 3 }}>
              {/* Header info */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    المستفيد
                  </Typography>
                  <Typography fontWeight="bold">{selectedResult.beneficiaryName}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    التاريخ
                  </Typography>
                  <Typography fontWeight="bold">{selectedResult.date}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    المقيّم
                  </Typography>
                  <Typography fontWeight="bold">{selectedResult.assessorName}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    المستوى
                  </Typography>
                  <Chip
                    label={selectedResult.level}
                    sx={{ bgcolor: selectedResult.levelColor, color: 'white' }}
                  />
                </Grid>
              </Grid>

              {/* Overall score */}
              <Paper elevation={1} sx={{ p: 2, mb: 3, textAlign: 'center' }}>
                <Typography
                  variant="h3"
                  fontWeight="bold"
                  color={selectedResult.levelColor}
                >
                  {selectedResult.percentage}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedResult.totalScore} من {selectedResult.maxScore}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={selectedResult.percentage}
                  sx={{
                    height: 12,
                    borderRadius: 6,
                    mt: 1,
                    bgcolor: surfaceColors.divider,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: selectedResult.levelColor,
                      borderRadius: 6,
                    },
                  }}
                />
              </Paper>

              {/* Radar Chart — domain comparison */}
              {radarData.length > 0 && (
                <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                  <Typography variant="h6" gutterBottom textAlign="center">
                    الملف التقييمي للمجالات
                  </Typography>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid />
                      <PolarAngleAxis dataKey="domain" tick={{ fontSize: 12, fill: '#555' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        formatter={(value, _name) => [`${value}%`, 'النسبة']}
                        labelFormatter={(label) => label}
                      />
                      <Radar
                        name="النسبة المئوية"
                        dataKey="pct"
                        stroke={selectedResult.levelColor}
                        fill={selectedResult.levelColor}
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </Paper>
              )}

              {/* Domain breakdown */}
              {scale && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    تفصيل المجالات
                  </Typography>
                  {scale.domains.map((d) => {
                    const score = selectedResult.domainScores?.[d.key] || 0;
                    const pct = Math.round((score / d.maxScore) * 100);
                    return (
                      <Paper
                        key={d.key}
                        elevation={0}
                        sx={{ p: 1.5, mb: 1, bgcolor: surfaceColors.paperAlt }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography fontWeight="bold">{d.name}</Typography>
                          <Typography fontWeight="bold" color={scale.color}>
                            {score}/{d.maxScore} ({pct}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: surfaceColors.divider,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: scale.color,
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Paper>
                    );
                  })}
                </Box>
              )}

              {/* Notes & recommendations */}
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
                      <li key={i}>
                        <Typography variant="body2">{rec}</Typography>
                      </li>
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
