/**
 * لوحة معلومات استبيانات رضا الأسر — NPS / CSAT
 * Family Satisfaction Surveys Dashboard
 */
import { useState, useEffect, useCallback } from 'react';


import familySatisfactionService from '../../services/familySatisfaction.service';

const npsColors = { promoter: 'success', passive: 'warning', detractor: 'error' };
const npsLabels = { promoter: 'مروّج', passive: 'محايد', detractor: 'منتقد' };
const sentimentLabels = { positive: 'إيجابي', negative: 'سلبي', neutral: 'محايد' };
const sentimentColors = { positive: 'success', negative: 'error', neutral: 'default' };

function getNPSIcon(category) {
  switch (category) {
    case 'promoter': return <SentimentVerySatisfied color="success" />;
    case 'passive': return <SentimentSatisfied color="warning" />;
    case 'detractor': return <SentimentDissatisfied color="error" />;
    default: return <SentimentSatisfied />;
  }
}

function getNPSColor(score) {
  if (score >= 50) return 'success.main';
  if (score >= 0) return 'warning.main';
  return 'error.main';
}

export default function FamilySatisfactionDashboard() {
  const [tab, setTab] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [responses, setResponses] = useState([]);
  const [npsData, setNpsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, tplRes, respRes, npsRes] = await Promise.all([
        familySatisfactionService.getDashboard(),
        familySatisfactionService.getTemplates(),
        familySatisfactionService.getResponses({ limit: 20 }),
        familySatisfactionService.getNPSAnalytics().catch(() => null),
      ]);
      setDashboard(dashRes?.data || dashRes);
      setTemplates(tplRes?.data?.templates || tplRes?.templates || []);
      setResponses(respRes?.data?.responses || respRes?.responses || []);
      setNpsData(npsRes?.data || npsRes);
    } catch (err) {
      setError('فشل في تحميل بيانات استبيانات الرضا');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeedTemplates = async () => {
    try {
      await familySatisfactionService.seedTemplates();
      fetchData();
    } catch (err) {
      setError('فشل في تحميل قوالب الاستبيان الافتراضية');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const stats = dashboard?.summary || {};
  const nps = npsData || {};

  return (
    <Box sx={{ p: 3 }}>
      {/* العنوان */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            استبيانات رضا الأسر
          </Typography>
          <Typography variant="body1" color="text.secondary">
            قياس ومتابعة رضا أسر المستفيدين عن الخدمات المقدمة (NPS / CSAT)
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="contained" startIcon={<Add />} onClick={handleSeedTemplates}>
            تحميل القوالب الافتراضية
          </Button>
          <IconButton onClick={fetchData}><Refresh /></IconButton>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* بطاقات إحصائية رئيسية */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* NPS Score */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: getNPSColor(nps.npsScore || 0), color: 'white', position: 'relative', overflow: 'hidden' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>مؤشر صافي الترويج (NPS)</Typography>
              <Typography variant="h3" fontWeight="bold">{nps.npsScore ?? '—'}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {(nps.npsScore || 0) >= 50 ? 'ممتاز' : (nps.npsScore || 0) >= 0 ? 'جيد' : 'يحتاج تحسين'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Star color="warning" sx={{ fontSize: 36 }} />
              <Typography variant="h4" fontWeight="bold">{stats.averageSatisfaction?.toFixed(1) || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">متوسط الرضا (من 5)</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <QuestionAnswer color="primary" sx={{ fontSize: 36 }} />
              <Typography variant="h4" fontWeight="bold">{stats.totalResponses || responses.length}</Typography>
              <Typography variant="caption" color="text.secondary">إجمالي الردود</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp color="info" sx={{ fontSize: 36 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.responseRate ? `${stats.responseRate}%` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">نسبة الاستجابة</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* توزيع NPS */}
      {(nps.promoters != null || nps.passives != null || nps.detractors != null) && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>توزيع صافي الترويج (NPS)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <SentimentVerySatisfied color="success" sx={{ fontSize: 40 }} />
                  <Typography variant="h5" fontWeight="bold" color="success.main">{nps.promoters || 0}%</Typography>
                  <Typography variant="body2" color="text.secondary">مروّجون (9-10)</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <SentimentSatisfied color="warning" sx={{ fontSize: 40 }} />
                  <Typography variant="h5" fontWeight="bold" color="warning.main">{nps.passives || 0}%</Typography>
                  <Typography variant="body2" color="text.secondary">محايدون (7-8)</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <SentimentDissatisfied color="error" sx={{ fontSize: 40 }} />
                  <Typography variant="h5" fontWeight="bold" color="error.main">{nps.detractors || 0}%</Typography>
                  <Typography variant="body2" color="text.secondary">منتقدون (0-6)</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* التبويبات */}
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, pt: 1 }}>
          <Tab label="الردود الأخيرة" icon={<QuestionAnswer />} iconPosition="start" />
          <Tab label="قوالب الاستبيانات" icon={<Assessment />} iconPosition="start" />
        </Tabs>

        <CardContent>
          {/* تبويب الردود */}
          {tab === 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>المستفيد</TableCell>
                    <TableCell>الاستبيان</TableCell>
                    <TableCell align="center">التقييم</TableCell>
                    <TableCell align="center">NPS</TableCell>
                    <TableCell align="center">المشاعر</TableCell>
                    <TableCell align="center">المتابعة</TableCell>
                    <TableCell>التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {responses.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center">لا توجد ردود حالياً</TableCell></TableRow>
                  ) : responses.map((resp) => (
                    <TableRow key={resp._id} hover>
                      <TableCell>{resp.respondent?.name || '—'}</TableCell>
                      <TableCell>{resp.template?.title || '—'}</TableCell>
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                          <Star sx={{ fontSize: 16, color: 'warning.main' }} />
                          <Typography variant="body2">{resp.scores?.overallScore?.toFixed(1) || '—'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {resp.scores?.npsCategory ? (
                          <Chip
                            icon={getNPSIcon(resp.scores.npsCategory)}
                            label={npsLabels[resp.scores.npsCategory]}
                            color={npsColors[resp.scores.npsCategory]}
                            size="small"
                            variant="outlined"
                          />
                        ) : '—'}
                      </TableCell>
                      <TableCell align="center">
                        {resp.sentiment?.overall ? (
                          <Chip
                            label={sentimentLabels[resp.sentiment.overall]}
                            color={sentimentColors[resp.sentiment.overall]}
                            size="small"
                          />
                        ) : '—'}
                      </TableCell>
                      <TableCell align="center">
                        {resp.followUp?.required ? (
                          <Chip
                            label={resp.followUp?.status === 'completed' ? 'مكتمل' : 'مطلوب'}
                            color={resp.followUp?.status === 'completed' ? 'success' : 'warning'}
                            size="small"
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>{new Date(resp.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* تبويب القوالب */}
          {tab === 1 && (
            <Box>
              {templates.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary" gutterBottom>لم يتم إنشاء قوالب بعد</Typography>
                  <Button variant="contained" startIcon={<Add />} onClick={handleSeedTemplates}>
                    تحميل القوالب الافتراضية
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {templates.map((tpl) => (
                    <Grid item xs={12} sm={6} md={4} key={tpl._id}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                            <Typography variant="subtitle1" fontWeight="bold">{tpl.title}</Typography>
                            <Chip
                              label={tpl.isActive ? 'نشط' : 'غير نشط'}
                              color={tpl.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {tpl.description || '—'}
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" color="text.secondary">
                            الأسئلة: {tpl.questions?.length || 0} | التصنيف: {tpl.category || '—'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
