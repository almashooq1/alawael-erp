

import { gradients } from 'theme/palette';

/** Gradient header banner + optional error alert */
const DashboardHeader = ({ loading, dashError, fetchDashboard }) => (
  <>
    <Box
      sx={{
        mb: 4,
        p: 3,
        borderRadius: 3,
        background: gradients.primary,
        color: '#fff',
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            لوحة التحكم
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            مرحباً بك، إليك ملخص عن نشاط المركز اليوم
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <IconButton sx={{ color: '#fff' }} aria-label="الإشعارات">
              <Badge badgeContent={12} color="error">
                <Notifications />
              </Badge>
            </IconButton>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchDashboard}
              disabled={loading}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              تحديث
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>

    {dashError && (
      <Alert severity="error" sx={{ mb: 3 }} action={
        <Button color="inherit" size="small" onClick={fetchDashboard}>إعادة المحاولة</Button>
      }>
        {dashError}
      </Alert>
    )}
  </>
);

export default DashboardHeader;
