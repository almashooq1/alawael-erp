import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

function lineKey(line, idx) {
  return line._id || line.itemId || line.item_id || line.itemName || idx;
}

function remainingQty(line) {
  const ordered = Number(line.quantity ?? line.quantityOrdered ?? line.quantity_ordered ?? 0);
  const received = Number(line.quantityReceived ?? line.quantity_received ?? 0);
  return Math.max(0, ordered - received);
}

export default function PartialReceiveDialog({ open, po, onClose, onSubmit, submitting }) {
  const lines = useMemo(() => {
    const src = po?.lineItems || po?.items || [];
    return Array.isArray(src) ? src : [];
  }, [po]);

  const [qtyByKey, setQtyByKey] = useState({});

  useEffect(() => {
    if (!open || !lines.length) return;
    const next = {};
    lines.forEach((line, idx) => {
      next[lineKey(line, idx)] = String(remainingQty(line));
    });
    setQtyByKey(next);
  }, [open, lines]);

  const handleSubmit = () => {
    const items = lines
      .map((line, idx) => {
        const key = lineKey(line, idx);
        const qty = Number(qtyByKey[key] || 0);
        if (qty <= 0) return null;
        return {
          itemName: line.itemName || line.item_name || line.item_name_ar,
          itemId: line.itemId || line.item_id,
          lineIndex: idx,
          quantityReceived: qty,
        };
      })
      .filter(Boolean);
    onSubmit(items);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>تسجيل استلام {po?.orderNumber || po?.po_number || ''}</DialogTitle>
      <DialogContent>
        {!lines.length ? (
          <Typography color="text.secondary">لا توجد بنود للاستلام</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الصنف</TableCell>
                <TableCell align="right">المطلوب</TableCell>
                <TableCell align="right">المستلم سابقاً</TableCell>
                <TableCell align="right">الاستلام الآن</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line, idx) => {
                const key = lineKey(line, idx);
                const rem = remainingQty(line);
                return (
                  <TableRow key={key}>
                    <TableCell>{line.itemName || line.item_name || '—'}</TableCell>
                    <TableCell align="right">
                      {line.quantity ?? line.quantityOrdered ?? line.quantity_ordered ?? '—'}
                    </TableCell>
                    <TableCell align="right">
                      {line.quantityReceived ?? line.quantity_received ?? 0}
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        inputProps={{ min: 0, max: rem, style: { width: 72 } }}
                        value={qtyByKey[key] ?? ''}
                        onChange={e => setQtyByKey(prev => ({ ...prev, [key]: e.target.value }))}
                        disabled={rem <= 0}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting || !lines.length}>
          تأكيد الاستلام
        </Button>
      </DialogActions>
    </Dialog>
  );
}
