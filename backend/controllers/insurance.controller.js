/**
 * Insurance Controller — وحدة التحكم بالتأمين
 *
 * ✅ CRUD كامل لوثائق التأمين
 * ✅ إدارة المطالبات (إنشاء، متابعة، موافقة، رفض)
 * ✅ تجديد الوثائق وتتبع الانتهاء
 * ✅ إحصائيات ولوحة تحكم
 * ✅ ربط مع شركات التأمين السعودية
 * ✅ عروض أسعار
 */

const InsurancePolicy = require('../models/InsurancePolicy');
const {
  SAUDI_INSURANCE_COMPANIES,
  INSURANCE_VIOLATION_CODES,
} = require('../models/InsurancePolicy');
const logger = require('../utils/logger');

class InsuranceController {
  // ═══════════════════════════════════════════════════════════════════════
  // CRUD الوثائق
  // ═══════════════════════════════════════════════════════════════════════

  /** إنشاء وثيقة تأمين جديدة */
  static async createPolicy(req, res) {
    try {
      const policy = new InsurancePolicy({
        ...req.body,
        tenantId: req.user?.tenantId,
        createdBy: req.user?.userId || req.user?.id,
      });
      await policy.save();

      res.status(201).json({
        success: true,
        message: 'تم إنشاء وثيقة التأمين بنجاح',
        data: policy,
      });
    } catch (error) {
      logger.error(`خطأ في إنشاء وثيقة التأمين: ${error.message}`);
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'رقم الوثيقة موجود مسبقاً' });
      }
      res
        .status(400)
        .json({ success: false, message: 'فشل إنشاء وثيقة التأمين', error: error.message });
    }
  }

  /** جلب جميع الوثائق */
  static async getAllPolicies(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        companyKey,
        policyType,
        vehicleId,
        search,
        sortBy = 'endDate',
        sortOrder = 'asc',
      } = req.query;

      const query = {};
      if (status) query.status = status;
      if (companyKey) query.companyKey = companyKey;
      if (policyType) query.policyType = policyType;
      if (vehicleId) query.vehicle = vehicleId;

      if (search) {
        query.$or = [
          { policyNumber: { $regex: search, $options: 'i' } },
          { vehiclePlateNumber: { $regex: search, $options: 'i' } },
          { ownerName: { $regex: search, $options: 'i' } },
          { companyNameAr: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [policies, total] = await Promise.all([
        InsurancePolicy.find(query).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
        InsurancePolicy.countDocuments(query),
      ]);

      // إضافة الحقول الافتراضية يدوياً لـ lean
      const enriched = policies.map(p => ({
        ...p,
        daysRemaining: Math.ceil((new Date(p.endDate) - new Date()) / 86400000),
        isActive: p.status === 'active' && new Date(p.endDate) > new Date(),
        isExpiringSoon: (() => {
          const d = Math.ceil((new Date(p.endDate) - new Date()) / 86400000);
          return d > 0 && d <= 30;
        })(),
        alertLevel: (() => {
          const d = Math.ceil((new Date(p.endDate) - new Date()) / 86400000);
          if (d < 0) return 'expired';
          if (d <= 7) return 'critical';
          if (d <= 15) return 'high';
          if (d <= 30) return 'medium';
          return 'normal';
        })(),
      }));

      res.json({
        success: true,
        data: {
          policies: enriched,
          total,
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      logger.error(`خطأ في جلب وثائق التأمين: ${error.message}`);
      res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  /** جلب وثيقة واحدة */
  static async getPolicy(req, res) {
    try {
      const policy = await InsurancePolicy.findById(req.params.id);
      if (!policy) return res.status(404).json({ success: false, message: 'الوثيقة غير موجودة' });
      res.json({ success: true, data: policy });
    } catch (error) {
      res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  /** تحديث وثيقة */
  static async updatePolicy(req, res) {
    try {
      const policy = await InsurancePolicy.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user?.userId || req.user?.id },
        { new: true, runValidators: true }
      );
      if (!policy) return res.status(404).json({ success: false, message: 'الوثيقة غير موجودة' });
      res.json({ success: true, message: 'تم تحديث الوثيقة بنجاح', data: policy });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث الوثيقة', error: error.message });
    }
  }

  /** حذف وثيقة */
  static async deletePolicy(req, res) {
    try {
      const policy = await InsurancePolicy.findByIdAndDelete(req.params.id);
      if (!policy) return res.status(404).json({ success: false, message: 'الوثيقة غير موجودة' });
      res.json({ success: true, message: 'تم حذف الوثيقة بنجاح' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'حدث خطأ في الحذف' });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // المطالبات
  // ═══════════════════════════════════════════════════════════════════════

  /** إضافة مطالبة لوثيقة */
  static async addClaim(req, res) {
    try {
      const policy = await InsurancePolicy.findById(req.params.id);
      if (!policy) return res.status(404).json({ success: false, message: 'الوثيقة غير موجودة' });

      // توليد رقم مطالبة تلقائي
      const claimNumber = `CLM-${policy.companyCode}-${Date.now().toString(36).toUpperCase()}`;

      const typeArMap = {
        accident: 'حادث مروري',
        theft: 'سرقة',
        natural_disaster: 'كارثة طبيعية',
        fire: 'حريق',
        vandalism: 'تخريب',
        glass: 'كسر زجاج',
        tow: 'سحب / قطر',
        third_party_liability: 'مسؤولية الطرف الثالث',
        bodily_injury: 'إصابة جسدية',
        total_loss: 'خسارة كلية',
      };

      const claim = {
        ...req.body,
        claimNumber,
        typeAr: typeArMap[req.body.type] || req.body.type,
        statusAr: 'مقدمة',
        status: 'submitted',
        reportDate: new Date(),
        timeline: [
          {
            action: 'تقديم المطالبة',
            date: new Date(),
            notes: 'تم تقديم المطالبة عبر النظام',
            performedBy: req.user?.fullName || 'النظام',
          },
        ],
      };

      policy.claims.push(claim);
      await policy.save();

      res.status(201).json({
        success: true,
        message: 'تم تقديم المطالبة بنجاح',
        data: { claimNumber, claim: policy.claims[policy.claims.length - 1] },
      });
    } catch (error) {
      logger.error(`خطأ في تقديم المطالبة: ${error.message}`);
      res.status(400).json({ success: false, message: 'فشل تقديم المطالبة', error: error.message });
    }
  }

  /** تحديث حالة المطالبة */
  static async updateClaimStatus(req, res) {
    try {
      const { id, claimId } = req.params;
      const { status, notes, approvedAmount, rejectionReason } = req.body;

      const policy = await InsurancePolicy.findById(id);
      if (!policy) return res.status(404).json({ success: false, message: 'الوثيقة غير موجودة' });

      const claim = policy.claims.id(claimId);
      if (!claim) return res.status(404).json({ success: false, message: 'المطالبة غير موجودة' });

      const statusArMap = {
        submitted: 'مقدمة',
        under_review: 'قيد المراجعة',
        approved: 'مقبولة',
        rejected: 'مرفوضة',
        paid: 'مدفوعة',
        appealed: 'متظلم عليها',
        closed: 'مغلقة',
      };

      claim.status = status;
      claim.statusAr = statusArMap[status] || status;
      if (approvedAmount !== undefined) claim.approvedAmount = approvedAmount;
      if (rejectionReason) claim.rejectionReason = rejectionReason;
      if (notes) claim.reviewNotes = notes;

      claim.timeline.push({
        action: `تغيير الحالة إلى: ${statusArMap[status] || status}`,
        date: new Date(),
        notes: notes || '',
        performedBy: req.user?.fullName || 'النظام',
      });

      if (status === 'paid' && approvedAmount) {
        claim.paidAmount = approvedAmount;
      }

      await policy.save();

      res.json({
        success: true,
        message: `تم تحديث حالة المطالبة إلى: ${statusArMap[status]}`,
        data: claim,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث المطالبة', error: error.message });
    }
  }

  /** جلب مطالبات وثيقة */
  static async getPolicyClaims(req, res) {
    try {
      const policy = await InsurancePolicy.findById(req.params.id).select(
        'claims policyNumber companyNameAr'
      );
      if (!policy) return res.status(404).json({ success: false, message: 'الوثيقة غير موجودة' });

      res.json({
        success: true,
        data: {
          policyNumber: policy.policyNumber,
          company: policy.companyNameAr,
          claims: policy.claims,
          totalClaims: policy.claims.length,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // الإحصائيات والتقارير
  // ═══════════════════════════════════════════════════════════════════════

  /** إحصائيات شاملة */
  static async getStatistics(req, res) {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000);

      const [
        totalPolicies,
        activePolicies,
        expiredPolicies,
        expiringSoon,
        allPolicies,
        claimStats,
      ] = await Promise.all([
        InsurancePolicy.countDocuments(),
        InsurancePolicy.countDocuments({ status: 'active', endDate: { $gt: now } }),
        InsurancePolicy.countDocuments({ $or: [{ status: 'expired' }, { endDate: { $lt: now } }] }),
        InsurancePolicy.countDocuments({
          status: 'active',
          endDate: { $lte: thirtyDaysFromNow, $gt: now },
        }),
        InsurancePolicy.find().lean(),
        InsurancePolicy.aggregate([
          { $unwind: '$claims' },
          {
            $group: {
              _id: '$claims.status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$claims.approvedAmount' },
              totalPaid: { $sum: '$claims.paidAmount' },
            },
          },
        ]),
      ]);

      // إحصائيات حسب الشركة
      const companyStats = {};
      allPolicies.forEach(p => {
        const key = p.companyKey || 'unknown';
        if (!companyStats[key]) {
          companyStats[key] = { count: 0, totalPremium: 0, nameAr: p.companyNameAr || key };
        }
        companyStats[key].count++;
        companyStats[key].totalPremium += p.totalPremium || 0;
      });

      // إحصائيات حسب نوع الوثيقة
      const typeStats = {};
      allPolicies.forEach(p => {
        const t = p.policyType || 'unknown';
        if (!typeStats[t]) typeStats[t] = { count: 0, totalPremium: 0 };
        typeStats[t].count++;
        typeStats[t].totalPremium += p.totalPremium || 0;
      });

      const totalPremiums = allPolicies.reduce((sum, p) => sum + (p.totalPremium || 0), 0);
      const totalClaims = claimStats.reduce((sum, c) => sum + c.count, 0);
      const totalClaimPaid = claimStats.reduce((sum, c) => sum + (c.totalPaid || 0), 0);

      res.json({
        success: true,
        data: {
          overview: {
            totalPolicies,
            activePolicies,
            expiredPolicies,
            expiringSoon,
            totalPremiums,
            totalClaims,
            totalClaimPaid,
            lossRatio:
              totalPremiums > 0 ? ((totalClaimPaid / totalPremiums) * 100).toFixed(2) + '%' : '0%',
          },
          byCompany: Object.entries(companyStats).map(([key, val]) => ({
            companyKey: key,
            ...val,
          })),
          byType: Object.entries(typeStats).map(([type, val]) => ({
            type,
            typeAr:
              type === 'third_party'
                ? 'طرف ثالث'
                : type === 'comprehensive'
                  ? 'شامل'
                  : type === 'premium'
                    ? 'بريميوم'
                    : type,
            ...val,
          })),
          claims: claimStats.map(c => ({
            status: c._id,
            count: c.count,
            totalAmount: c.totalAmount,
            totalPaid: c.totalPaid,
          })),
        },
      });
    } catch (error) {
      logger.error(`خطأ في إحصائيات التأمين: ${error.message}`);
      res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  /** وثائق تنتهي قريباً */
  static async getExpiringPolicies(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const policies = await InsurancePolicy.getExpiringPolicies(days, req.user?.tenantId);

      res.json({
        success: true,
        data: policies.map(p => ({
          _id: p._id,
          policyNumber: p.policyNumber,
          companyNameAr: p.companyNameAr,
          vehiclePlateNumber: p.vehiclePlateNumber,
          ownerName: p.ownerName,
          endDate: p.endDate,
          daysRemaining: p.daysRemaining,
          alertLevel: p.alertLevel,
          policyTypeAr: p.policyTypeAr,
        })),
        count: policies.length,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // التجديد وعروض الأسعار
  // ═══════════════════════════════════════════════════════════════════════

  /** تجديد وثيقة */
  static async renewPolicy(req, res) {
    try {
      const oldPolicy = await InsurancePolicy.findById(req.params.id);
      if (!oldPolicy)
        return res.status(404).json({ success: false, message: 'الوثيقة غير موجودة' });

      // إنشاء الوثيقة الجديدة
      const startDate =
        new Date(oldPolicy.endDate) > new Date() ? new Date(oldPolicy.endDate) : new Date();
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);

      // حساب NCD (خصم عدم المطالبة)
      const claimsInPeriod = oldPolicy.claims.filter(c => c.status !== 'rejected').length;
      let ncdYears = claimsInPeriod === 0 ? (oldPolicy.ncd?.years || 0) + 1 : 0;
      ncdYears = Math.min(ncdYears, 10); // حد أقصى 10 سنوات
      const ncdPercentage = Math.min(ncdYears * 5, 50); // 5% لكل سنة حتى 50%

      const newPremium = req.body.premium || oldPolicy.premium * (1 - ncdPercentage / 100);

      const newPolicy = new InsurancePolicy({
        policyNumber: req.body.policyNumber || `POL-${Date.now().toString(36).toUpperCase()}`,
        companyKey: req.body.companyKey || oldPolicy.companyKey,
        policyType: req.body.policyType || oldPolicy.policyType,
        startDate,
        endDate,
        premium: newPremium,
        coverage: req.body.coverage || oldPolicy.coverage,
        deductible: req.body.deductible ?? oldPolicy.deductible,
        vehicle: oldPolicy.vehicle,
        vehiclePlateNumber: oldPolicy.vehiclePlateNumber,
        vehicleMake: oldPolicy.vehicleMake,
        vehicleModel: oldPolicy.vehicleModel,
        vehicleYear: oldPolicy.vehicleYear,
        vehicleVIN: oldPolicy.vehicleVIN,
        owner: oldPolicy.owner,
        ownerName: oldPolicy.ownerName,
        ownerNationalId: oldPolicy.ownerNationalId,
        ownerPhone: oldPolicy.ownerPhone,
        coveredDrivers: oldPolicy.coveredDrivers,
        additionalCoverage: req.body.additionalCoverage || oldPolicy.additionalCoverage,
        ncd: { years: ncdYears, percentage: ncdPercentage, verified: false },
        renewal: { previousPolicyNumber: oldPolicy.policyNumber, renewalStatus: 'renewed' },
        tenantId: oldPolicy.tenantId,
        createdBy: req.user?.userId || req.user?.id,
      });

      // تحديث الوثيقة القديمة
      oldPolicy.status = oldPolicy.endDate < new Date() ? 'expired' : oldPolicy.status;
      oldPolicy.renewal.renewalStatus = 'renewed';
      await oldPolicy.save();

      await newPolicy.save();

      res.status(201).json({
        success: true,
        message: 'تم تجديد وثيقة التأمين بنجاح',
        data: {
          oldPolicy: {
            _id: oldPolicy._id,
            policyNumber: oldPolicy.policyNumber,
            status: oldPolicy.status,
          },
          newPolicy,
          ncd: { years: ncdYears, percentage: ncdPercentage },
        },
      });
    } catch (error) {
      logger.error(`خطأ في تجديد الوثيقة: ${error.message}`);
      res.status(400).json({ success: false, message: 'فشل تجديد الوثيقة', error: error.message });
    }
  }

  /** طلب عرض سعر من شركات التأمين */
  static async getQuote(req, res) {
    try {
      const {
        vehicleMake,
        vehicleModel,
        vehicleYear,
        policyType,
        driverAge,
        ncdYears = 0,
      } = req.body;

      // محاكاة عروض من شركات مختلفة
      const baseRates = { third_party: 800, comprehensive: 2500, premium: 4500 };
      const baseRate = baseRates[policyType] || 1500;

      // عوامل التسعير
      const ageMultiplier = vehicleYear
        ? Math.max(1, 1 + (new Date().getFullYear() - vehicleYear) * 0.03)
        : 1;
      const driverMultiplier = driverAge && driverAge < 25 ? 1.3 : 1;
      const ncdDiscount = Math.min(ncdYears * 5, 50) / 100;

      const quotes = Object.entries(SAUDI_INSURANCE_COMPANIES)
        .slice(0, 6)
        .map(([key, company]) => {
          const companyVariation = 0.85 + Math.random() * 0.3; // تباين 15% بين الشركات
          const premium = Math.round(
            baseRate * ageMultiplier * driverMultiplier * (1 - ncdDiscount) * companyVariation
          );
          const vat = Math.round(premium * 0.15);

          return {
            companyKey: key,
            companyNameAr: company.nameAr,
            companyNameEn: company.nameEn,
            companyCode: company.code,
            premium,
            vat,
            total: premium + vat,
            coverage:
              policyType === 'third_party'
                ? 10000000
                : policyType === 'comprehensive'
                  ? 500000
                  : 1000000,
            deductible:
              policyType === 'third_party' ? 0 : policyType === 'comprehensive' ? 1500 : 500,
            ncdDiscount: `${Math.round(ncdDiscount * 100)}%`,
            features:
              policyType === 'premium'
                ? [
                    'إصلاح الوكالة',
                    'سيارة بديلة',
                    'مساعدة الطريق',
                    'حماية الزجاج',
                    'تمديد دول الخليج',
                  ]
                : policyType === 'comprehensive'
                  ? ['إصلاح ورش معتمدة', 'مساعدة الطريق', 'حماية الزجاج']
                  : ['تغطية الطرف الثالث فقط'],
          };
        });

      // ترتيب حسب السعر
      quotes.sort((a, b) => a.total - b.total);

      res.json({
        success: true,
        message: 'تم الحصول على عروض الأسعار',
        data: {
          vehicleInfo: { make: vehicleMake, model: vehicleModel, year: vehicleYear },
          policyType,
          ncdDiscount: `${Math.round(ncdDiscount * 100)}%`,
          quotes,
          generatedAt: new Date(),
          validUntil: new Date(Date.now() + 7 * 86400000), // صالحة 7 أيام
        },
      });
    } catch (error) {
      logger.error(`خطأ في عرض الأسعار: ${error.message}`);
      res.status(500).json({ success: false, message: 'فشل الحصول على عروض الأسعار' });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // البيانات المرجعية
  // ═══════════════════════════════════════════════════════════════════════

  /** قائمة شركات التأمين */
  static async getInsuranceCompanies(_req, res) {
    const companies = Object.entries(SAUDI_INSURANCE_COMPANIES).map(([key, val]) => ({
      key,
      ...val,
    }));
    res.json({ success: true, data: companies });
  }

  /** أنواع الوثائق */
  static async getPolicyTypes(_req, res) {
    res.json({
      success: true,
      data: [
        {
          key: 'third_party',
          nameAr: 'تأمين ضد الغير (طرف ثالث)',
          nameEn: 'Third Party',
          description: 'التغطية الإلزامية: يشمل الأضرار المادية والجسدية للطرف الثالث فقط',
        },
        {
          key: 'comprehensive',
          nameAr: 'تأمين شامل',
          nameEn: 'Comprehensive',
          description: 'يشمل أضرار الطرف الثالث + أضرار مركبتك (سرقة، حريق، كوارث طبيعية)',
        },
        {
          key: 'premium',
          nameAr: 'تأمين بريميوم',
          nameEn: 'Premium',
          description: 'تغطية شاملة + إصلاح الوكالة + سيارة بديلة + مساعدة الطريق',
        },
      ],
    });
  }

  /** رموز مخالفات التأمين */
  static async getViolationCodes(_req, res) {
    res.json({ success: true, data: INSURANCE_VIOLATION_CODES });
  }

  /** التأمين الفعال لمركبة محددة */
  static async getVehicleInsurance(req, res) {
    try {
      const policy = await InsurancePolicy.getActiveByVehicle(req.params.vehicleId);
      res.json({
        success: true,
        data: policy || null,
        message: policy
          ? 'تم العثور على وثيقة تأمين سارية'
          : 'لا توجد وثيقة تأمين سارية لهذه المركبة',
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }
}

module.exports = InsuranceController;
