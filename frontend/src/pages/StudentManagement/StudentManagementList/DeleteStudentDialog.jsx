


/** Delete confirmation dialog */
const DeleteStudentDialog = ({ open, student, onClose, onConfirm }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle sx={{ fontWeight: 'bold' }}>تأكيد الحذف</DialogTitle>
    <DialogContent>
      <DialogContentText>
        هل أنت متأكد من حذف الطالب{' '}
        <strong>
          {student?.personalInfo?.firstName?.ar || ''}{' '}
          {student?.personalInfo?.lastName?.ar || ''}
        </strong>
        ؟ لا يمكن التراجع عن هذا الإجراء.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>إلغاء</Button>
      <Button onClick={onConfirm} color="error" variant="contained">
        حذف
      </Button>
    </DialogActions>
  </Dialog>
);

export default DeleteStudentDialog;
