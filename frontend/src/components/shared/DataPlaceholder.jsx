
/**
 * DataPlaceholder — Unified empty/error/loading/success state display.
 *
 * @param {string} type        — 'empty' | 'error' | 'no-results' | 'success'
 * @param {string} [title]     — Override title
 * @param {string} [message]   — Override message
 * @param {node}   [icon]      — Override icon
 * @param {node}   [action]    — Action button
 * @param {object} [sx]        — Extra styles
 */
const DataPlaceholder = ({ type = 'empty', title, message, icon, action, sx = {} }) => {
  const configs = {
    empty: { icon: <EmptyIcon sx={{ fontSize: 64, color: '#9E9E9E' }} />, title: 'لا توجد بيانات', message: 'لم يتم العثور على بيانات لعرضها', color: '#9E9E9E' },
    error: { icon: <ErrorIcon sx={{ fontSize: 64, color: '#E53935' }} />, title: 'حدث خطأ', message: 'حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى', color: '#E53935' },
    'no-results': { icon: <EmptyIcon sx={{ fontSize: 64, color: '#FF9800' }} />, title: 'لا توجد نتائج', message: 'لم يتم العثور على نتائج مطابقة للبحث. جرّب تعديل معايير البحث', color: '#FF9800' },
    success: { icon: <SuccessIcon sx={{ fontSize: 64, color: '#43A047' }} />, title: 'تم بنجاح', message: 'تمت العملية بنجاح', color: '#43A047' },
  };

  const config = configs[type] || configs.empty;

  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 3, ...sx }}>
      <Box sx={{ mb: 2 }}>{icon || config.icon}</Box>
      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, color: config.color }}>
        {title || config.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
        {message || config.message}
      </Typography>
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
};

export default DataPlaceholder;
