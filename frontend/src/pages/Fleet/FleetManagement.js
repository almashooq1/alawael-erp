/**
 * FleetManagement.js — Thin orchestrator (split from 725L original)
 * صفحة إدارة الأسطول — المنسق الرئيسي
 */

import { gradients } from '../../theme/palette';
import { TABS, STAT_CARDS } from './Fleet/fleetManagement.constants';
import useFleetManagement from './Fleet/useFleetManagement';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';

const FleetManagement = () => {
  const {
    activeTab,
    setActiveTab,
    data,
    loading,
    loadData,
    dialogOpen,
    setDialogOpen,
    dialogType,
    editItem,
    form,
    setForm,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    confirmState,
  } = useFleetManagement();

  const stats = STAT_CARDS(data);

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>جاري التحميل...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Gradient header */}
      <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          إدارة الأسطول
        </Typography>
        <Typography variant="body2">متابعة وإدارة المركبات والأسطول</Typography>
      </Box>

      {/* Title + actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          إدارة الأسطول والنقل
        </Typography>
        <Box>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData} sx={{ mr: 1 }}>
            تحديث
          </Button>
          {TABS[activeTab]?.key !== 'gps' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openCreate(TABS[activeTab]?.key)}
            >
              إضافة جديد
            </Button>
          )}
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
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        {TABS.map((t, i) => (
          <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
        ))}
      </Tabs>

      {/* Table */}
      <FleetTable
        activeTab={activeTab}
        data={data}
        openEdit={openEdit}
        handleDelete={handleDelete}
      />

      {/* Form dialog */}
      <FleetFormDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        dialogType={dialogType}
        editItem={editItem}
        form={form}
        setForm={setForm}
        handleSave={handleSave}
      />
      <ConfirmDialog {...confirmState} />
    </Container>
  );
};

export default FleetManagement;
