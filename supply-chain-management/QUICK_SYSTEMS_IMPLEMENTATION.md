# 🚀 دليل التطبيق السريع - أفضل 3 أنظمة

**تطبيق الأنظمة الأكثر طلباً مع كود جاهز**

---

## 1️⃣ نظام Barcode & QR Code - التطبيق الكامل

### 📦 التثبيت (5 دقائق)

```bash
# Backend
npm install jsbarcode qrcode

# Frontend
npm install html5-qrcode react-barcode jsbarcode
```

### 🔧 Backend Implementation

#### ملف: `backend/routes/barcode.js`

```javascript
import express from 'express';
import QRCode from 'qrcode';
import { createCanvas } from 'canvas';
import JsBarcode from 'jsbarcode';
import { asyncHandler } from '../middleware/errorHandler.js';
import Product from '../models/Product.js';

const router = express.Router();

// Generate QR Code for Product
router.get(
  '/qr/:productId',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // بيانات الـ QR Code
    const data = JSON.stringify({
      id: product._id,
      name: product.name,
      sku: product.sku,
      price: product.price,
    });

    // توليد QR Code
    const qrImage = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
    });

    res.json({
      success: true,
      qrCode: qrImage,
      data,
    });
  }),
);

// Generate Barcode for Product
router.get(
  '/barcode/:sku',
  asyncHandler(async (req, res) => {
    const { sku } = req.params;

    const product = await Product.findOne({ sku });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // إنشاء canvas
    const canvas = createCanvas(300, 100);

    // توليد Barcode
    JsBarcode(canvas, sku, {
      format: 'CODE128',
      width: 2,
      height: 80,
      displayValue: true,
      fontSize: 14,
    });

    // تحويل لـ base64
    const barcodeImage = canvas.toDataURL('image/png');

    res.json({
      success: true,
      barcode: barcodeImage,
      sku,
      product: {
        name: product.name,
        price: product.price,
        stock: product.stock,
      },
    });
  }),
);

// Scan and Retrieve Product
router.post(
  '/scan',
  asyncHandler(async (req, res) => {
    const { code, type } = req.body; // code = SKU or QR data

    let product;

    if (type === 'qr') {
      const data = JSON.parse(code);
      product = await Product.findById(data.id);
    } else {
      product = await Product.findOne({ sku: code });
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      product,
    });
  }),
);

// Bulk Generate QR/Barcodes for all products
router.get(
  '/bulk/generate',
  asyncHandler(async (req, res) => {
    const products = await Product.find();

    const codes = await Promise.all(
      products.map(async product => {
        const qrCode = await QRCode.toDataURL(
          JSON.stringify({
            id: product._id,
            sku: product.sku,
          }),
        );

        return {
          productId: product._id,
          name: product.name,
          sku: product.sku,
          qrCode,
        };
      }),
    );

    res.json({
      success: true,
      count: codes.length,
      codes,
    });
  }),
);

export default router;
```

### 🎨 Frontend Component

#### ملف: `frontend/src/components/BarcodeScanner.js`

```javascript
import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import Barcode from 'react-barcode';

function BarcodeScanner() {
  const [scannedProduct, setScannedProduct] = useState(null);
  const [manualSku, setManualSku] = useState('');
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    // إعداد QR Scanner
    const qrScanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: 250,
    });

    qrScanner.render(onScanSuccess, onScanError);
    setScanner(qrScanner);

    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, []);

  const onScanSuccess = async decodedText => {
    try {
      const response = await axios.post('/api/barcode/scan', {
        code: decodedText,
        type: 'qr',
      });

      setScannedProduct(response.data.product);

      // إيقاف المسح بعد النجاح
      if (scanner) {
        scanner.clear();
      }
    } catch (error) {
      alert('خطأ في جلب المنتج');
    }
  };

  const onScanError = error => {
    console.warn('Scan error:', error);
  };

  const handleManualSearch = async () => {
    try {
      const response = await axios.post('/api/barcode/scan', {
        code: manualSku,
        type: 'barcode',
      });

      setScannedProduct(response.data.product);
    } catch (error) {
      alert('المنتج غير موجود');
    }
  };

  const generateQR = async productId => {
    try {
      const response = await axios.get(`/api/barcode/qr/${productId}`);
      // عرض QR في modal أو تحميله
      const link = document.createElement('a');
      link.href = response.data.qrCode;
      link.download = `qr-${productId}.png`;
      link.click();
    } catch (error) {
      alert('خطأ في توليد QR');
    }
  };

  return (
    <div className="barcode-scanner">
      <h1>📱 ماسح الباركود والـ QR</h1>

      {/* QR Scanner */}
      <div className="qr-scanner-section">
        <h2>مسح QR Code</h2>
        <div id="qr-reader"></div>
      </div>

      {/* بحث يدوي */}
      <div className="manual-search">
        <h2>بحث يدوي بالـ SKU</h2>
        <input type="text" placeholder="أدخل SKU" value={manualSku} onChange={e => setManualSku(e.target.value)} />
        <button onClick={handleManualSearch}>بحث</button>
      </div>

      {/* النتيجة */}
      {scannedProduct && (
        <div className="product-result">
          <h2>✓ تم العثور على المنتج</h2>
          <div className="product-card">
            <h3>{scannedProduct.name}</h3>
            <p>
              <strong>SKU:</strong> {scannedProduct.sku}
            </p>
            <p>
              <strong>السعر:</strong> {scannedProduct.price} ريال
            </p>
            <p>
              <strong>المخزون:</strong> {scannedProduct.stock}
            </p>

            {/* عرض الباركود */}
            <div className="barcode-display">
              <Barcode value={scannedProduct.sku} />
            </div>

            <button onClick={() => generateQR(scannedProduct._id)}>📥 تحميل QR Code</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BarcodeScanner;
```

