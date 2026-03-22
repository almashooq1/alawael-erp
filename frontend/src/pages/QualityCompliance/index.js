import React from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  Tab,
  Tabs,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  VerifiedUser as QualityIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { gradients } from '../../theme/palette';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import useQualityCompliance from './useQualityCompliance';
import { tabs, colMap } from './constants';
import DataTable from './DataTable';
import FormDialog from './FormDialog';

const QualityCompliance = () => {
  const {
    data,
    loading,
    activeTab,
    setActiveTab,
    dialogOpen,
    setDialogOpen,
    dialogType,
    editItem,
    form,
    setForm,
    confirmState,
    stats,
    loadData,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
  } = useQualityCompliance();

  if (loading)
    return (
      <Container sx={{ mt: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>جاري التحميل...</Typography>
      </Container>
    );

  const key = tabs[activeTab]?.key;
  const items = Array.isArray(data[key]) ? data[key] : [];
  const { cols, headers } = colMap[key] || { cols: [], headers: [] };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <QualityIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              الجودة والامتثال
            </Typography>
            <Typography variant="body2">معايير الجودة والامتثال التنظيمي</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">
            الجودة والامتثال
          </Typography>
        </Box>
        <Box>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData} sx={{ mr: 1 }}>
            تحديث
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreate(key)}>
            إضافة جديد
          </Button>
        </Box>
      </Box>

      {/* Stats */}
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
      <DataTable
        items={items}
        cols={cols}
        headers={headers}
        onEdit={row => openEdit(key, row)}
        onDelete={id => handleDelete(key, id)}
      />

      {/* Form Dialog */}
      <FormDialog
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

export default QualityCompliance;
