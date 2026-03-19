/**
 * Administrative Communications Enhanced Service
 * خدمة محسّنة للاتصالات الإدارية - عمليات الأعمال المتقدمة
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../utils/logger');

const {
  DigitalSignature,
  InternalNote,
  CorrespondenceReminder,
  LinkedTask,
  DeliveryTracking,
  CorrespondenceReferral,
  CorrespondenceComment,
  OfficialStamp,
  CorrespondenceFavorite,
  QRCodeTracking,
  CorrespondenceLabel,
  ForwardRecord,
} = require('./admin-comm-enhanced-models');

const { Correspondence, CorrespondenceAction } = require('./administrative-communications-service');

class AdminCommEnhancedService {
  // ═══════════════════════════════════════════════════════════════════════════
  //  1. DIGITAL SIGNATURES — التوقيعات الإلكترونية
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * طلب توقيع إلكتروني على مراسلة
   */
  async requestSignature(
    correspondenceId,
    {
      signerId,
      signerName,
      signerTitle,
      signerDepartment,
      signatureType,
      order,
      isRequired,
      notes,
      expiresAt,
    },
    requestedBy
  ) {
    const signature = new DigitalSignature({
      correspondenceId,
      signerId,
      signerName,
      signerTitle,
      signerDepartment,
      signatureType: signatureType || 'approval',
      order: order || 0,
      isRequired: isRequired !== false,
      notes,
      expiresAt,
      status: 'pending',
    });
    await signature.save();

    await this._logAction(
      correspondenceId,
      'request_signature',
      requestedBy,
      `طلب توقيع من: ${signerName}`
    );
    return signature;
  }

  /**
   * تنفيذ التوقيع الإلكتروني
   */
  async signCorrespondence(signatureId, { imageData, ipAddress, userAgent }, userId) {
    const signature = await DigitalSignature.findById(signatureId);
    if (!signature) throw new Error('طلب التوقيع غير موجود');
    if (signature.signerId.toString() !== userId.toString())
      throw new Error('غير مصرح لك بالتوقيع');
    if (signature.status !== 'pending') throw new Error('تم التعامل مع طلب التوقيع مسبقاً');

    // توليد بصمة التوقيع
    const hash = crypto
      .createHash('sha256')
      .update(`${signature.correspondenceId}-${userId}-${Date.now()}-${imageData || ''}`)
      .digest('hex');

    signature.signatureData = { imageData, hash, algorithm: 'SHA-256', ipAddress, userAgent };
    signature.status = 'signed';
    signature.signedAt = new Date();
    await signature.save();

    await this._logAction(signature.correspondenceId, 'sign', userId, 'تم التوقيع الإلكتروني');

    // التحقق من اكتمال جميع التوقيعات
    const allSigs = await DigitalSignature.find({
      correspondenceId: signature.correspondenceId,
      isRequired: true,
    });
    const allSigned = allSigs.every(s => s.status === 'signed');
    return { signature, allSignaturesCompleted: allSigned };
  }

  /**
   * إلغاء توقيع
   */
  async revokeSignature(signatureId, reason, userId) {
    const sig = await DigitalSignature.findById(signatureId);
    if (!sig) throw new Error('التوقيع غير موجود');
    sig.status = 'revoked';
    sig.revokedAt = new Date();
    sig.revokedReason = reason;
    await sig.save();
    await this._logAction(
      sig.correspondenceId,
      'revoke_signature',
      userId,
      `إلغاء التوقيع: ${reason}`
    );
    return sig;
  }

  /**
   * الحصول على توقيعات مراسلة
   */
  async getSignatures(correspondenceId) {
    return DigitalSignature.find({ correspondenceId })
      .sort({ order: 1 })
      .populate('signerId', 'name nameAr email');
  }

  /**
   * التحقق من صحة التوقيع
   */
  async verifySignature(signatureId) {
    const sig = await DigitalSignature.findById(signatureId).populate('signerId', 'name nameAr');
    if (!sig) throw new Error('التوقيع غير موجود');
    return {
      isValid: sig.status === 'signed',
      signedBy: sig.signerName,
      signedAt: sig.signedAt,
      hash: sig.signatureData?.hash,
      status: sig.status,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  2. INTERNAL NOTES — الملاحظات الداخلية
  // ═══════════════════════════════════════════════════════════════════════════

  async addInternalNote(
    correspondenceId,
    { content, noteType, visibility, visibleTo, mentions, parentNoteId, attachments },
    userId,
    userName
  ) {
    const note = new InternalNote({
      correspondenceId,
      authorId: userId,
      authorName: userName,
      content,
      noteType: noteType || 'general',
      visibility: visibility || 'all_participants',
      visibleTo,
      mentions,
      parentNoteId,
      attachments,
    });
    await note.save();
    await this._logAction(correspondenceId, 'add_note', userId, 'إضافة ملاحظة داخلية');
    return note;
  }

  async getInternalNotes(correspondenceId, userId, { page = 1, limit = 20, noteType } = {}) {
    const filter = {
      correspondenceId,
      $or: [
        { visibility: 'all_participants' },
        { visibility: 'admins_only' },
        { authorId: userId },
        { visibleTo: userId },
      ],
    };
    if (noteType) filter.noteType = noteType;
    const skip = (page - 1) * limit;

    const [notes, total] = await Promise.all([
      InternalNote.find(filter)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'name nameAr')
        .populate('mentions', 'name nameAr'),
      InternalNote.countDocuments(filter),
    ]);
    return { notes, total, page, pages: Math.ceil(total / limit) };
  }

  async updateInternalNote(noteId, { content, noteType, isPinned }, userId) {
    const note = await InternalNote.findById(noteId);
    if (!note) throw new Error('الملاحظة غير موجودة');
    if (note.authorId.toString() !== userId.toString())
      throw new Error('غير مصرح لك بتعديل هذه الملاحظة');
    if (content) {
      note.content = content;
      note.isEdited = true;
      note.editedAt = new Date();
    }
    if (noteType) note.noteType = noteType;
    if (typeof isPinned === 'boolean') note.isPinned = isPinned;
    await note.save();
    return note;
  }

  async deleteInternalNote(noteId, userId) {
    const note = await InternalNote.findById(noteId);
    if (!note) throw new Error('الملاحظة غير موجودة');
    if (note.authorId.toString() !== userId.toString())
      throw new Error('غير مصرح لك بحذف هذه الملاحظة');
    await InternalNote.findByIdAndDelete(noteId);
    return { deleted: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  3. CUSTOM REMINDERS — التذكيرات المخصصة
  // ═══════════════════════════════════════════════════════════════════════════

  async createReminder(
    correspondenceId,
    { title, message, reminderDate, repeatType, repeatEndDate, priority, notifyVia },
    userId
  ) {
    const reminder = new CorrespondenceReminder({
      correspondenceId,
      userId,
      title,
      message,
      reminderDate: new Date(reminderDate),
      repeatType: repeatType || 'none',
      repeatEndDate: repeatEndDate ? new Date(repeatEndDate) : undefined,
      priority: priority || 'normal',
      notifyVia: notifyVia || ['system'],
    });
    await reminder.save();
    return reminder;
  }

  async getUserReminders(userId, { status, page = 1, limit = 20 } = {}) {
    const filter = { userId };
    if (status) filter.status = status;
    const skip = (page - 1) * limit;

    const [reminders, total] = await Promise.all([
      CorrespondenceReminder.find(filter)
        .sort({ reminderDate: 1 })
        .skip(skip)
        .limit(limit)
        .populate('correspondenceId', 'referenceNumber subject'),
      CorrespondenceReminder.countDocuments(filter),
    ]);
    return { reminders, total, page, pages: Math.ceil(total / limit) };
  }

  async snoozeReminder(reminderId, snoozeDuration, userId) {
    const reminder = await CorrespondenceReminder.findById(reminderId);
    if (!reminder) throw new Error('التذكير غير موجود');
    if (reminder.userId.toString() !== userId.toString()) throw new Error('غير مصرح');
    const snoozeUntil = new Date(Date.now() + snoozeDuration * 60 * 1000); // بالدقائق
    reminder.status = 'snoozed';
    reminder.snoozedUntil = snoozeUntil;
    reminder.snoozeCount += 1;
    await reminder.save();
    return reminder;
  }

  async dismissReminder(reminderId, userId) {
    const reminder = await CorrespondenceReminder.findById(reminderId);
    if (!reminder) throw new Error('التذكير غير موجود');
    if (reminder.userId.toString() !== userId.toString()) throw new Error('غير مصرح');
    reminder.status = 'dismissed';
    await reminder.save();
    return reminder;
  }

  async deleteReminder(reminderId, userId) {
    const reminder = await CorrespondenceReminder.findById(reminderId);
    if (!reminder) throw new Error('التذكير غير موجود');
    if (reminder.userId.toString() !== userId.toString()) throw new Error('غير مصرح');
    await CorrespondenceReminder.findByIdAndDelete(reminderId);
    return { deleted: true };
  }

  /**
   * معالجة التذكيرات المستحقة (تُشغّل بواسطة cron job)
   */
  async processDueReminders() {
    const now = new Date();
    const dueReminders = await CorrespondenceReminder.find({
      $or: [
        { status: 'active', reminderDate: { $lte: now } },
        { status: 'snoozed', snoozedUntil: { $lte: now } },
      ],
    }).populate('correspondenceId', 'referenceNumber subject');

    const triggered = [];
    for (const reminder of dueReminders) {
      reminder.status = 'triggered';
      reminder.triggeredAt = now;
      await reminder.save();
      triggered.push(reminder);
    }
    return { count: triggered.length, reminders: triggered };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  4. LINKED TASKS — المهام المرتبطة
  // ═══════════════════════════════════════════════════════════════════════════

  async createLinkedTask(correspondenceId, data, userId, userName) {
    const task = new LinkedTask({
      correspondenceId,
      title: data.title,
      description: data.description,
      assignedTo: data.assignedTo,
      assignedToName: data.assignedToName,
      assignedBy: userId,
      assignedByName: userName,
      priority: data.priority || 'normal',
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      checklist: data.checklist || [],
      tags: data.tags || [],
      watchers: data.watchers || [],
    });
    await task.save();
    await this._logAction(correspondenceId, 'create_task', userId, `إنشاء مهمة: ${data.title}`);
    return task;
  }

  async getLinkedTasks(correspondenceId, { status, assignedTo, page = 1, limit = 20 } = {}) {
    const filter = { correspondenceId };
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      LinkedTask.find(filter)
        .sort({ priority: -1, dueDate: 1 })
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'name nameAr')
        .populate('assignedBy', 'name nameAr'),
      LinkedTask.countDocuments(filter),
    ]);
    return { tasks, total, page, pages: Math.ceil(total / limit) };
  }

  async updateLinkedTask(taskId, data, userId) {
    const task = await LinkedTask.findById(taskId);
    if (!task) throw new Error('المهمة غير موجودة');

    const allowed = [
      'title',
      'description',
      'priority',
      'status',
      'dueDate',
      'progress',
      'completionNotes',
      'tags',
    ];
    for (const key of allowed) {
      if (data[key] !== undefined) task[key] = data[key];
    }
    if (data.status === 'completed') {
      task.completedAt = new Date();
      task.progress = 100;
    }
    await task.save();
    await this._logAction(
      task.correspondenceId,
      'update_task',
      userId,
      `تحديث مهمة: ${task.title}`
    );
    return task;
  }

  async updateTaskChecklist(taskId, checklistItem, _userId) {
    const task = await LinkedTask.findById(taskId);
    if (!task) throw new Error('المهمة غير موجودة');

    if (checklistItem.index !== undefined && task.checklist[checklistItem.index]) {
      task.checklist[checklistItem.index].isCompleted = checklistItem.isCompleted;
      if (checklistItem.isCompleted) task.checklist[checklistItem.index].completedAt = new Date();
    } else if (checklistItem.item) {
      task.checklist.push({ item: checklistItem.item, isCompleted: false });
    }

    // تحديث نسبة الإنجاز تلقائياً
    const completedItems = task.checklist.filter(c => c.isCompleted).length;
    task.progress =
      task.checklist.length > 0 ? Math.round((completedItems / task.checklist.length) * 100) : 0;
    await task.save();
    return task;
  }

  async getMyTasks(userId, { status, page = 1, limit = 20 } = {}) {
    const filter = { assignedTo: userId };
    if (status) filter.status = status;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      LinkedTask.find(filter)
        .sort({ dueDate: 1, priority: -1 })
        .skip(skip)
        .limit(limit)
        .populate('correspondenceId', 'referenceNumber subject')
        .populate('assignedBy', 'name nameAr'),
      LinkedTask.countDocuments(filter),
    ]);
    return { tasks, total, page, pages: Math.ceil(total / limit) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  5. DELIVERY TRACKING — تتبع التسليم
  // ═══════════════════════════════════════════════════════════════════════════

  async createDeliveryRecord(correspondenceId, data, userId) {
    const record = new DeliveryTracking({
      correspondenceId,
      recipientId: data.recipientId,
      recipientName: data.recipientName,
      recipientEntity: data.recipientEntity,
      deliveryMethod: data.deliveryMethod || 'electronic',
      trackingNumber: data.trackingNumber,
      courierName: data.courierName,
      notes: data.notes,
    });
    await record.save();
    await this._logAction(
      correspondenceId,
      'create_delivery',
      userId,
      `تتبع تسليم: ${data.recipientName}`
    );
    return record;
  }

  async updateDeliveryStatus(
    trackingId,
    { status, manualDelivery, receiptNumber, receiptImage, failureReason, notes },
    userId
  ) {
    const record = await DeliveryTracking.findById(trackingId);
    if (!record) throw new Error('سجل التسليم غير موجود');

    record.status = status;
    if (status === 'sent') record.sentAt = new Date();
    if (status === 'delivered') record.deliveredAt = new Date();
    if (status === 'read') record.readAt = new Date();
    if (status === 'acknowledged') record.acknowledgedAt = new Date();
    if (status === 'returned') record.returnedAt = new Date();
    if (status === 'failed') record.failureReason = failureReason;
    if (manualDelivery) record.manualDelivery = manualDelivery;
    if (receiptNumber) record.receiptNumber = receiptNumber;
    if (receiptImage) record.receiptImage = receiptImage;
    if (notes) record.notes = notes;
    await record.save();

    await this._logAction(
      record.correspondenceId,
      'update_delivery',
      userId,
      `تحديث حالة التسليم: ${status}`
    );
    return record;
  }

  async getDeliveryRecords(correspondenceId) {
    return DeliveryTracking.find({ correspondenceId })
      .sort({ createdAt: -1 })
      .populate('recipientId', 'name nameAr');
  }

  async getDeliveryStats(correspondenceId) {
    const records = await DeliveryTracking.find({ correspondenceId });
    const stats = {
      total: records.length,
      pending: records.filter(r => r.status === 'pending').length,
      sent: records.filter(r => r.status === 'sent').length,
      delivered: records.filter(r => r.status === 'delivered').length,
      read: records.filter(r => r.status === 'read').length,
      acknowledged: records.filter(r => r.status === 'acknowledged').length,
      failed: records.filter(r => r.status === 'failed').length,
      returned: records.filter(r => r.status === 'returned').length,
    };
    stats.deliveryRate =
      stats.total > 0
        ? Math.round(((stats.delivered + stats.read + stats.acknowledged) / stats.total) * 100)
        : 0;
    return stats;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  6. REFERRALS — الإحالات
  // ═══════════════════════════════════════════════════════════════════════════

  async createReferral(correspondenceId, data, userId, userName) {
    const referral = new CorrespondenceReferral({
      correspondenceId,
      referredBy: userId,
      referredByName: userName,
      referredTo: data.referredTo,
      referredToName: data.referredToName,
      referredToDepartment: data.referredToDepartment,
      referralType: data.referralType || 'for_action',
      instructions: data.instructions,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      priority: data.priority || 'normal',
      parentReferralId: data.parentReferralId,
    });
    await referral.save();
    await this._logAction(
      correspondenceId,
      'referral',
      userId,
      `إحالة إلى: ${data.referredToName} (${this._getReferralTypeName(data.referralType)})`
    );
    return referral;
  }

  async respondToReferral(referralId, { status, responseNotes }, userId) {
    const referral = await CorrespondenceReferral.findById(referralId);
    if (!referral) throw new Error('الإحالة غير موجودة');
    if (referral.referredTo.toString() !== userId.toString()) throw new Error('غير مصرح');

    referral.status = status;
    referral.responseNotes = responseNotes;
    referral.respondedAt = new Date();
    if (status === 'completed') referral.completedAt = new Date();
    await referral.save();

    await this._logAction(
      referral.correspondenceId,
      'referral_response',
      userId,
      `رد على الإحالة: ${status}`
    );
    return referral;
  }

  async escalateReferral(referralId, reason, userId) {
    const referral = await CorrespondenceReferral.findById(referralId);
    if (!referral) throw new Error('الإحالة غير موجودة');
    referral.isEscalated = true;
    referral.escalatedAt = new Date();
    referral.escalationReason = reason;
    await referral.save();
    await this._logAction(
      referral.correspondenceId,
      'escalate_referral',
      userId,
      `تصعيد إحالة: ${reason}`
    );
    return referral;
  }

  async getReferrals(correspondenceId, { status } = {}) {
    const filter = { correspondenceId };
    if (status) filter.status = status;
    return CorrespondenceReferral.find(filter)
      .sort({ createdAt: -1 })
      .populate('referredBy', 'name nameAr')
      .populate('referredTo', 'name nameAr');
  }

  async getMyReferrals(userId, { status, page = 1, limit = 20 } = {}) {
    const filter = { referredTo: userId };
    if (status) filter.status = status;
    const skip = (page - 1) * limit;

    const [referrals, total] = await Promise.all([
      CorrespondenceReferral.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('correspondenceId', 'referenceNumber subject priority')
        .populate('referredBy', 'name nameAr'),
      CorrespondenceReferral.countDocuments(filter),
    ]);
    return { referrals, total, page, pages: Math.ceil(total / limit) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  7. COMMENTS — التعليقات
  // ═══════════════════════════════════════════════════════════════════════════

  async addComment(correspondenceId, { content, parentCommentId, mentions }, userId, userName) {
    const comment = new CorrespondenceComment({
      correspondenceId,
      authorId: userId,
      authorName: userName,
      content,
      parentCommentId,
      mentions,
    });
    await comment.save();
    await this._logAction(correspondenceId, 'add_comment', userId, 'إضافة تعليق');
    return comment;
  }

  async getComments(correspondenceId, { page = 1, limit = 30 } = {}) {
    const skip = (page - 1) * limit;
    const filter = { correspondenceId, isDeleted: false, parentCommentId: { $exists: false } };

    const [comments, total] = await Promise.all([
      CorrespondenceComment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'name nameAr')
        .populate('mentions', 'name nameAr'),
      CorrespondenceComment.countDocuments(filter),
    ]);

    // جلب الردود لكل تعليق
    const commentIds = comments.map(c => c._id);
    const replies = await CorrespondenceComment.find({
      parentCommentId: { $in: commentIds },
      isDeleted: false,
    })
      .sort({ createdAt: 1 })
      .populate('authorId', 'name nameAr');

    const repliesMap = {};
    for (const reply of replies) {
      const pid = reply.parentCommentId.toString();
      if (!repliesMap[pid]) repliesMap[pid] = [];
      repliesMap[pid].push(reply);
    }

    const enriched = comments.map(c => ({
      ...c.toObject(),
      replies: repliesMap[c._id.toString()] || [],
    }));

    return { comments: enriched, total, page, pages: Math.ceil(total / limit) };
  }

  async updateComment(commentId, { content }, userId) {
    const comment = await CorrespondenceComment.findById(commentId);
    if (!comment) throw new Error('التعليق غير موجود');
    if (comment.authorId.toString() !== userId.toString()) throw new Error('غير مصرح');
    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();
    return comment;
  }

  async deleteComment(commentId, userId) {
    const comment = await CorrespondenceComment.findById(commentId);
    if (!comment) throw new Error('التعليق غير موجود');
    if (comment.authorId.toString() !== userId.toString()) throw new Error('غير مصرح');
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    await comment.save();
    return { deleted: true };
  }

  async addReaction(commentId, { type }, userId) {
    const comment = await CorrespondenceComment.findById(commentId);
    if (!comment) throw new Error('التعليق غير موجود');
    // إزالة تفاعل قديم من نفس المستخدم
    comment.reactions = comment.reactions.filter(r => r.userId.toString() !== userId.toString());
    comment.reactions.push({ userId, type });
    await comment.save();
    return comment;
  }

  async resolveComment(commentId, userId) {
    const comment = await CorrespondenceComment.findById(commentId);
    if (!comment) throw new Error('التعليق غير موجود');
    comment.isResolved = true;
    comment.resolvedBy = userId;
    comment.resolvedAt = new Date();
    await comment.save();
    return comment;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  8. OFFICIAL STAMPS — الأختام الرسمية
  // ═══════════════════════════════════════════════════════════════════════════

  async createStamp(data, userId) {
    const stamp = new OfficialStamp({
      name: data.name,
      nameAr: data.nameAr,
      stampType: data.stampType,
      imageData: data.imageData,
      department: data.department,
      branch: data.branch,
      usagePermissions: data.usagePermissions || [],
      createdBy: userId,
    });
    await stamp.save();
    return stamp;
  }

  async getStamps({ stampType, department, isActive = true } = {}) {
    const filter = { isActive };
    if (stampType) filter.stampType = stampType;
    if (department) filter.department = department;
    return OfficialStamp.find(filter).sort({ name: 1 });
  }

  async applyStamp(correspondenceId, stampId, userId) {
    const stamp = await OfficialStamp.findById(stampId);
    if (!stamp) throw new Error('الختم غير موجود');
    if (!stamp.isActive) throw new Error('الختم غير نشط');

    stamp.usageCount += 1;
    await stamp.save();

    await this._logAction(correspondenceId, 'apply_stamp', userId, `تطبيق ختم: ${stamp.nameAr}`);
    return { stamp, appliedAt: new Date() };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  9. FAVORITES & PINS — المفضلة والتثبيت
  // ═══════════════════════════════════════════════════════════════════════════

  async toggleFavorite(correspondenceId, userId, { label, color, notes, folder } = {}) {
    const existing = await CorrespondenceFavorite.findOne({ userId, correspondenceId });
    if (existing) {
      await CorrespondenceFavorite.findByIdAndDelete(existing._id);
      return { isFavorite: false };
    }
    const fav = new CorrespondenceFavorite({
      userId,
      correspondenceId,
      label,
      color: color || 'none',
      notes,
      folder,
    });
    await fav.save();
    return { isFavorite: true, favorite: fav };
  }

  async togglePin(correspondenceId, userId) {
    const fav = await CorrespondenceFavorite.findOne({ userId, correspondenceId });
    if (!fav) {
      const newFav = new CorrespondenceFavorite({ userId, correspondenceId, isPinned: true });
      await newFav.save();
      return { isPinned: true };
    }
    fav.isPinned = !fav.isPinned;
    await fav.save();
    return { isPinned: fav.isPinned };
  }

  async getFavorites(userId, { folder, color, page = 1, limit = 20 } = {}) {
    const filter = { userId };
    if (folder) filter.folder = folder;
    if (color) filter.color = color;
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      CorrespondenceFavorite.find(filter)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('correspondenceId', 'referenceNumber subject type status priority createdAt'),
      CorrespondenceFavorite.countDocuments(filter),
    ]);
    return { favorites, total, page, pages: Math.ceil(total / limit) };
  }

  async updateFavorite(favoriteId, { label, color, notes, folder }, userId) {
    const fav = await CorrespondenceFavorite.findById(favoriteId);
    if (!fav || fav.userId.toString() !== userId.toString())
      throw new Error('غير موجود أو غير مصرح');
    if (label !== undefined) fav.label = label;
    if (color) fav.color = color;
    if (notes !== undefined) fav.notes = notes;
    if (folder !== undefined) fav.folder = folder;
    await fav.save();
    return fav;
  }

  async getFavoriteFolders(userId) {
    const folders = await CorrespondenceFavorite.distinct('folder', {
      userId,
      folder: { $ne: null, $exists: true },
    });
    const counts = await CorrespondenceFavorite.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), folder: { $ne: null } } },
      { $group: { _id: '$folder', count: { $sum: 1 } } },
    ]);
    const countsMap = {};
    counts.forEach(c => {
      countsMap[c._id] = c.count;
    });
    return folders.map(f => ({ name: f, count: countsMap[f] || 0 }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. QR CODES — رموز QR
  // ═══════════════════════════════════════════════════════════════════════════

  async generateQRCode(correspondenceId, { purpose, expiresAt }, userId) {
    const correspondence = await Correspondence.findById(correspondenceId);
    if (!correspondence) throw new Error('المراسلة غير موجودة');

    const qrData = JSON.stringify({
      id: correspondenceId,
      ref: correspondence.referenceNumber,
      type: correspondence.type,
      date: correspondence.createdAt,
      purpose,
      generated: new Date().toISOString(),
    });

    const qr = new QRCodeTracking({
      correspondenceId,
      qrData,
      purpose: purpose || 'verification',
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      generatedBy: userId,
    });
    await qr.save();
    return qr;
  }

  async scanQRCode(qrId, { scannedBy, ipAddress, location, device }) {
    const qr = await QRCodeTracking.findById(qrId);
    if (!qr) throw new Error('رمز QR غير موجود');
    if (!qr.isActive) throw new Error('رمز QR غير نشط');
    if (qr.expiresAt && qr.expiresAt < new Date()) throw new Error('رمز QR منتهي الصلاحية');

    qr.scans.push({ scannedBy, scannedAt: new Date(), ipAddress, location, device });
    await qr.save();
    return {
      correspondenceId: qr.correspondenceId,
      purpose: qr.purpose,
      isValid: true,
      scanCount: qr.scans.length,
    };
  }

  async getQRCodes(correspondenceId) {
    return QRCodeTracking.find({ correspondenceId }).sort({ createdAt: -1 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. LABELS — التصنيفات
  // ═══════════════════════════════════════════════════════════════════════════

  async createLabel(data, userId) {
    const label = new CorrespondenceLabel({
      name: data.name,
      nameAr: data.nameAr,
      color: data.color || '#3b82f6',
      icon: data.icon,
      description: data.description,
      scope: data.scope || 'organization',
      createdBy: userId,
    });
    await label.save();
    return label;
  }

  async getLabels({ scope } = {}) {
    const filter = {};
    if (scope) filter.scope = scope;
    return CorrespondenceLabel.find(filter).sort({ name: 1 });
  }

  async updateLabel(labelId, data, _userId) {
    const label = await CorrespondenceLabel.findById(labelId);
    if (!label) throw new Error('التصنيف غير موجود');
    if (label.isSystem) throw new Error('لا يمكن تعديل تصنيف النظام');
    const allowed = ['name', 'nameAr', 'color', 'icon', 'description', 'scope'];
    for (const key of allowed) {
      if (data[key] !== undefined) label[key] = data[key];
    }
    await label.save();
    return label;
  }

  async deleteLabel(labelId) {
    const label = await CorrespondenceLabel.findById(labelId);
    if (!label) throw new Error('التصنيف غير موجود');
    if (label.isSystem) throw new Error('لا يمكن حذف تصنيف النظام');
    await CorrespondenceLabel.findByIdAndDelete(labelId);
    return { deleted: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. FORWARD — إعادة التوجيه
  // ═══════════════════════════════════════════════════════════════════════════

  async forwardCorrespondence(
    correspondenceId,
    {
      forwardedTo,
      reason,
      additionalMessage,
      includeAttachments,
      includeHistory,
      confidentialityOverride,
    },
    userId,
    userName
  ) {
    const record = new ForwardRecord({
      correspondenceId,
      forwardedBy: userId,
      forwardedByName: userName,
      forwardedTo,
      reason,
      additionalMessage,
      includeAttachments: includeAttachments !== false,
      includeHistory: includeHistory === true,
      confidentialityOverride: confidentialityOverride || 'keep_original',
    });
    await record.save();

    // إضافة المستلمين الجدد إلى المراسلة
    const correspondence = await Correspondence.findById(correspondenceId);
    if (correspondence) {
      for (const to of forwardedTo) {
        if (!to.isExternal) {
          correspondence.recipients.push({
            type: 'internal',
            entityId: to.userId,
            name: to.name,
            isPrimary: false,
            status: 'sent',
          });
        }
      }
      correspondence.updatedBy = userId;
      await correspondence.save();
    }

    const recipientNames = forwardedTo.map(r => r.name).join(', ');
    await this._logAction(
      correspondenceId,
      'forward',
      userId,
      `إعادة توجيه إلى: ${recipientNames}`
    );
    return record;
  }

  async getForwardHistory(correspondenceId) {
    return ForwardRecord.find({ correspondenceId })
      .sort({ createdAt: -1 })
      .populate('forwardedBy', 'name nameAr');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. REPLY — الرد على المراسلة
  // ═══════════════════════════════════════════════════════════════════════════

  async replyToCorrespondence(correspondenceId, replyData, userId) {
    const original = await Correspondence.findById(correspondenceId);
    if (!original) throw new Error('المراسلة الأصلية غير موجودة');

    // إنشاء مراسلة رد
    const { adminCommService } = require('./administrative-communications-service');
    const reply = await adminCommService.createCorrespondence(
      {
        ...replyData,
        type: replyData.type || 'response',
        subject: replyData.subject || `رد: ${original.subject}`,
        parentCorrespondence: correspondenceId,
        relatedCorrespondences: [correspondenceId],
      },
      userId
    );

    // ربط الرد بالأصل
    original.relatedCorrespondences = original.relatedCorrespondences || [];
    original.relatedCorrespondences.push(reply._id);
    await original.save();

    await this._logAction(
      correspondenceId,
      'reply',
      userId,
      `رد على المراسلة: ${reply.referenceNumber}`
    );
    return reply;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. ADVANCED DASHBOARD / REPORTS — لوحة المعلومات المتقدمة
  // ═══════════════════════════════════════════════════════════════════════════

  async getEnhancedDashboard(userId, userRoles = []) {
    const isAdmin = userRoles.includes('admin') || userRoles.includes('manager');
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      pendingSignatures,
      myTasks,
      myReferrals,
      activeReminders,
      favoriteCount,
      recentComments,
      overdueTaskCount,
      // إحصائيات عامة
      totalInbox,
      unreadInbox,
      totalPendingApprovals,
      weeklyNew,
    ] = await Promise.all([
      DigitalSignature.countDocuments({ signerId: userId, status: 'pending' }),
      LinkedTask.countDocuments({
        assignedTo: userId,
        status: { $in: ['pending', 'in_progress'] },
      }),
      CorrespondenceReferral.countDocuments({ referredTo: userId, status: 'pending' }),
      CorrespondenceReminder.countDocuments({
        userId,
        status: 'active',
        reminderDate: { $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      }),
      CorrespondenceFavorite.countDocuments({ userId }),
      CorrespondenceComment.countDocuments({
        correspondenceId: { $exists: true },
        createdAt: { $gte: sevenDaysAgo },
      }),
      LinkedTask.countDocuments({
        assignedTo: userId,
        status: { $nin: ['completed', 'cancelled'] },
        dueDate: { $lt: now },
      }),
      Correspondence.countDocuments({ 'recipients.entityId': userId }),
      Correspondence.countDocuments({
        'recipients.entityId': userId,
        'recipients.readAt': { $exists: false },
      }),
      Correspondence.countDocuments({ status: 'pending_approval' }),
      Correspondence.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    const dashboard = {
      summary: {
        pendingSignatures,
        activeTasks: myTasks,
        pendingReferrals: myReferrals,
        upcomingReminders: activeReminders,
        favorites: favoriteCount,
        overdueTasks: overdueTaskCount,
      },
      inbox: {
        total: totalInbox,
        unread: unreadInbox,
        pendingApprovals: totalPendingApprovals,
      },
      activity: {
        recentComments,
        weeklyNewCorrespondences: weeklyNew,
      },
    };

    if (isAdmin) {
      const [totalActive, totalOverdue, avgResponseTime] = await Promise.all([
        Correspondence.countDocuments({ status: { $nin: ['archived', 'cancelled', 'completed'] } }),
        Correspondence.countDocuments({
          dueDate: { $lt: now },
          status: { $nin: ['completed', 'archived', 'cancelled'] },
        }),
        this._calculateAvgResponseTime(thirtyDaysAgo),
      ]);
      dashboard.admin = { totalActive, totalOverdue, avgResponseTimeDays: avgResponseTime };
    }

    return dashboard;
  }

  async getPerformanceReport({ dateFrom, dateTo, departmentId: _departmentId } = {}) {
    const matchStage = {};
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
    }

    const [
      correspondencesByMonth,
      taskCompletion,
      referralEfficiency,
      topHandlers,
      avgProcessingTime,
    ] = await Promise.all([
      // مراسلات شهرية
      Correspondence.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // إنجاز المهام
      LinkedTask.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // كفاءة الإحالات
      CorrespondenceReferral.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // أكثر المتعاملين نشاطاً
      CorrespondenceReferral.aggregate([
        { $match: { ...matchStage, status: 'completed' } },
        { $group: { _id: '$referredTo', completedCount: { $sum: 1 } } },
        { $sort: { completedCount: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { name: '$user.name', nameAr: '$user.nameAr', completedCount: 1 } },
      ]),
      // متوسط وقت المعالجة
      this._calculateAvgResponseTime(
        dateFrom ? new Date(dateFrom) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      ),
    ]);

    return {
      correspondencesByMonth: this._arrayToObject(correspondencesByMonth),
      taskCompletion: this._arrayToObject(taskCompletion),
      referralEfficiency: this._arrayToObject(referralEfficiency),
      topHandlers,
      avgProcessingTimeDays: avgProcessingTime,
    };
  }

  async getResponseTimeAnalytics({ dateFrom, dateTo } = {}) {
    const match = {};
    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
      if (dateTo) match.createdAt.$lte = new Date(dateTo);
    }

    const analytics = await Correspondence.aggregate([
      { $match: { ...match, dateSent: { $exists: true }, dateReceived: { $exists: true } } },
      {
        $project: {
          type: 1,
          priority: 1,
          responseTimeDays: {
            $divide: [{ $subtract: ['$dateReceived', '$dateSent'] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      {
        $group: {
          _id: { type: '$type', priority: '$priority' },
          avgDays: { $avg: '$responseTimeDays' },
          minDays: { $min: '$responseTimeDays' },
          maxDays: { $max: '$responseTimeDays' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.type': 1, '_id.priority': 1 } },
    ]);

    return analytics;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  async _logAction(correspondenceId, actionType, userId, description = '', metadata = {}) {
    try {
      const action = new CorrespondenceAction({
        correspondenceId,
        actionType,
        description,
        performedBy: userId,
        performedAt: new Date(),
        metadata,
      });
      await action.save();
    } catch {
      // لا نريد أن يتوقف النظام بسبب فشل التسجيل
      logger.warn(`Failed to log action: ${actionType} for ${correspondenceId}`);
    }
  }

  async _calculateAvgResponseTime(since) {
    try {
      const result = await Correspondence.aggregate([
        {
          $match: {
            createdAt: { $gte: since },
            dateSent: { $exists: true },
            dateReceived: { $exists: true },
          },
        },
        {
          $project: {
            diffDays: {
              $divide: [{ $subtract: ['$dateReceived', '$dateSent'] }, 1000 * 60 * 60 * 24],
            },
          },
        },
        { $group: { _id: null, avgDays: { $avg: '$diffDays' } } },
      ]);
      return result[0]?.avgDays ? Math.round(result[0].avgDays * 100) / 100 : 0;
    } catch {
      return 0;
    }
  }

  _getReferralTypeName(type) {
    const names = {
      for_action: 'للتنفيذ',
      for_review: 'للمراجعة',
      for_information: 'للاطلاع',
      for_opinion: 'للرأي',
      for_follow_up: 'للمتابعة',
      for_archive: 'للأرشفة',
    };
    return names[type] || type;
  }

  _arrayToObject(arr) {
    const obj = {};
    arr.forEach(item => {
      obj[item._id] = item.count || item;
    });
    return obj;
  }
}

module.exports = new AdminCommEnhancedService();
