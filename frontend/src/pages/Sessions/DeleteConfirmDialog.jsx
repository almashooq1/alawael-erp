/**
 * DeleteConfirmDialog — Session deletion confirmation
 */


const DeleteConfirmDialog = ({ target, onClose, onConfirm }) => (
  <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>تأكيد الحذف</DialogTitle>
    <DialogContent>
      <Typography>
        هل أنت متأكد من حذف الجلسة &quot;{target?.title}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="inherit">إلغاء</Button>
      <Button onClick={onConfirm} color="error" variant="contained">حذف</Button>
    </DialogActions>
  </Dialog>
);

export default DeleteConfirmDialog;
