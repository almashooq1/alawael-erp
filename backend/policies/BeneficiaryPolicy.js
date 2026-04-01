/**
 * BeneficiaryPolicy — سياسة صلاحيات المستفيدين
 *
 * تُطبَّق على كل عمليات المستفيدين (CRUD، نقل، تاريخ طبي، مستندات...).
 * تدعم:
 *  - مدير النظام (super_admin / super-admin): صلاحيات كاملة بدون قيود
 *  - مدير الفرع (branch_admin / branch-admin): صلاحيات كاملة داخل فرعه فقط
 *  - ولي الأمر (parent / parent-guardian): يرى أبناءه فقط
 *  - باقي الأدوار: مقيّدة بالفرع والصلاحيات الصريحة
 *
 * الاستخدام:
 *   const policy = new BeneficiaryPolicy(req.user);
 *   if (!policy.canView(beneficiary))  return res.status(403)...
 *   if (!policy.canCreate())           return res.status(403)...
 *
 * @module policies/BeneficiaryPolicy
 */

'use strict';

// ─── الأدوار التي تملك صلاحية كاملة (تجاوز كل القيود) ──────────────────────
const SUPER_ROLES = ['super_admin', 'super-admin', 'hq_super_admin'];

// ─── الأدوار التي تملك صلاحية إدارة فرع واحد ────────────────────────────────
const BRANCH_ADMIN_ROLES = ['branch_admin', 'branch-admin', 'admin'];

// ─── الأدوار التي تملك صلاحية ولي الأمر (أبناءهم فقط) ──────────────────────
const GUARDIAN_ROLES = ['parent', 'parent-guardian'];

/**
 * مطابقة معرّفات Mongo أو ObjectId كـ strings
 */
const idsMatch = (a, b) => a && b && String(a) === String(b);

class BeneficiaryPolicy {
  /**
   * @param {Object} user - المستخدم الحالي (من req.user)
   * @param {string} user.role
   * @param {string} [user.branchId]
   * @param {string} [user.branch_id]
   * @param {string} [user.branch]
   * @param {string[]} [user.permissions]  - صلاحيات مخصصة (override)
   * @param {Object} [user.guardian]       - بيانات ولي الأمر (id)
   */
  constructor(user) {
    this.user = user || {};
    this.role = (user?.role || '').toLowerCase();
    this.userBranchId = user?.branchId || user?.branch_id || user?.branch || null;
    this.permissions = user?.permissions || [];
  }

  // ─── قبل كل شيء: مدير النظام يملك كل شيء ───────────────────────────────
  get isSuperAdmin() {
    return SUPER_ROLES.includes(this.role);
  }

  get isBranchAdmin() {
    return BRANCH_ADMIN_ROLES.includes(this.role);
  }

  get isGuardian() {
    return GUARDIAN_ROLES.includes(this.role);
  }

  /**
   * التحقق من أن المستخدم يملك صلاحية محددة
   */
  _hasPermission(perm) {
    if (this.isSuperAdmin) return true;
    return this.permissions.includes(perm) || this.permissions.includes('*');
  }

  /**
   * التحقق من إمكانية الوصول لفرع معين
   */
  _canAccessBranch(branchId) {
    if (this.isSuperAdmin) return true;
    if (!branchId) return true; // لا يوجد قيد فرع على السجل
    if (!this.userBranchId) return true; // المستخدم غير مقيّد بفرع
    return idsMatch(this.userBranchId, branchId);
  }

  // ═══════════════════════════════════════════════════════════
  // صلاحيات CRUD الأساسية
  // ═══════════════════════════════════════════════════════════

  /**
   * عرض قائمة المستفيدين
   */
  canViewAny() {
    if (this.isSuperAdmin) return true;
    if (this.isGuardian) return true; // يرى فقط أبناءه (مُصفَّى في الـ controller)
    return this._hasPermission('beneficiaries.view');
  }

  /**
   * عرض مستفيد واحد
   * @param {Object} beneficiary - سجل المستفيد { branchId, guardians }
   */
  canView(beneficiary) {
    if (!beneficiary) return false;
    if (this.isSuperAdmin) return true;

    if (!this._hasPermission('beneficiaries.view')) return false;

    // ولي الأمر يرى أبناءه فقط
    if (this.isGuardian) {
      const guardianId = this.user.guardian?.id || this.user.guardianId;
      if (!guardianId) return false;
      const guardians = beneficiary.guardians || [];
      return guardians.some(g => idsMatch(g.guardian_id || g, guardianId));
    }

    return this._canAccessBranch(beneficiary.branchId || beneficiary.branch_id);
  }

  /**
   * إنشاء مستفيد
   */
  canCreate() {
    if (this.isSuperAdmin) return true;
    return this._hasPermission('beneficiaries.create');
  }

