/**
 * DateDisplay — Calendar-aware date rendering component.
 * مكوّن عرض التاريخ — يتبدّل تلقائياً بين الهجري والميلادي.
 *
 * Subscribes to CalendarContext and re-renders instantly on toggle.
 *
 * Props:
 *   value       — Date string, Date object, or ISO string  (required)
 *   withTime    — Also show HH:MM (default: false)
 *   dual        — Show "gregorian | hijri" side-by-side (default: false)
 *   fallback    — String shown when value is empty/invalid (default: "—")
 *   component   — Root element ('span' | 'p' | 'div', default: 'span')
 *   options     — Intl.DateTimeFormat options forwarded to formatter
 *   sx / style  — Inline styling
 *   className
 *
 * Usage:
 *   <DateDisplay value={record.date} />
 *   <DateDisplay value={record.createdAt} withTime />
 *   <DateDisplay value={record.date} dual />
 */

import { Typography } from '@mui/material';
import { useDateFormatter } from 'contexts/CalendarContext';

export default function DateDisplay({
  value,
  withTime = false,
  dual = false,
  fallback = '—',
  component = 'span',
  options,
  sx,
  style,
  className,
}) {
  const { fmt, fmtDT, fmtDual } = useDateFormatter();

  if (!value) {
    return (
      <Typography component={component} sx={sx} style={style} className={className}>
        {fallback}
      </Typography>
    );
  }

  let text;
  if (dual) {
    text = fmtDual(value);
  } else if (withTime) {
    text = fmtDT(value);
  } else {
    text = fmt(value, options);
  }

  return (
    <Typography component={component} sx={sx} style={style} className={className}>
      {text}
    </Typography>
  );
}
