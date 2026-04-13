/**
 * SystemAdmin.js — إدارة النظام (orchestrator)
 * 8-tab admin page: Inventory, Ecommerce, Templates, Approvals, Notifications, RBAC, Civil Defense, Qiwa
 * Split into sub-components under pages/SystemAdmin/
 */
import React, { useMemo } from 'react';
import { Container, Typography, Paper, Tab, Tabs, LinearProgress } from '@mui/material';
import {
  Inventory as InventoryIcon,
  ShoppingCart as EcommerceIcon,
  Description as TemplatesIcon,
  Approval as ApprovalIcon,
  Notifications as NotifIcon,
  Security as RBACIcon,
  LocalFireDepartment as CivilDefenseIcon,
  Work as QiwaIcon,
} from '@mui/icons-material';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getStats } from './SystemAdmin/systemAdmin.constants';
import useSystemAdminData from './SystemAdmin/useSystemAdminData';
import SystemAdminHeader from './SystemAdmin/SystemAdminHeader';
import SystemAdminTable from './SystemAdmin/SystemAdminTable';
import SystemAdminDialog from './SystemAdmin/SystemAdminDialog';

const SystemAdmin = () => {
  const {
    confirmState,
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
    loadData,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
  } = useSystemAdminData();

  const tabs = [
    { label: 'المخزون', icon: <InventoryIcon />, key: 'inventory' },
    { label: 'المتجر الإلكتروني', icon: <EcommerceIcon />, key: 'ecommerce' },
    { label: 'النماذج', icon: <TemplatesIcon />, key: 'templates' },
    { label: 'الموافقات', icon: <ApprovalIcon />, key: 'approvals' },
    { label: 'الإشعارات', icon: <NotifIcon />, key: 'notifications' },
    { label: 'الأدوار والصلاحيات', icon: <RBACIcon />, key: 'rbac' },
    { label: 'الدفاع المدني', icon: <CivilDefenseIcon />, key: 'civilDefense' },
    { label: 'منصة قوى', icon: <QiwaIcon />, key: 'qiwa' },
  ];

  const stats = useMemo(() => getStats(data), [data]);

  if (loading)
    return (
      <Container sx={{ mt: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>جاري التحميل...</Typography>
      </Container>
    );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <SystemAdminHeader
        stats={stats}
        loadData={loadData}
        openCreate={openCreate}
        activeTab={activeTab}
        tabs={tabs}
      />

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

      <SystemAdminTable
        activeTab={activeTab}
        tabs={tabs}
        data={data}
        openEdit={openEdit}
        handleDelete={handleDelete}
      />

      <SystemAdminDialog
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

export default SystemAdmin;
