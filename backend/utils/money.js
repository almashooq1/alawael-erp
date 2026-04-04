/**
 * money.js — Money Value Object
 *
 * الملف: backend/utils/money.js
 * المصدر: prompt_03 — نظام إدارة مراكز تأهيل ذوي الإعاقة — Rehab-ERP v2.0
 *
 * كائن قيمة للتعامل مع المبالغ المالية بدقة
 * يستخدم الهللات (أصغر وحدة) لتجنب أخطاء الفاصلة العشرية
 *
 * الاستخدام:
 *   const { Money } = require('./money');
 *   const price = Money.fromRiyals(150.50);
 *   const withVat = price.withVat(); // 15%
 *   console.log(withVat.toFormattedString()); // "173.08 SAR"
 */

'use strict';

class Money {
  /**
   * @param {number} amount - المبلغ بالهللات (أصغر وحدة)
   * @param {string} currency - العملة (افتراضي: SAR)
   */
  constructor(amount, currency = 'SAR') {
    if (!Number.isInteger(amount)) {
      throw new TypeError(`Money amount must be an integer (halalas), got: ${amount}`);
    }
    this._amount = amount;
    this._currency = currency.toUpperCase();
  }

  // ─── Factory Methods ──────────────────────────────────────────

  /**
   * إنشاء من ريالات (مثلاً: 150.50 ريال)
   * @param {number|string} riyals
   * @param {string} [currency]
   * @returns {Money}
   */
  static fromRiyals(riyals, currency = 'SAR') {
    const amount = Math.round(parseFloat(riyals) * 100);
    return new Money(amount, currency);
  }

  /**
   * إنشاء من هللات (مثلاً: 15050 هللة = 150.50 ريال)
   * @param {number} halalas
   * @param {string} [currency]
   * @returns {Money}
   */
  static fromHalalas(halalas, currency = 'SAR') {
    return new Money(halalas, currency);
  }

  /**
   * صفر
   * @param {string} [currency]
   * @returns {Money}
   */
  static zero(currency = 'SAR') {
    return new Money(0, currency);
  }

  // ─── Getters ──────────────────────────────────────────────────

  /** المبلغ بالهللات */
  get amount() {
    return this._amount;
  }

  /** العملة */
  get currency() {
    return this._currency;
  }

  /** المبلغ بالريالات */
  toRiyals() {
    return this._amount / 100;
  }

  /** النص المنسّق */
  toFormattedString() {
    return `${this.toRiyals().toFixed(2)} ${this._currency}`;
  }

  // ─── Arithmetic ───────────────────────────────────────────────

  /**
   * جمع مبلغين
   * @param {Money} other
   * @returns {Money}
   */
  add(other) {
    this._ensureSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * طرح مبلغين
   * @param {Money} other
   * @returns {Money}
   */
  subtract(other) {
    this._ensureSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  /**
   * ضرب المبلغ في معامل
   * @param {number} multiplier
   * @returns {Money}
   */
  multiply(multiplier) {
    return new Money(Math.round(this._amount * multiplier), this._currency);
  }

  /**
   * حساب نسبة مئوية من المبلغ
   * @param {number} percent
   * @returns {Money}
   */
  percentage(percent) {
    return new Money(Math.round((this._amount * percent) / 100), this._currency);
  }

  // ─── VAT (ضريبة القيمة المضافة) ──────────────────────────────

  /**
   * حساب مبلغ الضريبة (15% السعودية)
   * @param {number} [rate=15]
   * @returns {Money}
   */
  vatAmount(rate = 15.0) {
    return this.percentage(rate);
  }

  /**
   * المبلغ شامل الضريبة
   * @param {number} [rate=15]
   * @returns {Money}
   */
  withVat(rate = 15.0) {
    return this.add(this.vatAmount(rate));
  }

  /**
   * استخراج المبلغ قبل الضريبة من مبلغ شامل الضريبة
   * @param {number} [rate=15]
   * @returns {Money}
   */
  excludeVat(rate = 15.0) {
    const amount = Math.round(this._amount / (1 + rate / 100));
    return new Money(amount, this._currency);
  }

  // ─── Comparison ───────────────────────────────────────────────

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
    this._ensureSameCurrency(other);
    return this._amount > other._amount;
  }

  lessThan(other) {
    this._ensureSameCurrency(other);
    return this._amount < other._amount;
  }

  greaterThanOrEqual(other) {
    this._ensureSameCurrency(other);
    return this._amount >= other._amount;
  }

  equals(other) {
    return this._amount === other._amount && this._currency === other._currency;
  }

  // ─── Serialization ────────────────────────────────────────────

  toJSON() {
    return {
      amount: this._amount,
      riyals: this.toRiyals(),
      formatted: this.toFormattedString(),
      currency: this._currency,
    };
  }

  toString() {
    return this.toFormattedString();
  }

  valueOf() {
    return this._amount;
  }

  // ─── Internal ─────────────────────────────────────────────────

  _ensureSameCurrency(other) {
    if (!(other instanceof Money)) {
      throw new TypeError('Cannot operate with a non-Money value');
    }
    if (this._currency !== other._currency) {
      throw new Error(
        `Cannot operate on different currencies: ${this._currency} and ${other._currency}`
      );
    }
  }
}

module.exports = { Money };
