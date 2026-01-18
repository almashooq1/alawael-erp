/**
 * ========================================
 * Date Converter API Routes
 * ========================================
 *
 * API endpoints لخدمة تحويل التاريخ
 * API Endpoints for Date Conversion Service
 *
 * Routes:
 * - POST /api/date-converter/gregorian-to-hijri
 * - POST /api/date-converter/hijri-to-gregorian
 * - POST /api/date-converter/info
 * - GET /api/date-converter/today
 * - POST /api/date-converter/validate
 */

const express = require('express');
const router = express.Router();
const DateConverterService = require('../services/DateConverterService');

/**
 * ====================================
 * 1. تحويل الميلادي إلى الهجري
 * Gregorian to Hijri Conversion
 * ====================================
 */
router.post('/gregorian-to-hijri', (req, res) => {
  try {
    const { gregorianDate } = req.body;

    if (!gregorianDate) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال تاريخ ميلادي',
        error: 'Missing gregorianDate parameter',
      });
    }

    const result = DateConverterService.gregorianToHijri(gregorianDate);

    return res.status(200).json({
      success: true,
      message: 'تم التحويل بنجاح',
      gregorian: result.gregorian,
      hijri: {
        date: result.fullDate,
        formatted: result.formatted,
        year: result.year,
        month: result.month,
        monthName: result.monthName,
        monthNameAr: result.monthNameAr,
        day: result.day,
      },
      day: DateConverterService.getDayName(gregorianDate),
      timestamp: result.timestamp,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في تحويل التاريخ الميلادي',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 2. تحويل الهجري إلى الميلادي
 * Hijri to Gregorian Conversion
 * ====================================
 */
router.post('/hijri-to-gregorian', (req, res) => {
  try {
    const { hijriDate } = req.body;

    if (!hijriDate) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال تاريخ هجري',
        error: 'Missing hijriDate parameter',
      });
    }

    const result = DateConverterService.hijriToGregorian(hijriDate);

    return res.status(200).json({
      success: true,
      message: 'تم التحويل بنجاح',
      hijri: result.hijri,
      gregorian: {
        date: result.fullDate,
        formatted: result.formatted,
        year: result.year,
        month: result.month,
        monthName: result.monthName,
        monthNameAr: result.monthNameAr,
        day: result.day,
      },
      day: DateConverterService.getDayName(new Date(result.year, result.month - 1, result.day)),
      timestamp: result.timestamp,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في تحويل التاريخ الهجري',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 3. معلومات التاريخ الشاملة
 * Complete Date Information
 * ====================================
 */
router.post('/info', (req, res) => {
  try {
    const { gregorianDate } = req.body;

    if (!gregorianDate) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال تاريخ ميلادي',
        error: 'Missing gregorianDate parameter',
      });
    }

    const info = DateConverterService.getCompleteDateInfo(gregorianDate);

    return res.status(200).json({
      success: true,
      message: 'تم الحصول على المعلومات',
      gregorian: info.gregorian,
      hijri: info.hijri,
      day: info.day,
      timestamp: info.timestamp,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في الحصول على معلومات التاريخ',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 4. الحصول على اليوم الحالي
 * Get Today's Date
 * ====================================
 */
router.get('/today', (req, res) => {
  try {
    const today = new Date();
    const info = DateConverterService.getCompleteDateInfo(today);

    return res.status(200).json({
      success: true,
      message: 'معلومات اليوم الحالي',
      gregorian: info.gregorian,
      hijri: info.hijri,
      day: info.day,
      timestamp: info.timestamp,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في الحصول على معلومات اليوم',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 5. التحقق من صحة التاريخ
 * Validate Date
 * ====================================
 */
router.post('/validate', (req, res) => {
  try {
    const { dateType, year, month, day } = req.body;

    if (!dateType || !year || !month || !day) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال جميع القيم المطلوبة',
        error: 'Missing required parameters',
      });
    }

    let isValid = false;

    if (dateType === 'hijri') {
      isValid = DateConverterService.isValidHijri(year, month, day);
    } else if (dateType === 'gregorian') {
      isValid = DateConverterService.isValidGregorian(year, month, day);
    } else {
      return res.status(400).json({
        success: false,
        message: 'نوع التاريخ غير صحيح (hijri أو gregorian)',
        error: 'Invalid dateType',
      });
    }

    return res.status(200).json({
      success: true,
      message: isValid ? 'التاريخ صحيح' : 'التاريخ غير صحيح',
      isValid,
      dateType,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في التحقق من التاريخ',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 6. حساب الفرق بين تاريخين
 * Calculate Date Difference
 * ====================================
 */
router.post('/difference', (req, res) => {
  try {
    const { date1, date2 } = req.body;

    if (!date1 || !date2) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال التاريخين',
        error: 'Missing date parameters',
      });
    }

    const difference = DateConverterService.getDifference(date1, date2);

    return res.status(200).json({
      success: true,
      message: 'تم حساب الفرق بنجاح',
      difference,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في حساب الفرق',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 7. تنسيق التاريخ
 * Format Date
 * ====================================
 */
router.post('/format', (req, res) => {
  try {
    const { date, pattern = 'DD/MM/YYYY' } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال تاريخ',
        error: 'Missing date parameter',
      });
    }

    const formatted = DateConverterService.formatDate(date, pattern);

    return res.status(200).json({
      success: true,
      message: 'تم تنسيق التاريخ بنجاح',
      formatted,
      pattern,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في تنسيق التاريخ',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 8. تحويل دفعي (Batch Conversion)
 * Batch Conversion
 * ====================================
 */
router.post('/batch', (req, res) => {
  try {
    const { dates, conversionType = 'gregorian-to-hijri' } = req.body;

    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال قائمة التواريخ',
        error: 'Invalid dates array',
      });
    }

    const results = dates.map(date => {
      try {
        if (conversionType === 'gregorian-to-hijri') {
          return {
            input: date,
            output: DateConverterService.gregorianToHijri(date),
            success: true,
          };
        } else {
          return {
            input: date,
            output: DateConverterService.hijriToGregorian(date),
            success: true,
          };
        }
      } catch (error) {
        return {
          input: date,
          error: error.message,
          success: false,
        };
      }
    });

    const successCount = results.filter(r => r.success).length;

    return res.status(200).json({
      success: true,
      message: `تم تحويل ${successCount} من ${dates.length} تاريخ بنجاح`,
      results,
      successCount,
      totalCount: dates.length,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في التحويل الدفعي',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 9. معلومات الشهر الهجري
 * Hijri Month Info
 * ====================================
 */
router.get('/hijri-month/:month/:year', (req, res) => {
  try {
    const { month, year } = req.params;

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12 || yearNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'قيم الشهر والسنة غير صحيحة',
        error: 'Invalid month or year',
      });
    }

    const monthName = DateConverterService.getHijriMonthNameAr(monthNum);
    const monthNameEn = DateConverterService.getHijriMonthName(monthNum);
    const days = DateConverterService.daysInHijriMonth(monthNum, yearNum);

    return res.status(200).json({
      success: true,
      month: monthNum,
      year: yearNum,
      monthNameAr: monthName,
      monthNameEn: monthNameEn,
      days,
      hijriDate: `${monthName} ${yearNum} هـ`,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في الحصول على معلومات الشهر',
      error: error.message,
    });
  }
});

module.exports = router;
