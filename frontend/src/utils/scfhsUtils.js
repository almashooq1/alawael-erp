/**
 * SCFHS Verification Utilities
 * دوال مساعدة للتحقق من تراخيص SCFHS
 */

/**
 * Validate Saudi National ID using Luhn algorithm
 */
export const validateSaudiNationalId = (nationalId) => {
  if (!nationalId || typeof nationalId !== 'string' || nationalId.length !== 10) {
    return { valid: false, error: 'رقم الهوية يجب أن يكون 10 أرقام' };
  }

  if (!/^\d{10}$/.test(nationalId)) {
    return { valid: false, error: 'رقم الهوية يجب أن يحتوي على أرقام فقط' };
  }

  // Luhn algorithm validation
  const weights = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    let digit = parseInt(nationalId[i]) * weights[i];
    if (digit > 9) digit -= 9;
    sum += digit;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  const isValid = checkDigit === parseInt(nationalId[9]);

  return {
    valid: isValid,
    error: isValid ? null : 'رقم الهوية الوطنية غير صحيح',
  };
};

/**
 * Validate license number format
 */
export const validateLicenseNumber = (licenseNumber) => {
  if (!licenseNumber || typeof licenseNumber !== 'string') {
    return { valid: false, error: 'رقم الرخصة مطلوب' };
  }

  // SCFHS license numbers are typically alphanumeric
  if (!/^[A-Z0-9]{3,20}$/i.test(licenseNumber)) {
    return {
      valid: false,
      error: 'صيغة رقم الرخصة غير صحيحة (أحرف وأرقام فقط، 3-20 حرف)',
    };
  }

  return { valid: true };
};

/**
 * Calculate days until expiry
 */
export const calculateDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;

  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Get license status based on expiry date
 */
export const getLicenseStatus = (expiryDate) => {
  const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate);

  if (daysUntilExpiry === null) return 'unknown';
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 7) return 'expiring-soon';
  if (daysUntilExpiry <= 30) return 'expiring-within-month';
  if (daysUntilExpiry <= 90) return 'expiring-within-3-months';

  return 'active';
};

/**
 * Get status color
 */
export const getStatusColor = (status) => {
  const colors = {
    active: '#4caf50',
    'expiring-within-3-months': '#ff9800',
    'expiring-within-month': '#ff9800',
    'expiring-soon': '#f44336',
    expired: '#b71c1c',
    suspended: '#9c27b0',
    revoked: '#424242',
    unknown: '#9e9e9e',
  };

  return colors[status] || '#9e9e9e';
};

/**
 * Get status label in Arabic
 */
export const getStatusLabel = (status) => {
  const labels = {
    active: '🟢 صلاحية سارية',
    'expiring-within-3-months': '🟡 تنتهي خلال 3 أشهر',
    'expiring-within-month': '🟠 تنتهي خلال شهر',
    'expiring-soon': '🔴 تنتهي قريباً جداً',
    expired: '❌ منتهية الصلاحية',
    suspended: '⛔ معلقة',
    revoked: '🚫 ملغاة',
    unknown: '❓ غير معروفة',
  };

  return labels[status] || 'غير معروفة';
};

/**
 * Format date to Arabic locale
 */
