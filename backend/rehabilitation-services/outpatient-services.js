/* eslint-disable no-unused-vars */
/**
 * Outpatient Rehabilitation Services
 * خدمات التأهيل الخارجية (غير المقيمة)
 */

class OutpatientServices {
  constructor() {
    this.appointments = new Map();
    this.schedules = new Map();
    this.sessions = new Map();
    this.homePrograms = new Map();
  }

  /**
   * جدولة موعد
   */
  async scheduleAppointment(appointmentData) {
    const appointment = {
      id: Date.now().toString(),
      beneficiaryId: appointmentData.beneficiaryId,
      beneficiaryName: appointmentData.beneficiaryName,
      serviceType: appointmentData.serviceType, // physical_therapy, occupational_therapy, speech_therapy, etc.
      therapistId: appointmentData.therapistId,
      therapistName: appointmentData.therapistName,
      dateTime: appointmentData.dateTime,
      duration: appointmentData.duration || 45,
      type: appointmentData.type || 'in_person', // in_person, telehealth, home_visit
      location: appointmentData.location,
      status: 'scheduled',
      notes: appointmentData.notes || '',
      reminders: {
        sent24h: false,
        sent2h: false,
      },
      checkIn: null,
      session: null,
      createdAt: new Date(),
    };

    this.appointments.set(appointment.id, appointment);
    return appointment;
  }

  /**
   * تسجيل حضور
   */
  async checkIn(appointmentId, checkInData) {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment) throw new Error('الموعد غير موجود');

    appointment.checkIn = {
      time: new Date(),
      method: checkInData.method, // kiosk, reception, self
      notes: checkInData.notes || '',
    };
    appointment.status = 'checked_in';

