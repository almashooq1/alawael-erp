const express = require('express');
const router = express.Router();
const SmartDocumentService = require('../services/smartDocument.service');

// Mock Auth Middleware
const mockAuth = (req, res, next) => {
  next();
};

// --- Template Routes ---

// GET /api/documents-smart/templates
router.get('/templates', mockAuth, (req, res) => {
  try {
    const templates = SmartDocumentService.getAllTemplates();
    res.json({ success: true, count: templates.length, data: templates });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/documents-smart/templates
router.post('/templates', mockAuth, (req, res) => {
  try {
    const template = SmartDocumentService.createTemplate(req.body);
    res.json({ success: true, data: template });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// --- Document Generation Routes ---

// POST /api/documents-smart/generate
router.post('/generate', mockAuth, async (req, res) => {
  try {
    // Body: { templateId, personId, customData: { ... } }
    const { templateId, personId, customData } = req.body;
    const document = await SmartDocumentService.generateDraft(templateId, personId, customData);
    res.json({ success: true, data: document });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/documents-smart/request-signature
router.post('/request-signature', mockAuth, async (req, res) => {
  try {
    // Body: { docId, signerRole }
    const { docId, signerRole } = req.body;
    const document = await SmartDocumentService.requestSignature(docId, signerRole);
    res.json({ success: true, data: document });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/documents-smart/sign
router.post('/sign', mockAuth, async (req, res) => {
  try {
    // Body: { docId, signerName }
    const { docId, signerName } = req.body;
    const document = await SmartDocumentService.signDocument(docId, signerName);
    res.json({ success: true, data: document });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/documents-smart/verify/:refNo
router.get('/verify/:refNo', (req, res) => {
  try {
    const result = SmartDocumentService.verifyDocument(req.params.refNo);
    if (!result.valid) {
      return res.json({ success: false, valid: false, message: result.message });
    }
    res.json({ success: true, valid: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/documents-smart/:id
router.get('/:id', mockAuth, (req, res) => {
  try {
    const doc = SmartDocumentService.getDocument(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// MOCK PDF DOWNLOAD (Returns HTML for viewing)
router.get('/download/:filename', (req, res) => {
  const docId = req.params.filename.replace('.pdf', '');
  const doc = SmartDocumentService.getDocument(docId);
  if (!doc) return res.status(404).send('Document not found');

  res.send(`
        <html>
            <head><title>${doc.templateName}</title></head>
            <body style="padding: 40px; font-family: 'Times New Roman', serif;">
                <div style="border: 1px solid #ccc; padding: 40px; max-width: 800px; margin: 0 auto;">
                    ${doc.content}
                </div>
                <script>window.print()</script>
            </body>
        </html>
    `);
});

module.exports = router;
