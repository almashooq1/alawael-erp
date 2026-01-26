/**
 * Camera Routes - مسارات إدارة الكاميرات
 */

const express = require('express');
const router = express.Router();
const Camera = require('../models/Camera');
const Branch = require('../models/Branch');
const hikvisionService = require('../services/hikvisionService');
const { authenticateToken } = require('../middleware/auth');

/**
 * الحصول على جميع الكاميرات
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { branchId, status, limit = 100, skip = 0 } = req.query;

    let query = { deletedAt: null };
    if (branchId) query.branchId = branchId;
    if (status) query.status = status;

    const cameras = await Camera.find(query)
      .populate('branchId', 'name code')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    const total = await Camera.countDocuments(query);

    res.json({
      success: true,
      data: cameras,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * الحصول على كاميرا محددة
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id).populate('branchId', 'name code');

    if (!camera || camera.deletedAt) {
      return res.status(404).json({ success: false, error: 'الكاميرا غير موجودة' });
    }

    res.json({ success: true, data: camera });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * إنشاء كاميرا جديدة
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, branchId, hikvision, recording, motionDetection, cloudSettings } = req.body;

    // التححقق من الفرع
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(400).json({ success: false, error: 'الفرع غير موجود' });
    }

    // اختبار الاتصال بـ Hikvision
    const connectionTest = await hikvisionService.testConnection(
      hikvision.ipAddress,
      hikvision.port,
      hikvision.username,
      hikvision.password,
    );

    if (!connectionTest.success) {
      return res.status(400).json({
        success: false,
        error: 'فشل الاتصال بالكاميرا: ' + connectionTest.message,
      });
    }

    // الحصول على معلومات الجهاز
    const deviceInfo = await hikvisionService.getDeviceInfo(hikvision.ipAddress, hikvision.port, hikvision.username, hikvision.password);

    const camera = new Camera({
      name,
      branchId,
      hikvision: {
        ...hikvision,
        deviceId: deviceInfo.device?.deviceId,
        serialNumber: deviceInfo.device?.serialNumber,
        model: deviceInfo.device?.model,
        rtspUrl: `rtsp://${hikvision.username}:${hikvision.password}@${hikvision.ipAddress}:${hikvision.port}/Streaming/Channels/${hikvision.cameraIndex}/`,
      },
      recording: recording || { enabled: true },
      motionDetection: motionDetection || { enabled: true, sensitivity: 50 },
      cloudSettings: cloudSettings || { uploadEnabled: true, cloudProvider: 'aws-s3' },
      status: 'online',
      lastOnline: new Date(),
      createdBy: req.user._id,
    });

    await camera.save();

    // تحديث إحصائيات الفرع
    await branch.updateStatistics();

    res.status(201).json({
      success: true,
      data: camera,
      message: '✅ تم إضافة الكاميرا بنجاح',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * تحديث كاميرا
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, location, recording, motionDetection, cloudSettings, status } = req.body;

    const camera = await Camera.findById(req.params.id);
    if (!camera || camera.deletedAt) {
      return res.status(404).json({ success: false, error: 'الكاميرا غير موجودة' });
    }

    camera.name = name || camera.name;
    camera.location = location || camera.location;
    camera.recording = recording || camera.recording;
    camera.motionDetection = motionDetection || camera.motionDetection;
    camera.cloudSettings = cloudSettings || camera.cloudSettings;
    if (status) camera.status = status;
    camera.updatedBy = req.user._id;

    await camera.save();

    res.json({
      success: true,
      data: camera,
      message: '✅ تم تحديث الكاميرا بنجاح',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * حذف كاميرا
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera || camera.deletedAt) {
      return res.status(404).json({ success: false, error: 'الكاميرا غير موجودة' });
    }

    camera.deletedAt = new Date();
    await camera.save();

    // تحديث إحصائيات الفرع
    const branch = await Branch.findById(camera.branchId);
    if (branch) await branch.updateStatistics();

    res.json({ success: true, message: '✅ تم حذف الكاميرا بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * اختبار الاتصال بالكاميرا
 */
router.post('/:id/test-connection', authenticate, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ success: false, error: 'الكاميرا غير موجودة' });
    }

    const { ipAddress, port, username, password } = camera.hikvision;
    const result = await hikvisionService.testConnection(ipAddress, port, username, password);

    if (result.success) {
      await camera.updateStatus('online');
    } else {
      await camera.updateStatus('error', result.error);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * الحصول على معلومات الجهاز
 */
router.get('/:id/device-info', authenticate, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ success: false, error: 'الكاميرا غير موجودة' });
    }

    const { ipAddress, port, username, password } = camera.hikvision;
    const deviceInfo = await hikvisionService.getDeviceInfo(ipAddress, port, username, password);

    res.json(deviceInfo);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * الحصول على رابط البث المباشر
 */
router.get('/:id/stream', authenticate, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ success: false, error: 'الكاميرا غير موجودة' });
    }

    const { ipAddress, port, username, password, cameraIndex } = camera.hikvision;
    const streamUrl = await hikvisionService.getLiveStreamUrl(ipAddress, port, username, password, cameraIndex);

    res.json(streamUrl);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * تفعيل/تعطيل كشف الحركة
 */
router.put('/:id/motion-detection', authenticate, async (req, res) => {
  try {
    const { enabled, sensitivity } = req.body;
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ success: false, error: 'الكاميرا غير موجودة' });
    }

    const { ipAddress, port, username, password } = camera.hikvision;
    const result = await hikvisionService.setMotionDetection(ipAddress, port, username, password, enabled, sensitivity);

    if (result.success) {
      camera.motionDetection.enabled = enabled;
      camera.motionDetection.sensitivity = sensitivity || camera.motionDetection.sensitivity;
      await camera.save();
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * الحصول على كاميرات الفرع
 */
router.get('/branch/:branchId/cameras', authenticate, async (req, res) => {
  try {
    const cameras = await Camera.find({ branchId: req.params.branchId, deletedAt: null }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: cameras,
      count: cameras.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * حفظ لقطة من الكاميرا
 */
router.post('/:id/capture-snapshot', authenticate, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ success: false, error: 'الكاميرا غير موجودة' });
    }

    const { ipAddress, port, username, password, cameraIndex } = camera.hikvision;
    const snapshot = await hikvisionService.captureSnapshot(ipAddress, port, username, password, cameraIndex);

    if (snapshot.success) {
      res.set('Content-Type', snapshot.contentType);
      res.send(snapshot.imageBuffer);
    } else {
      res.status(500).json(snapshot);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

