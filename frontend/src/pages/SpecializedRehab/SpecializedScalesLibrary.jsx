/**
 * SpecializedScalesLibrary — مكتبة مقاييس التأهيل المتخصصة
 * Specialized Assessment Scales Library
 */
import { useState } from 'react';



const SCALES = [
  { id: 1, name: 'Functional Independence Measure (FIM)', category: 'وظيفي', items: 18, time: '30 دقيقة' },
  { id: 2, name: 'WHO Disability Assessment Schedule (WHODAS)', category: 'إعاقة', items: 36, time: '20 دقيقة' },
  { id: 3, name: 'Barthel Index', category: 'أنشطة يومية', items: 10, time: '10 دقائق' },
  { id: 4, name: 'Berg Balance Scale', category: 'توازن', items: 14, time: '15 دقيقة' },
  { id: 5, name: 'Numerical Rating Scale (NRS) - Pain', category: 'ألم', items: 1, time: '2 دقيقة' },
  { id: 6, name: 'Modified Ashworth Scale', category: 'تشنج', items: 1, time: '5 دقائق' },
];

export default function SpecializedScalesLibrary() {
  const [search, setSearch] = useState('');

  const filtered = SCALES.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.includes(search)
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <AssessmentIcon color="primary" sx={{ fontSize: 36 }} />
        <Typography variant="h4" fontWeight="bold">
          مكتبة المقاييس المتخصصة
        </Typography>
      </Box>

      <TextField
        fullWidth
        placeholder="ابحث عن مقياس..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <Grid container spacing={3}>
        {filtered.map(scale => (
          <Grid item xs={12} sm={6} md={4} key={scale.id}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {scale.name}
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                  <Chip label={scale.category} color="primary" size="small" />
                  <Chip label={`${scale.items} بند`} size="small" variant="outlined" />
                  <Chip label={scale.time} size="small" variant="outlined" />
                </Box>
              </CardContent>
              <CardActions>
                <Button size="small" variant="contained" fullWidth>
                  تطبيق المقياس
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filtered.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography color="text.secondary">لا توجد مقاييس مطابقة للبحث</Typography>
        </Box>
      )}
    </Container>
  );
}
