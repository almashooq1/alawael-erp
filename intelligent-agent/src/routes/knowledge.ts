
import express from 'express';
import { MaintenanceKnowledge } from '../modules/maintenance-knowledge';
// Import validation middleware from backend
const { commonValidations, handleValidationErrors, sanitizeInput } = require('../../../backend/middleware/requestValidation');

const router = express.Router();
const knowledge = new MaintenanceKnowledge();



// List all articles
router.get('/', sanitizeInput, (req, res) => {
  res.json(knowledge.listArticles());
});

// Get single article
router.get('/:id',
  sanitizeInput,
  commonValidations.requiredString('id', 1, 64),
  handleValidationErrors,
  (req, res) => {
    const article = knowledge.getArticle(req.params.id);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  }
);

// Create article
router.post('/',
  sanitizeInput,
  [
    commonValidations.requiredString('title', 3, 200),
    commonValidations.requiredString('content', 10, 5000),
    commonValidations.array('tags', 1, 20),
    handleValidationErrors
  ],
  (req, res) => {
    const { title, content, tags } = req.body;
    const article = knowledge.createArticle({ title, content, tags });
    res.status(201).json(article);
  }
);

// Update article
router.put('/:id',
  sanitizeInput,
  [
    commonValidations.requiredString('id', 1, 64),
    commonValidations.optionalString('title', 200),
    commonValidations.optionalString('content', 5000),
    commonValidations.array('tags', 0, 20),
    handleValidationErrors
  ],
  (req, res) => {
    const article = knowledge.updateArticle(req.params.id, req.body);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  }
);

// Delete article
router.delete('/:id',
  sanitizeInput,
  commonValidations.requiredString('id', 1, 64),
  handleValidationErrors,
  (req, res) => {
    const ok = knowledge.deleteArticle(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  }
);

// Search articles
router.get('/search/:query',
  sanitizeInput,
  commonValidations.requiredString('query', 1, 100),
  handleValidationErrors,
  (req, res) => {
    res.json(knowledge.searchArticles(req.params.query));
  }
);

export default router;
