import { forwardRef } from 'react';
import { Box, Typography, Divider } from '@mui/material';

/**
 * PrintLayout — Print-ready layout wrapper that shows only when printing.
 * Wrap your printable content in this component and use ref with window.print().
 *
 * @param {string}  title         — Report title
 * @param {string}  [subtitle]    — Subtitle / date range
 * @param {string}  [organization]— Organization name
 * @param {string}  [logo]        — Logo URL
 * @param {node}    children      — Printable content
 * @param {boolean} [showHeader]  — Show print header (default true)
 * @param {boolean} [showFooter]  — Show print footer (default true)
 */
const PrintLayout = forwardRef(({
  title,
  subtitle,
  organization = 'مركز الأوائل للتأهيل',
  logo,
  children,
  showHeader = true,
  showFooter = true,
}, ref) => {
  return (
    <Box
      ref={ref}
      sx={{
        '@media screen': { display: 'none' },
        '@media print': {
          display: 'block',
          p: 3,
          direction: 'rtl',
          fontFamily: 'Cairo, sans-serif',
          '& *': { color: '#000 !important', background: 'transparent !important' },
          '& table': { borderCollapse: 'collapse', width: '100%' },
          '& th, & td': { border: '1px solid #333', padding: '6px 10px', textAlign: 'right' },
          '& th': { fontWeight: 'bold', backgroundColor: '#f0f0f0 !important' },
        },
      }}
    >
      {showHeader && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{organization}</Typography>
              <Typography variant="h6">{title}</Typography>
              {subtitle && <Typography variant="body2">{subtitle}</Typography>}
            </Box>
            {logo && <img src={logo} alt="logo" style={{ height: 60 }} />}
          </Box>
          <Divider sx={{ mb: 2, borderColor: '#333' }} />
        </>
      )}

      {children}

      {showFooter && (
        <>
          <Divider sx={{ mt: 3, mb: 1, borderColor: '#333' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</span>
            <span>{organization} — نظام الأوائل ERP</span>
          </Box>
        </>
      )}
    </Box>
  );
});

PrintLayout.displayName = 'PrintLayout';

export default PrintLayout;
