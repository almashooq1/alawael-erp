/**
 * RehabProgramsLibrary — مكتبة البرامج التأهيلية
 * Rehabilitation Programs Library
 */
import { useState } from 'react';



const PROGRAMS = [
  {
    id: 1,
    name: 'برنامج تأهيل الإصابات الجسدية',
    category: 'جسدي',
    weeks: 12,
    sessions: 36,
    level: 'شامل',
    tags: ['حركة', 'قوة', 'توازن'],
  },
  {
    id: 2,
    name: 'برنامج التدخل المبكر',
    category: 'مبكر',
    weeks: 8,
    sessions: 24,
    level: 'مبتدئ',
    tags: ['أطفال', 'نمو', 'تطور'],
  },
  {
    id: 3,
    name: 'برنامج التأهيل المهني',
    category: 'مهني',
    weeks: 16,
    sessions: 32,
    level: 'متقدم',
    tags: ['مهارات', 'عمل', 'استقلالية'],
  },
  {
    id: 4,
    name: 'برنامج التأهيل المعرفي',
    category: 'معرفي',
    weeks: 10,
    sessions: 20,
    level: 'متوسط',
    tags: ['ذاكرة', 'انتباه', 'تفكير'],
  },
  {
    id: 5,
    name: 'برنامج التواصل والنطق',
    category: 'تواصل',
    weeks: 12,
    sessions: 36,
    level: 'متوسط',
    tags: ['كلام', 'لغة', 'تواصل'],
  },
  {
    id: 6,
    name: 'برنامج المعيشة المستقلة',
    category: 'استقلالية',
    weeks: 20,
    sessions: 40,
    level: 'شامل',
    tags: ['حياة يومية', 'استقلالية', 'مجتمع'],
  },
];

export default function RehabProgramsLibrary() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = PROGRAMS.filter(p => {
    const matchSearch =
      p.name.includes(search) || p.tags.some(t => t.includes(search));
    const matchCat = category === 'all' || p.category === category;
    return matchSearch && matchCat;
  });

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <LibraryBooksIcon color="primary" sx={{ fontSize: 36 }} />
        <Typography variant="h4" fontWeight="bold">
          مكتبة البرامج التأهيلية
        </Typography>
      </Box>

      <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
        <TextField
          placeholder="ابحث في البرامج..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          value={category}
          exclusive
          onChange={(_, v) => v && setCategory(v)}
          size="small"
        >
          <ToggleButton value="all">الكل</ToggleButton>
          <ToggleButton value="جسدي">جسدي</ToggleButton>
          <ToggleButton value="مهني">مهني</ToggleButton>
          <ToggleButton value="معرفي">معرفي</ToggleButton>
          <ToggleButton value="مبكر">مبكر</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={3}>
        {filtered.map(program => (
          <Grid item xs={12} sm={6} md={4} key={program.id}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {program.name}
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  <Chip label={program.category} color="primary" size="small" />
                  <Chip label={program.level} size="small" variant="outlined" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  المدة: {program.weeks} أسبوع | الجلسات: {program.sessions}
                </Typography>
                <Box display="flex" gap={0.5} flexWrap="wrap" mt={1}>
                  {program.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" sx={{ fontSize: 11 }} />
                  ))}
                </Box>
              </CardContent>
              <CardActions>
                <Button size="small" variant="contained" fullWidth>
                  تسجيل مستفيد
                </Button>
                <Button size="small" variant="outlined" fullWidth>
                  عرض التفاصيل
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filtered.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography color="text.secondary">لا توجد برامج مطابقة</Typography>
        </Box>
      )}
    </Container>
  );
}
