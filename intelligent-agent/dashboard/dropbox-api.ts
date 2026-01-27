import express from 'express';
import { uploadToDropbox } from '../src/modules/dropbox-integration';
const router = express.Router();
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });

// رفع ملف إلى Dropbox
router.post('/upload', upload.single('file'), async (req, res) => {
  const { accessToken, dropboxPath } = req.body;
  if (!req.file || !accessToken || !dropboxPath) return res.status(400).json({ error: 'missing params' });
  try {
    const id = await uploadToDropbox({
      accessToken,
      filePath: req.file.path,
      dropboxPath
    });
    res.json({ id });
  } catch (e:any) {
    res.status(500).json({ error: e.message });
  } finally {
    require('fs').unlinkSync(req.file.path);
  }
});

export default router;
