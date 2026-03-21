/**
 * Performance Evaluations Page — barrel entry point
 * صفحة تقييمات الأداء
 *
 * Composes the extracted sub-components via usePerformanceData hook.
 */


import usePerformanceData from './usePerformanceData';

const TAB_LABELS = [
  { label: 'التقييمات', icon: <AssessmentIcon /> },
  { label: 'التعاقب', icon: <TrendingUpIcon /> },
  { label: 'الملفات الطبية', icon: <GroupsIcon /> },
  { label: 'الجدولة', icon: <CalendarIcon /> },
];
const TAB_KEYS = ['evaluations', 'succession', 'medical', 'scheduler'];

export default function PerformanceEvaluations() {
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

  const handleExportCSV = () => {
    const key = TAB_KEYS[activeTab];
    const items = data[key] || [];
    if (!items.length) return;
    const csv = [
      Object.keys(items[0]).join(','),
      ...items.map(r => Object.values(r).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${key}-export.csv`;
    a.click();
  };

  const currentKey = TAB_KEYS[activeTab];
  const rows = data[currentKey] || [];

  return (
    <Box sx={{ p: 3 }}>
      <PerformanceHeader handleExportCSV={handleExportCSV} loadData={loadData} />

      <PerformanceStatsCards stats={stats} />

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {TAB_LABELS.map((t, i) => (
          <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />
        ))}
      </Tabs>

      <PerformanceTable
        rows={rows}
        loading={loading}
        onEdit={item => openEdit(currentKey, item)}
        onDelete={id => handleDelete(currentKey, id)}
      />

      <PerformanceDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        dialogType={dialogType}
        editItem={editItem}
        form={form}
        setForm={setForm}
        handleSave={handleSave}
      />

      <ConfirmDialog {...confirmState} />
    </Box>
  );
}
