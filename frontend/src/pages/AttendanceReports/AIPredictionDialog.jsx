import React from 'react';




const AIPredictionDialog = ({ open, onClose, aiLoading, aiError, aiPrediction, onExport }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>توقع الغياب بالذكاء الاصطناعي</DialogTitle>
    <DialogContent
      sx={{ minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}
    >
      {aiLoading ? (
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
          <Typography align="center" sx={{ mt: 2 }}>جاري التوقع...</Typography>
        </Box>
      ) : aiError ? (
        <Typography color="error">{aiError}</Typography>
      ) : aiPrediction ? (
        <Box sx={{ width: '100%' }}>
          <Typography align="center" variant="h6" sx={{ mb: 2 }}>
            نسبة احتمال الغياب المتوقعة:{' '}
            <Box component="span" sx={{ color: '#fa709a', fontWeight: 'bold' }}>
              {aiPrediction.absenceProbability
                ? `${(aiPrediction.absenceProbability * 100).toFixed(1)}%`
                : 'غير متوفر'}
            </Box>
          </Typography>
          {aiPrediction.reason && (
            <Typography align="center" variant="body2" sx={{ color: '#666' }}>
              {aiPrediction.reason}
            </Typography>
          )}
          <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button variant="outlined" color="primary" onClick={() => onExport('pdf')} startIcon={<PictureAsPdfIcon />}>
              تصدير PDF
            </Button>
            <Button variant="outlined" color="success" onClick={() => onExport('excel')} startIcon={<TableViewIcon />}>
              تصدير Excel
            </Button>
            <Button variant="outlined" color="info" onClick={() => onExport('csv')} startIcon={<FileDownloadIcon />}>
              تصدير CSV
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography align="center">لا توجد بيانات توقع متاحة.</Typography>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>إغلاق</Button>
    </DialogActions>
  </Dialog>
);

export default React.memo(AIPredictionDialog);
