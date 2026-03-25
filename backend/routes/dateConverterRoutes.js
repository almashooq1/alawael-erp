// backend/routes/dateConverterRoutes.js
/**
 * Date Converter Routes
 * Handles conversion between Gregorian and Hijri calendar systems
 * Essential for Saudi Arabia compliance and date management
 */

const express = require('express');
const router = express.Router();
const DateConverterService = require('../services/DateConverterService');

// ─── POST /gregorian-to-hijri ───────────────────────────────────────────
router.post('/gregorian-to-hijri', (req, res) => {
  try {
    const { gregorianDate } = req.body;

    if (!gregorianDate) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال التاريخ الميلادي',
      });
    }

    const date = new Date(gregorianDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ ميلادي غير صحيح',
      });
    }

    const hijri = DateConverterService.gregorianToHijri(gregorianDate);
    const dayInfo = DateConverterService.getDayName(gregorianDate);

    res.json({
      success: true,
      gregorian: {
        date: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
        formatted: `${date.getDate()} ${DateConverterService.getGregorianMonthNameAr(date.getMonth() + 1)} ${date.getFullYear()}`,
      },
      hijri: {
        date: hijri.fullDate,
        formatted: hijri.formatted,
        year: hijri.year,
        month: hijri.month,
        day: hijri.day,
      },
      day: dayInfo,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ─── POST /hijri-to-gregorian ───────────────────────────────────────────
router.post('/hijri-to-gregorian', (req, res) => {
  try {
    const { hijriDate } = req.body;

    if (!hijriDate) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال التاريخ الهجري',
      });
    }

    const result = DateConverterService.hijriToGregorian(hijriDate);

    res.json({
      success: true,
      hijri: {
        date: result.hijri,
      },
      gregorian: {
        date: result.fullDate,
        formatted: result.formatted,
        year: result.year,
        month: result.month,
        day: result.day,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
  }
});

// ─── POST /info ─────────────────────────────────────────────────────────
router.post('/info', (req, res) => {
  try {
    const { gregorianDate } = req.body;

    if (!gregorianDate) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال التاريخ الميلادي',
      });
    }

    const info = DateConverterService.getCompleteDateInfo(gregorianDate);

    res.json({
      success: true,
      gregorian: info.gregorian,
      hijri: info.hijri,
      day: info.day,
      timestamp: info.timestamp,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ─── GET /today ─────────────────────────────────────────────────────────
router.get('/today', (req, res) => {
  try {
    const now = new Date();
    const info = DateConverterService.getCompleteDateInfo(now);

    res.json({
      success: true,
      gregorian: info.gregorian,
      hijri: info.hijri,
      day: info.day,
      timestamp: info.timestamp,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ─── POST /validate ─────────────────────────────────────────────────────
router.post('/validate', (req, res) => {
  try {
    const { dateType, year, month, day } = req.body;

    let isValid = false;
    if (dateType === 'hijri') {
      isValid = DateConverterService.isValidHijri(year, month, day);
    } else if (dateType === 'gregorian') {
      isValid = DateConverterService.isValidGregorian(year, month, day);
    } else {
      return res.status(400).json({
        success: false,
        message: 'يرجى تحديد نوع التاريخ (hijri أو gregorian)',
      });
    }

    res.json({
      success: true,
      isValid,
      dateType,
      year,
      month,
      day,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ─── POST /difference ───────────────────────────────────────────────────
router.post('/difference', (req, res) => {
  try {
    const { date1, date2 } = req.body;

    if (!date1 || !date2) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال التاريخين',
      });
    }

    const difference = DateConverterService.getDifference(date1, date2);

    res.json({
      success: true,
      difference,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ─── POST /format ───────────────────────────────────────────────────────
router.post('/format', (req, res) => {
  try {
    const { date, pattern } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال التاريخ',
      });
    }

    const formatted = DateConverterService.formatDate(date, pattern);

    res.json({
      success: true,
      formatted,
      pattern: pattern || 'DD/MM/YYYY',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ─── POST /batch ────────────────────────────────────────────────────────
router.post('/batch', (req, res) => {
  try {
    const { dates, conversionType } = req.body;

    if (!dates || !Array.isArray(dates)) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال مصفوفة التواريخ',
      });
    }

    const results = dates.map(date => {
      try {
        if (conversionType === 'gregorian-to-hijri') {
          const hijri = DateConverterService.gregorianToHijri(date);
          return { success: true, input: date, result: hijri };
        } else if (conversionType === 'hijri-to-gregorian') {
          const gregorian = DateConverterService.hijriToGregorian(date);
          return { success: true, input: date, result: gregorian };
        }
        return { success: false, input: date, error: 'نوع التحويل غير صحيح' };
      } catch (err) {
        return { success: false, input: date, error: err.message };
      }
    });

    res.json({
      success: true,
      results,
      total: dates.length,
      converted: results.filter(r => r.success).length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ─── GET /hijri-month/:month/:year ──────────────────────────────────────
router.get('/hijri-month/:month/:year', (req, res) => {
  try {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);

    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'الشهر يجب أن يكون بين 1 و 12',
      });
    }

    const days = DateConverterService.daysInHijriMonth(month, year);
    const monthNameAr = DateConverterService.getHijriMonthNameAr(month);
    const monthName = DateConverterService.getHijriMonthName(month);

    res.json({
      success: true,
      month,
      year,
      days,
      monthName,
      monthNameAr,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ─── Legacy routes (backward compatibility) ─────────────────────────────
router.post('/toHijri', (req, res) => {
  try {
    const { gregorianDate } = req.body;
    if (!gregorianDate) {
      return res.status(400).json({ success: false, error: 'Gregorian date is required' });
    }
    const hijri = DateConverterService.gregorianToHijri(gregorianDate);
    res.json({
      success: true,
      data: { gregorian: gregorianDate, hijri, formatted: hijri.formatted },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

router.post('/toGregorian', (req, res) => {
  try {
    const { hijriYear, hijriMonth, hijriDay } = req.body;
    if (!hijriYear || !hijriMonth || !hijriDay) {
      return res
        .status(400)
        .json({ success: false, error: 'Hijri year, month, and day are all required' });
    }
    const result = DateConverterService.hijriToGregorian({
      year: hijriYear,
      month: hijriMonth,
      day: hijriDay,
    });
    res.json({
      success: true,
      data: { hijri: { year: hijriYear, month: hijriMonth, day: hijriDay }, gregorian: result },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

router.get('/now', (req, res) => {
  try {
    const info = DateConverterService.getCompleteDateInfo(new Date());
    res.json({ success: true, data: { gregorian: info.gregorian, hijri: info.hijri } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

module.exports = router;
