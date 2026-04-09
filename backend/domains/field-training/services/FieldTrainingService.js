/**
 * FieldTrainingService — خدمة التدريب الميداني
 *
 * إدارة برامج التدريب، المتدربين، ساعات التدريب،
 * الكفاءات، التقييمات، الإشراف
 */

const mongoose = require('mongoose');
const { BaseService } = require('../../_base/BaseService');

class FieldTrainingService extends BaseService {
  constructor() {
    super({ serviceName: 'FieldTrainingService', cachePrefix: 'fieldtraining' });
  }

  /* ═══════════════════ PROGRAMS ═══════════════════ */

  async createProgram(data) {
    const TrainingProgram = mongoose.model('TrainingProgram');
    const count = await TrainingProgram.countDocuments();
    data.code = data.code || `FT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    const program = await TrainingProgram.create(data);
    this.emit('training:program:created', { programId: program._id });
    return program;
  }

  async listPrograms({ status, type, specialty, supervisorId, page = 1, limit = 20 } = {}) {
    const TrainingProgram = mongoose.model('TrainingProgram');
    const q = { isDeleted: { $ne: true } };
    if (status) q.status = status;
    if (type) q.type = type;
    if (specialty) q.specialty = specialty;
    if (supervisorId)
      q.$or = [{ primarySupervisor: supervisorId }, { 'supervisors.userId': supervisorId }];
    const total = await TrainingProgram.countDocuments(q);
    const data = await TrainingProgram.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('primarySupervisor', 'name email')
      .lean();
    return { data, total, page: +page, pages: Math.ceil(total / limit) };
  }

  async getProgram(id) {
    const TrainingProgram = mongoose.model('TrainingProgram');
    return TrainingProgram.findById(id)
      .populate('primarySupervisor', 'name email')
      .populate('supervisors.userId', 'name email')
      .lean();
  }

  async updateProgram(id, data) {
    const TrainingProgram = mongoose.model('TrainingProgram');
    return TrainingProgram.findByIdAndUpdate(id, data, { new: true });
  }

  /* ═══════════════════ TRAINEES ═══════════════════ */

  async enrollTrainee(programId, traineeData) {
    const TraineeRecord = mongoose.model('TraineeRecord');
    const record = await TraineeRecord.create({
      ...traineeData,
      programId,
      enrolledAt: new Date(),
    });
    this.emit('training:trainee:enrolled', {
      recordId: record._id,
      programId,
      traineeId: traineeData.traineeId,
    });
    return record;
  }

  async listTrainees({ programId, status, page = 1, limit = 20 } = {}) {
    const TraineeRecord = mongoose.model('TraineeRecord');
    const q = { isDeleted: { $ne: true } };
    if (programId) q.programId = programId;
    if (status) q.status = status;
    const total = await TraineeRecord.countDocuments(q);
    const data = await TraineeRecord.find(q)
      .sort({ enrolledAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('traineeId', 'name email')
      .populate('programId', 'title code')
      .lean();
    return { data, total, page: +page, pages: Math.ceil(total / limit) };
  }

  async getTraineeRecord(id) {
    const TraineeRecord = mongoose.model('TraineeRecord');
    return TraineeRecord.findById(id)
      .populate('traineeId', 'name email')
      .populate('programId', 'title code competencies totalHoursRequired')
      .populate('caseload.beneficiaryId', 'firstName lastName fileNumber')
      .populate('evaluations.evaluatedBy', 'name')
      .populate('supervisionSessions.supervisorId', 'name')
      .lean();
  }

  /* ── Log hours ── */
  async logHours(traineeRecordId, hourData) {
    const TraineeRecord = mongoose.model('TraineeRecord');
    const categoryMap = {
      direct_patient: 'directPatientContact',
      observation: 'observation',
      supervision: 'supervision',
      documentation: 'documentation',
      training: 'training',
      research: 'research',
      other: 'other',
    };
    const field = categoryMap[hourData.category] || 'other';
    return TraineeRecord.findByIdAndUpdate(
      traineeRecordId,
      {
        $push: { hourLogs: { ...hourData, date: hourData.date || new Date() } },
        $inc: { 'hours.totalLogged': hourData.hours, [`hours.${field}`]: hourData.hours },
      },
      { new: true }
    );
  }

  /* ── Add evaluation ── */
  async addEvaluation(traineeRecordId, evaluation) {
    const TraineeRecord = mongoose.model('TraineeRecord');
    return TraineeRecord.findByIdAndUpdate(
      traineeRecordId,
      {
        $push: { evaluations: { ...evaluation, date: evaluation.date || new Date() } },
      },
      { new: true }
    );
  }

  /* ── Add supervision session ── */
  async addSupervisionSession(traineeRecordId, session) {
    const TraineeRecord = mongoose.model('TraineeRecord');
    return TraineeRecord.findByIdAndUpdate(
      traineeRecordId,
      {
        $push: { supervisionSessions: { ...session, date: session.date || new Date() } },
        $inc: { 'hours.supervision': (session.durationMinutes || 0) / 60 },
      },
      { new: true }
    );
  }

  /* ── Add observation ── */
  async addObservation(traineeRecordId, observation) {
    const TraineeRecord = mongoose.model('TraineeRecord');
    return TraineeRecord.findByIdAndUpdate(
      traineeRecordId,
      {
        $push: { observations: { ...observation, date: observation.date || new Date() } },
        $inc: { 'hours.observation': 1 },
      },
      { new: true }
    );
  }

  /* ── Update competency ── */
  async updateCompetency(traineeRecordId, competencyName, assessment) {
    const TraineeRecord = mongoose.model('TraineeRecord');
    const record = await TraineeRecord.findById(traineeRecordId);
    if (!record) throw new Error('Trainee record not found');

    let comp = record.competencyProgress.find(c => c.competencyName === competencyName);
    if (!comp) {
      record.competencyProgress.push({
        competencyName,
        currentLevel: 'not_started',
        assessments: [],
      });
      comp = record.competencyProgress[record.competencyProgress.length - 1];
    }
    comp.assessments.push({ ...assessment, date: new Date() });
    comp.currentLevel = assessment.level;
    if (['competent', 'proficient', 'expert'].includes(assessment.level) && !comp.achievedDate) {
      comp.achievedDate = new Date();
    }
    await record.save();
    return record;
  }

  /* ── Assign beneficiary ── */
  async assignBeneficiary(traineeRecordId, caseData) {
    const TraineeRecord = mongoose.model('TraineeRecord');
    return TraineeRecord.findByIdAndUpdate(
      traineeRecordId,
      {
        $push: { caseload: { ...caseData, assignedDate: new Date() } },
      },
      { new: true }
    );
  }

  /* ── Complete training ── */
  async completeTraining(traineeRecordId, completionData) {
    const TraineeRecord = mongoose.model('TraineeRecord');
    return TraineeRecord.findByIdAndUpdate(
      traineeRecordId,
      {
        status: 'completed',
        completedAt: new Date(),
        ...completionData,
      },
      { new: true }
    );
  }

  /* ═══════════════════ DASHBOARD ═══════════════════ */

  async getDashboard(branchId) {
    const TrainingProgram = mongoose.model('TrainingProgram');
    const TraineeRecord = mongoose.model('TraineeRecord');
    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

    const [programStats, traineeStats, hourStats] = await Promise.all([
      TrainingProgram.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      TraineeRecord.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      TraineeRecord.aggregate([
        { $match: { isDeleted: { $ne: true }, status: 'active' } },
        {
          $group: {
            _id: null,
            totalHours: { $sum: '$hours.totalLogged' },
            avgHours: { $avg: '$hours.totalLogged' },
          },
        },
      ]),
    ]);

    return {
      programs: Object.fromEntries(programStats.map(s => [s._id, s.count])),
      trainees: Object.fromEntries(traineeStats.map(s => [s._id, s.count])),
      totalActiveTrainees: traineeStats.find(s => s._id === 'active')?.count || 0,
      totalHoursLogged: hourStats[0]?.totalHours || 0,
      averageHoursPerTrainee: Math.round(hourStats[0]?.avgHours || 0),
    };
  }
}

const fieldTrainingService = new FieldTrainingService();
module.exports = { fieldTrainingService };
