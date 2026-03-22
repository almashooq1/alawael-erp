/**
 * SessionsManagement — Main orchestrator (split into sub-components)
 * ──────────────────────
 * Full-featured admin page for managing therapy sessions & schedules.
 * Uses /api/therapy-sessions endpoints via therapySessions.service.js.
 */
import React from 'react';
import {
  Container, Typography, Box, Grid, Button, IconButton, Stack, Alert,
} from '@mui/material';
import { Add as AddIcon, Event as EventIcon, Refresh } from '@mui/icons-material';

import useSessionsManagement from './useSessionsManagement';
import StatCards from './StatCards';
import SessionsTable from './SessionsTable';
import SessionFormDialog from './SessionFormDialog';
import DeleteConfirmDialog from './DeleteConfirmDialog';

const SessionsManagement = () => {
  const ctx = useSessionsManagement();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              <EventIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              إدارة الجلسات والمواعيد
            </Typography>
            <Typography variant="body2" color="text.secondary">
              عرض وإدارة جميع الجلسات العلاجية والمواعيد المجدولة
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="contained" startIcon={<AddIcon />} onClick={ctx.handleOpenCreate} sx={{ borderRadius: 2 }}>
                جلسة جديدة
              </Button>
              <IconButton onClick={ctx.fetchSessions} disabled={ctx.loading}>
                <Refresh />
              </IconButton>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* ── Stat Cards ── */}
      <StatCards stats={ctx.stats} loading={ctx.loading} />

      {/* ── Error Alert ── */}
      {ctx.error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => ctx.setError('')}>
          {ctx.error} — يتم عرض بيانات تجريبية
        </Alert>
      )}

      {/* ── Table with Search & Filters ── */}
      <SessionsTable
        filtered={ctx.filtered}
        loading={ctx.loading}
        totalCount={ctx.totalCount}
        search={ctx.search}
        setSearch={ctx.setSearch}
        filterType={ctx.filterType}
        setFilterType={ctx.setFilterType}
        filterStatus={ctx.filterStatus}
        setFilterStatus={ctx.setFilterStatus}
        showFilters={ctx.showFilters}
        setShowFilters={ctx.setShowFilters}
        page={ctx.page}
        setPage={ctx.setPage}
        rowsPerPage={ctx.rowsPerPage}
        setRowsPerPage={ctx.setRowsPerPage}
        handleOpenCreate={ctx.handleOpenCreate}
        handleOpenEdit={ctx.handleOpenEdit}
        setDeleteTarget={ctx.setDeleteTarget}
        handleCancel={ctx.handleCancel}
        handleMarkAttendance={ctx.handleMarkAttendance}
        handleMarkNoShow={ctx.handleMarkNoShow}
      />

      {/* ── Create / Edit Dialog ── */}
      <SessionFormDialog
        open={ctx.openDialog}
        onClose={() => ctx.setOpenDialog(false)}
        editingSession={ctx.editingSession}
        form={ctx.form}
        setForm={ctx.setForm}
        saving={ctx.saving}
        formError={ctx.formError}
        onSave={ctx.handleSave}
      />

      {/* ── Delete Confirmation ── */}
      <DeleteConfirmDialog
        target={ctx.deleteTarget}
        onClose={() => ctx.setDeleteTarget(null)}
        onConfirm={ctx.handleDelete}
      />
    </Container>
  );
};

export default SessionsManagement;
