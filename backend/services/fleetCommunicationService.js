/**
 * Fleet Communication Service - خدمة اتصالات الأسطول
 */

const FleetCommunication = require('../models/FleetCommunication');
const logger = require('../utils/logger');

class FleetCommunicationService {
  async create(data) {
    const record = await FleetCommunication.create(data);
    logger.info(`Fleet message created: ${record.messageNumber} (${record.type})`);
    return record;
  }

  async getAll(query = {}) {
    const { page = 1, limit = 20, organization, type, priority, status } = query;
    const filter = {};
    if (organization) filter.organization = organization;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetCommunication.find(filter)
        .populate('sender.user sender.driver')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetCommunication.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getById(id) {
    return FleetCommunication.findById(id).populate(
      'sender.user sender.driver recipients.user recipients.driver relatedVehicle'
    );
  }

  async update(id, data) {
    return FleetCommunication.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return FleetCommunication.findByIdAndDelete(id);
  }

  async send(id) {
    const msg = await FleetCommunication.findById(id);
    if (!msg) throw new Error('الرسالة غير موجودة');
    msg.status = 'sent';
    msg.deliveryStats.sent = msg.recipients.length;
    await msg.save();
    logger.info(`Message sent: ${msg.messageNumber} to ${msg.recipients.length} recipients`);
    return msg;
  }

  async markRead(id, userId) {
    const msg = await FleetCommunication.findById(id);
    if (!msg) throw new Error('الرسالة غير موجودة');
    const recipient = msg.recipients.find(
      r => r.user?.toString() === userId || r.driver?.toString() === userId
    );
    if (recipient && !recipient.readAt) {
      recipient.readAt = new Date();
      msg.deliveryStats.read = (msg.deliveryStats.read || 0) + 1;
      await msg.save();
    }
    return msg;
  }

  async acknowledge(id, userId) {
    const msg = await FleetCommunication.findById(id);
    if (!msg) throw new Error('الرسالة غير موجودة');
    const recipient = msg.recipients.find(
      r => r.user?.toString() === userId || r.driver?.toString() === userId
    );
    if (recipient && !recipient.acknowledgedAt) {
      recipient.acknowledgedAt = new Date();
      if (!recipient.readAt) recipient.readAt = new Date();
      msg.deliveryStats.acknowledged = (msg.deliveryStats.acknowledged || 0) + 1;
      await msg.save();
    }
    return msg;
  }

  async sendSOS(data) {
    data.type = 'sos_alert';
    data.priority = 'emergency';
    data.status = 'sent';
    data.sos = { ...data.sos, active: true };
    const msg = await FleetCommunication.create(data);
    logger.warn(`SOS ALERT: ${msg.messageNumber} from driver`);
    return msg;
  }

  async resolveSOS(id, userId) {
    return FleetCommunication.findByIdAndUpdate(
      id,
      {
        'sos.active': false,
        'sos.resolvedAt': new Date(),
        'sos.resolvedBy': userId,
        status: 'acknowledged',
      },
      { new: true }
    );
  }

  async escalateSOS(id, escalationData) {
    const msg = await FleetCommunication.findById(id);
    if (!msg || !msg.sos) throw new Error('تنبيه SOS غير موجود');
    msg.sos.escalationLevel = (msg.sos.escalationLevel || 0) + 1;
    msg.sos.escalationHistory.push({
      level: msg.sos.escalationLevel,
      escalatedTo: escalationData.escalatedTo,
      escalatedAt: new Date(),
      notes: escalationData.notes,
    });
    await msg.save();
    return msg;
  }

  async getActiveSOS(query = {}) {
    const { organization, page = 1, limit = 20 } = query;
    const filter = { type: 'sos_alert', 'sos.active': true };
    if (organization) filter.organization = organization;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetCommunication.find(filter)
        .populate('sender.driver sos.vehicle')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetCommunication.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getThread(parentId) {
    return FleetCommunication.find({ parentMessage: parentId })
      .populate('sender.user sender.driver')
      .sort({ createdAt: 1 });
  }

  async getDriverInbox(driverId, query = {}) {
    const { page = 1, limit = 20 } = query;
    const filter = { 'recipients.driver': driverId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetCommunication.find(filter)
        .populate('sender.user')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetCommunication.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getBroadcasts(query = {}) {
    const { organization, page = 1, limit = 20 } = query;
    const filter = { type: 'broadcast' };
    if (organization) filter.organization = organization;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetCommunication.find(filter)
        .populate('sender.user')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetCommunication.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getStatistics(organization) {
    const [total, sosCurrent, broadcasts, byType] = await Promise.all([
      FleetCommunication.countDocuments({ organization }),
      FleetCommunication.countDocuments({ organization, type: 'sos_alert', 'sos.active': true }),
      FleetCommunication.countDocuments({ organization, type: 'broadcast' }),
      FleetCommunication.aggregate([
        { $match: { organization: new (require('mongoose').Types.ObjectId)(organization) } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);
    const typeMap = {};
    byType.forEach(t => (typeMap[t._id] = t.count));
    return { total, activeSOSAlerts: sosCurrent, broadcasts, byType: typeMap };
  }
}

module.exports = new FleetCommunicationService();