### 📱 Mobile App (React Native - اختياري)

```javascript
// استخدام expo-barcode-scanner
import { BarCodeScanner } from 'expo-barcode-scanner';
```

---

## 2️⃣ نظام GPS Tracking - التطبيق الكامل

### 📦 التثبيت

```bash
# Backend
npm install socket.io

# Frontend
npm install socket.io-client react-leaflet leaflet
```

### 🔧 Backend Implementation

#### ملف: `backend/routes/tracking.js`

```javascript
import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import Shipment from '../models/Shipment.js';

const router = express.Router();

// Update Location (من Mobile App أو GPS device)
router.post(
  '/location/:shipmentId',
  asyncHandler(async (req, res) => {
    const { latitude, longitude, speed, heading } = req.body;

    const shipment = await Shipment.findById(req.params.shipmentId);

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // تحديث الموقع
    shipment.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude],
      timestamp: new Date(),
    };

    // تحديث بيانات إضافية
    shipment.tracking = {
      ...shipment.tracking,
      speed,
      heading,
      lastUpdate: new Date(),
    };

    await shipment.save();

    // بث الموقع للمستمعين عبر Socket.io
    req.app.get('io').to(`shipment-${shipmentId}`).emit('locationUpdate', {
      shipmentId: shipment._id,
      location: { latitude, longitude },
      speed,
      heading,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      location: shipment.currentLocation,
    });
  }),
);

// Get Current Location
router.get(
  '/location/:shipmentId',
  asyncHandler(async (req, res) => {
    const shipment = await Shipment.findById(req.params.shipmentId);

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    res.json({
      success: true,
      location: shipment.currentLocation,
      tracking: shipment.tracking,
      estimatedArrival: calculateETA(shipment),
    });
  }),
);

// Get Location History
router.get(
  '/history/:shipmentId',
  asyncHandler(async (req, res) => {
    const shipment = await Shipment.findById(req.params.shipmentId);

    // افترض وجود مجموعة locationHistory في الـ model
    res.json({
      success: true,
      history: shipment.locationHistory || [],
    });
  }),
);

// Helper function للـ ETA
function calculateETA(shipment) {
  // خوارزمية بسيطة - يمكن استخدام Google Maps API
  const destination = shipment.destination;
  const current = shipment.currentLocation;

  // حساب المسافة والوقت المتوقع
  // ...

  return new Date(Date.now() + 3600000); // ساعة واحدة كمثال
}

export default router;
```

#### تحديث Shipment Model

```javascript
// في backend/models/Shipment.js
const shipmentSchema = new mongoose.Schema({
  // ... الحقول الموجودة

  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere',
    },
    timestamp: Date,
  },

  tracking: {
    speed: Number, // km/h
    heading: Number, // درجات
    lastUpdate: Date,
  },

  locationHistory: [
    {
      coordinates: [Number],
      timestamp: Date,
      speed: Number,
    },
  ],
});
```

### 🎨 Frontend Component

#### ملف: `frontend/src/components/TrackingMap.js`

