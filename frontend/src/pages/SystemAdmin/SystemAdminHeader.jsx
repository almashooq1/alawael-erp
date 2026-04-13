/**
 * SystemAdminHeader.jsx — Gradient header + secondary toolbar + stats cards
 * Extracted from SystemAdmin.js
 */
import React from 'react';
import {
  Typography,
  Grid,
  Box,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { gradients } from '../../theme/palette';

const SystemAdminHeader = ({ stats, loadData, openCreate, activeTab, tabs }) => (
  <>
    {/* Gradient Header */}
    <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <SettingsIcon sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            إدارة النظام
          </Typography>
          <Typography variant="body2">إعدادات وتكوين النظام المتقدمة</Typography>
        </Box>
      </Box>
    </Box>

    {/* Secondary Header */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <SettingsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Typography variant="h4" fontWeight="bold">
          إدارة النظام
        </Typography>
      </Box>
      <Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData} sx={{ mr: 1 }}>
          تحديث
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openCreate(tabs[activeTab]?.key)}
        >
          إضافة جديد
        </Button>
      </Box>
    </Box>

    {/* Stats Cards */}
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
  </>
);

export default SystemAdminHeader;
