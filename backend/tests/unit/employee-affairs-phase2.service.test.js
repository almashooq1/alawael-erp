/**
 * Unit tests for employeeAffairs.phase2.service.js (807L)
 * Singleton with 47 methods, lazy Mongoose model loading, aggregation pipelines
 * Domains: Tasks, Housing, Custody, WorkPermits, Rewards, Shifts, Dashboard
 */

/* ─── Chainable query mock ─── */
function Q(val) {
  const q = {};
  ['lean', 'select', 'populate', 'sort', 'skip', 'limit', 'exec'].forEach(m => {
    q[m] = jest.fn(() => q);
  });
  q.then = (cb, ecb) => Promise.resolve(val).then(cb, ecb);
  q.catch = ecb => Promise.resolve(val).catch(ecb);
  return q;
}

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* Model factory on global (jest.mock hoisting safe) */
global.__mkM = () => {
  const M = jest.fn(function (data) {
    Object.assign(this, data || {});
    this._id = this._id || 'aabb000000000000000000aa';
    this.save = jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    });
  });
  M.find = jest.fn(() => Q([]));
  M.findById = jest.fn(() => Q(null));
  M.findByIdAndUpdate = jest.fn().mockResolvedValue({});
  M.findOne = jest.fn(() => Q(null));
  M.countDocuments = jest.fn().mockResolvedValue(0);
  M.aggregate = jest.fn().mockResolvedValue([]);
  M.create = jest.fn().mockResolvedValue({ _id: 'aabb000000000000000000aa' });
  M.deleteMany = jest.fn().mockResolvedValue({});
  M.insertMany = jest.fn().mockResolvedValue([]);
  return M;
};

jest.mock('../../models/HR/EmployeeTask', () => global.__mkM());
jest.mock('../../models/HR/Housing', () => ({
  HousingUnit: global.__mkM(),
  HousingAssignment: global.__mkM(),
  TransportationRoute: global.__mkM(),
}));
jest.mock('../../models/HR/EmployeeCustody', () => global.__mkM());
jest.mock('../../models/HR/WorkPermit', () => global.__mkM());
jest.mock('../../models/HR/EmployeeReward', () => global.__mkM());
jest.mock('../../models/HR/ShiftSchedule', () => ({
  ShiftDefinition: global.__mkM(),
  ShiftAssignment: global.__mkM(),
  ShiftSwapRequest: global.__mkM(),
}));
jest.mock('../../models/employee.model', () => global.__mkM());

const EmployeeTask = require('../../models/HR/EmployeeTask');
const { HousingUnit, HousingAssignment, TransportationRoute } = require('../../models/HR/Housing');
const EmployeeCustody = require('../../models/HR/EmployeeCustody');
const WorkPermit = require('../../models/HR/WorkPermit');
const EmployeeReward = require('../../models/HR/EmployeeReward');
const {
  ShiftDefinition,
  ShiftAssignment,
  ShiftSwapRequest,
} = require('../../models/HR/ShiftSchedule');
const Employee = require('../../models/employee.model');

const service = require('../../services/employeeAffairs.phase2.service');

const ID = 'aabb000000000000000000aa';

/* Reset all model mocks to Q-based defaults after clearAllMocks */
function resetModels() {
  [
    EmployeeTask,
    HousingUnit,
    HousingAssignment,
    TransportationRoute,
    EmployeeCustody,
    WorkPermit,
    EmployeeReward,
    ShiftDefinition,
    ShiftAssignment,
    ShiftSwapRequest,
    Employee,
  ].forEach(M => {
    M.find.mockImplementation(() => Q([]));
    M.findById.mockImplementation(() => Q(null));
    M.findByIdAndUpdate.mockResolvedValue({});
    M.findOne.mockImplementation(() => Q(null));
    M.countDocuments.mockResolvedValue(0);
    M.aggregate.mockResolvedValue([]);
  });
}

/* Helper: mock document with save(), arrays pre-initialized */
const mkDoc = (o = {}) => ({
  _id: ID,
  comments: [],
  history: [],
  renewalHistory: [],
  save: jest.fn().mockImplementation(function () {
    return Promise.resolve(this);
  }),
  ...o,
});

