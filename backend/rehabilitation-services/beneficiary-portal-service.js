/**
 * بوابة المستفيد الذاتية
 * Beneficiary Portal Service
 * Phase 8 — لوحة تحكم المستفيد وخدمات الخدمة الذاتية
 */

class BeneficiaryPortalService {
  constructor() {
    this.profiles = new Map();
    this.appointments = new Map();
    this.messages = new Map();
    this.documents = new Map();
    this.goals = new Map();
    this.feedback = new Map();
  }

  /**
   * إنشاء/تحديث ملف المستفيد الذاتي
   */
  async manageProfile(beneficiaryId, profileData) {
    const existing = this.profiles.get(beneficiaryId);
    const profile = {
      beneficiaryId,
      updatedAt: new Date().toISOString(),
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      personalInfo: {
        preferredName: profileData.preferredName || existing?.personalInfo?.preferredName || '',
        preferredLanguage: profileData.language || 'العربية',
        emergencyContact:
          profileData.emergencyContact || existing?.personalInfo?.emergencyContact || {},
        communicationPreference: profileData.commPref || 'SMS', // SMS | Email | WhatsApp | تطبيق
      },
      accessibilitySettings: {
        fontSize: profileData.fontSize || 'متوسط',
        highContrast: profileData.highContrast ?? false,
        screenReader: profileData.screenReader ?? false,
        audioDescriptions: profileData.audioDesc ?? false,
        signLanguageVideo: profileData.signLang ?? false,
        simplifiedInterface: profileData.simplified ?? false,
      },
      preferences: {
        preferredTherapist: profileData.preferredTherapist || null,
        preferredTime: profileData.preferredTime || 'صباحي',
        preferredDays: profileData.preferredDays || [],
        transportationNeeded: profileData.transportation ?? false,
        companionRequired: profileData.companion ?? false,
      },
      notificationSettings: {
        appointmentReminder: profileData.appointmentReminder ?? true,
        reminderHoursBefore: profileData.reminderHours || 24,
        progressUpdates: profileData.progressUpdates ?? true,
        sessionSummaries: profileData.sessionSummaries ?? true,
        newMessages: profileData.newMessages ?? true,
      },
    };
    this.profiles.set(beneficiaryId, profile);
    return profile;
  }

  /**
   * عرض لوحة تحكم المستفيد
   */
  async getDashboard(beneficiaryId) {
    const profile = this.profiles.get(beneficiaryId);
    const appointments = [...this.appointments.values()]
      .filter(a => a.beneficiaryId === beneficiaryId)
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    const messages = [...this.messages.values()].filter(m => m.beneficiaryId === beneficiaryId);
    const goals = [...this.goals.values()].filter(g => g.beneficiaryId === beneficiaryId);
    const unreadMessages = messages.filter(m => !m.read && m.direction === 'incoming').length;

    const upcomingAppointments = appointments.filter(
      a => new Date(a.dateTime) >= new Date() && a.status !== 'ملغي'
    );
    const activeGoals = goals.filter(g => g.status === 'نشط');

    return {
      beneficiaryId,
      generatedAt: new Date().toISOString(),
      profile: profile || null,
      overview: {
        upcomingAppointments: upcomingAppointments.length,
        unreadMessages,
        activeGoals: activeGoals.length,
        nextAppointment: upcomingAppointments.length > 0 ? upcomingAppointments[0] : null,
      },
      appointments: upcomingAppointments.slice(0, 5),
      recentMessages: messages.slice(-5),
      goals: activeGoals,
    };
  }

  /**
   * طلب موعد جديد
   */
  async requestAppointment(beneficiaryId, appointmentData) {
    const id = `bp-apt-${Date.now()}`;
    const appointment = {
      id,
      beneficiaryId,
      requestedAt: new Date().toISOString(),
      serviceType: appointmentData.serviceType || '',
      preferredDate: appointmentData.preferredDate || '',
      preferredTime: appointmentData.preferredTime || '',
      alternateDate: appointmentData.alternateDate || null,
      therapistPreference: appointmentData.therapist || null,
      reason: appointmentData.reason || '',
      urgency: appointmentData.urgency || 'عادي', // عاجل | عادي
      transportationNeeded: appointmentData.transportation ?? false,
      specialRequirements: appointmentData.specialReqs || '',
      dateTime: appointmentData.preferredDate || null,
      status: 'معلّق', // معلّق | مؤكد | ملغي | مكتمل
      confirmationDate: null,
    };
    this.appointments.set(id, appointment);
    return appointment;
  }

