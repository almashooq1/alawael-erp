/**
 * OperationsManagement — Main orchestrator (split into sub-components)
 * Manages assets, equipment, maintenance, schedules, licenses, and branches.
 */




import { gradients } from '../../theme/palette';

import useOperationsManagement from './useOperationsManagement';

const OperationsManagement = () => {
  const ctx = useOperationsManagement();

  if (ctx.loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>جاري التحميل...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <MaintenanceIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              إدارة العمليات
            </Typography>
            <Typography variant="body2">متابعة وإدارة العمليات التشغيلية</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          إدارة العمليات والأصول
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={ctx.loadData}
            sx={{ mr: 1 }}
          >
            تحديث
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => ctx.openCreate(ctx.tabs[ctx.activeTab]?.key)}
          >
            إضافة جديد
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {ctx.stats.map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card sx={{ borderTop: `4px solid ${s.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h3" fontWeight="bold" color={s.color}>
                  {s.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={ctx.activeTab}
          onChange={(_, v) => ctx.setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {ctx.tabs.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {/* Table */}
      <OperationsTable
        activeTab={ctx.activeTab}
        tabs={ctx.tabs}
        data={ctx.data}
        openEdit={ctx.openEdit}
        handleDelete={ctx.handleDelete}
      />

      {/* Dialog */}
      <OperationsDialog
        open={ctx.dialogOpen}
        onClose={() => ctx.setDialogOpen(false)}
        dialogType={ctx.dialogType}
        editItem={ctx.editItem}
        form={ctx.form}
        setForm={ctx.setForm}
        onSave={ctx.handleSave}
        tabs={ctx.tabs}
      />

      <ConfirmDialog {...ctx.confirmState} />
    </Container>
  );
};

export default OperationsManagement;
