/**
 * BuildInfoChip — tiny footer chip showing the serving commit SHA + uptime.
 *
 * Drop-in: <BuildInfoChip /> anywhere in the admin shell. Fetches once
 * on mount from /api/build-info (unauth). Shows short SHA; tooltip
 * carries full SHA + startedAt + uptime + node version.
 *
 * Gracefully hides itself if the endpoint 404s (backward-compatible
 * with older deploys that don't have build-info yet).
 */

import { useEffect, useState } from 'react';
import { Chip, Tooltip, Box, Typography } from '@mui/material';
import CommitIcon from '@mui/icons-material/Commit';
import api from '../services/api.client';

export default function BuildInfoChip({ sx }) {
  const [info, setInfo] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/build-info')
      .then(res => {
        if (!cancelled) setInfo(res.data);
      })
      .catch(() => {
        if (!cancelled) setHidden(true); // older deploy — silently hide
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (hidden || !info) return null;

  const tooltip = (
    <Box sx={{ direction: 'ltr' }}>
      <Typography variant="caption" sx={{ display: 'block' }}>
        commit: <code>{info.commit}</code>
      </Typography>
      <Typography variant="caption" sx={{ display: 'block' }}>
        started: {info.startedAt}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block' }}>
        uptime: {info.uptimeHuman}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block' }}>
        node {info.node} · {info.platform} · pid {info.pid} · {info.env}
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltip}>
      <Chip
        size="small"
        icon={<CommitIcon />}
        label={info.commitShort}
        variant="outlined"
        sx={{ fontFamily: 'monospace', ...sx }}
      />
    </Tooltip>
  );
}
