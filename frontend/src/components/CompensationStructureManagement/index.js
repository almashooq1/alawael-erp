/**
 * CompensationStructureManagement — Orchestrator (index)
 */
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { gradients, statusColors, neutralColors } from '../../theme/palette';
import { ICONS } from './constants';
import useCompensation from './useCompensation';
import StructureCard from './StructureCard';
import CompensationForm from './CompensationForm';

const CompensationStructureManagement = () => {
  const {
    structures,
    loading,
    formOpen,
    setFormOpen,
    editingId,
    formData,
    setFormData,
    expandedCard,
    setExpandedCard,
    confirmDelete,
    setConfirmDelete,
    formSection,
    setFormSection,
    stats,
    loadStructures,
    resetForm,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleDuplicate,
    updateAllowance,
    addAllowance,
    removeAllowance,
  } = useCompensation();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, background: gradients.indigo, color: '#fff' }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <ICONS.StructureIcon fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                إدارة الهياكل التعويضية
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                تكوين هياكل الرواتب والمزايا والخصومات • {structures.length} هيكل
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title="تحديث">
              <IconButton sx={{ color: '#fff' }} onClick={loadStructures}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                resetForm();
                setFormOpen(true);
              }}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              هيكل جديد
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الهياكل',
            value: stats.total,
            icon: <ICONS.StructureIcon />,
            color: statusColors.indigo,
          },
          {
            label: 'هياكل نشطة',
            value: stats.active,
            icon: <ICONS.ActiveIcon />,
            color: statusColors.success,
          },
          {
            label: 'متوسط المزايا',
            value: `${stats.avgAllowances.toLocaleString('ar-SA')} ر.س`,
            icon: <ICONS.AllowanceIcon />,
            color: statusColors.warning,
          },
          {
            label: 'متوسط الإجازات',
            value: `${stats.avgLeave} يوم`,
            icon: <ICONS.LeaveIcon />,
            color: statusColors.cyan,
          },
        ].map((s, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: `${s.color}15`, color: s.color, width: 48, height: 48 }}>
                  {s.icon}
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {s.label}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {s.value}
                  </Typography>
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
          <ICONS.StructureIcon sx={{ fontSize: 64, color: neutralColors.placeholder, mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            لا توجد هياكل تعويضية
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => {
              resetForm();
              setFormOpen(true);
            }}
          >
            إضافة هيكل جديد
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {structures.map(structure => (
            <Grid item xs={12} md={6} key={structure._id}>
              <StructureCard
                structure={structure}
                expanded={expandedCard === structure._id}
                onToggle={() =>
                  setExpandedCard(expandedCard === structure._id ? null : structure._id)
                }
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={setConfirmDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Form Dialog */}
      <CompensationForm
        open={formOpen}
        onClose={resetForm}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        loading={loading}
        formSection={formSection}
        setFormSection={setFormSection}
        handleSubmit={handleSubmit}
        updateAllowance={updateAllowance}
        addAllowance={addAllowance}
        removeAllowance={removeAllowance}
      />

      {/* Confirm Delete Dialog */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>هل تريد حذف هذا الهيكل؟</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">لا يمكن التراجع عن هذا الإجراء.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDelete(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={() => handleDelete(confirmDelete)}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CompensationStructureManagement;