export const formatDateArabic = (date) => {
  if (!date) return '-';

  const d = new Date(date);
  return d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date time to Arabic locale
 */
export const formatDateTimeArabic = (date) => {
  if (!date) return '-';

  const d = new Date(date);
  return d.toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Detect potential fraud indicators
 */
export const detectFraudIndicators = (licenseData, verificationResult) => {
  const indicators = [];

  // Check 1: Name mismatch
  if (
    verificationResult?.layers?.database?.registeredName &&
    !namesMatch(
      `${licenseData.professionalFirstName} ${licenseData.professionalLastName}`,
      verificationResult.layers.database.registeredName
    )
  ) {
    indicators.push({
      type: 'name_mismatch',
      severity: 'high',
      message: 'الاسم المدخل لا يطابق السجل الرسمي',
    });
  }

  // Check 2: Future issue date
  const issueDate = new Date(licenseData.licenseIssueDate);
  if (issueDate > new Date()) {
    indicators.push({
      type: 'future_issue_date',
      severity: 'critical',
      message: 'تاريخ الإصدار في المستقبل',
    });
  }

  // Check 3: Unusual validity period
  const validity = (new Date(licenseData.licenseExpiryDate) - issueDate) / (1000 * 60 * 60 * 24 * 365);
  if (validity < 1 || validity > 10) {
    indicators.push({
      type: 'unusual_validity_period',
      severity: 'medium',
      message: 'فترة صلاحية غير عادية',
    });
  }

  return indicators;
};

/**
 * Compare two names for similarity
 */
export const namesMatch = (name1, name2) => {
  const normalize = (name) => name.toLowerCase().trim().replace(/\s+/g, ' ');
  const n1 = normalize(name1);
  const n2 = normalize(name2);

  if (n1 === n2) return true;

  // Check word-by-word match
  const words1 = n1.split(' ');
  const words2 = n2.split(' ');

  const matches = words1.filter((w) => words2.includes(w)).length;
  return matches >= Math.max(1, Math.min(words1.length, words2.length) - 1);
};

/**
 * Calculate risk score
 */
export const calculateRiskScore = (verificationResult) => {
  let score = 0;

  if (!verificationResult.layers.input.isValid) score += 20;
  if (!verificationResult.layers.format.isValid) score += 15;
  if (!verificationResult.layers.checksum.isValid) score += 10;
  if (!verificationResult.layers.database.found) score += 50;
  if (verificationResult.layers.status.isExpired) score += 30;
  if (!verificationResult.layers.compliance.isFullyCompliant) score += 10;
  if (verificationResult.layers.fraud.riskScore > 50) score += 20;
  if (!verificationResult.layers.specialization.valid) score += 15;

  return Math.min(100, score);
};

/**
 * Get risk level display
 */
export const getRiskLevelDisplay = (riskLevel) => {
  const displays = {
    LOW: { label: 'منخفض', icon: '🟢', color: '#4caf50' },
    LOW_MEDIUM: { label: 'منخفض-متوسط', icon: '🟡', color: '#8bc34a' },
    MEDIUM: { label: 'متوسط', icon: '🟠', color: '#ff9800' },
    HIGH: { label: 'مرتفع', icon: '🔴', color: '#f44336' },
    CRITICAL: { label: 'حرج', icon: '🚫', color: '#b71c1c' },
  };

  return displays[riskLevel] || displays.MEDIUM;
};

/**
 * Generate verification report PDF content
 */
export const generateVerificationReportContent = (verificationResult) => {
  return `
╔═══════════════════════════════════════════════════════════════╗
║        تقرير التحقق من الرخصة الطبية                        ║
║     SCFHS License Verification Report                         ║
╚═══════════════════════════════════════════════════════════════╝

معرف التحقق: ${verificationResult.verificationId}
التاريخ والوقت: ${formatDateTimeArabic(verificationResult.timestamp)}

═══════════════════════════════════════════════════════════════

📋 ملخص النتائج:
───────────────────────────────────────────────────────────────

الحالة: ${verificationResult.verified ? '✅ تم التحقق بنجاح' : '❌ فشل التحقق'}
درجة الثقة: ${verificationResult.overall?.trustScore}%
مستوى المخاطرة: ${getRiskLevelDisplay(verificationResult.overall?.riskLevel).label}
وقت المعالجة: ${verificationResult.processingTimeMs}ms

═══════════════════════════════════════════════════════════════

🔍 طبقات التحقق:
───────────────────────────────────────────────────────────────

1. التحقق من الإدخال: ${verificationResult.layers.input.isValid ? '✅' : '❌'}
2. التحقق من الصيغة: ${verificationResult.layers.format.isValid ? '✅' : '❌'}
3. التحقق من الفحص: ${verificationResult.layers.checksum.isValid ? '✅' : '❌'}
4. التحقق من قاعدة البيانات: ${verificationResult.layers.database.found ? '✅' : '❌'}
5. التحقق من الحالة: ${verificationResult.layers.status.status}
6. التحقق من الامتثال: ${verificationResult.layers.compliance.isFullyCompliant ? '✅' : '❌'}
7. الكشف عن الاحتيال: ${getRiskLevelDisplay(verificationResult.layers.fraud.riskLevel).label}
8. التحقق من التخصص: ${verificationResult.layers.specialization.valid ? '✅' : '❌'}

═══════════════════════════════════════════════════════════════

⚠️ الإجراء الموصى به:
───────────────────────────────────────────────────────────────

${verificationResult.overall?.recommendedAction}

═══════════════════════════════════════════════════════════════

هذا التقرير تم إنشاؤه بواسطة نظام التحقق الذكي لهيئة التخصصات الصحية السعودية
${new Date().toLocaleDateString('ar-SA')}
  `;
};

/**
 * Export verification to CSV format
 */
export const exportVerificationAsCSV = (verificationResult) => {
  const lines = [
    ['معرف التحقق', verificationResult.verificationId],
    ['التاريخ', formatDateArabic(verificationResult.timestamp)],
    ['الحالة', verificationResult.verified ? 'نجح' : 'فشل'],
    ['درجة الثقة', `${verificationResult.overall?.trustScore}%`],
    ['مستوى المخاطرة', getRiskLevelDisplay(verificationResult.overall?.riskLevel).label],
    ['وقت المعالجة', `${verificationResult.processingTimeMs}ms`],
  ];

  return lines.map((line) => line.join(',')).join('\n');
};

/**
 * Export verification to JSON format
 */
export const exportVerificationAsJSON = (verificationResult) => {
  return JSON.stringify(verificationResult, null, 2);
};

/**
 * Parse batch CSV data
 */
export const parseBatchCSVData = (csvText) => {
  const lines = csvText.split('\n').filter((line) => line.trim());
  const data = [];

  for (const line of lines) {
    const [licenseNumber, nationalId, specialization, licenseType] = line
      .split(',')
      .map((item) => item.trim());

    if (licenseNumber && nationalId) {
      data.push({
        licenseNumber,
        nationalId,
        specialization: specialization || '',
        licenseType: licenseType || 'medical_doctor',
      });
    }
  }

  return { valid: data.length > 0, data };
};

/**
 * Generate verification summary statistics
 */
export const generateSummaryStatistics = (verifications) => {
  const total = verifications.length;
  const successful = verifications.filter((v) => v.verified).length;
  const failed = total - successful;
  const avgTrustScore =
    verifications.reduce((sum, v) => sum + (v.overall?.trustScore || 0), 0) / total;

  const riskLevels = {
    LOW: 0,
    LOW_MEDIUM: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  verifications.forEach((v) => {
    const level = v.overall?.riskLevel || 'MEDIUM';
    if (riskLevels[level] !== undefined) riskLevels[level]++;
  });

  return {
    total,
    successful,
    failed,
    successRate: ((successful / total) * 100).toFixed(2),
    avgTrustScore: avgTrustScore.toFixed(2),
    riskLevelDistribution: riskLevels,
    avgProcessingTime:
      verifications.reduce((sum, v) => sum + (v.processingTimeMs || 0), 0) / total,
  };
};

/**
 * Check if license needs renewal
 */
export const needsRenewal = (expiryDate, daysThreshold = 90) => {
  const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate);

  if (daysUntilExpiry === null) return false;

  return daysUntilExpiry <= daysThreshold;
};

/**
 * Get renewal urgency level
 */
export const getRenewalUrgency = (expiryDate) => {
  const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate);

  if (daysUntilExpiry === null) return 'unknown';
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 7) return 'urgent';
  if (daysUntilExpiry <= 30) return 'high';
  if (daysUntilExpiry <= 90) return 'medium';

  return 'low';
};

/**
 * Generate verification certificate content
 */
export const generateVerificationCertificate = (verificationResult) => {
  return {
    certificateNumber: `CERT-${verificationResult.verificationId}`,
    issuedDate: new Date().toISOString(),
    verificationDate: verificationResult.timestamp,
    verified: verificationResult.verified,
    trustScore: verificationResult.overall?.trustScore,
    riskLevel: verificationResult.overall?.riskLevel,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Valid for 30 days
    digitalSignature: `SIGNATURE-${Math.random().toString(36).substr(2, 20)}`,
  };
};

export default {
  validateSaudiNationalId,
  validateLicenseNumber,
  calculateDaysUntilExpiry,
  getLicenseStatus,
  getStatusColor,
  getStatusLabel,
  formatDateArabic,
  formatDateTimeArabic,
  detectFraudIndicators,
  namesMatch,
  calculateRiskScore,
  getRiskLevelDisplay,
  generateVerificationReportContent,
  exportVerificationAsCSV,
  exportVerificationAsJSON,
  parseBatchCSVData,
  generateSummaryStatistics,
  needsRenewal,
  getRenewalUrgency,
  generateVerificationCertificate,
};