```javascript
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import io from 'socket.io-client';
import 'leaflet/dist/leaflet.css';

function TrackingMap({ shipmentId }) {
  const [location, setLocation] = useState(null);
  const [history, setHistory] = useState([]);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    // جلب الموقع الحالي
    fetchCurrentLocation();

    // الاتصال بـ Socket.io للتحديثات الفورية
    const socket = io('http://localhost:3001');

    socket.emit('joinShipment', shipmentId);

    socket.on('locationUpdate', data => {
      setLocation(data.location);
      setHistory(prev => [...prev, data.location]);
    });

    return () => {
      socket.disconnect();
    };
  }, [shipmentId]);

  const fetchCurrentLocation = async () => {
    try {
      const response = await fetch(`/api/tracking/location/${shipmentId}`);
      const data = await response.json();

      if (data.success) {
        setLocation({
          latitude: data.location.coordinates[1],
          longitude: data.location.coordinates[0],
        });
        setEta(data.estimatedArrival);
      }
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  };

  if (!location) {
    return <div>جاري تحميل الخريطة...</div>;
  }

  return (
    <div className="tracking-map">
      <div className="map-header">
        <h2>🗺️ تتبع الشحنة</h2>
        {eta && <div className="eta-display">⏰ الوصول المتوقع: {new Date(eta).toLocaleTimeString('ar')}</div>}
      </div>

      <MapContainer center={[location.latitude, location.longitude]} zoom={13} style={{ height: '500px', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

        {/* الموقع الحالي */}
        <Marker position={[location.latitude, location.longitude]}>
          <Popup>
            📍 الموقع الحالي
            <br />
            📦 شحنة #{shipmentId}
          </Popup>
        </Marker>

        {/* المسار */}
        {history.length > 0 && <Polyline positions={history.map(h => [h.latitude, h.longitude])} color="blue" weight={3} />}
      </MapContainer>

      {/* معلومات إضافية */}
      <div className="tracking-info">
        <p>
          📍 الإحداثيات: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </p>
        <p>🚚 السرعة: {location.speed || 0} km/h</p>
        <p>🧭 الاتجاه: {location.heading || 0}°</p>
      </div>
    </div>
  );
}

export default TrackingMap;
```

---

## 3️⃣ نظام HR - الحضور والانصراف

### 🔧 Backend Model

#### ملف: `backend/models/Employee.js`

```javascript
import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    department: String,
    position: String,
    salary: Number,
    hireDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'vacation'],
      default: 'active',
    },
  },
  { timestamps: true },
);

export default mongoose.model('Employee', employeeSchema);
```

#### ملف: `backend/models/Attendance.js`

```javascript
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    checkIn: Date,
    checkOut: Date,
    totalHours: Number,
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day'],
      default: 'present',
    },
    notes: String,
  },
  { timestamps: true },
);

// Index للبحث السريع
attendanceSchema.index({ employee: 1, date: -1 });

export default mongoose.model('Attendance', attendanceSchema);
```

### 📝 Backend Routes

```javascript
import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';

const router = express.Router();

// Check In
router.post(
  '/checkin/:employeeId',
  asyncHandler(async (req, res) => {
    const employee = await Employee.findOne({
      employeeId: req.params.employeeId,
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // تحقق إذا سجل حضور اليوم
    let attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today },
    });

    if (attendance && attendance.checkIn) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    if (!attendance) {
      attendance = new Attendance({
        employee: employee._id,
        date: new Date(),
      });
    }

    attendance.checkIn = new Date();

    // تحديد الحالة (متأخر؟)
    const hour = attendance.checkIn.getHours();
    attendance.status = hour > 8 ? 'late' : 'present';

    await attendance.save();

    res.json({
      success: true,
      message: `تم تسجيل حضور ${employee.name}`,
      checkInTime: attendance.checkIn,
    });
  }),
);

// Check Out
router.post(
  '/checkout/:employeeId',
  asyncHandler(async (req, res) => {
    const employee = await Employee.findOne({
      employeeId: req.params.employeeId,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today },
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ error: 'No check-in record found' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ error: 'Already checked out' });
    }

    attendance.checkOut = new Date();

    // حساب إجمالي الساعات
    const hours = (attendance.checkOut - attendance.checkIn) / (1000 * 60 * 60);
    attendance.totalHours = Math.round(hours * 100) / 100;

    await attendance.save();

    res.json({
      success: true,
      message: `تم تسجيل خروج ${employee.name}`,
      checkOutTime: attendance.checkOut,
      totalHours: attendance.totalHours,
    });
  }),
);

// Get Attendance Report
router.get(
  '/report/:employeeId',
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const employee = await Employee.findOne({
      employeeId: req.params.employeeId,
    });

    const attendance = await Attendance.find({
      employee: employee._id,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).sort({ date: -1 });

    const summary = {
      totalDays: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      late: attendance.filter(a => a.status === 'late').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      totalHours: attendance.reduce((sum, a) => sum + (a.totalHours || 0), 0),
    };

    res.json({
      success: true,
      employee: employee.name,
      summary,
      attendance,
    });
  }),
);

export default router;
```

---

## 📊 خطة التطبيق

### الأسبوع 1: Barcode/QR

```text
يوم 1-2: Backend routes
يوم 3-4: Frontend scanner
يوم 5:   Testing + Integration
```

### الأسبوع 2-3: GPS Tracking

```text
يوم 1-3: Backend + Socket.io
يوم 4-6: Frontend map
يوم 7:   Testing + Mobile app
```

### الأسبوع 4-5: HR Attendance

```text
يوم 1-2: Models & Routes
يوم 3-4: Frontend UI
يوم 5-6: Reports & Analytics
يوم 7:   Testing
```

---

<br>

**🚀 كل الكود جاهز للاستخدام الفوري**

**📱 ابدأ بـ Barcode (الأسهل)**

**🗺️ ثم GPS Tracking**

**👥 وأخيراً HR System**
