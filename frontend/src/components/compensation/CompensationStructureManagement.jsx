/**
 * CompensationStructureManagement — Slim orchestrator
 * Delegates to sub-components: stats, cards, form dialog
 */




import { gradients, statusColors, neutralColors } from 'theme/palette';
import { useCompensation } from './useCompensation';

const CompensationStructureManagement = () => {
  const {
    structures, loading, stats,
    formOpen, editingId, formData, setFormData, formSection, setFormSection,
    expandedCard, setExpandedCard, confirmDelete, setConfirmDelete,
    loadStructures, resetForm, handleSubmit, handleEdit, handleDelete, handleDuplicate,
    openNewForm, updateAllowance, addAllowance, removeAllowance,
  } = useCompensation();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, background: gradients.indigo, color: 'white' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <StructureIcon fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>إدارة الهياكل التعويضية</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                تكوين هياكل الرواتب والمزايا والخصومات • {structures.length} هيكل
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title="تحديث">
              <IconButton sx={{ color: 'white' }} onClick={loadStructures}><RefreshIcon /></IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNewForm}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>
              هيكل جديد
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الهياكل', value: stats.total, icon: <StructureIcon />, color: statusColors.indigo },
          { label: 'هياكل نشطة', value: stats.active, icon: <ActiveIcon />, color: statusColors.success },
          { label: 'متوسط المزايا', value: `${stats.avgAllowances.toLocaleString('ar-SA')} ر.س`, icon: <AllowanceIcon />, color: statusColors.warning },
          { label: 'متوسط الإجازات', value: `${stats.avgLeave} يوم`, icon: <LeaveIcon />, color: statusColors.cyan },
        ].map((s, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: `${s.color}15`, color: s.color, width: 48, height: 48 }}>{s.icon}</Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                  <Typography variant="h6" fontWeight={700}>{s.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Structures Grid */}
      {structures.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <StructureIcon sx={{ fontSize: 64, color: neutralColors.placeholder, mb: 2 }} />
          <Typography variant="h6" color="text.secondary">لا توجد هياكل تعويضية</Typography>
          <Button startIcon={<AddIcon />} variant="contained" sx={{ mt: 2 }} onClick={openNewForm}>
            إضافة هيكل جديد
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {structures.map(structure => (
            <Grid item xs={12} md={6} key={structure._id}>
              <CompensationStructureCard
                structure={structure}
                expanded={expandedCard === structure._id}
                onToggleExpand={() => setExpandedCard(expandedCard === structure._id ? null : structure._id)}
                onEdit={() => handleEdit(structure)}
                onDelete={() => setConfirmDelete(structure._id)}
                onDuplicate={() => handleDuplicate(structure)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Form Dialog */}
      <CompensationFormDialog
        open={formOpen}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        formSection={formSection}
        setFormSection={setFormSection}
        loading={loading}
        onSubmit={handleSubmit}
        onClose={resetForm}
        updateAllowance={updateAllowance}
        addAllowance={addAllowance}
        removeAllowance={removeAllowance}
      />

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>هل تريد حذف هذا الهيكل؟</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">لا يمكن التراجع عن هذا الإجراء.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDelete(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={() => handleDelete(confirmDelete)}>حذف</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CompensationStructureManagement;
