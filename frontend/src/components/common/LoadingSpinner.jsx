/**
 * LoadingSpinner.jsx - Loading Spinner Component (MUI)
 * مكون العجلة الدوارة للتحميل
 */


const LoadingSpinner = ({ message = 'جاري التحميل...', open = true }) => {
  return (
    <Backdrop
      open={open}
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, flexDirection: 'column', gap: 2 }}
    >
      <CircularProgress color="inherit" size={56} thickness={4} />
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body1" sx={{ color: '#fff', fontWeight: 500 }}>
          {message}
        </Typography>
      </Box>
    </Backdrop>
  );
};

export default LoadingSpinner;
