/**
 * Money — كائن القيمة النقدية (Value Object)
 *
 * يُخزَّن المبلغ داخلياً بالهللات (أصغر وحدة نقدية = 1/100 ريال)
 * لتجنّب أخطاء الفاصلة العائمة في الحسابات المالية.
 *
 * ميزات:
 *  - إنشاء من ريالات أو هللات
 *  - عمليات حسابية (جمع، طرح، ضرب، نسبة مئوية)
 *  - حساب ضريبة القيمة المضافة (15% افتراضياً)
 *  - تنسيق للعرض بالعربي والإنجليزي
 *  - JSON serialization جاهز للـ API responses
 *
 * @example
 * const price = Money.fromRiyals(100);          // 100 ريال
 * const withVat = price.withVat();              // 115 ريال
 * const half    = price.multiply(0.5);          // 50 ريال
 * console.log(price.toFormattedString());       // "100.00 SAR"
 *
 * @module support/Money
 */

'use strict';

class Money {
  /**
   * @param {number} amount   - المبلغ بالهللات (integer)
   * @param {string} currency - رمز العملة (افتراضي: SAR)
   */
  constructor(amount, currency = 'SAR') {
    if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
      throw new TypeError(`Money: amount must be an integer (halalas), got: ${amount}`);
    }
    this._amount = amount;
    this._currency = currency.toUpperCase();
    Object.freeze(this);
  }

  // ═══════════════════════════════════════════════════════════
  // Factory methods — طرق الإنشاء
  // ═══════════════════════════════════════════════════════════

  /**
   * إنشاء من ريالات (فاصلة عائمة مقبولة)
   * @param {number|string} riyals
   * @param {string} [currency='SAR']
   */
  static fromRiyals(riyals, currency = 'SAR') {
    const parsed = parseFloat(riyals);
    if (!Number.isFinite(parsed)) {
      throw new TypeError(`Money.fromRiyals: invalid value "${riyals}"`);
    }
    return new Money(Math.round(parsed * 100), currency);
  }

  /**
   * إنشاء من هللات (integer)
   * @param {number} halalas
   * @param {string} [currency='SAR']
   */
  static fromHalalas(halalas, currency = 'SAR') {
    return new Money(Math.round(halalas), currency);
  }

  /** قيمة صفر */
  static zero(currency = 'SAR') {
    return new Money(0, currency);
  }

  /**
   * إنشاء من قيمة غير محددة النوع (string/number/هللات)
   * يُستخدَم عند قراءة من قاعدة البيانات حيث قد يكون المبلغ مخزوناً بأي صيغة
   * @param {number|string} value
   * @param {'riyals'|'halalas'} [unit='halalas']
   */
  static from(value, unit = 'halalas', currency = 'SAR') {
    if (unit === 'riyals') return Money.fromRiyals(value, currency);
    return Money.fromHalalas(Number(value), currency);
  }

  // ═══════════════════════════════════════════════════════════
  // Getters — قراءة القيمة
  // ═══════════════════════════════════════════════════════════

  /** المبلغ بالهللات */
  get amount() {
    return this._amount;
  }

  /** رمز العملة */
  get currency() {
    return this._currency;
  }

  /** المبلغ بالريالات (float) */
  toRiyals() {
    return this._amount / 100;
  }

  /** تنسيق للعرض: "150.00 SAR" */
  toFormattedString(locale = 'en') {
    const formatted = (this._amount / 100).toFixed(2);
    if (locale === 'ar') {
      // تحويل الأرقام لعربية اختياري — نبقيها إنجليزية للتوافق
      return `${formatted} ر.س`;
    }
    return `${formatted} ${this._currency}`;
  }

  /** تنسيق مختصر للعرض */
  toString() {
    return this.toFormattedString();
  }

  // ═══════════════════════════════════════════════════════════
  // العمليات الحسابية — Arithmetic Operations
  // ═══════════════════════════════════════════════════════════

  /**
   * جمع مبلغين
   */
  add(other) {
    this._assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * طرح مبلغ من آخر
   */
  subtract(other) {
    this._assertSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  /**
   * ضرب في معامل (float)
   * @param {number} multiplier
   */
  multiply(multiplier) {
    if (!Number.isFinite(multiplier)) {
      throw new TypeError(`Money.multiply: invalid multiplier "${multiplier}"`);
    }
    return new Money(Math.round(this._amount * multiplier), this._currency);
  }

  /**
   * حساب نسبة مئوية من المبلغ
   * @param {number} percent - النسبة (مثل: 15 لـ 15%)
   */
  percentage(percent) {
    return this.multiply(percent / 100);
  }

  /**
   * قسمة على عدد (مفيد لتوزيع مبلغ على عدة أطراف)
   * @param {number} divisor
   */
  divide(divisor) {
    if (!divisor || divisor === 0) throw new Error('Money.divide: cannot divide by zero');
    return new Money(Math.round(this._amount / divisor), this._currency);
  }

  /**
   * التقريب لأقرب ريال
   */
  roundToRiyal() {
    return new Money(Math.round(this._amount / 100) * 100, this._currency);
  }

  // ═══════════════════════════════════════════════════════════
  // ضريبة القيمة المضافة (VAT) — 15% سعودياً
  // ═══════════════════════════════════════════════════════════

  /**
   * مبلغ الضريبة فقط
   * @param {number} [rate=15]  - نسبة الضريبة المئوية
   */
  vatAmount(rate = 15) {
    return this.percentage(rate);
  }

  /**
   * المبلغ مضاف إليه الضريبة
   * @param {number} [rate=15]
   */
  withVat(rate = 15) {
    return this.add(this.vatAmount(rate));
  }

  /**
   * استخراج المبلغ بدون ضريبة من مبلغ شامل
   * (عكس withVat)
   * @param {number} [rate=15]
   */
  excludeVat(rate = 15) {
    return new Money(Math.round(this._amount / (1 + rate / 100)), this._currency);
  }

  /**
   * إنشاء كائن يحتوي المبلغ الأصلي والضريبة والإجمالي
   * مفيد لعرض تفاصيل الفاتورة
   */
  vatBreakdown(rate = 15) {
    const tax = this.vatAmount(rate);
    const total = this.withVat(rate);
    return {
      subtotal: this,
      vatRate: rate,
      vatAmount: tax,
      total,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // المقارنة — Comparison
  // ═══════════════════════════════════════════════════════════

  isZero() {
    return this._amount === 0;
  }

  isPositive() {
    return this._amount > 0;
  }

  isNegative() {
    return this._amount < 0;
  }

  greaterThan(other) {
    this._assertSameCurrency(other);
    return this._amount > other._amount;
  }

  lessThan(other) {
    this._assertSameCurrency(other);
    return this._amount < other._amount;
  }

  greaterThanOrEqual(other) {
    this._assertSameCurrency(other);
    return this._amount >= other._amount;
  }

  lessThanOrEqual(other) {
    this._assertSameCurrency(other);
    return this._amount <= other._amount;
  }

  equals(other) {
    if (!(other instanceof Money)) return false;
    return this._amount === other._amount && this._currency === other._currency;
  }

  // ═══════════════════════════════════════════════════════════
  // تجميع — Aggregation Helpers
  // ═══════════════════════════════════════════════════════════

  /**
   * جمع مصفوفة من كائنات Money
   * @param {Money[]} amounts
   * @param {string} [currency='SAR']
   */
  static sum(amounts, currency = 'SAR') {
    return amounts.reduce((acc, curr) => acc.add(curr), Money.zero(currency));
  }

  /**
   * أعلى قيمة من مصفوفة
   */
  static max(...amounts) {
    return amounts.reduce((a, b) => (a.greaterThan(b) ? a : b));
  }

  /**
   * أدنى قيمة من مصفوفة
   */
  static min(...amounts) {
    return amounts.reduce((a, b) => (a.lessThan(b) ? a : b));
  }

  // ═══════════════════════════════════════════════════════════
  // Serialization — التسلسل للـ API
  // ═══════════════════════════════════════════════════════════

  /**
   * JSON serialization — يُستخدَم تلقائياً بـ JSON.stringify
   */
  toJSON() {
    return {
      amount: this._amount,
      riyals: this.toRiyals(),
      formatted: this.toFormattedString(),
      formattedAr: this.toFormattedString('ar'),
      currency: this._currency,
    };
  }

  /**
   * حفظ في MongoDB كـ number (هللات)
   * يُستخدَم عند تعريف Mongoose virtual أو getter
   */
  toDBValue() {
    return this._amount;
  }

  /**
   * استعادة من قيمة MongoDB
   */
  static fromDB(value, currency = 'SAR') {
    if (value instanceof Money) return value;
    return Money.fromHalalas(Number(value) || 0, currency);
  }

  // ═══════════════════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════════════════

  _assertSameCurrency(other) {
    if (!(other instanceof Money)) {
      throw new TypeError('Money: can only operate with another Money instance');
    }
    if (this._currency !== other._currency) {
      throw new Error(
        `Money: currency mismatch — cannot operate on ${this._currency} and ${other._currency}`
      );
    }
  }
}

module.exports = Money;
