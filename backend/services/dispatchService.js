/**
 * Dispatch Service - خدمة التوزيع والشحن
 *
 * إدارة أوامر التوزيع والشحنات والتسليم
 */

const DispatchOrder = require('../models/DispatchOrder');
const _Vehicle = require('../models/Vehicle');
const logger = require('../utils/logger');

class DispatchService {
  /**
   * إنشاء أمر توزيع جديد
   */
  static async createOrder(data) {
    const order = new DispatchOrder(data);
    order.timeline.push({
      event: 'created',
      timestamp: new Date(),
      userId: data.createdBy,
      details: 'تم إنشاء أمر التوزيع',
    });
    await order.save();
    logger.info(`Dispatch order created: ${order.orderNumber}`);
    return order;
  }

  /**
   * جلب جميع الأوامر مع الفلترة والترقيم
   */
  static async getAll(filters = {}, page = 1, limit = 20) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.priority) query.priority = filters.priority;
    if (filters.vehicle) query.vehicle = filters.vehicle;
    if (filters.driver) query.driver = filters.driver;
    if (filters.organization) query.organization = filters.organization;
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
    }

    const [orders, total] = await Promise.all([
      DispatchOrder.find(query)
        .populate('vehicle', 'plateNumber type status')
        .populate('driver', 'name phone')
        .populate('createdBy', 'name email')
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 }),
      DispatchOrder.countDocuments(query),
    ]);

    return { orders, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * جلب أمر توزيع بالـ ID
   */
  static async getById(id) {
    return DispatchOrder.findById(id)
      .populate('vehicle', 'plateNumber type status currentLocation')
      .populate('driver', 'name phone licenseNumber')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
  }

  /**
   * تحديث أمر توزيع
   */
  static async update(id, data, userId) {
    data.updatedBy = userId;
    const order = await DispatchOrder.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (order) {
      order.timeline.push({ event: 'updated', userId, details: 'تم تحديث الأمر' });
      await order.save();
    }
    return order;
  }

  /**
   * تعيين مركبة وسائق
   */
  static async assignVehicleAndDriver(orderId, vehicleId, driverId, userId) {
    const order = await DispatchOrder.findById(orderId);
    if (!order) return null;

    order.vehicle = vehicleId;
    order.driver = driverId;
    order.assignedAt = new Date();
    order.status = 'assigned';
    order.timeline.push({
      event: 'assigned',
      userId,
      details: `تم تعيين المركبة ${vehicleId} والسائق ${driverId}`,
    });
    await order.save();
    return order;
  }

  /**
   * بدء الرحلة / التوزيع
   */
  static async startDispatch(orderId, userId) {
    const order = await DispatchOrder.findById(orderId);
    if (!order) return null;
    if (!['assigned', 'dispatched'].includes(order.status)) {
      throw new Error('الأمر ليس في حالة تسمح بالبدء');
    }

    order.status = 'in_transit';
    order.actualRoute = { ...order.actualRoute, startedAt: new Date() };
    order.timeline.push({ event: 'started', userId, details: 'بدأت الرحلة' });
    await order.save();
    return order;
  }

  /**
   * تحديث حالة نقطة توقف
   */
  static async updateStopStatus(orderId, stopIndex, status, data = {}, userId) {
    const order = await DispatchOrder.findById(orderId);
    if (!order || !order.stops[stopIndex]) return null;

    const stop = order.stops[stopIndex];
    stop.status = status;

    if (status === 'arrived') stop.actualArrival = new Date();
    if (status === 'completed') stop.actualDeparture = new Date();
    if (data.signature) stop.signature = data.signature;
    if (data.proofOfDelivery) stop.proofOfDelivery = data.proofOfDelivery;
    if (data.notes) stop.notes = data.notes;
    if (data.failureReason) stop.failureReason = data.failureReason;

    order.timeline.push({
      event: `stop_${status}`,
      userId,
      details: `نقطة التوقف ${stopIndex + 1}: ${status}`,
    });

    // التحقق من اكتمال جميع النقاط
    const allCompleted = order.stops.every(s =>
      ['completed', 'skipped', 'failed'].includes(s.status)
    );
    if (allCompleted) {
      order.status = 'completed';
      order.actualRoute.completedAt = new Date();
      if (order.actualRoute.startedAt) {
        order.actualRoute.actualDuration = Math.round(
          (new Date() - new Date(order.actualRoute.startedAt)) / 60000
        );
      }
    }

    await order.save();
    return order;
  }

  /**
   * إلغاء أمر
   */
  static async cancelOrder(orderId, reason, userId) {
    const order = await DispatchOrder.findById(orderId);
    if (!order) return null;

    order.status = 'cancelled';
    order.notes = (order.notes || '') + `\nسبب الإلغاء: ${reason}`;
    order.timeline.push({ event: 'cancelled', userId, details: reason });
    await order.save();
    return order;
  }

  /**
   * تقييم الأمر
   */
  static async rateOrder(orderId, score, comment, ratedBy) {
    const order = await DispatchOrder.findById(orderId);
    if (!order) return null;

    order.rating = { score, comment, ratedBy, ratedAt: new Date() };
    await order.save();
    return order;
  }

  /**
   * جلب الأوامر النشطة
   */
  static async getActiveOrders(organizationId) {
    const query = { status: { $in: ['assigned', 'dispatched', 'in_transit', 'at_stop'] } };
    if (organizationId) query.organization = organizationId;

    return DispatchOrder.find(query)
      .populate('vehicle', 'plateNumber type currentLocation')
      .populate('driver', 'name phone')
      .sort({ priority: -1, 'scheduling.scheduledDate': 1 });
  }

  /**
   * جلب أوامر السائق
   */
  static async getDriverOrders(driverId, status) {
    const query = { driver: driverId };
    if (status) query.status = status;
    return DispatchOrder.find(query).sort({ createdAt: -1 }).limit(50);
  }

  /**
   * إحصائيات التوزيع
   */
  static async getStatistics(filters = {}) {
    const match = {};
    if (filters.organization) match.organization = filters.organization;
    if (filters.dateFrom) match.createdAt = { $gte: new Date(filters.dateFrom) };

    const stats = await DispatchOrder.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          inTransitOrders: { $sum: { $cond: [{ $eq: ['$status', 'in_transit'] }, 1, 0] } },
          totalRevenue: { $sum: '$costs.customerCharge' },
          totalCost: { $sum: '$costs.totalCost' },
          totalProfit: { $sum: '$costs.profit' },
          avgRating: { $avg: '$rating.score' },
          totalDistance: { $sum: '$actualRoute.totalDistance' },
          avgDeliveryTime: { $avg: '$actualRoute.actualDuration' },
        },
      },
    ]);

    const byType = await DispatchOrder.aggregate([
      { $match: match },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const byPriority = await DispatchOrder.aggregate([
      { $match: match },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    return {
      ...(stats[0] || {}),
      completionRate: stats[0]
        ? ((stats[0].completedOrders / stats[0].totalOrders) * 100).toFixed(1)
        : 0,
      byType,
      byPriority,
    };
  }

  /**
   * تحسين المسار (ترتيب النقاط)
   */
  static async optimizeRoute(orderId) {
    const order = await DispatchOrder.findById(orderId);
    if (!order || order.stops.length < 2) return order;

    // خوارزمية بسيطة للترتيب: nearest neighbor
    // في الإنتاج يمكن استبدالها بـ Google OR-Tools أو مشابه
    const optimizedStops = [...order.stops];
    // تحسين بسيط: ترتيب pickup أولاً ثم delivery
    optimizedStops.sort((a, b) => {
      if (a.type === 'pickup' && b.type !== 'pickup') return -1;
      if (a.type !== 'pickup' && b.type === 'pickup') return 1;
      return a.order - b.order;
    });

    optimizedStops.forEach((stop, i) => {
      stop.order = i + 1;
    });
    order.stops = optimizedStops;
    order.plannedRoute.optimized = true;

    await order.save();
    logger.info(`Route optimized for order ${order.orderNumber}`);
    return order;
  }
}

module.exports = DispatchService;