  /**
   * إرسال رسالة للفريق المعالج
   */
  async sendMessage(beneficiaryId, messageData) {
    const id = `bp-msg-${Date.now()}`;
    const message = {
      id,
      beneficiaryId,
      direction: 'outgoing', // outgoing: من المستفيد | incoming: إلى المستفيد
      date: new Date().toISOString(),
      recipient: messageData.recipient || 'الفريق المعالج',
      subject: messageData.subject || '',
      body: messageData.body || '',
      category: messageData.category || 'استفسار عام',
      // أنواع: استفسار عام | تقدم في المنزل | ملاحظة طبية | شكوى | اقتراح | طلب
      attachments: messageData.attachments || [],
      priority: messageData.priority || 'عادي',
      read: false,
      repliedTo: false,
      replyId: null,
    };
    this.messages.set(id, message);
    return message;
  }

  /**
   * رفع مستند من المستفيد
   */
  async uploadDocument(beneficiaryId, docData) {
    const id = `bp-doc-${Date.now()}`;
    const document = {
      id,
      beneficiaryId,
      uploadedAt: new Date().toISOString(),
      title: docData.title || '',
      type: docData.type || 'أخرى',
      // أنواع: تقرير طبي | نتائج فحوصات | شهادة إعاقة | تأمين | صور تقدم | أخرى
      description: docData.description || '',
      fileName: docData.fileName || '',
      fileSize: docData.fileSize || 0,
      mimeType: docData.mimeType || 'application/pdf',
      category: docData.category || 'عام',
      sharedWithTeam: docData.shareWithTeam ?? true,
      status: 'مرفوع',
    };
    this.documents.set(id, document);
    return document;
  }

  /**
   * متابعة أهداف المستفيد
   */
  async trackGoal(beneficiaryId, goalData) {
    if (goalData.goalId && this.goals.has(goalData.goalId)) {
      // تحديث هدف قائم
      const goal = this.goals.get(goalData.goalId);
      goal.selfRatedProgress = goalData.progress ?? goal.selfRatedProgress;
      goal.notes = goalData.notes || goal.notes;
      goal.updatedAt = new Date().toISOString();
      if (goalData.completed) {
        goal.status = 'مكتمل';
        goal.completedAt = new Date().toISOString();
      }
      goal.checkIns.push({
        date: new Date().toISOString(),
        progress: goalData.progress ?? 0,
        notes: goalData.notes || '',
        mood: goalData.mood || 'جيد',
      });
      return goal;
    }

    // إنشاء هدف جديد
    const id = `bp-goal-${Date.now()}`;
    const goal = {
      id,
      beneficiaryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: goalData.title || '',
      description: goalData.description || '',
      category: goalData.category || 'عام',
      targetDate: goalData.targetDate || null,
      selfRatedProgress: goalData.progress || 0,
      status: 'نشط',
      checkIns: [],
      notes: goalData.notes || '',
      completedAt: null,
    };
    this.goals.set(id, goal);
    return goal;
  }

  /**
   * تقديم تغذية راجعة عن جلسة
   */
  async submitFeedback(beneficiaryId, feedbackData) {
    const id = `bp-fb-${Date.now()}`;
    const fb = {
      id,
      beneficiaryId,
      date: new Date().toISOString(),
      sessionId: feedbackData.sessionId || null,
      serviceType: feedbackData.serviceType || '',
      therapistId: feedbackData.therapistId || null,
      ratings: {
        overallSatisfaction: feedbackData.overall ?? null, // 1-5
        therapistCommunication: feedbackData.communication ?? null,
        sessionEffectiveness: feedbackData.effectiveness ?? null,
        facilityCleanness: feedbackData.cleanness ?? null,
        waitTime: feedbackData.waitTime ?? null,
        accessibility: feedbackData.accessibility ?? null,
      },
      wouldRecommend: feedbackData.recommend ?? null,
      positiveFeedback: feedbackData.positive || '',
      improvementSuggestions: feedbackData.suggestions || '',
      anonymous: feedbackData.anonymous ?? false,
    };
    this.feedback.set(id, fb);
    return fb;
  }

  /**
   * الحصول على المستندات المرفوعة
   */
  async getDocuments(beneficiaryId) {
    const docs = [...this.documents.values()].filter(d => d.beneficiaryId === beneficiaryId);
    return {
      total: docs.length,
      documents: docs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
    };
  }
}

module.exports = { BeneficiaryPortalService };
