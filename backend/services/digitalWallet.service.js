/**
 * DigitalWallet Service — System 39
 * المحفظة الرقمية: شحن، دفع، تحويل، كوبونات، نقاط الولاء
 */
'use strict';

const { v4: uuidv4 } = require('uuid');
const DigitalWallet = require('../models/DigitalWallet');
const WalletTransaction = require('../models/WalletTransaction');
const DiscountCoupon = require('../models/DiscountCoupon');
const CouponUsage = require('../models/CouponUsage');
const LoyaltyPointsTransaction = require('../models/LoyaltyPointsTransaction');

class DigitalWalletService {
  /**
   * إنشاء محفظة جديدة لمستفيد أو ولي أمر
   */
  async createWallet(ownerType, ownerId, branchId, userId) {
    // التحقق من عدم وجود محفظة سابقة
    const existing = await DigitalWallet.findOne({
      ownerType,
      ownerId,
      branchId,
      deletedAt: null,
    });
    if (existing) throw new Error('توجد محفظة مسجلة لهذا المالك');

    return DigitalWallet.create({
      branchId,
      walletNumber: `WLT-${Date.now().toString().slice(-8)}`,
      uuid: uuidv4(),
      ownerType,
      ownerId,
      balance: 0,
      frozenBalance: 0,
      totalToppedUp: 0,
      totalSpent: 0,
      status: 'active',
      isBlocked: false,
      loyaltyPoints: 0,
      createdBy: userId,
    });
  }

  /**
   * شحن رصيد المحفظة
   */
  async topUp(walletId, amount, source, metadata = {}, userId) {
    const wallet = await DigitalWallet.findById(walletId);
    if (!wallet || wallet.deletedAt) throw new Error('المحفظة غير موجودة');
    if (wallet.isBlocked) throw new Error('المحفظة محجوبة');
    if (amount <= 0) throw new Error('مبلغ الشحن يجب أن يكون أكبر من صفر');

    const balanceBefore = wallet.balance;
    wallet.balance += amount;
    wallet.totalToppedUp += amount;
    wallet.updatedBy = userId;
    await wallet.save();

    const tx = await WalletTransaction.create({
      branchId: wallet.branchId,
      referenceNumber: `TXN-WLT-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      uuid: uuidv4(),
      walletId: wallet._id,
      type: 'credit',
      subType: 'topup',
      amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: `شحن من ${source}`,
      status: 'completed',
      metadata,
      createdBy: userId,
    });

    return { transaction: tx, wallet };
  }

  /**
   * خصم مبلغ من المحفظة
   */
  async debit(walletId, amount, description, relatedType = null, relatedId = null, userId) {
    const wallet = await DigitalWallet.findById(walletId);
    if (!wallet || wallet.deletedAt) throw new Error('المحفظة غير موجودة');
    if (wallet.isBlocked) throw new Error('المحفظة محجوبة');

    const available = wallet.balance - wallet.frozenBalance;
    if (amount > available) throw new Error(`الرصيد غير كافٍ: ${available.toFixed(2)} SAR متاح`);

    if (wallet.singleTransactionLimit && amount > wallet.singleTransactionLimit) {
      throw new Error(`تجاوز حد المعاملة الواحدة: ${wallet.singleTransactionLimit} SAR`);
    }

    // فحص الحد اليومي
    if (wallet.dailyLimit) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySpent = await WalletTransaction.aggregate([
        {
          $match: {
            walletId: wallet._id,
            type: 'debit',
            createdAt: { $gte: today },
            deletedAt: null,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      if ((todaySpent[0]?.total || 0) + amount > wallet.dailyLimit) {
        throw new Error(`تجاوز الحد اليومي: ${wallet.dailyLimit} SAR`);
      }
    }

    const balanceBefore = wallet.balance;
    wallet.balance -= amount;
    wallet.totalSpent += amount;
    wallet.updatedBy = userId;
    await wallet.save();

    const tx = await WalletTransaction.create({
      branchId: wallet.branchId,
      referenceNumber: `TXN-WLT-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      uuid: uuidv4(),
      walletId: wallet._id,
      type: 'debit',
      subType: 'payment',
      amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description,
      relatedType,
      relatedId,
      status: 'completed',
      createdBy: userId,
    });

    // إضافة نقاط الولاء (1 نقطة لكل 10 ريال)
    const earnedPoints = Math.floor(amount / 10);
    if (earnedPoints > 0) {
      await this.addLoyaltyPoints(
        wallet,
        earnedPoints,
        'payment',
        'WalletTransaction',
        tx._id,
        userId
      );
      await WalletTransaction.findByIdAndUpdate(tx._id, { loyaltyPointsEarned: earnedPoints });
    }

    return { transaction: tx, wallet };
  }

