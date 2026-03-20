/**
 * 📅 نظام المواعيد الذكي — Smart Scheduling & Appointment System
 * الإصدار 6.0.0
 * يشمل: جدولة ذكية، كشف التعارضات، التذكيرات، إدارة قوائم الانتظار
 */

class SmartSchedulingService {
  constructor() {
    this.appointments = new Map();
    this.therapistSchedules = new Map();
    this.waitlists = new Map();
    this.reminders = new Map();
    this.rooms = new Map();
    this._initDefaultRooms();
  }

  _initDefaultRooms() {
    const rooms = [
      {
        id: 'room-1',
        name: 'غرفة العلاج الطبيعي',
        capacity: 1,
        equipment: ['سرير علاجي', 'معدات تمارين'],
        available: true,
      },
      {
        id: 'room-2',
        name: 'غرفة العلاج الوظيفي',
        capacity: 1,
        equipment: ['أدوات حركية دقيقة', 'معدات حسية'],
        available: true,
      },
      {
        id: 'room-3',
        name: 'غرفة علاج النطق',
        capacity: 1,
        equipment: ['مرآة', 'أجهزة صوتية', 'بطاقات مصورة'],
        available: true,
      },
      {
        id: 'room-4',
        name: 'غرفة التأهيل النفسي',
        capacity: 2,
        equipment: ['كراسي مريحة', 'ألعاب'],
        available: true,
      },
      {
        id: 'room-5',
        name: 'صالة التكامل الحسي',
        capacity: 3,
        equipment: ['أرجوحة', 'ترامبولين', 'حمام كرات'],
        available: true,
      },
      {
        id: 'room-6',
        name: 'غرفة الواقع الافتراضي',
        capacity: 1,
        equipment: ['نظارات VR', 'أجهزة استشعار حركة'],
        available: true,
      },
      {
        id: 'room-7',
        name: 'غرفة متعددة الأغراض',
        capacity: 5,
        equipment: ['طاولات', 'شاشة عرض'],
        available: true,
      },
    ];
    rooms.forEach(r => this.rooms.set(r.id, r));
  }

  /* ─── إنشاء موعد ─── */
  async createAppointment(appointmentData) {
    const conflicts = await this._checkConflicts(appointmentData);
    if (conflicts.length > 0) {
      return {
        success: false,
        conflicts,
        suggestions: await this._suggestAlternatives(appointmentData),
      };
    }

    const appointment = {
      id: `apt-${Date.now()}`,
      beneficiaryId: appointmentData.beneficiaryId,
      therapistId: appointmentData.therapistId,
      serviceType: appointmentData.serviceType,
      roomId: appointmentData.roomId || (await this._autoAssignRoom(appointmentData)),
      date: appointmentData.date,
      startTime: appointmentData.startTime,
      endTime:
        appointmentData.endTime ||
        this._calcEndTime(appointmentData.startTime, appointmentData.duration || 45),
      duration: appointmentData.duration || 45,
      status: 'scheduled',
      priority: appointmentData.priority || 'normal',
      recurrence: appointmentData.recurrence || null, // weekly / biweekly / monthly / null
      notes: appointmentData.notes || '',
      reminders: this._createReminders(appointmentData),
      createdAt: new Date(),
    };

    this.appointments.set(appointment.id, appointment);

    // إنشاء المواعيد المتكررة
    if (appointment.recurrence) {
      await this._createRecurringAppointments(appointment);
    }

    return { success: true, appointment };
  }

  /* ─── تحديث موعد ─── */
  async updateAppointment(appointmentId, updates) {
    const apt = this.appointments.get(appointmentId);
    if (!apt) return { success: false, error: 'الموعد غير موجود' };

    if (updates.date || updates.startTime || updates.endTime) {
      const conflicts = await this._checkConflicts({ ...apt, ...updates });
      if (conflicts.length > 0) return { success: false, conflicts };
    }

    Object.assign(apt, updates, { updatedAt: new Date() });
    this.appointments.set(appointmentId, apt);
    return { success: true, appointment: apt };
  }

