


/* ------------------------------------------------------------------ */
/*  Status options (shared across tabs)                                */
/* ------------------------------------------------------------------ */
const STATUS_OPTIONS = ['متوفر', 'نشط', 'مفعّل', 'معتمد', 'سارية', 'فعّال', 'منخفض', 'معلّق', 'منتهي', 'قيد المراجعة'];

/* ------------------------------------------------------------------ */
/*  SystemAdminDialog                                                  */
/* ------------------------------------------------------------------ */
const SystemAdminDialog = ({
  dialogOpen,
  setDialogOpen,
  dialogType,
  editItem,
  form,
  setForm,
  handleSave,
  tabs = [],
}) => {
  const isEdit = dialogType === 'edit';

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const onClose = () => setDialogOpen(false);

  return (
    <Dialog
      open={dialogOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {/* ---- title ---- */}
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
          {isEdit ? 'تعديل العنصر' : 'إضافة عنصر جديد'}
        </Typography>
      </DialogTitle>

      <Divider />

      {/* ---- form fields ---- */}
      <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {isEdit && editItem && (
          <Box
            sx={{
              bgcolor: 'grey.50',
              borderRadius: 2,
              px: 2,
              py: 1,
              mb: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              تعديل العنصر رقم: {editItem.id}
            </Typography>
          </Box>
        )}

        <TextField
          label="الاسم"
          value={form.name}
          onChange={handleChange('name')}
          fullWidth
          required
          size="small"
        />

        <TextField
          label="الحالة"
          value={form.status}
          onChange={handleChange('status')}
          fullWidth
          select
          size="small"
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="ملاحظات"
          value={form.notes}
          onChange={handleChange('notes')}
          fullWidth
          multiline
          minRows={3}
          size="small"
        />
      </DialogContent>

      {/* ---- actions ---- */}
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} startIcon={<CloseIcon />} color="inherit">
          إلغاء
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!form.name}
          sx={{
            background: 'linear-gradient(135deg, #1a237e, #0d47a1)',
            '&:hover': { background: 'linear-gradient(135deg, #283593, #1565c0)' },
          }}
        >
          {isEdit ? 'حفظ التعديلات' : 'إضافة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SystemAdminDialog;
