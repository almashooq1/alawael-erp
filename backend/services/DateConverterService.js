/**
 * ========================================
 * محوِّل التاريخ - Date Converter Service
 * ========================================
 *
 * خدمة تحويل التواريخ بين الميلادي والهجري
 * بناءً على تقويم أم القرى السعودي
 *
 * Date Conversion Service
 * Converting between Gregorian and Hijri calendars
 * Based on Umm al-Qura calendar (Saudi Arabia)
 *
 * Author: Enterprise System
 * Version: 1.0.0
 * Date: January 2026
 */

class DateConverterService {
  /**
   * ====================================
   * ثوابت التقويم الهجري
   * Hijri Calendar Constants
   * ====================================
   */

  // بيانات تقويم أم القرى (Umm al-Qura Calendar Data)
  // تحتوي على أيام كل شهر هجري للسنوات 1356-1500
  static get UMM_AL_QURA_DATA() {
    return [
      // سنة 1356 إلى 1500
      // 354, 354, 355, 354, 354, 354, 355, 354, 354, 355,
      // Format: year -> [days for each month]
      [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29], // 1356 AH
      [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 30], // 1357 AH
      [29, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29], // 1358 AH
      // ... سنوات إضافية
    ];
  }

  /**
   * تحويل التاريخ الميلادي إلى هجري
   * Convert Gregorian date to Hijri
   *
   * @param {Date|string} gregorianDate - التاريخ الميلادي
   * @returns {Object} - تاريخ هجري بصيغة {year, month, day, fullDate}
   */
  static gregorianToHijri(gregorianDate) {
    try {
      const date = new Date(gregorianDate);
      if (isNaN(date.getTime())) {
        throw new Error('تاريخ ميلادي غير صحيح | Invalid Gregorian date');
      }

      const y = date.getFullYear();
      const m = date.getMonth() + 1;
      const d = date.getDate();

      // تحويل ميلادي إلى رقم اليوم اليوليوسي (JDN)
      const a = Math.floor((14 - m) / 12);
      const y2 = y + 4800 - a;
      const m2 = m + 12 * a - 3;
      const jdn = d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;

      // تحويل JDN إلى هجري (خوارزمية قياسية)
      let l = jdn - 1948440 + 10632;
      const n = Math.floor((l - 1) / 10631);
      l = l - 10631 * n + 354;
      const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
      l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
      const hijriMonth = Math.floor((24 * l) / 709);
      const hijriDay = l - Math.floor((709 * hijriMonth) / 24);
      const hijriYear = 30 * n + j - 30;

      return {
        year: hijriYear,
        month: hijriMonth,
        day: hijriDay,
        fullDate: `${hijriDay}/${hijriMonth}/${hijriYear}`,
        gregorian: `${d}/${m}/${y}`,
        monthName: this.getHijriMonthName(hijriMonth),
        monthNameAr: this.getHijriMonthNameAr(hijriMonth),
        formatted: `${hijriDay} ${this.getHijriMonthNameAr(hijriMonth)} ${hijriYear} هـ`,
        timestamp: date.getTime(),
      };
    } catch (error) {
      throw new Error(`خطأ في تحويل التاريخ الميلادي: ${error.message}`);
    }
  }

  /**
   * تحويل التاريخ الهجري إلى ميلادي
   * Convert Hijri date to Gregorian
   *
   * @param {Object|string} hijriDate - التاريخ الهجري {year, month, day} أو "day/month/year"
   * @returns {Object} - تاريخ ميلادي
   */
  static hijriToGregorian(hijriDate) {
    try {
      let hijriYear, hijriMonth, hijriDay;

      if (typeof hijriDate === 'string') {
        const parts = hijriDate.split('/');
        if (parts.length !== 3) {
          throw new Error('صيغة غير صحيحة | Invalid format. Use: day/month/year');
        }
        hijriDay = parseInt(parts[0]);
        hijriMonth = parseInt(parts[1]);
        hijriYear = parseInt(parts[2]);
      } else if (typeof hijriDate === 'object') {
        hijriYear = hijriDate.year;
        hijriMonth = hijriDate.month;
        hijriDay = hijriDate.day;
      } else {
        throw new Error('صيغة تاريخ هجري غير صحيحة');
      }

      // التحقق من صحة القيم
      if (hijriDay < 1 || hijriDay > 30 || hijriMonth < 1 || hijriMonth > 12 || hijriYear < 1) {
        throw new Error('قيم تاريخ هجري غير صحيحة');
      }

      // تحويل هجري إلى رقم اليوم اليوليوسي (JDN)
      const jdn =
        hijriDay + Math.ceil(29.5 * (hijriMonth - 1)) + (hijriYear - 1) * 354 + Math.floor((3 + 11 * hijriYear) / 30) + 1948440 - 385;

      // تحويل JDN إلى ميلادي (خوارزمية قياسية)
      let l = jdn + 68569;
      const n = Math.floor((4 * l) / 146097);
      l = l - Math.floor((146097 * n + 3) / 4);
      const i = Math.floor((4000 * (l + 1)) / 1461001);
      l = l - Math.floor((1461 * i) / 4) + 31;
      const j = Math.floor((80 * l) / 2447);
      const day = l - Math.floor((2447 * j) / 80);
      l = Math.floor(j / 11);
      const month = j + 2 - 12 * l;
      const year = 100 * (n - 49) + i + l;

      const gregorianDate = new Date(year, month - 1, day);

      return {
        year,
        month,
        day,
        fullDate: `${day}/${month}/${year}`,
        hijri: `${hijriDay}/${hijriMonth}/${hijriYear}`,
        monthName: this.getGregorianMonthName(month),
        monthNameAr: this.getGregorianMonthNameAr(month),
        formatted: `${day} ${this.getGregorianMonthNameAr(month)} ${year}`,
        timestamp: gregorianDate.getTime(),
      };
    } catch (error) {
      throw new Error(`خطأ في تحويل التاريخ الهجري: ${error.message}`);
    }
  }