    return appointment;
  }

  /**
   * بدء الجلسة
   */
  async startSession(appointmentId, sessionData) {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment) throw new Error('الموعد غير موجود');

    const session = {
      id: Date.now().toString(),
      appointmentId,
      beneficiaryId: appointment.beneficiaryId,
      therapistId: appointment.therapistId,
      serviceType: appointment.serviceType,
      startTime: new Date(),
      endTime: null,
      objectives: sessionData.objectives || [],
      interventions: [],
      exercises: [],
      measurements: {},
      progress: {
        before: sessionData.beforeStatus || {},
        after: null,
      },
      notes: '',
      recommendations: '',
      homeProgram: null,
      status: 'in_progress',
    };

    appointment.session = session.id;
    appointment.status = 'in_session';
    this.sessions.set(session.id, session);

    return session;
  }

  /**
   * إضافة تدخل للجلسة
   */
  async addIntervention(sessionId, interventionData) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('الجلسة غير موجودة');

    const intervention = {
      id: Date.now().toString(),
      type: interventionData.type,
      description: interventionData.description,
      duration: interventionData.duration,
      response: interventionData.response, // excellent, good, fair, poor
      notes: interventionData.notes || '',
    };

    session.interventions.push(intervention);
    return intervention;
  }

  /**
   * إنهاء الجلسة
   */
  async endSession(sessionId, endData) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('الجلسة غير موجودة');

    session.endTime = new Date();
    session.progress.after = endData.afterStatus || {};
    session.notes = endData.notes || '';
    session.recommendations = endData.recommendations || '';
    session.status = 'completed';

    // حساب المدة الفعلية
    session.actualDuration = Math.round((session.endTime - session.startTime) / 60000);

    return session;
  }

  /**
   * إنشاء برنامج منزلي
   */
  async createHomeProgram(beneficiaryId, programData) {
    const program = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),
      createdBy: programData.createdBy,
      diagnosis: programData.diagnosis,
      goals: programData.goals || [],
      exercises: programData.exercises.map(ex => ({
        id: Date.now().toString() + Math.random(),
        name: ex.name,
        nameAr: ex.nameAr,
        description: ex.description,
        instructions: ex.instructions,
        frequency: ex.frequency, // times per day
        duration: ex.duration, // minutes
        sets: ex.sets,
        reps: ex.reps,
        restPeriod: ex.restPeriod,
        precautions: ex.precautions || [],
        videoUrl: ex.videoUrl || null,
        imageUrl: ex.imageUrl || null,
        progress: [],
      })),
      precautions: programData.precautions || [],
      schedule: {
        startDate: programData.startDate || new Date(),
        endDate: programData.endDate,
        reviewDate: programData.reviewDate,
      },
      adherenceTracking: {
        totalAssigned: 0,
        totalCompleted: 0,
        adherenceRate: 0,
      },
      status: 'active',
      notes: [],
    };

    this.homePrograms.set(program.id, program);
    return program;
  }

  /**
   * تسجيل أداء التمارين المنزلية
   */
  async logExerciseProgress(programId, exerciseId, progressData) {
    const program = this.homePrograms.get(programId);
    if (!program) throw new Error('البرنامج غير موجود');

    const exercise = program.exercises.find(e => e.id === exerciseId);
    if (!exercise) throw new Error('التمرين غير موجود');

    const progress = {
      date: new Date(),
      completed: progressData.completed,
      difficulty: progressData.difficulty, // easy, moderate, hard, very_hard
      painLevel: progressData.painLevel || 0,
      notes: progressData.notes || '',
      duration: progressData.duration,
    };

    exercise.progress.push(progress);

    // تحديث معدل الالتزام
    program.adherenceTracking.totalAssigned++;
    if (progressData.completed) {
      program.adherenceTracking.totalCompleted++;
    }
    program.adherenceTracking.adherenceRate =
      (program.adherenceTracking.totalCompleted / program.adherenceTracking.totalAssigned) * 100;

    return progress;
  }

  /**
   * جدولة المواعيد المتكررة
   */
  async scheduleRecurringAppointments(beneficiaryId, scheduleData) {
    const schedule = {
      id: Date.now().toString(),
      beneficiaryId,
      serviceType: scheduleData.serviceType,
      therapistId: scheduleData.therapistId,
      frequency: scheduleData.frequency, // weekly, biweekly, monthly
      daysOfWeek: scheduleData.daysOfWeek, // [0,1,2,3,4,5,6]
      time: scheduleData.time,
      startDate: scheduleData.startDate,
      endDate: scheduleData.endDate,
      location: scheduleData.location,
      exceptions: [], // dates to skip
      createdAppointments: [],
      status: 'active',
    };

    // توليد المواعيد
    const appointments = this._generateRecurringAppointments(schedule);
    schedule.createdAppointments = appointments.map(a => a.id);

    appointments.forEach(apt => this.appointments.set(apt.id, apt));
    this.schedules.set(schedule.id, schedule);

    return schedule;
  }

  /**
   * توليد المواعيد المتكررة
   */
  _generateRecurringAppointments(schedule) {
    const appointments = [];
    const start = new Date(schedule.startDate);
    const end = schedule.endDate
      ? new Date(schedule.endDate)
      : new Date(start.setMonth(start.getMonth() + 3));

    const current = new Date(start);
    while (current <= end) {
      if (schedule.daysOfWeek.includes(current.getDay())) {
        appointments.push({
          id: Date.now().toString() + Math.random(),
          beneficiaryId: schedule.beneficiaryId,
          serviceType: schedule.serviceType,
          therapistId: schedule.therapistId,
          dateTime: new Date(current),
          type: 'in_person',
          location: schedule.location,
          status: 'scheduled',
          recurringScheduleId: schedule.id,
        });
      }
      current.setDate(current.getDate() + 1);
    }

    return appointments;
  }

  /**
   * تقرير المواعيد
   */
  async generateAppointmentReport(period = 'monthly') {
    const appointments = Array.from(this.appointments.values());
    const now = new Date();
    const startDate = new Date(now.setMonth(now.getMonth() - 1));

    const periodAppointments = appointments.filter(a => new Date(a.dateTime) >= startDate);

    const report = {
      period,
      generatedAt: new Date(),
      summary: {
        total: periodAppointments.length,
        completed: periodAppointments.filter(a => a.status === 'completed').length,
        cancelled: periodAppointments.filter(a => a.status === 'cancelled').length,
        noShow: periodAppointments.filter(a => a.status === 'no_show').length,
        upcoming: periodAppointments.filter(a => a.status === 'scheduled').length,
      },
      byServiceType: {},
      byTherapist: {},
      byType: {
        in_person: periodAppointments.filter(a => a.type === 'in_person').length,
        telehealth: periodAppointments.filter(a => a.type === 'telehealth').length,
        home_visit: periodAppointments.filter(a => a.type === 'home_visit').length,
      },
      adherence: 0,
      recommendations: [],
    };

    // حساب معدل الحضور
    const totalAttended = report.summary.completed;
    const totalScheduled = report.summary.total - report.summary.upcoming;
    report.adherence = totalScheduled > 0 ? (totalAttended / totalScheduled) * 100 : 0;

    return report;
  }
}

module.exports = { OutpatientServices };
