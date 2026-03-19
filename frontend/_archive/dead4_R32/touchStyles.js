// أنماط لمس موحدة للأزرار والجداول (React/Vue)
// للاستخدام في React: style={touchButtonStyle}
// للاستخدام في Vue: :style="touchButtonStyle"
// جميع القيم كسلاسل نصية لتوافق Vue وReact
export const touchStyles = {
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
};

export const touchButtonStyle = {
  ...touchStyles,
  minWidth: '56px',
  minHeight: '44px',
  fontSize: '18px',
  borderRadius: '10px',
  boxShadow: '0 1px 4px #ccc',
  cursor: 'pointer',
  transition: 'background 0.2s, color 0.2s',
  padding: '8px 20px',
  fontWeight: 500,
  border: 'none',
};

export const touchTableStyle = {
  ...touchStyles,
  fontSize: '17px',
};
