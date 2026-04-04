/**
 * ApiResponse.js — مساعد استجابات API الموحّد
 *
 * الملف: backend/support/ApiResponse.js
 * المصدر: prompt_03 — نظام إدارة مراكز تأهيل ذوي الإعاقة — Rehab-ERP v2.0
 *
 * يوفر استجابات JSON موحّدة لجميع نقاط النهاية (endpoints):
 *   - success()    — نجاح العملية
 *   - error()      — فشل العملية
 *   - paginated()  — بيانات مقسّمة إلى صفحات
 *   - created()    — إنشاء ناجح (201)
 *   - deleted()    — حذف ناجح
 *   - notFound()   — غير موجود (404)
 *   - unauthorized() — غير مصرح (403)
 *
 * ملاحظة: هذا الملف مستقل عن backend/utils/apiResponse.js الموجود مسبقاً
 * ويوفر واجهة أكثر اكتمالاً مع دعم meta data والـ pagination.
 */

'use strict';

class ApiResponse {
  /**
   * استجابة نجاح عامة
   *
   * @param {import('express').Response} res
   * @param {*} data - البيانات المُرجَعة
   * @param {string} message - رسالة النجاح
   * @param {number} code - رمز HTTP (افتراضي: 200)
   * @param {Object} meta - بيانات إضافية (pagination، إحصائيات... إلخ)
   * @returns {import('express').Response}
   */
  static success(res, data = null, message = '', code = 200, meta = {}) {
    const response = {
      success: true,
      message: message || 'تمت العملية بنجاح',
      data,
    };

    if (meta && Object.keys(meta).length > 0) {
      response.meta = meta;
    }

    return res.status(code).json(response);
  }

  /**
   * استجابة خطأ عامة
   *
   * @param {import('express').Response} res
   * @param {string} message - رسالة الخطأ
   * @param {number} code - رمز HTTP (افتراضي: 400)
   * @param {*} errors - تفاصيل الأخطاء (validation errors... إلخ)
   * @param {*} data - بيانات إضافية عند الحاجة
   * @returns {import('express').Response}
   */
  static error(res, message = '', code = 400, errors = null, data = null) {
    const response = {
      success: false,
      message: message || 'فشلت العملية',
    };

    if (errors !== null && errors !== undefined) {
      response.errors = errors;
    }

    if (data !== null && data !== undefined) {
      response.data = data;
    }

    return res.status(code).json(response);
  }

  /**
   * استجابة بيانات مقسّمة إلى صفحات
   *
   * @param {import('express').Response} res
   * @param {Object} paginator - كائن pagination (يجب أن يحتوي على items, total, page, limit)
   * @param {string} message
   * @returns {import('express').Response}
   */
  static paginated(res, paginator, message = '') {
    const {
      items = [],
      data = [],
      total = 0,
      page = 1,
      currentPage,
      limit = 15,
      perPage,
      lastPage,
    } = paginator;

    const currentPageNum = currentPage || page;
    const perPageNum = perPage || limit;
    const lastPageNum = lastPage || Math.ceil(total / perPageNum) || 1;
    const records = items.length > 0 ? items : data;
    const from = total === 0 ? null : (currentPageNum - 1) * perPageNum + 1;
    const to = total === 0 ? null : Math.min(currentPageNum * perPageNum, total);

    return res.status(200).json({
      success: true,
      message,
      data: records,
      meta: {
        current_page: currentPageNum,
        last_page: lastPageNum,
        per_page: perPageNum,
        total,
        from,
        to,
      },
    });
  }

  /**
   * إنشاء ناجح (201 Created)
   *
   * @param {import('express').Response} res
   * @param {*} data
   * @param {string} message
   * @returns {import('express').Response}
   */
  static created(res, data = null, message = '') {
    return ApiResponse.success(res, data, message || 'تم الإنشاء بنجاح', 201);
  }

  /**
   * حذف ناجح (200 OK)
   *
   * @param {import('express').Response} res
   * @param {string} message
   * @returns {import('express').Response}
   */
  static deleted(res, message = '') {
    return ApiResponse.success(res, null, message || 'تم الحذف بنجاح');
  }

  /**
   * غير موجود (404 Not Found)
   *
   * @param {import('express').Response} res
   * @param {string} message
   * @returns {import('express').Response}
   */
  static notFound(res, message = '') {
    return ApiResponse.error(res, message || 'العنصر غير موجود', 404);
  }

  /**
   * غير مصرح (403 Forbidden)
   *
   * @param {import('express').Response} res
   * @param {string} message
   * @returns {import('express').Response}
   */
  static unauthorized(res, message = '') {
    return ApiResponse.error(res, message || 'ليس لديك صلاحية للقيام بهذا الإجراء', 403);
  }

  /**
   * غير مُصادق (401 Unauthorized)
   *
   * @param {import('express').Response} res
   * @param {string} message
   * @returns {import('express').Response}
   */
  static unauthenticated(res, message = '') {
    return ApiResponse.error(res, message || 'يجب تسجيل الدخول أولاً', 401);
  }

  /**
   * خطأ في التحقق (422 Unprocessable Entity)
   *
   * @param {import('express').Response} res
   * @param {*} errors - أخطاء التحقق
   * @param {string} message
   * @returns {import('express').Response}
   */
  static validationError(res, errors, message = '') {
    return ApiResponse.error(res, message || 'بيانات غير صحيحة، يرجى مراجعة الحقول', 422, errors);
  }

  /**
   * خطأ في الخادم (500 Internal Server Error)
   *
   * @param {import('express').Response} res
   * @param {string} message
   * @param {*} errors
   * @returns {import('express').Response}
   */
  static serverError(res, message = '', errors = null) {
    return ApiResponse.error(
      res,
      message || 'حدث خطأ في الخادم، يرجى المحاولة لاحقاً',
      500,
      errors
    );
  }

  /**
   * تعارض (409 Conflict) — مثلاً: سجل مكرر
   *
   * @param {import('express').Response} res
   * @param {string} message
   * @returns {import('express').Response}
   */
  static conflict(res, message = '') {
    return ApiResponse.error(res, message || 'تعارض في البيانات', 409);
  }

  /**
   * استجابة مخصصة بالكامل
   *
   * @param {import('express').Response} res
   * @param {boolean} success
   * @param {string} message
   * @param {*} data
   * @param {number} code
   * @param {Object} extra - حقول إضافية في جذر الاستجابة
   * @returns {import('express').Response}
   */
  static custom(res, success, message, data, code, extra = {}) {
    return res.status(code).json({
      success,
      message,
      data,
      ...extra,
    });
  }
}

module.exports = ApiResponse;
