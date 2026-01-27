import express from 'express';
import { uploadToGoogleDrive } from '../src/modules/google-drive-integration';
const router = express.Router();
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });

// رفع ملف إلى Google Drive
router.post('/upload', upload.single('file'), async (req, res) => {
  const { credentials, token, name, mimeType } = req.body;
  if (!req.file || !credentials || !token || !name || !mimeType) return res.status(400).json({ error: 'missing params' });
  try {
    const id = await uploadToGoogleDrive({
      credentials: JSON.parse(credentials),
      token: JSON.parse(token),
      filePath: req.file.path,
      mimeType,
      name
    });
    res.json({ id });
  } catch (e:any) {
    res.status(500).json({ error: e.message });
  } finally {
    require('fs').unlinkSync(req.file.path);
  }
});

export default router;
