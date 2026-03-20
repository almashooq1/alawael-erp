/**
 * Driver Training & Certification Service - خدمة تدريب وشهادات السائقين
 */

const { DriverTraining, DriverCertification } = require('../models/DriverTraining');
const _logger = require('../utils/logger');

class DriverTrainingService {
  // ─── Training Programs ────────────────────────────────────────────

  static async createTraining(data) {
    return DriverTraining.create(data);
  }

  static async getAllTrainings(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.category) query.category = filter.category;
    if (filter.status) query.status = filter.status;
    if (filter.type) query.type = filter.type;
    if (filter.isMandatory !== undefined) query.isMandatory = filter.isMandatory;

    const [trainings, total] = await Promise.all([
      DriverTraining.find(query)
        .populate('participants.driver', 'name licenseNumber')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      DriverTraining.countDocuments(query),
    ]);
    return { trainings, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getTrainingById(id) {
    return DriverTraining.findById(id).populate('participants.driver', 'name licenseNumber phone');
  }

  static async updateTraining(id, data) {
    return DriverTraining.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async enrollDriver(trainingId, driverId) {
    const training = await DriverTraining.findById(trainingId);
    if (!training) return null;
    if (training.maxParticipants && training.participants.length >= training.maxParticipants) {
      throw new Error('الحد الأقصى للمشاركين تم الوصول إليه');
    }
    const already = training.participants.find(p => p.driver?.toString() === driverId);
    if (already) throw new Error('السائق مسجل بالفعل');
    training.participants.push({ driver: driverId });
    await training.save();
    return training;
  }

  static async updateParticipantResult(trainingId, driverId, resultData) {
    const training = await DriverTraining.findById(trainingId);
    if (!training) return null;
    const participant = training.participants.find(p => p.driver?.toString() === driverId);
    if (!participant) return null;
    Object.assign(participant, resultData);
    if (resultData.examScore !== undefined || resultData.practicalScore !== undefined) {
      const exam = participant.examScore || 0;
      const practical = participant.practicalScore || 0;
      participant.finalScore = Math.round(exam * 0.6 + practical * 0.4);
      participant.result = participant.finalScore >= training.passingScore ? 'passed' : 'failed';
      if (participant.result === 'passed') participant.completedAt = new Date();
    }
    await training.save();
    return training;
  }

  static async issueCertificate(trainingId, driverId) {
    const training = await DriverTraining.findById(trainingId);
    if (!training) return null;
    const participant = training.participants.find(p => p.driver?.toString() === driverId);
    if (!participant || participant.result !== 'passed') throw new Error('السائق لم يجتز التدريب');
    const certData = {
      driver: driverId,
      organization: training.organization,
      name: training.title,
      nameAr: training.titleAr,
      type: 'custom',
      issuer: training.instructor?.provider || 'مركز التدريب الداخلي',
      issueDate: new Date(),
      expiryDate: training.recurringInterval
        ? new Date(Date.now() + training.recurringInterval * 30 * 24 * 60 * 60 * 1000)
        : null,
      linkedTraining: trainingId,
    };
    const cert = await DriverCertification.create(certData);
    participant.certificateIssued = true;
    participant.certificateNumber = cert.certificationNumber;
    await training.save();
    return cert;
  }

  static async getDriverTrainings(driverId) {
    return DriverTraining.find({ 'participants.driver': driverId, isActive: true })
      .select(
        'title titleAr category type status schedule.startDate schedule.endDate participants.$'
      )
      .sort({ 'schedule.startDate': -1 });
  }

  static async getTrainingStatistics(organization) {
    const match = { isActive: true };
    if (organization) match.organization = new (require('mongoose').Types.ObjectId)(organization);
    return DriverTraining.aggregate([
      { $match: match },
      { $unwind: { path: '$participants', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalPrograms: { $addToSet: '$_id' },
          totalParticipants: { $sum: 1 },
          passed: { $sum: { $cond: [{ $eq: ['$participants.result', 'passed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$participants.result', 'failed'] }, 1, 0] } },
          avgScore: { $avg: '$participants.finalScore' },
        },
      },
      {
        $project: {
          totalPrograms: { $size: '$totalPrograms' },
          totalParticipants: 1,
          passed: 1,
          failed: 1,
          avgScore: 1,
          passRate: {
            $cond: [
              { $gt: ['$totalParticipants', 0] },
              { $multiply: [{ $divide: ['$passed', '$totalParticipants'] }, 100] },
              0,
            ],
          },
        },
      },
    ]);
  }

  // ─── Certifications ───────────────────────────────────────────────

  static async createCertification(data) {
    return DriverCertification.create(data);
  }

  static async getDriverCertifications(driverId) {
    return DriverCertification.find({ driver: driverId, isActive: true }).sort({ expiryDate: 1 });
  }

  static async updateCertification(id, data) {
    return DriverCertification.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async getExpiringCertifications(daysAhead = 30, organization) {
    const deadline = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    const query = {
      isActive: true,
      expiryDate: { $lte: deadline, $gte: new Date() },
      status: 'active',
    };
    if (organization) query.organization = organization;
    return DriverCertification.find(query).populate('driver', 'name phone').sort({ expiryDate: 1 });
  }

  static async getExpiredCertifications(organization) {
    const query = { isActive: true, status: { $in: ['expired', 'suspended'] } };
    if (organization) query.organization = organization;
    return DriverCertification.find(query).populate('driver', 'name phone').sort({ expiryDate: 1 });
  }

  static async renewCertification(id, newExpiryDate) {
    return DriverCertification.findByIdAndUpdate(
      id,
      {
        status: 'active',
        expiryDate: newExpiryDate,
        $push: { 'renewalReminder.daysBefore': { $each: [] } },
      },
      { new: true }
    );
  }
}

module.exports = DriverTrainingService;
