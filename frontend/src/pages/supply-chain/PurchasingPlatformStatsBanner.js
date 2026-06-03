import React, { useState, useEffect } from 'react';
import { Alert, Typography, Box, Chip } from '@mui/material';
import { purchasingService } from 'services/operationsService';

/** W803/W804 — ADR-039 cross-tier PO counts (read-only). */
export default function PurchasingPlatformStatsBanner() {
  const [platformStats, setPlatformStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    purchasingService
      .getPlatformStats()
      .then(ps => {
        if (cancelled) return;
        const tierPayload = ps?.data ?? ps;
        setPlatformStats(tierPayload?.tiers ? tierPayload : null);
      })
      .catch(() => {
        if (!cancelled) setPlatformStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tiers = platformStats?.tiers;
  if (!tiers?.legacyPurchasing) return null;

  return (
    <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
        نظرة عبر الطبقات (ADR-039 — للقراءة فقط)
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Chip
          size="small"
          label={`مشتريات (Tier B): ${tiers.legacyPurchasing.totalOrders ?? 0} أمر — ${
            tiers.legacyPurchasing.partialOrders ?? 0
          } جزئي`}
        />
        {tiers.inventoryStock?.modelAvailable !== false ? (
          <Chip
            size="small"
            color="secondary"
            variant="outlined"
            label={`مخزون web-admin (Tier A): ${
              tiers.inventoryStock?.totalOrders ?? 0
            } أمر — ${tiers.inventoryStock?.partiallyReceivedOrders ?? 0} جزئي`}
          />
        ) : (
          <Chip size="small" variant="outlined" label="مخزون web-admin: غير مسجّل في هذه البيئة" />
        )}
      </Box>
    </Alert>
  );
}
