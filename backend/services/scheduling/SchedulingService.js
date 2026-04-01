const Appointment = require('../../models/scheduling/Appointment');
const TherapistAvailability = require('../../models/scheduling/TherapistAvailability');
const AppointmentRecurrence = require('../../models/scheduling/AppointmentRecurrence');
const RoomBooking = require('../../models/scheduling/RoomBooking');
const WaitlistEntry = require('../../models/scheduling/WaitlistEntry');

// ===== خدمة كشف تعارضات المواعيد =====
class ConflictDetectionService {
  /**
   * فحص 7 أنواع من التعارضات
   */
  static async checkConflicts(data) {
    const {
      therapist_id,
      beneficiary_id,
      room_id,
      branch_id,
      appointment_date,
      start_time,
      end_time,
      duration_minutes,
      exclude_id,
    } = data;
    const conflicts = [];

    const date = new Date(appointment_date);
    const dateStr = date.toISOString().split('T')[0];

    const baseQuery = {
      appointment_date: {
        $gte: new Date(dateStr),
        $lt: new Date(new Date(dateStr).getTime() + 86400000),
      },
      status: { $nin: ['cancelled', 'no_show'] },
      deleted_at: null,
    };
    if (exclude_id) baseQuery._id = { $ne: exclude_id };

    // 1. تعارض المعالج
    const therapistConflict = await Appointment.findOne({
      ...baseQuery,
      therapist_id,
      $or: [{ start_time: { $lt: end_time }, end_time: { $gt: start_time } }],
    });
    if (therapistConflict) {
      conflicts.push({
        type: 'therapist_conflict',
        message: `المعالج لديه موعد آخر من ${therapistConflict.start_time} إلى ${therapistConflict.end_time}`,
        conflicting_appointment: therapistConflict._id,
      });
    }

    // 2. تعارض المستفيد
    const beneficiaryConflict = await Appointment.findOne({
      ...baseQuery,
      beneficiary_id,
      $or: [{ start_time: { $lt: end_time }, end_time: { $gt: start_time } }],
    });
    if (beneficiaryConflict) {
      conflicts.push({
        type: 'beneficiary_conflict',
        message: `المستفيد لديه موعد آخر في نفس الوقت`,
        conflicting_appointment: beneficiaryConflict._id,
      });
    }

    // 3. تعارض الغرفة
    if (room_id) {
      const roomConflict = await Appointment.findOne({
        ...baseQuery,
        room_id,
        $or: [{ start_time: { $lt: end_time }, end_time: { $gt: start_time } }],
      });
      if (roomConflict) {
        conflicts.push({
          type: 'room_conflict',
          message: `الغرفة محجوزة من ${roomConflict.start_time} إلى ${roomConflict.end_time}`,
          conflicting_appointment: roomConflict._id,
        });
      }
    }

    // 4. تجاوز الحد اليومي للمعالج
    const dayAppointments = await Appointment.countDocuments({
      ...baseQuery,
      therapist_id,
    });
    const availability = await TherapistAvailability.findOne({ therapist_id, deleted_at: null });
    if (availability && dayAppointments >= availability.max_appointments_per_day) {
      conflicts.push({
        type: 'daily_limit_exceeded',
        message: `المعالج وصل للحد الأقصى من المواعيد اليومية (${availability.max_appointments_per_day})`,
      });
    }

    // 5. تجاوز الـ Caseload
    if (availability && availability.current_caseload >= availability.max_caseload) {
      const existingRelation = await Appointment.findOne({
        therapist_id,
        beneficiary_id,
        status: { $nin: ['cancelled'] },
        deleted_at: null,
      });
      if (!existingRelation) {
        conflicts.push({
          type: 'caseload_exceeded',
          message: `المعالج وصل للحد الأقصى من المستفيدين (${availability.max_caseload})`,
        });
      }
    }

    // 6. عدم توفر المعالج في هذا اليوم
    if (availability) {
      const dayName = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ][date.getDay()];
      const daySchedule = availability.weekly_schedule?.[dayName];
      if (daySchedule && daySchedule.length > 0) {
        const isInSlot = daySchedule.some(
          slot => slot.is_available && slot.start_time <= start_time && slot.end_time >= end_time
        );
        if (!isInSlot) {
          conflicts.push({
            type: 'outside_availability',
            message: `الوقت المحدد خارج أوقات توفر المعالج`,
          });
        }
      }
    }

    // 7. إجازة معتمدة
    const Leave = require('../../models/hr/Leave');
    const leaveConflict = await Leave.findOne({
      employee_id: therapist_id,
      status: 'approved',
      start_date: { $lte: date },
      end_date: { $gte: date },
      deleted_at: null,
    });
    if (leaveConflict) {
      conflicts.push({
        type: 'therapist_on_leave',
        message: `المعالج في إجازة معتمدة في هذا اليوم`,
      });
    }

    return conflicts;
  }

  static async canSchedule(data) {
    const conflicts = await ConflictDetectionService.checkConflicts(data);
    return {
      can_schedule: conflicts.length === 0,
      conflicts,
    };
  }
}

