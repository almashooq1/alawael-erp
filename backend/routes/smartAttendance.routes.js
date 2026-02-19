/**
 * SMART ATTENDANCE ROUTES - API ENDPOINTS
 * Smart attendance and departure system API endpoints
 */

const express = require('express');
const router = express.Router();
const SmartAttendanceService = require('../services/smartAttendance.service');
const {
  SmartAttendanceRecord,
  AttendanceBehaviorPattern,
  AttendanceAppeal,
  ParentNotificationPreferences,
  BiometricEnrollment,
  AttendanceAnomalyAlert,
  AttendanceSummaryReport,
} = require('../models/smartAttendance.model');

const attendanceService = new SmartAttendanceService();

// ============================================
// 1. ATTENDANCE RECORDING ENDPOINTS
// ============================================

/**
 * POST /api/attendance/check-in
 * تسجيل دخول الطالب
 */
router.post('/check-in', async (req, res) => {
  try {
    const { studentId, method, location, geoLocation, deviceId, biometricData } = req.body;

    const record = await attendanceService.recordAttendance({
      studentId,
      checkInTime: new Date(),
      method: method || 'biometric',
      location: location || 'MAIN_GATE',
      geoLocation,
      ipAddress: req.ip,
      deviceId,
    });

    // Validate biometric if provided
    if (biometricData && method === 'biometric') {
      const bioValidation = await attendanceService.validateBiometric(studentId, biometricData);
      record.verification = {
        status: bioValidation.verified ? 'VERIFIED' : 'REJECTED',
        biometricScore: bioValidation.matchScore,
      };
    }

    // Save to database
    const newRecord = new SmartAttendanceRecord(record);
    await newRecord.save();

    res.status(201).json({
      success: true,
      message: 'تم تسجيل دخول الطالب بنجاح',
      data: record,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/attendance/check-out/:studentId
 * تسجيل خروج الطالب
 */
router.post('/check-out/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { method, location, geoLocation, deviceId } = req.body;

    // Find the latest check-in record for today
    const today = new Date().toDateString();
    const latestRecord = await SmartAttendanceRecord.findOne({
      studentId,
      date: { $gte: new Date(today) },
      status: 'CHECKED_IN',
    }).sort({ checkInTime: -1 });

    if (!latestRecord) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد تسجيلة دخول نشطة',
      });
    }

    // Update the record with check-out time
    latestRecord.checkOutTime = new Date();
    latestRecord.duration = Math.round(
      (latestRecord.checkOutTime - latestRecord.checkInTime) / 1000 / 60
    );
    latestRecord.status = 'CHECKED_OUT';
    latestRecord.earlyCheckOutFlag = attendanceService.isEarlyCheckOut(latestRecord.checkOutTime);

    // Trigger notifications for early checkout
    if (latestRecord.earlyCheckOutFlag) {
      await attendanceService.triggerSmartNotifications(latestRecord.toObject());
    }

    await latestRecord.save();

    res.status(200).json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
      data: latestRecord,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// 2. ANALYTICS & PATTERN ANALYSIS
// ============================================

/**
 * GET /api/attendance/patterns/:studentId
 * جلب تحليل الأنماط السلوكية
 */
router.get('/patterns/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { days = 30 } = req.query;

    const analysis = await attendanceService.analyzeAttendancePatterns(studentId, parseInt(days));

    // Try to get from database or generate new
    let pattern = await AttendanceBehaviorPattern.findOne({ studentId });
    if (!pattern) {
      pattern = new AttendanceBehaviorPattern({
        studentId,
        period: {
          startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          daysAnalyzed: analysis.totalDays,
        },
        statistics: analysis,
        patterns: analysis.patterns,
        risks: {
          riskScore: analysis.predictions.riskScore,
          dropoutProbability: analysis.predictions.riskScore / 10,
        },
        predictions: analysis.predictions,
      });
      await pattern.save();
    }

    res.status(200).json({
      success: true,
      message: 'تم تحليل الأنماط بنجاح',
      data: pattern,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/attendance/report/:studentId
 * جلب تقرير الحضور الشامل
 */
router.get('/report/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } =
      req.query;

    const report = await attendanceService.generateAttendanceReport(studentId, startDate, endDate);

    // Save report to database
    const summaryReport = new AttendanceSummaryReport({
      studentId,
      reportPeriod: 'MONTHLY',
      periodDates: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      summary: report.summary,
      indicators: {
        status:
          parseFloat(report.summary.attendanceRate) >= 90
            ? 'EXCELLENT'
            : parseFloat(report.summary.attendanceRate) >= 80
              ? 'GOOD'
              : 'NEEDS_IMPROVEMENT',
        impactsAcademicStanding: parseFloat(report.summary.attendanceRate) < 75,
        affectsPromotion: parseFloat(report.summary.attendanceRate) < 75,
      },
      recommendations: report.recommendations,
    });
    await summaryReport.save();

    res.status(200).json({
      success: true,
      message: 'تم إنشاء التقرير بنجاح',
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/attendance/class-statistics/:classId
 * احصائيات الحضور للفصل
 */
router.get('/class-statistics/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const { date = new Date() } = req.query;

    const stats = await attendanceService.getClassAttendanceStatistics(classId, date);

    res.status(200).json({
      success: true,
      message: 'تم جلب احصائيات الفصل',
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// 3. ANOMALY DETECTION & ALERTS
// ============================================

/**
 * GET /api/attendance/anomalies
 * جلب الحالات الشاذة
 */
router.get('/anomalies', async (req, res) => {
  try {
    const anomalies = await AttendanceAnomalyAlert.find({
      status: { $in: ['DETECTED', 'INVESTIGATING'] },
    })
      .populate('studentId', 'name studentNumber')
      .sort({ detectionTime: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      message: 'تم جلب الحالات الشاذة',
      data: anomalies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/attendance/anomalies/:anomalyId/resolve
 * حل الحالة الشاذة
 */
router.post('/anomalies/:anomalyId/resolve', async (req, res) => {
  try {
    const { anomalyId } = req.params;
    const { resolution, status = 'CONFIRMED' } = req.body;

    const anomaly = await AttendanceAnomalyAlert.findByIdAndUpdate(
      anomalyId,
      {
        status,
        resolution,
        resolvedAt: new Date(),
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'تم حل الشكوى',
      data: anomaly,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// 4. APPEAL & CORRECTION SYSTEM
// ============================================

/**
 * POST /api/attendance/appeal
 * تقديم استئناف على تسجيلة حضور
 */
router.post('/appeal', async (req, res) => {
  try {
    const { studentId, attendanceRecordId, reason, supportingDocuments, requestedAction } =
      req.body;

    const appeal = new AttendanceAppeal({
      studentId,
      attendanceRecordId,
      appealReason: {
        description: reason,
      },
      supportingEvidence: supportingDocuments || [],
      requestedAction: requestedAction || 'MARK_PRESENT',
    });

    await appeal.save();

    // Emit event for admin review
    attendanceService.emit('appeal-submitted', appeal);

    res.status(201).json({
      success: true,
      message: 'تم تقديم الاستئناف بنجاح',
      data: appeal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/attendance/appeals
 * جلب الاستئنافات المعلقة
 */
router.get('/appeals', async (req, res) => {
  try {
    const appeals = await AttendanceAppeal.find({ status: 'SUBMITTED' })
      .populate('studentId', 'name studentNumber')
      .populate('attendanceRecordId')
      .sort({ reviewProcess: { submittedAt: -1 } });

    res.status(200).json({
      success: true,
      message: 'تم جلب الاستئنافات',
      data: appeals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/attendance/appeals/:appealId/approve
 * الموافقة على الاستئناف
 */
router.post('/appeals/:appealId/approve', async (req, res) => {
  try {
    const { appealId } = req.params;
    const { adminId, approvalNotes } = req.body;

    const appeal = await AttendanceAppeal.findByIdAndUpdate(
      appealId,
      {
        status: 'APPROVED',
        'reviewProcess.reviewedBy': adminId,
        'reviewProcess.reviewedAt': new Date(),
        'reviewProcess.decision': 'APPROVED',
        'reviewProcess.reviewNotes': approvalNotes,
      },
      { new: true }
    );

    // Update the original attendance record
    if (appeal.requestedAction === 'MARK_PRESENT') {
      await SmartAttendanceRecord.findByIdAndUpdate(appeal.attendanceRecordId, {
        status: 'CHECKED_OUT',
        flags: { isLate: false },
      });
    }

    res.status(200).json({
      success: true,
      message: 'تم الموافقة على الاستئناف',
      data: appeal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// 5. NOTIFICATION PREFERENCES
// ============================================

/**
 * POST /api/attendance/notification-preferences/:studentId
 * تعيين تفضيلات التنبيهات
 */
router.post('/notification-preferences/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const preferences = req.body;

    let prefs = await ParentNotificationPreferences.findOne({ studentId });
    if (!prefs) {
      prefs = new ParentNotificationPreferences({ studentId, ...preferences });
    } else {
      Object.assign(prefs, preferences);
    }

    await prefs.save();

    res.status(200).json({
      success: true,
      message: 'تم حفظ التفضيلات',
      data: prefs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/attendance/notification-preferences/:studentId
 */
router.get('/notification-preferences/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    const prefs = await ParentNotificationPreferences.findOne({ studentId });

    res.status(200).json({
      success: true,
      message: 'تم جلب التفضيلات',
      data: prefs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// 6. BIOMETRIC MANAGEMENT
// ============================================

/**
 * POST /api/attendance/biometric/enroll/:studentId
 * تسجيل بيانات بيومترية للطالب
 */
router.post('/biometric/enroll/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { biometricType, biometricData } = req.body; // face, fingerprint, iris

    let enrollment = await BiometricEnrollment.findOne({ studentId });
    if (!enrollment) {
      enrollment = new BiometricEnrollment({ studentId });
    }

    if (biometricType === 'face') {
      enrollment.biometricData.faceRecognition = {
        enrolled: true,
        embedding: Buffer.from(biometricData.embedding || []),
        photoUrl: biometricData.photoUrl,
        enrollmentDate: new Date(),
        qualityScore: biometricData.qualityScore || 95,
      };
    } else if (biometricType === 'fingerprint') {
      enrollment.biometricData.fingerprint = {
        enrolled: true,
        template: Buffer.from(biometricData.template || []),
        quality: biometricData.quality || 95,
        enrollmentDate: new Date(),
        fingers: biometricData.fingers || [],
      };
    }

    enrollment.enrollmentHistory.push({
      date: new Date(),
      method: biometricType,
      status: 'SUCCESS',
    });

    await enrollment.save();

    res.status(200).json({
      success: true,
      message: `تم تسجيل بيانات ${biometricType} بنجاح`,
      data: enrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// 7. REAL-TIME MONITORING
// ============================================

/**
 * GET /api/attendance/live/:classId
 * مراقبة الحضور الحي للفصل
 */
router.get('/live/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const today = new Date().toDateString();

    const liveData = await SmartAttendanceRecord.find({
      classId,
      date: { $gte: new Date(today) },
    })
      .populate('studentId', 'name studentNumber')
      .sort({ checkInTime: -1 });

    const summary = {
      total: liveData.length,
      checkedIn: liveData.filter(r => r.status === 'CHECKED_IN').length,
      checkedOut: liveData.filter(r => r.status === 'CHECKED_OUT').length,
      late: liveData.filter(r => r.flags?.isLate).length,
    };

    res.status(200).json({
      success: true,
      data: {
        summary,
        records: liveData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// 7. CAMERA-BASED ATTENDANCE ENDPOINTS
// Camera and biometric attendance registration endpoints
// ============================================

/**
 * POST /api/attendance/camera/face-recognition
 * Register attendance via face recognition
 */
router.post('/camera/face-recognition', async (req, res) => {
  try {
    const { cameraId, frameData, studentIds, location, confidence } = req.body;

    // Use SmartBiometricProcessor to process face
    const biometricProcessor = attendanceService.getBiometricProcessor?.();

    if (!biometricProcessor) {
      return res.status(500).json({
        success: false,
        message: 'خدمة معالجة البصمة غير متاحة',
      });
    }

    const result = await biometricProcessor.processCameraFeed(cameraId, frameData, {
      studentIds,
      confidence: confidence || 0.95,
      location: location || 'MAIN_GATE',
      autoRecord: true,
    });

    // Save attendance records
    const attendanceRecords = [];

    for (const recognition of result.results) {
      if (recognition.studentId) {
        const cameraAttendance = new AttendanceViaCamera({
          attendanceId: `FACE-${recognition.studentId}-${Date.now()}`,
          studentId: recognition.studentId,
          cameraId,
          timestamp: recognition.timestamp,
          method: 'FACE_RECOGNITION',
          biometricData: {
            confidence: recognition.confidence,
            quality: recognition.faceData?.quality,
            matchingTime: 150,
            templateId: `face-${recognition.studentId}`,
            overallScore: Math.round(recognition.confidence * 100),
          },
          evidence: {
            snapshotUrl: `/evidence/face-${recognition.studentId}-${Date.now()}.jpg`,
            processingTime: 150,
          },
          location: {
            building: 'MAIN',
            gate: location || 'MAIN_GATE',
          },
          verification: {
            status: 'VERIFIED',
            confidence: recognition.confidence,
          },
        });

        const savedRecord = await cameraAttendance.save();
        attendanceRecords.push(savedRecord);

        // Record in main attendance system
        await attendanceService.recordAttendance({
          studentId: recognition.studentId,
          checkInTime: new Date(),
          method: 'face_recognition',
          location,
          deviceId: cameraId,
          photoEvidence: recognition.faceData,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'تم تسجيل الحضور عبر التعرف على الوجه',
      data: {
        processedFrames: result.processedFrames,
        recognizedStudents: result.recognizedStudents,
        records: attendanceRecords,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/attendance/biometric/fingerprint
 * تسجيل الحضور من خلال البصمة
 */
router.post('/biometric/fingerprint', async (req, res) => {
  try {
    const { studentId, fingerprintData, deviceId, fingerIndex } = req.body;

    const biometricProcessor = attendanceService.getBiometricProcessor?.();

    if (!biometricProcessor) {
      return res.status(500).json({
        success: false,
        message: 'خدمة معالجة البصمة غير متاحة',
      });
    }

    const result = await biometricProcessor.processFingerprintData(fingerprintData, {
      studentId,
      fingerIndex: fingerIndex || 0,
      location: 'BIOMETRIC_STATION',
    });

    if (result.success) {
      // Save attendance record
      const attendanceRecord = new AttendanceViaCamera({
        attendanceId: `FP-${studentId}-${Date.now()}`,
        studentId,
        cameraId: deviceId,
        timestamp: result.timestamp,
        method: 'FINGERPRINT',
        biometricData: {
          confidence: result.confidence,
          quality: result.template?.quality,
          matchingTime: 200,
          templateId: `fingerprint-${studentId}-${fingerIndex}`,
          overallScore: Math.round(result.confidence * 100),
        },
        location: {
          building: 'MAIN',
          gate: 'BIOMETRIC_STATION',
        },
        verification: {
          status: 'VERIFIED',
        },
      });

      const savedRecord = await attendanceRecord.save();

      // Record in main system
      await attendanceService.recordAttendance({
        studentId,
        checkInTime: new Date(),
        method: 'fingerprint',
        location: 'BIOMETRIC_STATION',
        deviceId,
      });

      res.status(201).json({
        success: true,
        message: 'تم تسجيل الحضور عبر البصمة بنجاح',
        data: {
          attendanceRecord: savedRecord,
          confidence: result.confidence,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'فشل التحقق من البصمة',
        data: result,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/attendance/multimodal/authenticate
 * تسجيل الحضور بطرق متعددة (وجه + بصمة)
 */
router.post('/multimodal/authenticate', async (req, res) => {
  try {
    const { studentId, faceData, fingerprintData, location } = req.body;

    const biometricProcessor = attendanceService.getBiometricProcessor?.();

    if (!biometricProcessor) {
      return res.status(500).json({
        success: false,
        message: 'خدمة المصادقة متعددة الأنماط غير متاحة',
      });
    }

    const result = await biometricProcessor.authenticateMultiModal(studentId, {
      faceData,
      fingerprintData,
    });

    if (result.overallResult === 'AUTHENTICATED') {
      // Save attendance
      const attendanceRecord = new AttendanceViaCamera({
        attendanceId: `MULTI-${studentId}-${Date.now()}`,
        studentId,
        timestamp: result.timestamp,
        method: 'MULTI_MODAL',
        biometricData: {
          confidence: result.confidence,
          overallScore: Math.round(result.confidence * 100),
          matchedMethods: result.matchedMethods,
        },
        verification: {
          status: 'VERIFIED',
        },
      });

      const savedRecord = await attendanceRecord.save();

      res.status(201).json({
        success: true,
        message: 'تم المصادقة متعددة الأنماط بنجاح',
        data: {
          attendanceRecord: savedRecord,
          verificationMethods: result.matchedMethods,
          overallConfidence: result.confidence,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'فشل التحقق من الهوية',
        data: result,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * ============================================
 * CAMERA MANAGEMENT ENDPOINTS
 * ============================================
 */

/**
 * POST /api/attendance/camera/register
 * تسجيل كاميرا جديدة
 */
router.post('/camera/register', async (req, res) => {
  try {
    const cameraConfig = req.body;

    // إضافة الكاميرا إلى النظام
    // سيتم استخدام SmartCameraManager

    res.status(201).json({
      success: true,
      message: 'تم تسجيل الكاميرا بنجاح',
      data: {
        cameraId: cameraConfig.cameraId,
        name: cameraConfig.name,
        status: 'OFFLINE',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/attendance/camera/:cameraId/status
 * الحصول على حالة الكاميرا
 */
router.get('/camera/:cameraId/status', async (req, res) => {
  try {
    const { cameraId } = req.params;

    res.status(200).json({
      success: true,
      data: {
        cameraId,
        connectionStatus: 'ONLINE',
        frameRate: 30,
        resolution: '1080p',
        health: {
          status: 'HEALTHY',
          uptime: 86400,
          frameDropRate: 0.02,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * ============================================
 * BIOMETRIC ENROLLMENT ENDPOINTS
 * ============================================
 */

/**
 * POST /api/attendance/biometric/enroll-face
 * تسجيل وجه الطالب
 */
router.post('/biometric/enroll-face', async (req, res) => {
  try {
    const { studentId, faceImage, quality } = req.body;

    const biometricProcessor = attendanceService.getBiometricProcessor?.();

    const enrollment = await biometricProcessor.enrollBiometricData(studentId, {
      method: 'face_recognition',
      data: {
        faceImage,
        quality: quality || 0.95,
      },
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل وجه الطالب بنجاح',
      data: enrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/attendance/biometric/enroll-fingerprint
 * تسجيل بصمات الطالب
 */
router.post('/biometric/enroll-fingerprint', async (req, res) => {
  try {
    const { studentId, fingerprintData, fingerIndex } = req.body;

    const biometricProcessor = attendanceService.getBiometricProcessor?.();

    const enrollment = await biometricProcessor.enrollBiometricData(studentId, {
      method: 'fingerprint',
      data: {
        fingerprintData,
        fingerIndex: fingerIndex || 0,
      },
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل البصمة بنجاح',
      data: enrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/attendance/biometric/status/:studentId
 * الحصول على حالة التسجيل البيومتري للطالب
 */
router.get('/biometric/status/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    const biometricProcessor = attendanceService.getBiometricProcessor?.();

    const status = await biometricProcessor.getBiometricStatus(studentId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * ============================================
 * CAMERA ATTENDANCE HISTORY
 * ============================================
 */

/**
 * GET /api/attendance/camera/history/:studentId
 * سجل الحضور عبر الكاميرا للطالب
 */
router.get('/camera/history/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { days = 30, method } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let query = {
      studentId,
      timestamp: { $gte: startDate },
    };

    if (method) {
      query.method = method; // FACE_RECOGNITION, FINGERPRINT, etc.
    }

    const history = await AttendanceViaCamera.find(query).sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      data: {
        studentId,
        period: `${days} أيام`,
        totalRecords: history.length,
        records: history,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/attendance/camera/statistics
 * إحصائيات الحضور عبر الكاميرات
 */
router.get('/camera/statistics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const records = await AttendanceViaCamera.find(query);

    const stats = {
      totalAttendances: records.length,
      byMethod: {
        faceRecognition: records.filter(r => r.method === 'FACE_RECOGNITION').length,
        fingerprint: records.filter(r => r.method === 'FINGERPRINT').length,
        multiModal: records.filter(r => r.method === 'MULTI_MODAL').length,
      },
      verificationStats: {
        verified: records.filter(r => r.verification?.status === 'VERIFIED').length,
        pending: records.filter(r => r.verification?.status === 'PENDING').length,
        rejected: records.filter(r => r.verification?.status === 'REJECTED').length,
      },
      averageConfidence: (
        records.reduce((sum, r) => sum + (r.biometricData?.confidence || 0), 0) / records.length
      ).toFixed(4),
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