  /**
   * تحويل مبلغ بين محفظتين
   */
  async transfer(fromWalletId, toWalletNumber, amount, userId) {
    const fromWallet = await DigitalWallet.findById(fromWalletId);
    const toWallet = await DigitalWallet.findOne({ walletNumber: toWalletNumber, deletedAt: null });

    if (!fromWallet || !toWallet) throw new Error('محفظة غير موجودة');
    if (fromWallet._id.toString() === toWallet._id.toString()) {
      throw new Error('لا يمكن التحويل لنفس المحفظة');
    }

    // خصم من المحفظة الأصلية
    const { transaction: debitTx } = await this.debit(
      fromWallet._id,
      amount,
      `تحويل إلى محفظة ${toWallet.walletNumber}`,
      null,
      null,
      userId
    );

    // إضافة للمحفظة الهدف
    const { transaction: creditTx } = await this.topUp(
      toWallet._id,
      amount,
      `تحويل من محفظة ${fromWallet.walletNumber}`,
      {},
      userId
    );

    // تحديث نوع المعاملات
    await WalletTransaction.findByIdAndUpdate(debitTx._id, {
      subType: 'transfer_out',
      counterpartWalletId: toWallet._id,
    });
    await WalletTransaction.findByIdAndUpdate(creditTx._id, {
      subType: 'transfer_in',
      counterpartWalletId: fromWallet._id,
    });

    return { debit: debitTx, credit: creditTx };
  }

  /**
   * تطبيق كوبون خصم
   */
  async applyCoupon(couponCode, orderAmount, beneficiaryId, branchId) {
    const now = new Date();
    const coupon = await DiscountCoupon.findOne({
      code: couponCode.toUpperCase(),
      branchId,
      isActive: true,
      startsAt: { $lte: now },
      expiresAt: { $gte: now },
      deletedAt: null,
    });

    if (!coupon) throw new Error('الكوبون غير صالح أو منتهي الصلاحية');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new Error('تجاوز حد استخدام الكوبون');
    }
    if (orderAmount < coupon.minAmount) {
      throw new Error(`الحد الأدنى للطلب: ${coupon.minAmount} SAR`);
    }

    // فحص حد الاستخدام للمستفيد
    const userUsage = await CouponUsage.countDocuments({ couponId: coupon._id, beneficiaryId });
    if (userUsage >= coupon.perUserLimit) throw new Error('تجاوزت حد الاستخدام الشخصي');

    let discount = coupon.type === 'percentage' ? (orderAmount * coupon.value) / 100 : coupon.value;

    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.round(discount * 100) / 100;

    const finalAmount = Math.max(0, orderAmount - discount);

