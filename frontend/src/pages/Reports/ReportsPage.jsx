/**
 * Reports & Analytics Page — صفحة التقارير والتحليلات
 */

import { useState, useEffect, useCallback } from 'react';



import { reportsAPI } from '../../services/ddd';

const REPORT_CATEGORIES = [
  { value: '', label: 'الكل' },
  { value: 'clinical', label: 'سريري' },
  { value: 'operational', label: 'تشغيلي' },
  { value: 'financial', label: 'مالي' },
  { value: 'quality', label: 'جودة' },
  { value: 'research', label: 'بحثي' },
  { value: 'regulatory', label: 'تنظيمي' },
];

const REPORT_ICONS = {
  clinical: <ChartIcon />,
  operational: <ReportIcon />,
  financial: <ExcelIcon />,
  quality: <StarIcon />,
  research: <ChartIcon />,
  regulatory: <ReportIcon />,
};

export default function ReportsPage() {
  const [templates, setTemplates] = useState([]);
  const [generated, setGenerated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [previewReport, setPreviewReport] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, gRes] = await Promise.all([
        reportsAPI.getTemplates?.().catch(() => ({ data: [] })),
        reportsAPI.list({ limit: 50 }).catch(() => ({ data: [] })),
      ]);
      setTemplates(tRes?.data?.data || tRes?.data || []);
      setGenerated(gRes?.data?.data || gRes?.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredTemplates = templates.filter(t => {
    if (search && !((t.name || '').includes(search) || (t.description || '').includes(search))) return false;
    if (category && t.category !== category) return false;
    return true;
  });

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold"><ChartIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> التقارير والتحليلات</Typography>
          <Typography variant="body2" color="text.secondary">{templates.length} قالب • {generated.length} تقرير مُنشأ</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AddIcon />}>تقرير مخصص</Button>
          <IconButton onClick={load}><RefreshIcon /></IconButton>
        </Stack>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth size="small" placeholder="بحث في التقارير..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>التصنيف</InputLabel>
                <Select value={category} label="التصنيف" onChange={(e) => setCategory(e.target.value)}>
                  {REPORT_CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Templates */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>قوالب التقارير</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {filteredTemplates.length === 0 && !loading ? (
          <Grid item xs={12}><Alert severity="info">لا توجد قوالب مطابقة</Alert></Grid>
        ) : (
          filteredTemplates.map((t, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={t._id || i}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
                      {REPORT_ICONS[t.category] || <ReportIcon />}
                    </Avatar>
                    <Typography variant="subtitle2" fontWeight="bold">{t.name || t.title || 'تقرير'}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t.description || ''}
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    {t.category && <Chip size="small" variant="outlined" label={REPORT_CATEGORIES.find(c => c.value === t.category)?.label || t.category} />}
                    {t.frequency && <Chip size="small" variant="outlined" label={t.frequency} />}
                  </Stack>
                </CardContent>
                <CardActions>
                  <Button size="small" startIcon={<ChartIcon />}>إنشاء</Button>
                  <Button size="small" startIcon={<ScheduleIcon />}>جدولة</Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Generated Reports */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>التقارير المُنشأة</Typography>
      <Grid container spacing={2}>
        {generated.map((r, i) => (
          <Grid item xs={12} sm={6} md={4} key={r._id || i}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold">{r.title || r.name || 'تقرير'}</Typography>
                  <Chip size="small" label={r.status || 'جاهز'} color={r.status === 'ready' || r.status === 'completed' ? 'success' : 'default'} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {r.generatedAt ? new Date(r.generatedAt).toLocaleString('ar-SA') : r.createdAt ? new Date(r.createdAt).toLocaleString('ar-SA') : ''}
                </Typography>
              </CardContent>
              <CardActions>
                <IconButton size="small" onClick={() => setPreviewReport(r)}><PreviewIcon /></IconButton>
                <IconButton size="small"><PdfIcon /></IconButton>
                <IconButton size="small"><ExcelIcon /></IconButton>
                <IconButton size="small"><PrintIcon /></IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Preview Dialog */}
      <Dialog open={!!previewReport} onClose={() => setPreviewReport(null)} maxWidth="md" fullWidth>
        {previewReport && (
          <>
            <DialogTitle>{previewReport.title || previewReport.name || 'معاينة التقرير'}</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary">
                {previewReport.summary || previewReport.description || 'لا توجد معاينة متاحة'}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewReport(null)}>إغلاق</Button>
              <Button variant="contained" startIcon={<DownloadIcon />}>تحميل</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