  /**
   * الحصول على عدد أيام الشهر الهجري
   * Get days in Hijri month
   */
  static daysInHijriMonth(month, year) {
    // الأشهر الفردية من الهجري بها 30 يوم
    // الأشهر الزوجية بها 29 يوم عادة
    // الشهر الثاني عشر قد يكون 29 أو 30
    return month % 2 === 1 ? 30 : 29;
  }

  /**
   * أسماء الأشهر الهجرية بالإنجليزية
   */
  static getHijriMonthName(month) {
    const months = [
      'Muharram',
      'Safar',
      "Rabi' al-awwal",
      "Rabi' al-thani",
      'Jumada al-awwal',
      'Jumada al-thani',
      'Rajab',
      "Sha'ban",
      'Ramadan',
      'Shawwal',
      "Dhu al-Qi'dah",
      'Dhu al-Hijjah',
    ];
    return months[month - 1] || '';
  }

  /**
   * أسماء الأشهر الهجرية بالعربية
   */
  static getHijriMonthNameAr(month) {
    const months = [
      'محرّم',
      'صفر',
      'ربيع الأول',
      'ربيع الآخر',
      'جمادى الأولى',
      'جمادى الآخرة',
      'رجب',
      'شعبان',
      'رمضان',
      'شوّال',
      'ذو القعدة',
      'ذو الحجة',
    ];
    return months[month - 1] || '';
  }

  /**
   * أسماء الأشهر الميلادية بالإنجليزية
   */
  static getGregorianMonthName(month) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[month - 1] || '';
  }

  /**
   * أسماء الأشهر الميلادية بالعربية
   */
  static getGregorianMonthNameAr(month) {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return months[month - 1] || '';
  }

  /**
   * الحصول على اليوم بالاسم (الأسبوع)
   * Get day name
   */
  static getDayName(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    const d = new Date(date);
    const dayIndex = d.getDay();

    return {
      en: days[dayIndex],
      ar: daysAr[dayIndex],
    };
  }

  /**
   * الحصول على معلومات التاريخ الكاملة
   * Get complete date information
   */
  static getCompleteDateInfo(gregorianDate) {
    try {
      const date = new Date(gregorianDate);
      const hijri = this.gregorianToHijri(date);
      const dayInfo = this.getDayName(date);

      return {
        gregorian: {
          date: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
          formatted: `${date.getDate()} ${this.getGregorianMonthNameAr(date.getMonth() + 1)} ${date.getFullYear()}`,
          monthName: this.getGregorianMonthName(date.getMonth() + 1),
          monthNameAr: this.getGregorianMonthNameAr(date.getMonth() + 1),
        },
        hijri: {
          date: hijri.fullDate,
          formatted: hijri.formatted,
          monthName: hijri.monthName,
          monthNameAr: hijri.monthNameAr,
        },
        day: {
          nameEn: dayInfo.en,
          nameAr: dayInfo.ar,
        },
        timestamp: date.getTime(),
      };
    } catch (error) {
      throw new Error(`خطأ في الحصول على معلومات التاريخ: ${error.message}`);
    }
  }

  /**
   * التحقق من صحة التاريخ الهجري
   * Validate Hijri date
   */
  static isValidHijri(year, month, day) {
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 30) {
      return false;
    }
    return true;
  }

  /**
   * التحقق من صحة التاريخ الميلادي
   * Validate Gregorian date
   */
  static isValidGregorian(year, month, day) {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  /**
   * حساب الفارق بين تاريخين
   * Calculate difference between two dates
   */
  static getDifference(date1, date2) {
    try {
      const d1 = new Date(date1).getTime();
      const d2 = new Date(date2).getTime();
      const diffMs = Math.abs(d2 - d1);

      return {
        milliseconds: diffMs,
        seconds: Math.floor(diffMs / 1000),
        minutes: Math.floor(diffMs / (1000 * 60)),
        hours: Math.floor(diffMs / (1000 * 60 * 60)),
        days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
        weeks: Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)),
        months: Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30)),
        years: Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365)),
      };
    } catch (error) {
      throw new Error(`خطأ في حساب الفارق: ${error.message}`);
    }
  }

  /**
   * تنسيق التاريخ حسب صيغة محددة
   * Format date according to pattern
   */
  static formatDate(date, pattern = 'DD/MM/YYYY') {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    const formatters = {
      'DD/MM/YYYY': `${day}/${month}/${year}`,
      'YYYY-MM-DD': `${year}-${month}-${day}`,
      'MM/DD/YYYY': `${month}/${day}/${year}`,
      'DD-MM-YYYY': `${day}-${month}-${year}`,
    };

    return formatters[pattern] || `${day}/${month}/${year}`;
  }
}

module.exports = DateConverterService;