    return {
      coupon,
      discount,
      finalAmount,
      couponCode: coupon.code,
      couponType: coupon.type,
      couponValue: coupon.value,
    };
  }

  /**
   * تسجيل استخدام الكوبون
   */
  async recordCouponUsage(
    couponId,
    beneficiaryId,
    walletTransactionId,
    discountAmount,
    orderAmount,
    userId
  ) {
    const coupon = await DiscountCoupon.findById(couponId);
    if (!coupon) throw new Error('الكوبون غير موجود');

    await CouponUsage.create({
      branchId: coupon.branchId,
      couponId,
      beneficiaryId,
      walletTransactionId,
      discountAmount,
      orderAmount,
      usedAt: new Date(),
      createdBy: userId,
    });

    await DiscountCoupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
  }

  /**
   * إضافة نقاط الولاء
   */
  async addLoyaltyPoints(wallet, points, type, sourceType = null, sourceId = null, userId) {
    const before = wallet.loyaltyPoints;
    wallet.loyaltyPoints += points;
    if (!wallet.isModified) await wallet.save();

    await LoyaltyPointsTransaction.create({
      branchId: wallet.branchId,
      uuid: uuidv4(),
      walletId: wallet._id,
      type: 'earn',
      points,
      balanceBefore: before,
      balanceAfter: before + points,
      description: `اكتساب نقاط - ${type}`,
      sourceType,
      sourceId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // سنة
      createdBy: userId,
    });
  }

  /**
   * استبدال نقاط الولاء بخصم
   */
  async redeemLoyaltyPoints(walletId, points, userId) {
    const wallet = await DigitalWallet.findById(walletId);
    if (!wallet) throw new Error('المحفظة غير موجودة');
    if (wallet.loyaltyPoints < points) {
      throw new Error(`نقاط غير كافية: لديك ${wallet.loyaltyPoints} نقطة`);
    }

    const discountAmount = points / 100; // 100 نقطة = 1 ريال
    const before = wallet.loyaltyPoints;
    wallet.loyaltyPoints -= points;
    wallet.updatedBy = userId;
    await wallet.save();

    await LoyaltyPointsTransaction.create({
      branchId: wallet.branchId,
      uuid: uuidv4(),
      walletId: wallet._id,
      type: 'redeem',
      points,
      balanceBefore: before,
      balanceAfter: wallet.loyaltyPoints,
      description: `استبدال ${points} نقطة = ${discountAmount} SAR`,
      createdBy: userId,
    });

    return discountAmount;
  }

  /**
   * حجب محفظة
   */
  async blockWallet(walletId, reason, userId) {
    const wallet = await DigitalWallet.findByIdAndUpdate(
      walletId,
      { isBlocked: true, blockReason: reason, blockedAt: new Date(), updatedBy: userId },
      { new: true }
    );
    if (!wallet) throw new Error('المحفظة غير موجودة');
    return wallet;
  }

  /**
   * رفع الحجب عن محفظة
   */
  async unblockWallet(walletId, userId) {
    const wallet = await DigitalWallet.findByIdAndUpdate(
      walletId,
      { isBlocked: false, blockReason: null, blockedAt: null, updatedBy: userId },
      { new: true }
    );
    if (!wallet) throw new Error('المحفظة غير موجودة');
    return wallet;
  }

  /**
   * كشف حساب المحفظة
   */
  async getStatement(walletId, dateFrom, dateTo) {
    const wallet = await DigitalWallet.findById(walletId);
    if (!wallet) throw new Error('المحفظة غير موجودة');

    const from = new Date(dateFrom);
    const to = new Date(dateTo + 'T23:59:59');

    const txns = await WalletTransaction.find({
      walletId,
      createdAt: { $gte: from, $lte: to },
      deletedAt: null,
    }).sort({ createdAt: -1 });

    const totalCredits = txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalDebits = txns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

    // الرصيد الافتتاحي
    const prevTx = await WalletTransaction.findOne({
      walletId,
      createdAt: { $lt: from },
      deletedAt: null,
    }).sort({ createdAt: -1 });

    return {
      wallet,
      period: { from: dateFrom, to: dateTo },
      openingBalance: prevTx?.balanceAfter ?? 0,
      closingBalance: wallet.balance,
      totalCredits,
      totalDebits,
      netChange: totalCredits - totalDebits,
      transactions: txns,
    };
  }

  /**
   * إنهاء صلاحية نقاط الولاء المنتهية
   */
  async expireLoyaltyPoints() {
    const expired = await LoyaltyPointsTransaction.find({
      type: 'earn',
      expiresAt: { $lt: new Date() },
      deletedAt: null,
    });

    let expiredCount = 0;
    for (const pts of expired) {
      const wallet = await DigitalWallet.findById(pts.walletId);
      if (wallet && wallet.loyaltyPoints >= pts.points) {
        wallet.loyaltyPoints -= pts.points;
        await wallet.save();

        await LoyaltyPointsTransaction.create({
          branchId: wallet.branchId,
          uuid: uuidv4(),
          walletId: wallet._id,
          type: 'expire',
          points: pts.points,
          balanceBefore: wallet.loyaltyPoints + pts.points,
          balanceAfter: wallet.loyaltyPoints,
          description: 'انتهاء صلاحية النقاط',
        });
        expiredCount++;
      }
    }
    return expiredCount;
  }

  /**
   * قائمة المحافظ مع فلترة
   */
  async list(filters) {
    const { branchId, status, ownerType, page = 1, limit = 15, search } = filters;

    const query = { deletedAt: null };
    if (branchId) query.branchId = branchId;
    if (status) query.status = status;
    if (ownerType) query.ownerType = ownerType;
    if (search) query.walletNumber = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      DigitalWallet.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      DigitalWallet.countDocuments(query),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /**
   * إحصائيات المحافظ
   */
  async getStats(branchId) {
    const query = { deletedAt: null };
    if (branchId) query.branchId = branchId;

    const [total, active, totalBalance, totalPoints] = await Promise.all([
      DigitalWallet.countDocuments(query),
      DigitalWallet.countDocuments({ ...query, status: 'active', isBlocked: false }),
      DigitalWallet.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$balance' } } },
      ]),
      DigitalWallet.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$loyaltyPoints' } } },
      ]),
    ]);

    return {
      totalWallets: { title: 'إجمالي المحافظ', value: total, icon: 'wallet' },
      activeWallets: { title: 'المحافظ النشطة', value: active, icon: 'check-circle' },
      totalBalance: {
        title: 'إجمالي الأرصدة',
        value: (totalBalance[0]?.total || 0).toFixed(2),
        icon: 'currency-dollar',
      },
      totalPoints: {
        title: 'نقاط الولاء',
        value: totalPoints[0]?.total || 0,
        icon: 'star',
      },
    };
  }
}

module.exports = new DigitalWalletService();