  /* ─── إلغاء موعد ─── */
  async cancelAppointment(appointmentId, reason) {
    const apt = this.appointments.get(appointmentId);
    if (!apt) return { success: false, error: 'الموعد غير موجود' };

    apt.status = 'cancelled';
    apt.cancellationReason = reason || '';
    apt.cancelledAt = new Date();
    this.appointments.set(appointmentId, apt);

    // إعادة الغرفة والمعالج للمتاحين
    const waitlist = this.waitlists.get(apt.serviceType) || [];
    if (waitlist.length > 0) {
      return { success: true, waitlistNotified: waitlist[0].beneficiaryId };
    }
    return { success: true };
  }

  /* ─── جدول المعالج ─── */
  async getTherapistSchedule(therapistId, dateRange) {
    const allApts = Array.from(this.appointments.values()).filter(
      a =>
        a.therapistId === therapistId &&
        a.status !== 'cancelled' &&
        a.date >= (dateRange?.from || '2020-01-01') &&
        a.date <= (dateRange?.to || '2099-12-31')
    );

    return {
      therapistId,
      totalAppointments: allApts.length,
      appointments: allApts.sort((a, b) =>
        `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
      ),
      dailyLoad: this._calcDailyLoad(allApts),
      availableSlots: await this._getAvailableSlots(therapistId, dateRange),
    };
  }

  /* ─── جدول المستفيد ─── */
  async getBeneficiarySchedule(beneficiaryId, dateRange) {
    const allApts = Array.from(this.appointments.values()).filter(
      a =>
        a.beneficiaryId === beneficiaryId &&
        a.status !== 'cancelled' &&
        a.date >= (dateRange?.from || '2020-01-01') &&
        a.date <= (dateRange?.to || '2099-12-31')
    );

    return {
      beneficiaryId,
      totalAppointments: allApts.length,
      upcoming: allApts.filter(a => a.date >= new Date().toISOString().slice(0, 10)),
      past: allApts.filter(a => a.date < new Date().toISOString().slice(0, 10)),
    };
  }

  /* ─── قائمة الانتظار ─── */
  async addToWaitlist(beneficiaryId, serviceType, preferences) {
    const entry = {
      id: `wl-${Date.now()}`,
      beneficiaryId,
      serviceType,
      preferredDays: preferences?.preferredDays || [],
      preferredTimes: preferences?.preferredTimes || [],
      priority: preferences?.priority || 'normal',
      addedAt: new Date(),
    };

    const list = this.waitlists.get(serviceType) || [];
    list.push(entry);
    list.sort((a, b) => (a.priority === 'urgent' ? -1 : 1) - (b.priority === 'urgent' ? -1 : 1));
    this.waitlists.set(serviceType, list);
    return { success: true, position: list.indexOf(entry) + 1, entry };
  }

  /* ─── احصائيات المواعيد ─── */
  async getSchedulingStats(dateRange) {
    const all = Array.from(this.appointments.values());
    const filtered = dateRange
      ? all.filter(a => a.date >= (dateRange.from || '') && a.date <= (dateRange.to || '9'))
      : all;

    const counts = { scheduled: 0, completed: 0, cancelled: 0, noShow: 0 };
    filtered.forEach(a => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });

    const byService = {};
    filtered.forEach(a => {
      if (!byService[a.serviceType]) byService[a.serviceType] = 0;
      byService[a.serviceType]++;
    });

    return {
      total: filtered.length,
      ...counts,
      cancellationRate: filtered.length
        ? Math.round((counts.cancelled / filtered.length) * 100)
        : 0,
      noShowRate: filtered.length ? Math.round((counts.noShow / filtered.length) * 100) : 0,
      byService,
      waitlistSummary: this._getWaitlistStats(),
      peakHours: this._calcPeakHours(filtered),
    };
  }

  /* ─── مساعدات خاصة ─── */
  async _checkConflicts(aptData) {
    const conflicts = [];
    const all = Array.from(this.appointments.values()).filter(a => a.status !== 'cancelled');
    for (const a of all) {
      if (a.date === aptData.date) {
        if (
          a.therapistId === aptData.therapistId &&
          this._timesOverlap(
            a.startTime,
            a.endTime,
            aptData.startTime,
            aptData.endTime || this._calcEndTime(aptData.startTime, aptData.duration || 45)
          )
        ) {
          conflicts.push({ type: 'therapist_conflict', existingAppointment: a.id });
        }
        if (
          aptData.roomId &&
          a.roomId === aptData.roomId &&
          this._timesOverlap(
            a.startTime,
            a.endTime,
            aptData.startTime,
            aptData.endTime || this._calcEndTime(aptData.startTime, aptData.duration || 45)
          )
        ) {
          conflicts.push({ type: 'room_conflict', existingAppointment: a.id });
        }
        if (
          a.beneficiaryId === aptData.beneficiaryId &&
          this._timesOverlap(
            a.startTime,
            a.endTime,
            aptData.startTime,
            aptData.endTime || this._calcEndTime(aptData.startTime, aptData.duration || 45)
          )
        ) {
          conflicts.push({ type: 'beneficiary_conflict', existingAppointment: a.id });
        }
      }
    }
    return conflicts;
  }

  _timesOverlap(s1, e1, s2, e2) {
    return s1 < e2 && s2 < e1;
  }

  _calcEndTime(startTime, duration) {
    const [h, m] = startTime.split(':').map(Number);
    const total = h * 60 + m + duration;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  async _suggestAlternatives(aptData) {
    const suggestions = [];
    const baseTimes = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
    for (const time of baseTimes) {
      if (time !== aptData.startTime) {
        const testData = {
          ...aptData,
          startTime: time,
          endTime: this._calcEndTime(time, aptData.duration || 45),
        };
        const conf = await this._checkConflicts(testData);
        if (conf.length === 0) {
          suggestions.push({ date: aptData.date, startTime: time, endTime: testData.endTime });
        }
        if (suggestions.length >= 3) break;
      }
    }
    return suggestions;
  }

  async _autoAssignRoom(aptData) {
    const roomUsage = Array.from(this.appointments.values()).filter(
      a => a.date === aptData.date && a.status !== 'cancelled'
    );
    for (const [id, room] of this.rooms) {
      const inUse = roomUsage.some(
        a =>
          a.roomId === id &&
          this._timesOverlap(
            a.startTime,
            a.endTime,
            aptData.startTime,
            aptData.endTime || this._calcEndTime(aptData.startTime, aptData.duration || 45)
          )
      );
      if (!inUse && room.available) return id;
    }
    return null;
  }

  _calcDailyLoad(apts) {
    const byDate = {};
    apts.forEach(a => {
      byDate[a.date] = (byDate[a.date] || 0) + 1;
    });
    return byDate;
  }

  async _getAvailableSlots(_therapistId, _dateRange) {
    return []; // يتم حسابها بناءً على جدول العمل
  }

  _createReminders(_aptData) {
    return [
      { type: 'sms', timing: '24h_before', status: 'pending' },
      { type: 'sms', timing: '2h_before', status: 'pending' },
    ];
  }

  async _createRecurringAppointments(_baseApt) {
    // placeholder: يتم إنشاء مواعيد متكررة حسب نمط التكرار
  }

  _getWaitlistStats() {
    const stats = {};
    for (const [service, list] of this.waitlists) {
      stats[service] = list.length;
    }
    return stats;
  }

  _calcPeakHours(apts) {
    const hours = {};
    apts.forEach(a => {
      const h = a.startTime?.split(':')[0];
      if (h) hours[h] = (hours[h] || 0) + 1;
    });
    return hours;
  }
}

module.exports = { SmartSchedulingService };
