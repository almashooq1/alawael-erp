/**
 * صفحة تحليل مخاطر الاستقالة وأداء الموظف (AI Employee Insights)
 */
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import { Warning, School, WorkOutline } from '@mui/icons-material';
import { fetchAttritionRisk, fetchTrainingSuggestions } from './api';

const riskColors = {
  حرج: '#d32f2f',
  عالي: '#f44336',
  متوسط: '#ff9800',
  منخفض: '#4caf50',
};

const EmployeeAIInsights = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [attrition, setAttrition] = useState(null);
  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyze = async () => {
    if (!employeeId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const [attrRes, trainRes] = await Promise.all([
        fetchAttritionRisk(employeeId).catch(() => null),
        fetchTrainingSuggestions(employeeId).catch(() => null),
      ]);
      setAttrition(attrRes?.data || null);
      setTraining(trainRes?.data || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3} dir="rtl">
      <Typography variant="h5" fontWeight="bold" mb={3}>
        🔍 تحليل ذكي للموظف
      </Typography>

      {/* Search */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          label="رقم الموظف (Employee ID)"
          value={employeeId}
          onChange={e => setEmployeeId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && analyze()}
          fullWidth
          size="small"
        />
        <Button variant="contained" onClick={analyze} disabled={loading || !employeeId.trim()}>
          {loading ? <CircularProgress size={20} /> : 'تحليل'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* ═══ Attrition Risk ═══ */}
        {attrition && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>
                <Warning sx={{ verticalAlign: 'middle', mr: 1 }} />
                مخاطر الاستقالة
              </Typography>

              <Box textAlign="center" mb={2}>
                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    border: `8px solid ${riskColors[attrition.riskLevel]}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="h3"
                    fontWeight="bold"
                    color={riskColors[attrition.riskLevel]}
                  >
                    {attrition.riskScore}
                  </Typography>
                </Box>
                <Chip
                  label={attrition.riskLevel}
                  sx={{
                    bgcolor: riskColors[attrition.riskLevel],
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
              </Box>

              <Typography variant="subtitle2" mb={1}>
                العوامل المؤثرة:
              </Typography>
              {Object.entries(attrition.factors || {}).map(([key, val]) => (
                <Box
                  key={key}
                  display="flex"
                  justifyContent="space-between"
                  py={0.5}
                  borderBottom="1px solid #f0f0f0"
                >
                  <Typography variant="body2" color="text.secondary">
                    {key}
                  </Typography>
                  <Typography variant="body2">{val}</Typography>
                </Box>
              ))}

              {attrition.recommendations?.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" mb={1}>
                    💡 التوصيات:
                  </Typography>
                  {attrition.recommendations.map((r, i) => (
                    <Alert key={i} severity="info" sx={{ mb: 0.5 }} icon={false}>
                      {i + 1}. {r}
                    </Alert>
                  ))}
                </>
              )}
            </Paper>
          </Grid>
        )}

        {/* ═══ Training Suggestions ═══ */}
        {training && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>
                <School sx={{ verticalAlign: 'middle', mr: 1 }} />
                توصيات التدريب ({training.totalSuggestions} اقتراح)
              </Typography>

              {(training.suggestions || []).map((s, i) => (
                <Card key={i} variant="outlined" sx={{ mb: 1.5 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight="bold">{s.skill}</Typography>
                      <Chip
                        label={`أولوية ${s.priority}/10`}
                        size="small"
                        color={s.priority >= 8 ? 'error' : s.priority >= 5 ? 'warning' : 'default'}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      {s.reason}
                    </Typography>
                    <Chip
                      label={
                        s.type === 'skill_gap'
                          ? 'فجوة مهارة'
                          : s.type === 'performance_weakness'
                            ? 'نقطة ضعف'
                            : 'خطة تطوير'
                      }
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                    {s.alreadyTrained && (
                      <Alert severity="success" sx={{ mt: 0.5, py: 0 }}>
                        {s.note}
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}

              {(!training.suggestions || training.suggestions.length === 0) && (
                <Alert severity="success">لا توجد فجوات تدريبية مكتشفة</Alert>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>

      {!attrition && !training && !loading && (
        <Box textAlign="center" py={6}>
          <WorkOutline sx={{ fontSize: 80, color: '#ccc' }} />
          <Typography variant="h6" color="text.secondary" mt={2}>
            أدخل رقم الموظف للحصول على تحليل ذكي
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default EmployeeAIInsights;
