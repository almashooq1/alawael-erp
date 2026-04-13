


/* ------------------------------------------------------------------ */
/*  SystemAdminHeader                                                 */
/* ------------------------------------------------------------------ */
const SystemAdminHeader = ({ stats = [], loadData, openCreate, activeTab, tabs = [] }) => {
  const currentTab = tabs.find((t) => t.key === activeTab);

  return (
    <Box sx={{ mb: 3 }}>
      {/* ---- gradient title bar ---- */}
      <Paper
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%)',
          color: '#fff',
          borderRadius: 3,
          px: 3,
          py: 2.5,
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AdminPanelSettingsIcon sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              إدارة النظام
            </Typography>
            {currentTab && (
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {currentTab.label}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={loadData} sx={{ color: '#fff' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            onClick={openCreate}
            sx={{
              bgcolor: 'rgba(255,255,255,0.18)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              fontWeight: 600,
            }}
          >
            إضافة جديد
          </Button>
        </Box>
      </Paper>

      {/* ---- stats cards grid ---- */}
      <Grid container spacing={2}>
        {stats.map((stat) => (
          <Grid item xs={6} sm={4} md={3} lg={1.5} key={stat.label}>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                borderRadius: 2,
                textAlign: 'center',
                borderTop: `3px solid ${stat.color}`,
                transition: 'transform .15s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
              }}
            >
              <Typography variant="h5" fontWeight={700} sx={{ color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SystemAdminHeader;
