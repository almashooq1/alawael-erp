// أنماط موحدة لدعم اللمس للأزرار والجداول في جميع لوحات النظام
export const touchStyles = {
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none' as const,
};

export const touchButtonStyle = {
  ...touchStyles,
  minWidth: 56,
  minHeight: 44,
  fontSize: 18,
  borderRadius: 10,
  boxShadow: '0 1px 4px #ccc',
  cursor: 'pointer',
  transition: 'background 0.2s, color 0.2s',
  padding: '8px 20px',
  fontWeight: 500,
  border: 'none',
};

export const touchTableStyle = {
  ...touchStyles,
  fontSize: 17,
};