  /**
   * تعديل مستفيد
   */
  canUpdate(beneficiary) {
    if (!beneficiary) return false;
    if (this.isSuperAdmin) return true;
    return (
      this._hasPermission('beneficiaries.edit') &&
      this._canAccessBranch(beneficiary.branchId || beneficiary.branch_id)
    );
  }

  /**
   * حذف مستفيد
   */
  canDelete(beneficiary) {
    if (!beneficiary) return false;
    if (this.isSuperAdmin) return true;
    return (
      this._hasPermission('beneficiaries.delete') &&
      this._canAccessBranch(beneficiary.branchId || beneficiary.branch_id)
    );
  }

  // ═══════════════════════════════════════════════════════════
  // صلاحيات متخصصة
  // ═══════════════════════════════════════════════════════════

  /**
   * نقل مستفيد بين الفروع
   */
  canTransfer(beneficiary) {
    if (!beneficiary) return false;
    if (this.isSuperAdmin) return true;
    return (
      this._hasPermission('beneficiaries.transfer') &&
      this._canAccessBranch(beneficiary.branchId || beneficiary.branch_id)
    );
  }

  /**
   * تصدير بيانات المستفيدين
   */
  canExport() {
    if (this.isSuperAdmin) return true;
    return this._hasPermission('beneficiaries.export');
  }

  /**
   * عرض التاريخ الطبي
   */
  canViewMedicalHistory(beneficiary) {
    if (!beneficiary) return false;
    if (this.isSuperAdmin) return true;
    return (
      this._hasPermission('beneficiaries.medical-history') &&
      this._canAccessBranch(beneficiary.branchId || beneficiary.branch_id)
    );
  }

  /**
   * تعديل التاريخ الطبي
   */
  canEditMedicalHistory(beneficiary) {
    if (!beneficiary) return false;
    if (this.isSuperAdmin) return true;
    return (
      this._hasPermission('beneficiaries.medical-history.edit') &&
      this._canAccessBranch(beneficiary.branchId || beneficiary.branch_id)
    );
  }

  /**
   * عرض مستندات المستفيد
   */
  canViewDocuments(beneficiary) {
    if (!beneficiary) return false;
    if (this.isSuperAdmin) return true;
    return (
      this._hasPermission('beneficiaries.documents.view') &&
      this._canAccessBranch(beneficiary.branchId || beneficiary.branch_id)
    );
  }

  /**
   * رفع مستندات المستفيد
   */
  canUploadDocuments(beneficiary) {
    if (!beneficiary) return false;
    if (this.isSuperAdmin) return true;
    return (
      this._hasPermission('beneficiaries.documents.upload') &&
      this._canAccessBranch(beneficiary.branchId || beneficiary.branch_id)
    );
  }

  /**
   * حذف مستندات المستفيد
   */
  canDeleteDocuments(beneficiary) {
    if (!beneficiary) return false;
    if (this.isSuperAdmin) return true;
    return (
      this._hasPermission('beneficiaries.documents.delete') &&
      this._canAccessBranch(beneficiary.branchId || beneficiary.branch_id)
    );
  }

  /**
   * إدارة أولياء الأمور
   */
  canManageGuardians() {
    if (this.isSuperAdmin) return true;
    return this._hasPermission('beneficiaries.guardians.manage');
  }

  /**
   * إدارة قائمة الانتظار
   */
  canManageWaitlist() {
    if (this.isSuperAdmin) return true;
    return this._hasPermission('beneficiaries.waitlist.manage');
  }

  /**
   * إدارة تقييمات الإعاقة
   */
  canManageAssessment(beneficiary) {
    if (!beneficiary) return false;
    if (this.isSuperAdmin) return true;
    return (
      this._hasPermission('beneficiaries.assessment.manage') &&
      this._canAccessBranch(beneficiary.branchId || beneficiary.branch_id)
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Middleware factory — لاستخدام مباشر في routes
  // ═══════════════════════════════════════════════════════════

  /**
   * Express middleware: يرفض الطلب إذا فشل اختبار policy
   *
   * @example
   * router.post('/', BeneficiaryPolicy.middleware('canCreate'));
   * router.get('/:id', BeneficiaryPolicy.middleware('canView', req => req.beneficiary));
   */
  static middleware(method, getBeneficiary = null) {
    return (req, res, next) => {
      const policy = new BeneficiaryPolicy(req.user);
      const beneficiary = getBeneficiary ? getBeneficiary(req) : null;

      let allowed;
      if (beneficiary !== null) {
        allowed = policy[method](beneficiary);
      } else {
        allowed = policy[method]();
      }

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للقيام بهذه العملية',
          code: 'BENEFICIARY_POLICY_DENIED',
        });
      }
      next();
    };
  }
}

module.exports = BeneficiaryPolicy;
