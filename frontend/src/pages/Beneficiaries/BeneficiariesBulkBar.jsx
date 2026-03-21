/**
 * شريط الإجراءات الجماعية
 * BeneficiariesBulkBar – conditional bulk-action bar
 */


const BeneficiariesBulkBar = ({ selected, handleBulkAction }) => {
  if (selected.length === 0) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        mb: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        bgcolor: 'primary.light',
        color: 'primary.contrastText',
      }}
    >
      <Typography variant="subtitle1" fontWeight="bold">
        تم تحديد {selected.length} مستفيد
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<Send />}
          onClick={() => handleBulkAction('send')}
        >
          إرسال رسالة
        </Button>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<Download />}
          onClick={() => handleBulkAction('export')}
        >
          تصدير
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<Delete />}
          onClick={() => handleBulkAction('delete')}
        >
          حذف
        </Button>
      </Stack>
    </Paper>
  );
};

export default BeneficiariesBulkBar;
