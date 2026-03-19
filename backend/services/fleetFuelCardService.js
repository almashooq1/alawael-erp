/**
 * Fleet Fuel Card Service - خدمة بطاقات الوقود
 *
 * إدارة بطاقات الوقود والمعاملات ومنع الاحتيال
 */

const FleetFuelCard = require('../models/FleetFuelCard');
const logger = require('../utils/logger');

class FleetFuelCardService {
  /**
   * إنشاء بطاقة وقود جديدة
   */
  static async create(data) {
    const card = new FleetFuelCard(data);
    await card.save();
    logger.info(`Fuel card created: ${card.cardNumber}`);
    return card;
  }

  /**
   * جلب جميع البطاقات
   */
  static async getAll(filters = {}, page = 1, limit = 20) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.provider) query.provider = filters.provider;
    if (filters.vehicle) query.assignedVehicle = filters.vehicle;
    if (filters.driver) query.assignedDriver = filters.driver;
    if (filters.organization) query.organization = filters.organization;

    const [cards, total] = await Promise.all([
      FleetFuelCard.find(query)
        .populate('assignedVehicle', 'plateNumber type')
        .populate('assignedDriver', 'name phone')
        .select('-transactions -pin')
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 }),
      FleetFuelCard.countDocuments(query),
    ]);

    return { cards, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * جلب بطاقة بالـ ID
   */
  static async getById(id) {
    return FleetFuelCard.findById(id)
      .populate('assignedVehicle', 'plateNumber type fuelType')
      .populate('assignedDriver', 'name phone email')
      .select('-pin');
  }

  /**
   * تحديث بطاقة
   */
  static async update(id, data) {
    return FleetFuelCard.findByIdAndUpdate(id, data, { new: true, runValidators: true }).select(
      '-pin'
    );
  }

  /**
   * تفعيل بطاقة
   */
  static async activateCard(cardId) {
    const card = await FleetFuelCard.findById(cardId);
    if (!card) return null;

    card.status = 'active';
    card.activatedDate = new Date();
    await card.save();
    logger.info(`Fuel card activated: ${card.cardNumber}`);
    return card;
  }

  /**
   * تعليق بطاقة
   */
  static async suspendCard(cardId, reason) {
    const card = await FleetFuelCard.findById(cardId);
    if (!card) return null;

    card.status = 'suspended';
    card.notes = (card.notes || '') + `\nتم التعليق: ${reason} — ${new Date().toISOString()}`;
    await card.save();
    logger.warn(`Fuel card suspended: ${card.cardNumber} — ${reason}`);
    return card;
  }

  /**
   * تعيين بطاقة لمركبة/سائق
   */
  static async assignCard(cardId, vehicleId, driverId) {
    const card = await FleetFuelCard.findById(cardId);
    if (!card) return null;

    card.assignedVehicle = vehicleId || card.assignedVehicle;
    card.assignedDriver = driverId || card.assignedDriver;
    await card.save();
    return card;
  }

  /**
   * تسجيل معاملة وقود
   */
  static async recordTransaction(cardId, txData) {
    const card = await FleetFuelCard.findById(cardId);
    if (!card) return null;
    if (card.status !== 'active') {
      throw new Error('البطاقة غير نشطة');
    }

    // التحقق من الحدود
    const alerts = this._checkLimits(card, txData);

    // حساب كفاءة الوقود
    if (txData.odometer && card.transactions.length > 0) {
      const lastTx = card.transactions[card.transactions.length - 1];
      if (lastTx.odometer) {
        txData.kmSinceLastFill = txData.odometer - lastTx.odometer;
        txData.fuelEfficiency =
          txData.kmSinceLastFill > 0 ? (txData.kmSinceLastFill / txData.quantity).toFixed(2) : null;
      }
    }

    card.transactions.push(txData);

    // تحديث الإحصائيات
    card.usage.totalSpent += txData.totalAmount;
    card.usage.totalLiters += txData.quantity;
    card.usage.transactionCount += 1;
    card.usage.currentDaySpent += txData.totalAmount;
    card.usage.currentWeekSpent += txData.totalAmount;
    card.usage.currentMonthSpent += txData.totalAmount;
    card.usage.lastTransaction = new Date();
    card.usage.averagePerTransaction = card.usage.totalSpent / card.usage.transactionCount;

    // إضافة تنبيهات الاحتيال إن وجدت
    if (alerts.length > 0) {
      card.fraudAlerts.push(...alerts);
    }

    await card.save();
    logger.info(`Fuel transaction recorded: Card ${card.cardNumber} — ${txData.totalAmount} SAR`);
    return { card, alerts };
  }

  /**
   * التحقق من الحدود واكتشاف الاحتيال
   */
  static _checkLimits(card, tx) {
    const alerts = [];
    const limits = card.limits;

    // حد المعاملة الواحدة
    if (limits.transactionLimit && tx.totalAmount > limits.transactionLimit) {
      alerts.push({
        type: 'exceeded_limit',
        description: `تجاوز حد المعاملة: ${tx.totalAmount} > ${limits.transactionLimit}`,
        severity: 'high',
      });
    }

    // حد اليومي
    if (limits.dailyLimit && card.usage.currentDaySpent + tx.totalAmount > limits.dailyLimit) {
      alerts.push({
        type: 'exceeded_limit',
        description: `تجاوز الحد اليومي: ${card.usage.currentDaySpent + tx.totalAmount} > ${limits.dailyLimit}`,
        severity: 'high',
      });
    }

    // مبلغ غير معتاد
    if (
      card.usage.averagePerTransaction &&
      tx.totalAmount > card.usage.averagePerTransaction * 2.5
    ) {
      alerts.push({
        type: 'unusual_amount',
        description: `مبلغ غير معتاد: ${tx.totalAmount} (المتوسط: ${card.usage.averagePerTransaction.toFixed(0)})`,
        severity: 'medium',
      });
    }

    // تكرار غير معتاد (أكثر من 3 معاملات في يوم)
    const todayTxCount = card.transactions.filter(t => {
      const txDate = new Date(t.date);
      const today = new Date();
      return txDate.toDateString() === today.toDateString();
    }).length;
    if (todayTxCount >= (limits.dailyTransactionCount || 3)) {
      alerts.push({
        type: 'unusual_frequency',
        description: `تكرار غير معتاد: ${todayTxCount + 1} معاملات اليوم`,
        severity: 'medium',
      });
    }

    return alerts;
  }

  /**
   * جلب معاملات بطاقة
   */
  static async getCardTransactions(cardId, page = 1, limit = 50) {
    const card = await FleetFuelCard.findById(cardId).select('transactions cardNumber');
    if (!card) return null;

    const start = (page - 1) * limit;
    const txs = card.transactions
      .slice()
      .reverse()
      .slice(start, start + limit);
    return {
      cardNumber: card.cardNumber,
      transactions: txs,
      total: card.transactions.length,
      page,
      totalPages: Math.ceil(card.transactions.length / limit),
    };
  }

  /**
   * تأكيد تنبيه احتيال
   */
  static async resolveFraudAlert(cardId, alertId, resolution, userId) {
    const card = await FleetFuelCard.findById(cardId);
    if (!card) return null;

    const alert = card.fraudAlerts.id(alertId);
    if (!alert) return null;

    alert.resolved = true;
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();
    alert.resolution = resolution;

    await card.save();
    return alert;
  }

  /**
   * البطاقات المنتهية / القريبة من الانتهاء
   */
  static async getExpiringCards(daysAhead = 30, organizationId) {
    const targetDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    const query = {
      status: 'active',
      expiryDate: { $lte: targetDate },
    };
    if (organizationId) query.organization = organizationId;

    return FleetFuelCard.find(query)
      .populate('assignedVehicle', 'plateNumber')
      .populate('assignedDriver', 'name')
      .sort({ expiryDate: 1 });
  }

  /**
   * تنبيهات الاحتيال غير المحلولة
   */
  static async getUnresolvedFraudAlerts(organizationId) {
    const query = {
      'fraudAlerts.resolved': false,
      status: { $ne: 'cancelled' },
    };
    if (organizationId) query.organization = organizationId;

    const cards = await FleetFuelCard.find(query)
      .populate('assignedVehicle', 'plateNumber')
      .populate('assignedDriver', 'name')
      .select('cardNumber fraudAlerts assignedVehicle assignedDriver');

    const alerts = [];
    cards.forEach(card => {
      card.fraudAlerts
        .filter(a => !a.resolved)
        .forEach(alert => {
          alerts.push({
            cardNumber: card.cardNumber,
            cardId: card._id,
            vehicle: card.assignedVehicle,
            driver: card.assignedDriver,
            alert,
          });
        });
    });

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (severityOrder[a.alert.severity] || 4) - (severityOrder[b.alert.severity] || 4);
    });
  }

  /**
   * تقرير استهلاك الوقود
   */
  static async getConsumptionReport(filters = {}) {
    const match = {};
    if (filters.organization) match.organization = filters.organization;
    if (filters.provider) match.provider = filters.provider;

    const stats = await FleetFuelCard.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalCards: { $sum: 1 },
          activeCards: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          totalSpent: { $sum: '$usage.totalSpent' },
          totalLiters: { $sum: '$usage.totalLiters' },
          totalTransactions: { $sum: '$usage.transactionCount' },
          avgPerTransaction: { $avg: '$usage.averagePerTransaction' },
        },
      },
    ]);

    const byProvider = await FleetFuelCard.aggregate([
      { $match: { ...match, status: 'active' } },
      {
        $group: {
          _id: '$provider',
          count: { $sum: 1 },
          totalSpent: { $sum: '$usage.totalSpent' },
          totalLiters: { $sum: '$usage.totalLiters' },
        },
      },
      { $sort: { totalSpent: -1 } },
    ]);

    const topSpenders = await FleetFuelCard.find(match)
      .populate('assignedVehicle', 'plateNumber')
      .sort({ 'usage.currentMonthSpent': -1 })
      .limit(10)
      .select('cardNumber assignedVehicle usage.currentMonthSpent usage.totalSpent');

    return {
      summary: stats[0] || {},
      byProvider,
      topSpenders,
    };
  }

  /**
   * إحصائيات عامة
   */
  static async getStatistics(organizationId) {
    const match = organizationId ? { organization: organizationId } : {};

    const stats = await FleetFuelCard.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          totalSpent: { $sum: '$usage.totalSpent' },
          totalLiters: { $sum: '$usage.totalLiters' },
          unresolvedAlerts: {
            $sum: {
              $size: {
                $filter: { input: '$fraudAlerts', as: 'a', cond: { $eq: ['$$a.resolved', false] } },
              },
            },
          },
        },
      },
    ]);

    return (
      stats[0] || {
        total: 0,
        active: 0,
        suspended: 0,
        expired: 0,
        totalSpent: 0,
        totalLiters: 0,
        unresolvedAlerts: 0,
      }
    );
  }
}

module.exports = FleetFuelCardService;
