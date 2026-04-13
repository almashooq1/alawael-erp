/**
 * PerformanceEvaluation.js — الأداء والتخطيط (orchestrator)
 * 4-tab admin page: Performance Evaluations, Succession Planning, Medical Files, Smart Scheduling
 * Split into sub-components under pages/Performance/
 */
import React, { useMemo, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Tab,
  Tabs,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingUp as PerformanceIcon,
  SwapHoriz as SuccessionIcon,
  MedicalServices as MedicalIcon,
  SmartToy as SchedulerIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'contexts/SnackbarContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { COL_MAP } from './Performance/performanceEvaluation.constants';
import usePerformanceData from './Performance/usePerformanceData';
import PerformanceHeader from './Performance/PerformanceHeader';
import PerformanceStatsCards from './Performance/PerformanceStatsCards';
import PerformanceTable from './Performance/PerformanceTable';
import PerformanceDialog from './Performance/PerformanceDialog';

const PerformanceEvaluation = () => {
  const showSnackbar = useSnackbar();
  const {
    confirmState,
    activeTab,
    setActiveTab,
    data,
    loading,
    stats,
    dialogOpen,
    setDialogOpen,
    dialogType,
    editItem,
    form,
    setForm,
    loadData,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
  } = usePerformanceData();

  const tabs = useMemo(
    () => [
      { label: 'تقييم الأداء', icon: <PerformanceIcon />, key: 'evaluations' },
      { label: 'تخطيط التعاقب', icon: <SuccessionIcon />, key: 'succession' },
      { label: 'الملفات الطبية', icon: <MedicalIcon />, key: 'medical' },
      { label: 'الجدولة الذكية', icon: <SchedulerIcon />, key: 'scheduler' },
    ],
    []
  );

  const handleExportCSV = useCallback(() => {
    const key = tabs[activeTab]?.key;
    const items = Array.isArray(data[key]) ? data[key] : [];
    const { headers, cols } = COL_MAP[key] || {};
    if (!items.length) return;
    const bom = '\uFEFF';
    const rows = items.map(r => cols.map(c => r[c]?.toString() || ''));
    const csv = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSnackbar('تم التصدير بنجاح', 'success');
  }, [activeTab, data, showSnackbar, tabs]);

  if (loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography sx={{ mt: 2, textAlign: 'center' }} color="text.secondary">
          جاري تحميل بيانات الأداء...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <PerformanceHeader handleExportCSV={handleExportCSV} loadData={loadData} />
      <PerformanceStatsCards stats={stats} />

      {/* Tabs */}
      <Paper sx={{ mb: 2, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ '& .MuiTab-root': { fontWeight: 'bold', minHeight: 56 } }}
        >
          {tabs.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {/* Action Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openCreate(tabs[activeTab]?.key)}
          sx={{ borderRadius: 2 }}
        >
          إضافة جديد
        </Button>
      </Box>

      <PerformanceTable
        activeTab={activeTab}
        tabs={tabs}
        data={data}
        openEdit={openEdit}
        handleDelete={handleDelete}
      />

      <PerformanceDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        dialogType={dialogType}
        editItem={editItem}
        form={form}
        setForm={setForm}
        handleSave={handleSave}
        tabs={tabs}
      />
      <ConfirmDialog {...confirmState} />
    </Container>
  );
};

export default PerformanceEvaluation;
