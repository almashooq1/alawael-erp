/**
 * EducationRehab – orchestrator (index).
 *
 * Split from the original 654-line EducationRehab.js:
 *   constants.js       – statusColors, tabs, colMap, fieldSets, demoData, buildStats
 *   useEducationRehab.js – state, data fetching, CRUD handlers
 *   DataTable.jsx       – generic table component
 *   ItemFormDialog.jsx  – create / edit dialog
 *   index.js            – this file (layout + wiring)
 */

import { gradients } from '../../theme/palette';
import useEducationRehab from './useEducationRehab';
import { tabs, buildStats } from './constants';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  LinearProgress,
  Paper,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';

const EducationRehab = () => {
  const {
    activeTab,
    setActiveTab,
    data,
    loading,
    dialogOpen,
    setDialogOpen,
    dialogType,
    editItem,
    form,
    setForm,
    confirmState,
    loadData,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    currentTabKey,
  } = useEducationRehab();

  const stats = buildStats(data);

  if (loading)
    return (
      <Container sx={{ mt: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>جاري التحميل...</Typography>
      </Container>
    );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Gradient Header */}
      <Box sx={{ background: gradients.success, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SchoolIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              التعليم والتأهيل
            </Typography>
            <Typography variant="body2">برامج التعليم وخطط التأهيل المتكاملة</Typography>
          </Box>
        </Box>
      </Box>

      {/* Title bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SchoolIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">
            التعليم والتأهيل
          </Typography>
        </Box>
        <Box>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData} sx={{ mr: 1 }}>
            تحديث
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openCreate(currentTabKey)}
          >
            إضافة جديد
          </Button>
        </Box>
      </Box>

      {/* Stats cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((s, i) => (
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
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {/* Table */}
      <DataTable data={data} activeTab={activeTab} onEdit={openEdit} onDelete={handleDelete} />

      {/* Create / Edit dialog */}
      <ItemFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        dialogType={dialogType}
        editItem={editItem}
        form={form}
        setForm={setForm}
        onSave={handleSave}
      />

      <ConfirmDialog {...confirmState} />
    </Container>
  );
};

export default EducationRehab;
