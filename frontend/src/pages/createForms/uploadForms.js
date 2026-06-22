/**
 * Registry of file-upload screens, powering <FileUploadPage> routes
 * (see AuthenticatedShell). Fixes dashboard "upload" links that pointed at
 * routes that did not exist (404s). Each endpoint is a verified multipart
 * upload endpoint on the live API.
 */
const UPLOAD_FORMS = {
  'medical-files/upload': {
    title: 'رفع ملف طبي',
    subtitle: 'PDF أو صورة أو مستند — يُحفظ ضمن سجلّات المركز',
    endpoint: '/medical-files/single',
    fileField: 'file',
    backTo: '/medical-files',
    successMsg: 'تم رفع الملف الطبي بنجاح ✓',
  },
};

export default UPLOAD_FORMS;
