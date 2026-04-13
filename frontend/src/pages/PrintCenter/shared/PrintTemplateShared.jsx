/**
 * مكونات مشتركة لقوالب الطباعة — Shared Print Template Components
 * يُستخدم من قبل جميع قوالب الأقسام
 * @version 1.0.0
 */

// ── Shared Styles ──────────────────────────────
export const headerStyle = {
  background: 'linear-gradient(135deg, #1a237e, #283593)',
  color: 'white', p: 3, borderRadius: '12px 12px 0 0',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
export const sectionTitle = {
  bgcolor: '#f5f5f5', p: 1.5, mb: 2, borderRadius: 1,
  borderRight: '4px solid #1a237e', fontWeight: 'bold',
};
export const fieldRow = { display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap' };
export const fieldBox = (flex = 1) => ({ flex, minWidth: 140 });
export const labelSx = { fontSize: 11, color: '#666', mb: 0.3 };
export const valueSx = { fontSize: 13, fontWeight: 600, borderBottom: '1px dotted #ccc', pb: 0.5, minHeight: 24 };
export const emptyLine = { borderBottom: '1px dotted #999', pb: 0.5, minHeight: 24, display: 'block' };
export const pageWrapper = { border: '2px solid #1a237e', borderRadius: 3, overflow: 'hidden' };
export const bodyPad = { p: 3 };
export const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 };
export const thStyle = { border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right', background: '#f5f5f5', fontWeight: 'bold' };
export const tdStyle = { border: '1px solid #ddd', padding: '6px 8px' };
export const tdCenter = { ...tdStyle, textAlign: 'center' };

// ── Format Date ────────────────────────────────
export const formatDate = (d) => {
  if (!d) return '....../....../......';
  try { return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d)); }
  catch { return String(d).slice(0, 10); }
};

export const formatMoney = (v) => {
  if (!v && v !== 0) return '—';
  return Number(v).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const today = () => formatDate(new Date());

// ── Organization Header ────────────────────────
export const OrgHeader = ({ title, subtitle, color }) => (
  <Box sx={{ ...headerStyle, ...(color ? { background: `linear-gradient(135deg, ${color}, ${color}cc)` } : {}) }}>
    <Box>
      <Typography variant="h5" fontWeight="bold">مركز الأوائل للتأهيل</Typography>
      <Typography variant="body2" sx={{ opacity: 0.9 }}>AlAwael Rehabilitation Center</Typography>
    </Box>
    <Box textAlign="left">
      <Typography variant="h6" fontWeight="bold">{title}</Typography>
      {subtitle && <Typography variant="caption">{subtitle}</Typography>}
    </Box>
  </Box>
);

// ── Organization Footer ────────────────────────
export const OrgFooter = ({ page = '1', total = '1' }) => (
  <Box sx={{ mt: 4, pt: 2, borderTop: '2px solid #1a237e', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666' }}>
    <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</span>
    <span>مركز الأوائل للتأهيل — نظام الأوائل ERP</span>
    <span>صفحة {page} من {total}</span>
  </Box>
);

// ── Signature Block ────────────────────────────
export const SignatureBlock = ({ signatures = ['المسؤول'] }) => (
  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-around' }}>
    {signatures.map((s, i) => (
      <Box key={i} textAlign="center" sx={{ minWidth: 140 }}>
        <Box sx={{ borderBottom: '1px solid #333', mb: 1, height: 40 }} />
        <Typography variant="caption" fontWeight="bold">{s}</Typography>
      </Box>
    ))}
  </Box>
);

// ── Stamp Circle ───────────────────────────────
export const StampCircle = () => (
  <Box textAlign="center">
    <Box sx={{ width: 80, height: 80, border: '2px dashed #ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto' }}>
      <Typography variant="caption" color="text.secondary">الختم</Typography>
    </Box>
  </Box>
);

// ── Field Display ──────────────────────────────
export const Field = ({ label, value, flex = 1 }) => (
  <Box sx={fieldBox(flex)}>
    <Typography sx={labelSx}>{label}</Typography>
    <Typography sx={valueSx}>{value || ''}</Typography>
  </Box>
);

// ── Section Title ──────────────────────────────
export const Section = ({ title, color }) => (
  <Typography sx={{ ...sectionTitle, ...(color ? { borderRight: `4px solid ${color}` } : {}) }}>{title}</Typography>
);

// ── Notes Box ──────────────────────────────────
export const NotesBox = ({ content, minHeight = 60, lines = 0 }) => (
  <Box sx={{ border: '1px dotted #999', borderRadius: 1, p: 2, minHeight }}>
    {content ? <Typography variant="body2">{content}</Typography>
      : lines > 0 ? <Typography variant="body2" sx={{ lineHeight: 2.5 }}>
        {Array(lines).fill(0).map((_, i) => `${i + 1}. ________________________________________`).join('\n')}
      </Typography>
      : null}
  </Box>
);

// ── Table Helper ───────────────────────────────
export const PrintTable = ({ headers, rows, headerBg }) => (
  <table style={tableStyle}>
    <thead>
      <tr>
        {headers.map((h, i) => (
          <th key={i} style={{ ...thStyle, ...(headerBg ? { background: headerBg } : {}), ...(h.width ? { width: h.width } : {}), ...(h.center ? { textAlign: 'center' } : {}) }}>
            {h.label || h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {(!rows || rows.length === 0) && (
        <tr><td colSpan={headers.length} style={{ ...tdStyle, textAlign: 'center', color: '#999', padding: 12 }}>لا يوجد بيانات</td></tr>
      )}
      {(rows || []).map((row, ri) => (
        <tr key={ri}>
          {row.map((cell, ci) => (
            <td key={ci} style={typeof cell === 'object' && cell?.center ? tdCenter : tdStyle}>
              {typeof cell === 'object' && cell?.value !== undefined ? cell.value : cell}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

// ── Empty Rows Table ───────────────────────────
export const EmptyTable = ({ headers, rowCount = 5, headerBg }) => (
  <PrintTable
    headers={headers}
    headerBg={headerBg}
    rows={Array(rowCount).fill(0).map((_, i) => headers.map((_, ci) => ci === 0 ? String(i + 1) : ''))}
  />
);

// ── Ref Number + Date ──────────────────────────
export const RefDateLine = ({ prefix = 'REF', refNum }) => (
  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
    رقم المرجع: {prefix}-{new Date().getFullYear()}-{refNum || '________'} &nbsp;&nbsp; التاريخ: {today()}
  </Typography>
);

// ── Confidential Banner ────────────────────────
export const ConfidentialBanner = ({ text = 'سري — للاستخدام الداخلي فقط — CONFIDENTIAL' }) => (
  <Box sx={{ bgcolor: '#fff3e0', border: '1px solid #ffcc80', borderRadius: 1, p: 1, mb: 2, textAlign: 'center' }}>
    <Typography variant="caption" fontWeight="bold" color="warning.dark">{text}</Typography>
  </Box>
);

// ── Declaration Box ────────────────────────────
export const DeclarationBox = ({ text }) => (
  <Box sx={{ mt: 3, p: 2, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #ddd' }}>
    <Typography variant="body2" fontWeight="bold" gutterBottom>إقرار وتعهد:</Typography>
    <Typography variant="caption" sx={{ lineHeight: 2 }}>{text}</Typography>
  </Box>
);
