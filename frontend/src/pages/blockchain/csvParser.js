/**
 * Minimal RFC-4180-ish CSV parser used by BatchIssue.
 *
 * Handles:
 *   • Quoted fields with embedded commas
 *   • "" → " escape inside quoted fields
 *   • CRLF and LF line endings
 *   • Trailing blank lines (filtered)
 *   • A final row without a trailing newline
 *
 * Intentionally NOT a full CSV lib — admin-curated certificate CSVs are small
 * and well-formed enough that pulling in a dependency would be overkill.
 */

export function parseCsv(text) {
  const rows = [];
  let cur = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQ = false;
      } else field += ch;
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      cur.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = '';
    } else field += ch;
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

export function rowsToObjects(rows) {
  if (rows.length === 0) return { headers: [], objects: [] };
  const headers = rows[0].map(h => h.trim());
  const objects = rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, i) => {
      o[h] = (r[i] ?? '').trim();
    });
    return o;
  });
  return { headers, objects };
}

export function rowToCertPayload(row, templateId) {
  const data = {};
  for (const k of Object.keys(row)) {
    if (k.startsWith('data.')) data[k.slice(5)] = row[k];
  }
  return {
    template: templateId || undefined,
    recipient: {
      name: { ar: row.recipient_name_ar || '', en: row.recipient_name_en || '' },
      nationalId: row.national_id || undefined,
      email: row.email || undefined,
    },
    title: { ar: row.title_ar || '', en: row.title_en || '' },
    data: Object.keys(data).length ? data : undefined,
  };
}
