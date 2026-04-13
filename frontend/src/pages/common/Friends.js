import { useState, useEffect } from 'react';


import apiClient from 'services/api.client';
import { gradients } from 'theme/palette';

function Friends() {
  const [colleagues, setColleagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/admin/users');
        const data = res?.data || res;
        const list = Array.isArray(data) ? data : data?.users || [];
        setColleagues(list);
      } catch {
        setColleagues([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = colleagues.filter(
    c =>
      !search ||
      (c.name || '').includes(search) ||
      (c.email || '').includes(search) ||
      (c.department || '').includes(search)
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Gradient Header */}
      <Box sx={{ background: gradients.ocean, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PeopleIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              الزملاء
            </Typography>
            <Typography variant="body2">عرض وإدارة قائمة الزملاء في المؤسسة</Typography>
          </Box>
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        <TextField
          fullWidth
          placeholder="بحث بالاسم أو القسم..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filtered.length === 0 ? (
          <Typography color="text.secondary">لا يوجد زملاء مطابقون</Typography>
        ) : (
          <Grid container spacing={2}>
            {filtered.map((c, i) => (
              <Grid item xs={12} sm={6} md={4} key={c._id || i}>
                <Card sx={{ '&:hover': { boxShadow: 4 } }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#1976d2', width: 48, height: 48 }}>
                      {(c.name || 'م')[0]}
                    </Avatar>
                    <Box>
                      <Typography fontWeight="bold">{c.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {c.email}
                      </Typography>
                      {c.department && (
                        <Chip
                          label={c.department}
                          size="small"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                      {c.role && (
                        <Chip
                          label={c.role}
                          size="small"
                          color="primary"
                          sx={{ mt: 0.5, ml: 0.5 }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Container>
  );
}

export default Friends;
