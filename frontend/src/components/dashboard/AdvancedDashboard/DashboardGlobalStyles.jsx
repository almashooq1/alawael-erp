/**
 * DashboardGlobalStyles — Print CSS, keyboard focus ring, skip-to-content
 */
import { brandColors, surfaceColors, neutralColors } from 'theme/palette';

const DashboardGlobalStyles = () => (
  <>
    <style>{`
      @media print {
        body { background: #fff !important; -webkit-print-color-adjust: economy; }
        nav, header, .MuiAppBar-root, .MuiFab-root,
        .MuiSnackbar-root, .no-print { display: none !important; }
        .MuiPaper-root { box-shadow: none !important; border: 1px solid ${surfaceColors.divider} !important; break-inside: avoid; }
        .MuiChip-root { border: 1px solid ${neutralColors.borderInactive} !important; }
        svg circle[stroke-dasharray] { stroke-dashoffset: 0 !important; }
      }
      *:focus-visible {
        outline: 2px solid ${brandColors.primaryStart} !important;
        outline-offset: 2px !important;
        border-radius: 4px;
      }
      button:focus-visible, [role="button"]:focus-visible {
        box-shadow: 0 0 0 3px rgba(102,126,234,0.35) !important;
      }
      .MuiChip-root:focus-visible {
        outline: 2px solid ${brandColors.primaryStart} !important;
        outline-offset: 1px !important;
      }
    `}</style>

    <a
      href="#dashboard-content"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
      onFocus={(e) => {
        e.target.style.position = 'fixed';
        e.target.style.left = '16px';
        e.target.style.top = '16px';
        e.target.style.width = 'auto';
        e.target.style.height = 'auto';
        e.target.style.overflow = 'visible';
        e.target.style.zIndex = '9999';
        e.target.style.background = brandColors.primaryStart;
        e.target.style.color = '#fff';
        e.target.style.padding = '8px 16px';
        e.target.style.borderRadius = '8px';
        e.target.style.fontWeight = '700';
        e.target.style.fontSize = '0.85rem';
        e.target.style.textDecoration = 'none';
      }}
      onBlur={(e) => {
        e.target.style.position = 'absolute';
        e.target.style.left = '-9999px';
        e.target.style.width = '1px';
        e.target.style.height = '1px';
        e.target.style.overflow = 'hidden';
      }}
    >
      تخطي إلى المحتوى الرئيسي
    </a>
  </>
);

export default DashboardGlobalStyles;