beforeEach(() => {
  jest.clearAllMocks();
  resetModels();
});
afterAll(() => {
  delete global.__mkM;
});

describe('EmployeeAffairsPhase2Service', () => {
  // ═══════════════════════════════════════════════════════════════
  // المهام والتكليفات — Tasks
  // ═══════════════════════════════════════════════════════════════
  describe('createTask', () => {
    it('creates with generated taskNumber', async () => {
      EmployeeTask.countDocuments.mockResolvedValue(5);
      const r = await service.createTask({ title: 'مهمة', department: 'IT' });
      expect(r.taskNumber).toMatch(/^TSK-\d{4}-00006$/);
    });
  });

  describe('listTasks', () => {
    it('returns {tasks, total, page, pages}', async () => {
      EmployeeTask.find.mockReturnValue(Q([{ _id: ID }]));
      EmployeeTask.countDocuments.mockResolvedValue(1);
      const r = await service.listTasks();
      expect(r.tasks).toHaveLength(1);
      expect(r.total).toBe(1);
      expect(r.page).toBe(1);
      expect(r.pages).toBe(1);
    });

    it('applies filters', async () => {
      await service.listTasks({
        status: 'مكتملة',
        priority: 'عاجل',
        department: 'IT',
        assignedTo: ID,
        assignedBy: 'u1',
      });
      const f = EmployeeTask.find.mock.calls[0][0];
      expect(f.status).toBe('مكتملة');
      expect(f.assignedTo).toBe(ID);
    });
  });

  describe('getTaskById', () => {
    it('returns populated task via 3 populates + lean', async () => {
      EmployeeTask.findById.mockReturnValue(Q({ _id: ID, title: 'تقرير' }));
      const r = await service.getTaskById(ID);
      expect(r.title).toBe('تقرير');
    });
  });

  describe('updateTaskStatus', () => {
    it('updates status and pushes comment', async () => {
      const t = mkDoc({ status: 'جديدة', progress: 0 });
      EmployeeTask.findById.mockReturnValue(Q(t));
      await service.updateTaskStatus(ID, { status: 'قيد التنفيذ', comment: 'بدأت', userId: 'u1' });
      expect(t.status).toBe('قيد التنفيذ');
      expect(t.comments).toHaveLength(1);
    });

    it('sets progress=100 and completedDate for مكتملة', async () => {
      const t = mkDoc({ status: 'قيد التنفيذ', progress: 50 });
      EmployeeTask.findById.mockReturnValue(Q(t));
      await service.updateTaskStatus(ID, { status: 'مكتملة', userId: 'u1' });
      expect(t.progress).toBe(100);
      expect(t.completedDate).toBeInstanceOf(Date);
    });

    it('throws if not found', async () => {
      await expect(service.updateTaskStatus(ID, { status: 'x' })).rejects.toThrow(
        'المهمة غير موجودة'
      );
    });
  });

  describe('addTaskComment', () => {
    it('pushes comment', async () => {
      const t = mkDoc();
      EmployeeTask.findById.mockReturnValue(Q(t));
      await service.addTaskComment(ID, { text: 'ملاحظة', userId: 'u1' });
      expect(t.comments).toHaveLength(1);
      expect(t.comments[0].text).toBe('ملاحظة');
    });

    it('throws if not found', async () => {
      await expect(service.addTaskComment(ID, { text: 'x', userId: 'u1' })).rejects.toThrow(
        'المهمة غير موجودة'
      );
    });
  });

  describe('delegateTask', () => {
    it('delegates and logs comment', async () => {
      const t = mkDoc();
      EmployeeTask.findById.mockReturnValue(Q(t));
      await service.delegateTask(ID, { delegatedTo: 'emp2', reason: 'غياب', userId: 'u1' });
      expect(t.delegatedTo).toBe('emp2');
      expect(t.delegationReason).toBe('غياب');
      expect(t.comments).toHaveLength(1);
    });
  });

  describe('rateTask', () => {
    it('rates مكتملة task', async () => {
      const t = mkDoc({ status: 'مكتملة' });
      EmployeeTask.findById.mockReturnValue(Q(t));
      await service.rateTask(ID, { rating: 5, ratingComment: 'ممتاز', ratedBy: 'u1' });
      expect(t.rating).toBe(5);
    });

    it('throws if task not مكتملة', async () => {
      EmployeeTask.findById.mockReturnValue(Q(mkDoc({ status: 'جديدة' })));
      await expect(service.rateTask(ID, { rating: 5 })).rejects.toThrow(
        'لا يمكن تقييم مهمة غير مكتملة'
      );
    });
  });

  describe('getTaskStats', () => {
    it('returns {total, overdue, byStatus, byPriority}', async () => {
      EmployeeTask.countDocuments.mockResolvedValueOnce(20).mockResolvedValueOnce(3);
      EmployeeTask.aggregate.mockResolvedValue([]);
      const r = await service.getTaskStats();
      expect(r.total).toBe(20);
      expect(r.overdue).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // السكن والمواصلات — Housing & Transportation
  // ═══════════════════════════════════════════════════════════════
  describe('createHousingUnit', () => {
    it('creates with unitNumber', async () => {
      HousingUnit.countDocuments.mockResolvedValue(2);
      const r = await service.createHousingUnit({ building: 'B1', type: 'فردية' });
      expect(r.unitNumber).toMatch(/^HU-0003$/);
    });
  });

  describe('listHousingUnits', () => {
    it('returns {units, total}', async () => {
      HousingUnit.find.mockReturnValue(Q([{ _id: ID }]));
      HousingUnit.countDocuments.mockResolvedValue(1);
      const r = await service.listHousingUnits();
      expect(r.units).toHaveLength(1);
      expect(r.total).toBe(1);
    });
  });

  describe('assignHousing', () => {
    it('creates assignment and updates unit', async () => {
      HousingAssignment.countDocuments.mockResolvedValue(0);
      const r = await service.assignHousing({ unitId: ID, employeeId: ID });
      expect(r.assignmentNumber).toMatch(/^HA-\d{4}-0001$/);
      expect(HousingUnit.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('listHousingAssignments', () => {
    it('returns assignments', async () => {
      HousingAssignment.find.mockReturnValue(Q([{ _id: ID }]));
      const r = await service.listHousingAssignments();
      expect(r).toHaveLength(1);
    });
  });

  describe('createTransportationRoute', () => {
    it('creates with routeNumber', async () => {
      TransportationRoute.countDocuments.mockResolvedValue(0);
      const r = await service.createTransportationRoute({ routeName: 'خط 1' });
      expect(r.routeNumber).toMatch(/^TR-001$/);
    });
  });

  describe('listTransportationRoutes', () => {
    it('returns routes', async () => {
      TransportationRoute.find.mockReturnValue(Q([{ _id: ID }]));
      const r = await service.listTransportationRoutes();
      expect(r).toHaveLength(1);
    });
  });

  describe('assignEmployeeToRoute', () => {
    it('calls findByIdAndUpdate with $addToSet', async () => {
      TransportationRoute.findByIdAndUpdate.mockResolvedValue({ _id: ID });
      await service.assignEmployeeToRoute(ID, 'emp1');
      expect(TransportationRoute.findByIdAndUpdate).toHaveBeenCalledWith(
        ID,
        { $addToSet: { assignedEmployees: 'emp1' } },
        { new: true }
      );
    });
  });

  describe('getHousingStats', () => {
    it('returns {totalUnits, available, occupied, totalRoutes, activeAssignments}', async () => {
      HousingUnit.countDocuments
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(6);
      TransportationRoute.countDocuments.mockResolvedValue(3);
      HousingAssignment.countDocuments.mockResolvedValue(8);
      const r = await service.getHousingStats();
      expect(r.totalUnits).toBe(10);
      expect(r.available).toBe(4);
      expect(r.occupied).toBe(6);
      expect(r.totalRoutes).toBe(3);
      expect(r.activeAssignments).toBe(8);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // العهد والممتلكات — Custody
  // ═══════════════════════════════════════════════════════════════
  describe('createCustody', () => {
    it('creates with custodyNumber and initial history entry', async () => {
      EmployeeCustody.countDocuments.mockResolvedValue(0);
      const r = await service.createCustody({
        itemName: 'لابتوب',
        assignedBy: 'u1',
        condition: 'جيد',
      });
      expect(r.custodyNumber).toMatch(/^CUS-\d{4}-00001$/);
    });
  });

  describe('listCustodies', () => {
    it('returns {custodies, total, page}', async () => {
      EmployeeCustody.find.mockReturnValue(Q([{ _id: ID }]));
      EmployeeCustody.countDocuments.mockResolvedValue(1);
      const r = await service.listCustodies();
      expect(r.custodies).toHaveLength(1);
      expect(r.total).toBe(1);
      expect(r.page).toBe(1);
    });
  });

  describe('getCustodyById', () => {
    it('returns populated custody', async () => {
      EmployeeCustody.findById.mockReturnValue(Q({ _id: ID, itemName: 'X' }));
      const r = await service.getCustodyById(ID);
      expect(r.itemName).toBe('X');
    });
  });

  describe('returnCustody', () => {
    it('sets مرتجعة and pushes history', async () => {
      const c = mkDoc({ status: 'مسلّمة' });
      EmployeeCustody.findById.mockReturnValue(Q(c));
      await service.returnCustody(ID, { returnedBy: 'u1', condition: 'جيد', notes: 'تم' });
      expect(c.status).toBe('مرتجعة');
      expect(c.history).toHaveLength(1);
      expect(c.history[0].action).toBe('استلام');
    });

    it('throws if not found', async () => {
      await expect(service.returnCustody(ID, { returnedBy: 'u1' })).rejects.toThrow(
        'العهدة غير موجودة'
      );
    });
  });

  describe('reportCustodyIssue', () => {
    it('marks مفقودة on فقدان', async () => {
      const c = mkDoc();
      EmployeeCustody.findById.mockReturnValue(Q(c));
      await service.reportCustodyIssue(ID, { action: 'فقدان', notes: 'ضاع', performedBy: 'u1' });
      expect(c.status).toBe('مفقودة');
      expect(c.history).toHaveLength(1);
    });

    it('marks تالفة on تلف', async () => {
      const c = mkDoc();
      EmployeeCustody.findById.mockReturnValue(Q(c));
      await service.reportCustodyIssue(ID, { action: 'تلف', notes: 'كسر', performedBy: 'u1' });
      expect(c.status).toBe('تالفة');
    });

    it('marks قيد الصيانة on صيانة', async () => {
      const c = mkDoc();
      EmployeeCustody.findById.mockReturnValue(Q(c));
      await service.reportCustodyIssue(ID, { action: 'صيانة', notes: 'إصلاح', performedBy: 'u1' });
      expect(c.status).toBe('قيد الصيانة');
    });
  });

  describe('getEmployeeCustodies', () => {
    it('returns مسلّمة custodies for employee', async () => {
      EmployeeCustody.find.mockReturnValue(Q([{ _id: ID }]));
      const r = await service.getEmployeeCustodies('emp1');
      expect(r).toHaveLength(1);
    });
  });

  describe('getCustodyStats', () => {
    it('returns {total, byCategory, byStatus}', async () => {
      EmployeeCustody.countDocuments.mockResolvedValue(15);
      EmployeeCustody.aggregate.mockResolvedValue([]);
      const r = await service.getCustodyStats();
      expect(r.total).toBe(15);
      expect(r.byCategory).toEqual([]);
      expect(r.byStatus).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // تصاريح العمل — Work Permits
  // ═══════════════════════════════════════════════════════════════
  describe('createWorkPermit', () => {
    it('uses IQA prefix for إقامة', async () => {
      const r = await service.createWorkPermit({ documentType: 'إقامة', employeeId: ID });
      expect(r.recordNumber).toMatch(/^IQA-/);
    });

    it('uses WP prefix for رخصة عمل', async () => {
      const r = await service.createWorkPermit({ documentType: 'رخصة عمل', employeeId: ID });
      expect(r.recordNumber).toMatch(/^WP-/);
    });

    it('uses DOC prefix for other types', async () => {
      const r = await service.createWorkPermit({ documentType: 'أخرى', employeeId: ID });
      expect(r.recordNumber).toMatch(/^DOC-/);
    });
  });

  describe('listWorkPermits', () => {
    it('returns {permits, total, page}', async () => {
      WorkPermit.find.mockReturnValue(Q([]));
      WorkPermit.countDocuments.mockResolvedValue(0);
      const r = await service.listWorkPermits();
      expect(r.permits).toEqual([]);
      expect(r.total).toBe(0);
    });
  });

  describe('getWorkPermitById', () => {
    it('returns populated permit', async () => {
      WorkPermit.findById.mockReturnValue(Q({ _id: ID, recordNumber: 'WP-2025-00001' }));
      const r = await service.getWorkPermitById(ID);
      expect(r.recordNumber).toBe('WP-2025-00001');
    });
  });

  describe('renewWorkPermit', () => {
    it('renews and pushes history', async () => {
      const p = mkDoc({
        documentNumber: 'OLD',
        expiryDate: new Date('2025-06-01'),
        fees: {},
        status: 'قارب الانتهاء',
        renewalHistory: [],
        reminderSent: true,
      });
      WorkPermit.findById.mockReturnValue(Q(p));
      await service.renewWorkPermit(ID, { expiryDate: new Date('2027-01-01'), processedBy: 'u1' });
      expect(p.status).toBe('ساري');
      expect(p.renewalHistory).toHaveLength(1);
      expect(p.reminderSent).toBe(false);
    });

    it('throws if not found', async () => {
      await expect(service.renewWorkPermit(ID, {})).rejects.toThrow('التصريح غير موجود');
    });
  });

  describe('getExpiringPermits', () => {
    it('returns permits expiring within N days', async () => {
      WorkPermit.find.mockReturnValue(Q([{ _id: ID }]));
      const r = await service.getExpiringPermits(30);
      expect(r).toHaveLength(1);
    });
  });

  describe('getWorkPermitStats', () => {
    it('returns stats', async () => {
      WorkPermit.countDocuments
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(5);
      WorkPermit.aggregate.mockResolvedValue([]);
      const r = await service.getWorkPermitStats();
      expect(r.total).toBe(20);
      expect(r.expired).toBe(3);
      expect(r.expiringSoon).toBe(5);
      expect(r.totalCost).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // المكافآت — Rewards
  // ═══════════════════════════════════════════════════════════════
  describe('createReward', () => {
    it('creates with rewardNumber', async () => {
      const r = await service.createReward({ type: 'أداء', amount: 1000 });
      expect(r.rewardNumber).toMatch(/^RWD-\d{4}-00001$/);
    });
  });

  describe('listRewards', () => {
    it('returns {rewards, total, page}', async () => {
      EmployeeReward.find.mockReturnValue(Q([]));
      EmployeeReward.countDocuments.mockResolvedValue(0);
      const r = await service.listRewards();
      expect(r.rewards).toEqual([]);
    });
  });

  describe('getRewardById', () => {
    it('returns populated reward', async () => {
      EmployeeReward.findById.mockReturnValue(Q({ _id: ID, type: 'أداء' }));
      const r = await service.getRewardById(ID);
      expect(r.type).toBe('أداء');
    });
  });

  describe('approveReward', () => {
    it('approves → status معتمد', async () => {
      const rew = mkDoc();
      EmployeeReward.findById.mockReturnValue(Q(rew));
      await service.approveReward(ID, { approved: true, approvedBy: 'u1' });
      expect(rew.status).toBe('معتمد');
      expect(rew.approvalDate).toBeInstanceOf(Date);
    });

    it('rejects → status مرفوض', async () => {
      const rew = mkDoc();
      EmployeeReward.findById.mockReturnValue(Q(rew));
      await service.approveReward(ID, {
        approved: false,
        approvedBy: 'u1',
        rejectionReason: 'لا يستحق',
      });
      expect(rew.status).toBe('مرفوض');
      expect(rew.rejectionReason).toBe('لا يستحق');
    });

    it('throws if not found', async () => {
      await expect(service.approveReward(ID, {})).rejects.toThrow('المكافأة غير موجودة');
    });
  });

  describe('disburseReward', () => {
    it('disburses approved reward → تم الصرف', async () => {
      const rew = mkDoc({ status: 'معتمد' });
      EmployeeReward.findById.mockReturnValue(Q(rew));
      await service.disburseReward(ID, { disbursedBy: 'u1', paymentMethod: 'تحويل' });
      expect(rew.status).toBe('تم الصرف');
      expect(rew.disbursementDate).toBeInstanceOf(Date);
    });

    it('throws if not approved', async () => {
      EmployeeReward.findById.mockReturnValue(Q(mkDoc({ status: 'بانتظار' })));
      await expect(service.disburseReward(ID, { disbursedBy: 'u1' })).rejects.toThrow(
        'المكافأة غير معتمدة'
      );
    });
  });

  describe('getEmployeeRewardPoints', () => {
    it('returns totalPoints from aggregate', async () => {
      EmployeeReward.aggregate.mockResolvedValue([{ _id: null, totalPoints: 500 }]);
      const r = await service.getEmployeeRewardPoints(ID);
      expect(r.totalPoints).toBe(500);
    });

    it('returns 0 when no results', async () => {
      EmployeeReward.aggregate.mockResolvedValue([]);
      const r = await service.getEmployeeRewardPoints(ID);
      expect(r.totalPoints).toBe(0);
    });
  });

  describe('getRewardStats', () => {
    it('returns stats structure', async () => {
      EmployeeReward.countDocuments.mockResolvedValue(8);
      EmployeeReward.aggregate.mockResolvedValue([]);
      const r = await service.getRewardStats();
      expect(r.total).toBe(8);
      expect(r.totalDisbursed).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // الورديات — Shifts
  // ═══════════════════════════════════════════════════════════════
  describe('createShiftDefinition', () => {
    it('creates and saves', async () => {
      const r = await service.createShiftDefinition({
        name: 'صباحي',
        shiftCode: 'M',
        startTime: '08:00',
        endTime: '16:00',
      });
      expect(r.name).toBe('صباحي');
    });
  });

  describe('listShiftDefinitions', () => {
    it('returns active shifts', async () => {
      ShiftDefinition.find.mockReturnValue(Q([{ _id: ID }]));
      const r = await service.listShiftDefinitions();
      expect(r).toHaveLength(1);
    });
  });

  describe('createShiftAssignment', () => {
    it('creates and saves', async () => {
      const r = await service.createShiftAssignment({
        employeeId: ID,
        shiftId: ID,
        date: '2026-04-10',
      });
      expect(r).toBeDefined();
    });
  });

  describe('bulkCreateShiftAssignments', () => {
    it('inserts many', async () => {
      ShiftAssignment.insertMany.mockResolvedValue([{ _id: ID }]);
      const r = await service.bulkCreateShiftAssignments([{ employeeId: ID }]);
      expect(r).toHaveLength(1);
    });
  });

  describe('getEmployeeSchedule', () => {
    it('returns assignments in range', async () => {
      ShiftAssignment.find.mockReturnValue(Q([{ _id: ID }]));
      const r = await service.getEmployeeSchedule(ID, '2026-04-01', '2026-04-30');
      expect(r).toHaveLength(1);
    });
  });

  describe('getDepartmentSchedule', () => {
    it('returns department schedule for date', async () => {
      ShiftAssignment.find.mockReturnValue(Q([{ _id: ID }]));
      const r = await service.getDepartmentSchedule('IT', '2026-04-10');
      expect(r).toHaveLength(1);
    });
  });

  describe('recordShiftAttendance', () => {
    it('records checkIn and detects lateness', async () => {
      const a = mkDoc({ shiftId: { startTime: '08:00', graceMinutesLate: 15 }, status: 'مجدول' });
      ShiftAssignment.findById.mockReturnValue(Q(a));
      await service.recordShiftAttendance(ID, { checkIn: '2026-04-10T08:30:00Z' });
      expect(a.status).toBe('حاضر');
      expect(a.actualCheckIn).toBeInstanceOf(Date);
    });

    it('records checkOut and calculates workedHours', async () => {
      const checkIn = new Date('2026-04-10T08:00:00Z');
      const a = mkDoc({ shiftId: { startTime: '08:00' }, actualCheckIn: checkIn, status: 'حاضر' });
      ShiftAssignment.findById.mockReturnValue(Q(a));
      await service.recordShiftAttendance(ID, { checkOut: '2026-04-10T16:00:00Z' });
      expect(a.actualCheckOut).toBeInstanceOf(Date);
      expect(a.workedHours).toBe(8);
    });

    it('throws if not found', async () => {
      await expect(service.recordShiftAttendance(ID, { checkIn: new Date() })).rejects.toThrow(
        'لا يوجد جدولة'
      );
    });
  });

  describe('createShiftSwapRequest', () => {
    it('creates with requestNumber', async () => {
      ShiftSwapRequest.countDocuments.mockResolvedValue(0);
      const r = await service.createShiftSwapRequest({ requesterId: ID, targetId: ID });
      expect(r.requestNumber).toMatch(/^SWP-\d{4}-0001$/);
    });
  });

  describe('approveShiftSwap', () => {
    it('employee step — sets targetEmployeeApproval', async () => {
      const swap = mkDoc({ status: 'جديد' });
      ShiftSwapRequest.findById.mockReturnValue(Q(swap));
      await service.approveShiftSwap(ID, { step: 'employee', approved: true });
      expect(swap.targetEmployeeApproval).toBe(true);
      expect(swap.status).toBe('موافقة الموظف');
    });

    it('manager step — executes shift swap', async () => {
      const swap = mkDoc({ requesterAssignmentId: 'a1', targetAssignmentId: 'a2' });
      ShiftSwapRequest.findById.mockReturnValue(Q(swap));
      const a1 = mkDoc({ shiftId: 'shift1' });
      const a2 = mkDoc({ shiftId: 'shift2' });
      ShiftAssignment.findById.mockResolvedValueOnce(a1).mockResolvedValueOnce(a2);
      await service.approveShiftSwap(ID, { step: 'manager', approved: true, approvedBy: 'u1' });
      expect(swap.status).toBe('معتمد');
      expect(a1.shiftId).toBe('shift2');
      expect(a2.shiftId).toBe('shift1');
    });

    it('manager rejection — sets مرفوض', async () => {
      const swap = mkDoc();
      ShiftSwapRequest.findById.mockReturnValue(Q(swap));
      await service.approveShiftSwap(ID, { step: 'manager', approved: false, approvedBy: 'u1' });
      expect(swap.status).toBe('مرفوض');
    });

    it('throws if not found', async () => {
      await expect(
        service.approveShiftSwap(ID, { step: 'employee', approved: true })
      ).rejects.toThrow('طلب التبديل غير موجود');
    });
  });

  describe('getShiftStats', () => {
    it('returns {todayStats, shiftTypes, totalDefinitions}', async () => {
      ShiftAssignment.aggregate.mockResolvedValue([]);
      ShiftDefinition.countDocuments.mockResolvedValue(4);
      const r = await service.getShiftStats();
      expect(r.totalDefinitions).toBe(4);
      expect(r.todayStats).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Dashboard
  // ═══════════════════════════════════════════════════════════════
  describe('getPhase2Dashboard', () => {
    it('aggregates all domain stats', async () => {
      const r = await service.getPhase2Dashboard();
      expect(r.tasks).toBeDefined();
      expect(r.housing).toBeDefined();
      expect(r.custody).toBeDefined();
      expect(r.permits).toBeDefined();
      expect(r.rewards).toBeDefined();
      expect(r.shifts).toBeDefined();
    });
  });
});
