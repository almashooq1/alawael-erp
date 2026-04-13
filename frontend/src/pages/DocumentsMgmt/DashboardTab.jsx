/**
 * @deprecated This file is part of an older split implementation.
 * The active version is the monolithic ../DocumentsMgmt.js which takes
 * priority in webpack module resolution over this directory index.
 * Do NOT use or maintain this file — all changes go to ../DocumentsMgmt.js.
 */

/**
 * DashboardTab — Statistics cards & categories grid
 * تبويب لوحة التحكم: بطاقات الإحصائيات والتصنيفات
 */

import { statusColors } from '../../theme/palette';

const DashboardTab = ({ stats, categories, setSelectedCategory, setActiveTab }) => (
  <Grid container spacing={3}>
    {/* Statistics Cards */}
    <Grid item xs={12} md={3}>
      <Card sx={{ bgcolor: statusColors.info, color: 'white' }}>
        <CardContent>
          <Typography variant="h6">إجمالي المستندات</Typography>
          <Typography variant="h3">{stats?.total || 0}</Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={3}>
      <Card sx={{ bgcolor: statusColors.success, color: 'white' }}>
        <CardContent>
          <Typography variant="h6">معتمد</Typography>
          <Typography variant="h3">{stats?.approved || 0}</Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={3}>
      <Card sx={{ bgcolor: statusColors.warning, color: 'white' }}>
        <CardContent>
          <Typography variant="h6">قيد المراجعة</Typography>
          <Typography variant="h3">{stats?.pending || 0}</Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={3}>
      <Card sx={{ bgcolor: statusColors.purple, color: 'white' }}>
        <CardContent>
          <Typography variant="h6">حجم التخزين</Typography>
          <Typography variant="h3">{stats?.totalSize || '0 MB'}</Typography>
        </CardContent>
      </Card>
    </Grid>

    {/* Categories Grid */}
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom>
        التصنيفات
      </Typography>
      <Grid container spacing={2}>
        {categories.map((category) => (
          <Grid item xs={12} sm={6} md={4} key={category.id}>
            <Card
              sx={{
                cursor: 'pointer',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                transition: 'all 0.3s',
              }}
              onClick={() => {
                setSelectedCategory(category.id);
                setActiveTab(1);
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      bgcolor: category.color,
                      color: 'white',
                      p: 2,
                      borderRadius: 2,
                      fontSize: '2rem',
                    }}
                  >
                    {category.icon}
                  </Box>
                  <Box>
                    <Typography variant="h6">{category.name}</Typography>
                    <Typography color="text.secondary">{category.count} مستند</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Grid>
  </Grid>
);

export default DashboardTab;
