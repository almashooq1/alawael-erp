import compression from 'compression';
import { Request, Response } from 'express';

/**
 * Middleware لضغط الـ responses
 * يقلل حجم البيانات المنقولة بنسبة 70-90%
 */
export const compressionMiddleware = compression({
  // ضغط جميع الـ responses
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },

  // مستوى الضغط (0-9)
  level: 6, // توازن بين السرعة وحجم الضغط

  // الحد الأدنى لحجم الـ response للضغط
  threshold: 1024, // 1KB

  // Memory level (1-9)
  memLevel: 8,

  // استراتيجية الضغط (Z_DEFAULT_STRATEGY = 0)
  strategy: 0,
});

export default compressionMiddleware;
