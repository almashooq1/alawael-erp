import express from 'express';
import { uploadToBox } from '../src/modules/box-integration';
const router = express.Router();
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });

// رفع ملف إلى Box
router.post('/upload', upload.single('file'), async (req, res) => {
  const { clientId, clientSecret, accessToken, boxFolderId, name } = req.body;
  if (!req.file || !clientId || !clientSecret || !accessToken || !boxFolderId || !name) return res.status(400).json({ error: 'missing params' });
  try {
    const id = await uploadToBox({
      clientId,
      clientSecret,
      accessToken,
      filePath: req.file.path,
      boxFolderId,
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
