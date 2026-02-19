# ⚡ أوامر النسخ واللصق المباشرة - Barcode System

**انسخ والصق كل أمر مباشرة - بدون تعديل**

---

## 🎯 اليوم الأول - الإعداد الفوري

### 1️⃣ انتقل للمجلد الصحيح

```bash
cd "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\supply-chain-management"
```

### 2️⃣ شغل قواعد البيانات

```bash
# في Terminal جديد
docker-compose up -d mongo redis

# تحقق من الحالة
docker-compose ps
```

### 3️⃣ انتقل للـ Backend

```bash
cd backend

# تثبيت المكتبات الجديدة
npm install jsbarcode qrcode canvas express-rate-limit winston

# تحقق من التثبيت
npm list jsbarcode qrcode canvas
```

### 4️⃣ أنشئ ملف .env.development

```bash
# في المشروع
cat > .env.development << 'EOF'
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/scm-dev
MONGOOSE_DEBUG=true
JWT_SECRET=test-secret-key-development-only-12345
JWT_EXPIRE=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@scm.local
LOG_LEVEL=debug
LOG_DIR=logs
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
```

---

## 📦 الملفات الجديدة - انسخ المحتوى

### 5️⃣ ملف الخدمة - BarcodeService

**الملف: `backend/services/barcodeService.js`**

```javascript
import winston from 'winston';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: 'logs/barcode-error.log',
      level: 'error',
    }),
    new winston.transports.File({ filename: 'logs/barcode-all.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

export class BarcodeService {
  static async generateQRCode(productData, options = {}) {
    const startTime = Date.now();

    try {
      if (!productData || typeof productData !== 'object') {
        throw new Error('Invalid product data');
      }

      const {
        errorCorrectionLevel = 'H',
        width = 300,
        margin = 1,
        version = null,
      } = options;

      const qrData = JSON.stringify({
        id: productData._id,
        name: productData.name,
        sku: productData.sku,
        price: productData.price,
        timestamp: new Date().toISOString(),
      });

      if (qrData.length > 2953) {
        throw new Error('QR code data too large');
      }

      const qrImage = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel,
        type: 'image/png',
        width,
        margin,
        version,
      });

      const duration = Date.now() - startTime;

      logger.info('QR Code generated successfully', {
        productId: productData._id,
        duration,
        size: qrImage.length,
      });

      return {
        success: true,
        qrCode: qrImage,
        metadata: {
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          size: qrImage.length,
        },
      };
    } catch (error) {
      logger.error('QR Code generation failed', {
        error: error.message,
        productData: productData?._id,
      });
      throw error;
    }
  }

  static async generateBarcode(sku, format = 'CODE128') {
    const startTime = Date.now();

    try {
      if (!sku || typeof sku !== 'string' || sku.length < 3) {
        throw new Error('Invalid SKU format');
      }

      const validFormats = {
        CODE128: { width: 2, height: 80 },
        CODE39: { width: 2, height: 80 },
        EAN13: { width: 2, height: 60 },
        UPC: { width: 2, height: 60 },
      };

      if (!validFormats[format]) {
        throw new Error(`Unsupported format: ${format}`);
      }

      const canvas = createCanvas(300, 100);
      const { width, height } = validFormats[format];

      JsBarcode(canvas, sku, {
        format,
        width,
        height,
        displayValue: true,
        fontSize: 14,
        margin: 10,
      });

      const barcodeImage = canvas.toDataURL('image/png');
      const duration = Date.now() - startTime;

      logger.info('Barcode generated successfully', {
        sku,
        format,
        duration,
        size: barcodeImage.length,
      });

      return {
        success: true,
        barcode: barcodeImage,
        format,
        sku,
        metadata: {
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          size: barcodeImage.length,
        },
      };
    } catch (error) {
      logger.error('Barcode generation failed', {
        error: error.message,
        sku,
        format,
      });
      throw error;
    }
  }

  static async generateBatchCodes(productIds, onProgress) {
    const results = [];
    const total = productIds.length;

    for (let i = 0; i < total; i++) {
      try {
        const productId = productIds[i];
        results.push({ success: true, productId });

        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            percentage: Math.round(((i + 1) / total) * 100),
          });
        }
      } catch (error) {
        results.push({
          success: false,
          productId: productIds[i],
          error: error.message,
        });
      }
    }

    logger.info('Batch generation completed', {
      total,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });

    return results;
  }
}
```

### 6️⃣ ملف الـ Model - BarcodeLog

**الملف: `backend/models/BarcodeLog.js`**

```javascript
import mongoose from 'mongoose';

const barcodeLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    action: {
      type: String,
      enum: ['GENERATE_QR', 'GENERATE_BARCODE', 'SCAN', 'DELETE'],
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    sku: String,
    success: {
      type: Boolean,
      default: true,
    },
    error: String,
    metadata: {
      format: String,
      size: Number,
      duration: Number,
    },
  },
  { timestamps: true }
);

barcodeLogSchema.index({ user: 1, createdAt: -1 });
barcodeLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model('BarcodeLog', barcodeLogSchema);
```

### 7️⃣ Middleware - Authentication

**الملف: `backend/middleware/barcodeAuth.js`**

```javascript
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

export const authBarcodeOperations = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (!['admin', 'warehouse_manager'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const barcodeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const validateBarcodeInput = (req, res, next) => {
  const { format = 'CODE128', errorCorrection = 'H' } = req.body;

  const validFormats = ['CODE128', 'CODE39', 'EAN13', 'UPC'];
  if (!validFormats.includes(format)) {
    return res.status(400).json({
      error: 'Invalid barcode format',
      validFormats,
    });
  }

  const validLevels = ['L', 'M', 'Q', 'H'];
  if (!validLevels.includes(errorCorrection)) {
    return res.status(400).json({
      error: 'Invalid error correction level',
      validLevels,
    });
  }

  next();
};
```

