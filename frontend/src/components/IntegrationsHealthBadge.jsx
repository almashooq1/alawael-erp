/**
 * IntegrationsHealthBadge — small click-through widget showing the
 * overall state of the 10 gov adapters.
 *
 * Data: GET /api/health/integrations/summary (public, cached 60s server-side).
 * Auto-refreshes every 60s while mounted.
 *
 * Visual: green ✓ / amber ! / red ✕ + short label.  Clicking navigates
 * to the full ops dashboard at /admin/integrations-ops.
 *
 * Drop-in placement:
 *   <IntegrationsHealthBadge />
 */

import { useCallback, useEffect, useState } from 'react';
import { Box, Chip, CircularProgress, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import { Link as RouterLink } from 'react-router-dom';
import api from '../services/api.client';

const REFRESH_MS = 60_000;

export default function IntegrationsHealthBadge({ sx }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/health/integrations/summary');
      setData(res.data);
    } catch {
      setData({ overall: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  if (loading && !data) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, ...sx }}>
        <CircularProgress size={14} />
      </Box>
    );
  }

  const overall = data?.overall;
  let icon, color, label;
  if (overall === 'ok') {
    icon = <CheckCircleIcon />;
    color = 'success';
    label = `التكاملات: ${data?.ok || 0}/${data?.total || 0}`;
  } else if (overall === 'degraded') {
    icon = <WarningAmberIcon />;
    color = 'warning';
    label = `${data?.circuitOpen?.length || 0} دائرة مفتوحة`;
  } else if (overall === 'misconfigured') {
    icon = <ErrorIcon />;
    color = 'error';
    label = `${data?.misconfigured?.length || 0} بحاجة تهيئة`;
  } else {
    icon = <ErrorIcon />;
    color = 'default';
    label = 'تعذّر التحقق';
  }

  const tooltip =
    overall === 'ok'
      ? 'جميع المزودين الحكوميين ضمن الحدود الطبيعية'
      : `مزودون بحاجة انتباه: ${
          [...(data?.circuitOpen || []), ...(data?.misconfigured || [])]
            .filter(Boolean)
            .join('، ') || '—'
        }`;

  return (
    <Tooltip title={tooltip}>
      <Chip
        component={RouterLink}
        to="/admin/integrations-ops"
        clickable
        size="small"
        icon={icon}
        label={label}
        color={color}
        variant="outlined"
        sx={{ textDecoration: 'none', ...sx }}
      />
    </Tooltip>
  );
}
