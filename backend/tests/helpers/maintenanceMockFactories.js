/* eslint-disable no-unused-vars */
function createVehicleModelMock() {
  return {
    findById: jest.fn().mockResolvedValue({
      _id: 'VEH-DEMO-001',
      registrationNumber: 'ABC-123',
      plateNumber: 'XYZ-789',
      basicInfo: { make: 'Toyota', model: 'Camry', year: 2024 },
    }),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({}),
  };
}

function createMaintenanceScheduleModelMock() {
  const mockSchedule = {
    scheduleId: 'SCH-001',
    _id: 'MOCK-SCHEDULE-001',
    vehicle: 'VEH-DEMO-001',
    status: 'نشط',
    save: jest.fn().mockResolvedValue(true),
    isDue: false,
    daysUntilDue: 5,
  };

  return class MaintenanceSchedule {
    constructor(data) {
      return { ...mockSchedule, ...data };
    }
    static find = jest.fn().mockReturnThis();
    static populate = jest.fn().mockResolvedValue([mockSchedule]);
    static sort = jest.fn().mockResolvedValue([mockSchedule]);
    static findById = jest.fn().mockResolvedValue(mockSchedule);
    static create = jest.fn().mockResolvedValue(mockSchedule);
  };
}

function createMaintenanceTaskModelMock() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
  };
}

function createMaintenanceProviderModelMock() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue({}),
  };
}

function createMaintenanceIssueModelMock() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
  };
}

function createMaintenanceInventoryModelMock() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue({}),
  };
}

function createAdvancedMaintenanceServiceMock() {
  return {
    createSmartMaintenanceSchedule: jest.fn(),
    getActiveSchedules: jest.fn(),
    createTasksFromSchedule: jest.fn(),
    getUpcomingTasks: jest.fn(),
    updateTaskProgress: jest.fn(),
    reportMaintenanceIssue: jest.fn(),
    autodiagnosisIssue: jest.fn(),
    checkInventoryCriticalLevels: jest.fn(),
  };
}

function createMaintenanceAIServiceMock() {
  return {
    predictMaintenanceNeeds: jest.fn(),
    detectAnomalies: jest.fn(),
    getSmartRecommendations: jest.fn(),
  };
}

function createMaintenanceAnalyticsServiceMock() {
  return {
    generateComprehensiveReport: jest.fn(),
    getProviderPerformanceReport: jest.fn(),
    getInventoryHealthReport: jest.fn(),
    getComplianceReport: jest.fn(),
  };
}

module.exports = {
  createVehicleModelMock,
  createMaintenanceScheduleModelMock,
  createMaintenanceTaskModelMock,
  createMaintenanceProviderModelMock,
  createMaintenanceIssueModelMock,
  createMaintenanceInventoryModelMock,
  createAdvancedMaintenanceServiceMock,
  createMaintenanceAIServiceMock,
  createMaintenanceAnalyticsServiceMock,
};
