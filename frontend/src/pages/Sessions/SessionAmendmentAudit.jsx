/**
 * SessionAmendmentAudit — سجل تعديلات الجلسات السريرية (BC-04)
 *
 * Reads amendment history from /api/admin/therapy-sessions/:id (legacy)
 * and /api/v1/sessions/admin/:id (unified).
 * Shows finalization + all amendments for auditors / supervisors.
 * Roles: admin, super_admin, clinical_supervisor, manager
 */
import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Button,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  LockOutlined as FinalizeIcon,
  EditNote as AmendIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Timeline as AuditIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import apiClient from '../../services/api';
import logger from '../../utils/logger';

const formatDate = d => {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yyyy HH:mm', { locale: arSA });
  } catch {
    return String(d);
  }
};

export default function SessionAmendmentAudit() {
  const [sessionId, setSessionId] = useState('');
  const [query, setQuery] = useState('');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSession = useCallback(
    async id => {
      const target = (id || query).trim();
      if (!target) return;
      setLoading(true);
      setError('');
      try {
        const r = await apiClient.get(`/api/v1/sessions/admin/${target}`);
        setSession(r?.data?.data || r?.data || null);
        setSessionId(target);
      } catch (err) {
        logger.warn('SessionAmendmentAudit load:', err.message);
        setError(`تعذّر تحميل الجلسة: ${err.response?.data?.message || err.message}`);
        setSession(null);
      } finally {
        setLoading(false);
      }
    },
    [query]
  );

  const handleSearch = e => {
    e.preventDefault();
    loadSession();
  };

  return (
    <Box sx={{ maxWidth: 'lg', mx: 'auto', p: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg,#1565c0,#1976d2)',
          color: '#fff',
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          flexWrap="wrap"
          gap={2}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <AuditIcon />
              <Typography variant="h6" fontWeight={800}>
                سجل تعديلات الجلسات السريرية
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
              مراجعة إقفال وتعديلات السجل السريري — الالتزام بمعيار CARF‑MH 3.A
            </Typography>
          </Box>
          <Chip
            label="BC-04 · نافذة التعديل 24 ساعة"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
          />
        </Stack>

        {/* Search bar */}
        <Box component="form" onSubmit={handleSearch} sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="أدخل ID الجلسة…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            sx={{
              flexGrow: 1,
              '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' },
              '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.6)' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<SearchIcon />}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            بحث
          </Button>
          {session && (
            <Tooltip title="تحديث">
              <IconButton onClick={() => loadSession(sessionId)} sx={{ color: '#fff' }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!session && !loading && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          <AuditIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">أدخل ID الجلسة لعرض سجل الإقفال والتعديلات</Typography>
        </Paper>
      )}

      {session && (
        <>
          {/* Session Summary */}
          <Paper
            elevation={0}
            sx={{ p: 2.5, mb: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {session.beneficiary?.fullName || session.beneficiary?.name || 'مستفيد'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {session.sessionType || session.type || 'جلسة'} —{' '}
                  {session.date ? formatDate(session.date) : '—'}
                </Typography>
              </Box>
              <Chip
                label={session.status}
                size="small"
                color={session.status === 'COMPLETED' ? 'success' : 'default'}
              />
              <Chip
                icon={<FinalizeIcon />}
                label={session.noteStatus === 'finalized' ? 'محكم' : 'مسودة'}
                size="small"
                color={session.noteStatus === 'finalized' ? 'primary' : 'warning'}
                variant={session.noteStatus === 'finalized' ? 'filled' : 'outlined'}
              />
              {session.signedAt && (
                <Typography variant="caption" color="text.secondary">
                  أُقفل: {formatDate(session.signedAt)}
                </Typography>
              )}
            </Stack>
          </Paper>

          {/* Finalization info */}
          {session.noteStatus === 'finalized' && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 3,
                bgcolor: 'primary.50',
                border: '1px solid',
                borderColor: 'primary.200',
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <FinalizeIcon color="primary" />
                <Box>
                  <Typography variant="body2" fontWeight={700} color="primary.dark">
                    إقفال السجل السريري
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    أُقفل بواسطة: {session.signedBy?.name || session.signedBy || '—'} &nbsp;|&nbsp;{' '}
                    {formatDate(session.signedAt)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          )}

          {/* Amendment History */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <AmendIcon color="warning" />
                <Typography variant="subtitle2" fontWeight={700}>
                  سجل التعديلات
                </Typography>
                <Chip label={session.amendments?.length ?? 0} size="small" color="warning" />
              </Stack>
            </Box>

            {!session.amendments || session.amendments.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">
                  لا توجد تعديلات مسجّلة
                </Typography>
              </Box>
            ) : (
              session.amendments.map((amend, idx) => (
                <Accordion
                  key={amend._id || idx}
                  disableGutters
                  elevation={0}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 },
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandIcon />} sx={{ px: 2.5 }}>
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      sx={{ width: '100%' }}
                      flexWrap="wrap"
                      gap={0.5}
                    >
                      <Chip
                        label={`#${idx + 1}`}
                        size="small"
                        color="warning"
                        sx={{ fontSize: 11 }}
                      />
                      <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                        {amend.reason}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120 }}>
                        {formatDate(amend.amendedAt)}
                      </Typography>
                      <Chip
                        label={amend.amendedBy?.name || amend.amendedBy || '—'}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 11 }}
                      />
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 2.5, pb: 2 }}>
                    {amend.fields && amend.fields.length > 0 ? (
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            {['الحقل', 'القيمة السابقة', 'القيمة الجديدة'].map(h => (
                              <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                                {h}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {amend.fields.map((f, fi) => (
                            <TableRow key={fi}>
                              <TableCell>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                  {f.field}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="error.main">
                                  {f.oldValue !== undefined && f.oldValue !== null
                                    ? String(f.oldValue)
                                    : '—'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="success.main">
                                  {f.newValue !== undefined && f.newValue !== null
                                    ? String(f.newValue)
                                    : '—'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        لا توجد تفاصيل حقول
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}
