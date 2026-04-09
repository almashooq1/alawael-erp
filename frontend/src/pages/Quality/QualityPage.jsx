/**
 * Quality & Compliance Page — صفحة الجودة والامتثال
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Avatar,
  Button, IconButton, Stack, LinearProgress, Alert, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Tab, Tabs, Badge, Divider, List, ListItem, ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  VerifiedUser as QualityIcon, Warning as WarningIcon,
  CheckCircle as PassIcon, Cancel as FailIcon,
  Refresh as RefreshIcon, Assessment as AuditIcon,
  Build as ActionIcon, TrendingUp as TrendIcon,
} from '@mui/icons-material';

import { qualityAPI } from '../../services/ddd';

export default function QualityPage() {
  const [audits, setAudits] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, cRes] = await Promise.all([
        qualityAPI.list({ limit: 100 }).catch(() => ({ data: [] })),
        qualityAPI.getCorrectiveActions?.({ limit: 100 }).catch(() => ({ data: [] })),
      ]);
      setAudits(aRes?.data?.data || aRes?.data || []);
      setActions(cRes?.data?.data || cRes?.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const passRate = audits.length > 0
    ? Math.round((audits.filter(a => a.result === 'pass' || a.status === 'compliant').length / audits.length) * 100)
    : 0;

  const openActions = actions.filter(a => a.status !== 'completed' && a.status !== 'closed');

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold"><QualityIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> الجودة والامتثال</Typography>
          <Typography variant="body2" color="text.secondary">مراجعات الجودة والإجراءات التصحيحية</Typography>
        </Box>
        <IconButton onClick={load}><RefreshIcon /></IconButton>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'المراجعات', value: audits.length, color: '#2196f3', icon: <AuditIcon /> },
          { label: 'نسبة الامتثال', value: `${passRate}%`, color: passRate >= 80 ? '#4caf50' : '#f44336', icon: <TrendIcon /> },
          { label: 'إجراءات مفتوحة', value: openActions.length, color: openActions.length > 0 ? '#ff9800' : '#4caf50', icon: <ActionIcon /> },
          { label: 'عدم الامتثال', value: audits.filter(a => a.result === 'fail' || a.status === 'non_compliant').length, color: '#f44336', icon: <WarningIcon /> },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card variant="outlined" sx={{ borderRight: `4px solid ${s.color}` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Avatar sx={{ bgcolor: `${s.color}20`, color: s.color }}>{s.icon}</Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: s.color }}>{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab icon={<AuditIcon />} iconPosition="start" label={`المراجعات (${audits.length})`} />
          <Tab icon={<ActionIcon />} iconPosition="start" label={`الإجراءات التصحيحية (${actions.length})`} />
        </Tabs>

        {tab === 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>النوع</TableCell><TableCell>المجال</TableCell><TableCell>التاريخ</TableCell>
                <TableCell>النتيجة</TableCell><TableCell>النقاط</TableCell><TableCell>المراجع</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {audits.map((a, i) => (
                  <TableRow key={a._id || i} hover>
                    <TableCell>{a.auditType || a.type || '-'}</TableCell>
                    <TableCell>{a.domain || a.area || '-'}</TableCell>
                    <TableCell>{a.date ? new Date(a.date).toLocaleDateString('ar-SA') : '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={a.result === 'pass' ? <PassIcon /> : <FailIcon />}
                        label={a.result === 'pass' ? 'ممتثل' : 'غير ممتثل'}
                        color={a.result === 'pass' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>{a.score ?? '-'}</TableCell>
                    <TableCell>{a.auditor?.name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 1 && (
          <List>
            {actions.length === 0 ? (
              <ListItem><ListItemText primary="لا توجد إجراءات تصحيحية" /></ListItem>
            ) : (
              actions.map((a, i) => (
                <ListItem key={a._id || i} divider>
                  <ListItemIcon>
                    <ActionIcon color={a.status === 'completed' ? 'success' : 'warning'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={a.title || a.description || 'إجراء تصحيحي'}
                    secondary={`${a.priority || '-'} • ${a.dueDate ? new Date(a.dueDate).toLocaleDateString('ar-SA') : ''} • ${a.assignedTo?.name || '-'}`}
                  />
                  <Chip size="small" label={a.status || '-'} color={a.status === 'completed' ? 'success' : 'warning'} />
                </ListItem>
              ))
            )}
          </List>
        )}
      </Card>
    </Box>
  );
}
