'use strict';

const SmartAttendanceRecord = require('./SmartAttendanceRecord.model');
const AttendanceBehaviorPattern = require('./AttendanceBehaviorPattern.model');
const AttendanceAppeal = require('./AttendanceAppeal.model');
const ParentNotificationPreferences = require('./ParentNotificationPreferences.model');
const BiometricEnrollment = require('./BiometricEnrollment.model');
const AttendanceAnomalyAlert = require('./AttendanceAnomalyAlert.model');
const AttendanceSummaryReport = require('./AttendanceSummaryReport.model');
const CameraDevice = require('./CameraDevice.model');
const BiometricDevice = require('./BiometricDevice.model');
const FaceRecognitionData = require('./FaceRecognitionData.model');
const FingerprintData = require('./FingerprintData.model');
const AttendanceViaCamera = require('./AttendanceViaCamera.model');

module.exports = {
  SmartAttendanceRecord,
  AttendanceBehaviorPattern,
  AttendanceAppeal,
  ParentNotificationPreferences,
  BiometricEnrollment,
  AttendanceAnomalyAlert,
  AttendanceSummaryReport,
  CameraDevice,
  BiometricDevice,
  FaceRecognitionData,
  FingerprintData,
  AttendanceViaCamera,
};