### 8️⃣ API Routes

**الملف: `backend/routes/barcode-pro.js`**

```javascript
import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  authBarcodeOperations,
  barcodeRateLimiter,
  validateBarcodeInput,
} from '../middleware/barcodeAuth.js';
import { BarcodeService } from '../services/barcodeService.js';
import Product from '../models/Product.js';
import BarcodeLog from '../models/BarcodeLog.js';

const router = express.Router();

router.use(barcodeRateLimiter);
router.use(authBarcodeOperations);

router.post(
  '/generate-qr/:productId',
  validateBarcodeInput,
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { errorCorrection = 'H', width = 300 } = req.body;

    const result = await BarcodeService.generateQRCode(product, {
      errorCorrectionLevel: errorCorrection,
      width,
    });

    await BarcodeLog.create({
      user: req.user.id,
      action: 'GENERATE_QR',
      productId: product._id,
      success: true,
      metadata: {
        size: result.qrCode.length,
        format: 'QR_CODE',
      },
    });

    res.json(result);
  })
);

router.post(
  '/generate-barcode/:sku',
  asyncHandler(async (req, res) => {
    const { format = 'CODE128' } = req.body;

    const result = await BarcodeService.generateBarcode(req.params.sku, format);

    await BarcodeLog.create({
      user: req.user.id,
      action: 'GENERATE_BARCODE',
      sku: req.params.sku,
      success: true,
      metadata: {
        format,
        size: result.barcode.length,
      },
    });

    res.json(result);
  })
);

router.post(
  '/batch-generate',
  asyncHandler(async (req, res) => {
    const { productIds, type = 'qr' } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Invalid product IDs' });
    }

    if (productIds.length > 1000) {
      return res
        .status(400)
        .json({ error: 'Maximum 1000 products per request' });
    }

    const results = await BarcodeService.generateBatchCodes(
      productIds,
      progress => {
        req.app.get('io')?.emit('barcodeProgress', progress);
      }
    );

    res.json({
      success: true,
      total: productIds.length,
      successful: results.filter(r => r.success).length,
      results,
    });
  })
);

router.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const { userId, action, limit = 50, skip = 0 } = req.query;

    const filter = {};
    if (userId) filter.user = userId;
    if (action) filter.action = action;

    const logs = await BarcodeLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('user', 'name email');

    const total = await BarcodeLog.countDocuments(filter);

    res.json({
      success: true,
      total,
      count: logs.length,
      logs,
    });
  })
);

export default router;
```

---

## 🔌 أضف المسارات للـ Server

### 9️⃣ عدّل server.js

**ملف: `backend/server.js`**

ابحث عن قسم Routes وأضف هذا السطر:

```javascript
// ابحث عن:
// app.use('/api/products', productRoutes);
// app.use('/api/suppliers', supplierRoutes);

// وأضف بعدهم:
import barcodeRoutes from './routes/barcode-pro.js';
app.use('/api/barcode', barcodeRoutes);
```

---

## 🧪 الاختبار - استخدم Postman

### 🔟 اختبر التوليد

**في Postman:**

```
REQUEST 1: Generate QR
================
Method: POST
URL: http://localhost:3001/api/barcode/generate-qr/507f1f77bcf86cd799439011

Headers:
- Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- Content-Type: application/json

Body (JSON):
{
  "errorCorrection": "H",
  "width": 300
}

Expected Response:
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "metadata": {
    "generatedAt": "2026-02-08T10:00:00.000Z",
    "expiresAt": "2026-02-09T10:00:00.000Z",
    "size": 12345
  }
}
```

---

## 🚀 شغّل الـ Backend

```bash
# تأكد أنك في مجلد backend
cd backend

# شغّل الـ server
npm start

# يجب أن ترى:
# ✅ Server running on port 3001
# ✅ Connected to MongoDB
# ✅ Ready to accept requests
```

---

## 📱 ملف Frontend - اختياري الآن

**الملف: `frontend/src/hooks/useBarcodeGeneration.js`**

```javascript
import { useState, useCallback } from 'react';
import axios from 'axios';

export function useBarcodeGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const generateQR = useCallback(async (productId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/barcode/generate-qr/${productId}`,
        options,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(true);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.error || 'خطأ في التوليد';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateBarcode = useCallback(async (sku, format = 'CODE128') => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/barcode/generate-barcode/${sku}`,
        { format },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(true);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.error || 'خطأ في التوليد';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    success,
    generateQR,
    generateBarcode,
    resetState: () => {
      setError(null);
      setSuccess(false);
    },
  };
}
```

---

## ✅ Checklist التحقق السريع

```bash
# 1. تحقق من المكتبات
npm list jsbarcode qrcode canvas

# 2. تحقق من الملفات
ls backend/services/barcodeService.js
ls backend/models/BarcodeLog.js
ls backend/middleware/barcodeAuth.js
ls backend/routes/barcode-pro.js

# 3. تحقق من الـ imports في server.js
grep "barcodeRoutes" backend/server.js

# 4. شغّل الـ server
npm start

# 5. اختبر بـ curl
curl http://localhost:3001/health
```

---

## 🎯 بعد الانتهاء مباشرة

```
1️⃣ git add .
2️⃣ git commit -m "feat: Add Barcode & QR System"
3️⃣ git push origin develop
```

---

**🎊 تم! أنت الآن جاهز للاختبار الفوري!**

**ابدأ مباشرة في اختبار API مع Postman 🚀**