// ===== خدمة قائمة الانتظار =====
class WaitlistService {
  /**
   * إضافة مستفيد لقائمة الانتظار مع حساب الأولوية
   */
  static async addToWaitlist(data) {
    const existing = await WaitlistEntry.findOne({
      beneficiary_id: data.beneficiary_id,
      service_type: data.service_type,
      branch_id: data.branch_id,
      status: 'waiting',
      deleted_at: null,
    });
    if (existing) throw new Error('المستفيد موجود مسبقاً في قائمة الانتظار لنفس الخدمة');
    return WaitlistEntry.create(data);
  }

  /**
   * الحصول على قائمة الانتظار مرتبة حسب الأولوية
   */
  static async getWaitlist(branchId, serviceType) {
    const entries = await WaitlistEntry.find({
      branch_id: branchId,
      service_type: serviceType,
      status: 'waiting',
      deleted_at: null,
    })
      .populate('beneficiary_id', 'full_name_ar file_number date_of_birth disability_severity')
      .sort({ priority_score: -1, registration_date: 1 });

    // تحديث ترتيب الأولوية
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].priority_rank !== i + 1) {
        await WaitlistEntry.findByIdAndUpdate(entries[i]._id, { priority_rank: i + 1 });
        entries[i].priority_rank = i + 1;
      }
    }
    return entries;
  }

  /**
   * جدولة موعد من قائمة الانتظار تلقائياً
   */
  static async scheduleFromWaitlist(waitlistEntryId, appointmentData, scheduledBy) {
    const entry = await WaitlistEntry.findById(waitlistEntryId);
    if (!entry || entry.status !== 'waiting') throw new Error('المدخل غير موجود أو ليس في انتظار');

    // فحص التعارضات
    const { can_schedule, conflicts } = await ConflictDetectionService.canSchedule({
      ...appointmentData,
      beneficiary_id: entry.beneficiary_id,
    });

    if (!can_schedule) {
      return { scheduled: false, conflicts };
    }

    // إنشاء الموعد
    const appointment = await Appointment.create({
      ...appointmentData,
      beneficiary_id: entry.beneficiary_id,
      created_by: scheduledBy,
    });

    // تحديث حالة قائمة الانتظار
    entry.status = 'scheduled';
    entry.scheduled_appointment_id = appointment._id;
    entry.notified_at = new Date();
    await entry.save();

    return { scheduled: true, appointment };
  }

  /**
   * توليد مواعيد متكررة
   */
  static async generateRecurringAppointments(recurrenceId, weeksAhead = 4) {
    const recurrence = await AppointmentRecurrence.findById(recurrenceId);
    if (!recurrence || recurrence.status !== 'active')
      throw new Error('جدول التكرار غير موجود أو غير نشط');

    const generated = [];
    const today = new Date();
    const endDate =
      recurrence.recurrence_end || new Date(today.getTime() + weeksAhead * 7 * 86400000);
    const lastGenerated = recurrence.last_generated_date || recurrence.recurrence_start;

    const current = new Date(lastGenerated);
    current.setDate(current.getDate() + 1); // ابدأ من اليوم التالي للآخر

    const dayMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    while (current <= endDate) {
      const dayName = Object.keys(dayMap).find(k => dayMap[k] === current.getDay());
      if (recurrence.days_of_week.includes(dayName)) {
        // فحص التعارضات
        const conflictCheck = await ConflictDetectionService.canSchedule({
          therapist_id: recurrence.therapist_id,
          beneficiary_id: recurrence.beneficiary_id,
          room_id: recurrence.room_id,
          branch_id: recurrence.branch_id,
          appointment_date: new Date(current),
          start_time: recurrence.start_time,
          end_time: recurrence.end_time,
          duration_minutes: recurrence.duration_minutes,
        });

        if (conflictCheck.can_schedule) {
          const appt = await Appointment.create({
            beneficiary_id: recurrence.beneficiary_id,
            therapist_id: recurrence.therapist_id,
            branch_id: recurrence.branch_id,
            room_id: recurrence.room_id,
            service_type: recurrence.service_type,
            appointment_date: new Date(current),
            start_time: recurrence.start_time,
            end_time: recurrence.end_time,
            duration_minutes: recurrence.duration_minutes,
            recurrence_id: recurrence._id,
            plan_id: recurrence.plan_id,
            status: 'scheduled',
            created_by: recurrence.created_by,
          });
          generated.push(appt);
        }
      }
      current.setDate(current.getDate() + 1);
    }

    // تحديث سجل التكرار
    recurrence.sessions_generated += generated.length;
    recurrence.last_generated_date = new Date();
    if (recurrence.sessions_count && recurrence.sessions_generated >= recurrence.sessions_count) {
      recurrence.status = 'completed';
    }
    await recurrence.save();

    return { generated_count: generated.length, appointments: generated };
  }
}

module.exports = { ConflictDetectionService, WaitlistService };
