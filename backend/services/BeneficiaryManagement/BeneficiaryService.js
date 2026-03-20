/* eslint-disable no-unused-vars */
// backend/services/BeneficiaryManagement/BeneficiaryService.js

/**
 * خدمة إدارة المستفيدين والطلاب
 * Comprehensive Beneficiary Management Service
 *
 * التاريخ: فبراير 15، 2026
 * الإصدار: 1.0
 * الحالة: عملي وشامل
 */

const mongoose = require('mongoose');
const { EventEmitter } = require('events');
const crypto = require('crypto');
const { escapeRegex } = require('../../utils/sanitize');

class BeneficiaryService extends EventEmitter {
  constructor(db) {
    super();
    this.db = db;
    this.validateInputs = true;
    this.autoNotify = true;
    this.logger = null;
  }

  /**
   * إنشاء مستفيد جديد
   * Create new beneficiary with complete profile
   */
  async createBeneficiary(beneficiaryData) {
    try {
      // التحقق من صحة البيانات
      this.validateBeneficiaryData(beneficiaryData);

      // التحقق من عدم وجود هوية مكررة
      const existingBeneficiary = await this.db.collection('beneficiaries').findOne({
        'personalData.idNumber': beneficiaryData.personalData.idNumber,
      });

      if (existingBeneficiary) {
        throw new Error('رقم الهوية موجود بالفعل | ID Number already exists');
      }

      // إنشاء الملف الشخصي الأساسي
      const beneficiary = {
        ...beneficiaryData,
        personalData: {
          ...beneficiaryData.personalData,
          accountStatus: 'active',
          verificationStatus: 'pending',
        },
        performanceMetrics: {
          cumulativeGPA: 0,
          currentSemesterGPA: 0,
          totalCreditsEarned: 0,
          totalCreditsRequired: 0,
          academicStatus: 'pending',
          lastUpdated: new Date(),
        },
        attendanceRate: {
          totalClasses: 0,
          attendedClasses: 0,
          percentage: 0,
          lastUpdated: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        auditLog: [
          {
            action: 'created',
            timestamp: new Date(),
            details: 'Initial beneficiary creation',
          },
        ],
      };

      // حفظ في قاعدة البيانات
      const result = await this.db.collection('beneficiaries').insertOne(beneficiary);

      // إرسال إشعار البريد الإلكتروني
      if (this.autoNotify) {
        this.emit('beneficiary:created', {
          beneficiaryId: result.insertedId,
          email: beneficiaryData.personalData.email,
          name: `${beneficiaryData.personalData.firstName} ${beneficiaryData.personalData.lastName}`,
        });
      }

      return result.insertedId;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * تحديث بيانات المستفيد
   * Update beneficiary information
   */
  async updateBeneficiary(beneficiaryId, updateData) {
    try {
      const beneficiaryObjectId = new mongoose.Types.ObjectId(beneficiaryId);

      // حفظ البيانات القديمة للمقارنة
      const oldBeneficiary = await this.db.collection('beneficiaries').findOne({
        _id: beneficiaryObjectId,
      });

      if (!oldBeneficiary) {
        throw new Error('المستفيد غير موجود | Beneficiary not found');
      }

      // تحديث البيانات
      const updateResult = await this.db.collection('beneficiaries').updateOne(
        { _id: beneficiaryObjectId },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
          $push: {
            auditLog: {
              action: 'updated',
              timestamp: new Date(),
              changes: this.compareObjects(oldBeneficiary, updateData),
            },
          },
        }
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error('لم يتم تحديث أي حقول | No fields were updated');
      }

      // إرسال إشعار التحديث
      if (this.autoNotify) {
        this.emit('beneficiary:updated', {
          beneficiaryId,
          email: updateData.personalData?.email || oldBeneficiary.personalData.email,
          changedFields: Object.keys(updateData),
        });
      }

      return updateResult;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * الحصول على ملف المستفيد الكامل
   * Get complete beneficiary profile
   */
  async getBeneficiaryProfile(beneficiaryId) {
    try {
      const beneficiaryObjectId = new mongoose.Types.ObjectId(beneficiaryId);

      // جلب البيانات الأساسية
      const beneficiary = await this.db.collection('beneficiaries').findOne({
        _id: beneficiaryObjectId,
      });

      if (!beneficiary) {
        throw new Error('المستفيد غير موجود | Beneficiary not found');
      }

      // جلب السجلات الأكاديمية
      const academicRecords = await this.db
        .collection('academicRecords')
        .find({
          beneficiaryId: beneficiaryObjectId,
        })
        .toArray();

      // جلب الحضور
      const attendance = await this.db
        .collection('attendanceRecords')
        .find({
          beneficiaryId: beneficiaryObjectId,
        })
        .toArray();

      // جلب الإنجازات
      const achievements = await this.db
        .collection('achievements')
        .find({
          beneficiaryId: beneficiaryObjectId,
        })
        .toArray();

      // جلب المنح الدراسية
      const scholarships = await this.db
        .collection('scholarships')
        .find({
          beneficiaryId: beneficiaryObjectId,
        })
        .toArray();

      // حساب الإحصائيات
      const stats = await this.calculateBeneficiaryStatistics(beneficiaryId);

      return {
        personalInfo: beneficiary.personalData,
        academicInfo: beneficiary.academicInfo,
        financialInfo: beneficiary.financialInfo,
        performanceMetrics: beneficiary.performanceMetrics,
        attendanceRate: beneficiary.attendanceRate,
        academicRecords,
        attendance,
        achievements,
        scholarships,
        statistics: stats,
        lastUpdated: beneficiary.updatedAt,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * البحث والتصفية المتقدم
   * Advanced search and filtering
   */
  async searchBeneficiaries(filters = {}) {
    try {
      const query = this.buildSearchQuery(filters);

      const benefits = await this.db
        .collection('beneficiaries')
        .find(query)
        .sort(filters.sortBy || { createdAt: -1 })
        .skip(filters.skip || 0)
        .limit(filters.limit || 50)
        .toArray();

      // حساب الإجمالي
      const total = await this.db.collection('beneficiaries').countDocuments(query);

      return {
        results: benefits,
        total,
        page: Math.ceil((filters.skip || 0) / (filters.limit || 50)) + 1,
        pageSize: filters.limit || 50,
        totalPages: Math.ceil(total / (filters.limit || 50)),
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * تقييم الحالة الصحية الأكاديمية
   * Evaluate academic health status
   */
  async evaluateBeneficiaryStatus(beneficiaryId) {
    try {
      const beneficiary = await this.db.collection('beneficiaries').findOne({
        _id: new mongoose.Types.ObjectId(beneficiaryId),
      });

      if (!beneficiary) {
        throw new Error('المستفيد غير موجود');
      }

      const gpa = beneficiary.performanceMetrics.cumulativeGPA;
      const attendancePercentage = beneficiary.attendanceRate.percentage;

      let academicStatus, riskLevel;
      const recommendations = [];

      // تحديد الحالة الأكاديمية
      if (gpa >= 3.7 && attendancePercentage >= 95) {
        academicStatus = 'excellent';
        riskLevel = 'none';
      } else if (gpa >= 3.0 && attendancePercentage >= 90) {
        academicStatus = 'good';
        riskLevel = 'low';
      } else if (gpa >= 2.0 && attendancePercentage >= 80) {
        academicStatus = 'satisfactory';
        riskLevel = 'medium';
        recommendations.push('Consider additional study support');
      } else if (gpa >= 1.5 && attendancePercentage >= 70) {
        academicStatus = 'warning';
        riskLevel = 'high';
        recommendations.push('Enroll in tutoring programs immediately');
        recommendations.push('Meet with academic advisor');
      } else {
        academicStatus = 'probation';
        riskLevel = 'critical';
        recommendations.push('Urgent intervention required');
        recommendations.push('Consider course load reduction');
        recommendations.push('Mandatory counseling sessions');
      }

      // تحديث الحالة
      await this.db.collection('beneficiaries').updateOne(
        { _id: new mongoose.Types.ObjectId(beneficiaryId) },
        {
          $set: {
            'performanceMetrics.academicStatus': academicStatus,
            'performanceMetrics.riskLevel': riskLevel,
            'performanceMetrics.lastEvaluation': new Date(),
          },
        }
      );

      return {
        beneficiaryId,
        academicStatus,
        gpa,
        attendancePercentage,
        riskLevel,
        recommendations,
        evaluatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * استخراج التقارير الشاملة
   * Generate comprehensive reports
   */
  async generateBeneficiaryReport(beneficiaryId, reportType = 'comprehensive') {
    try {
      const beneficiary = await this.getBeneficiaryProfile(beneficiaryId);

      let report = {
        beneficiaryId,
        generatedAt: new Date(),
        reportType,
      };

      switch (reportType) {
        case 'academic':
          report = {
            ...report,
            personalInfo: beneficiary.personalInfo,
            academicInfo: beneficiary.academicInfo,
            performanceMetrics: beneficiary.performanceMetrics,
            academicRecords: beneficiary.academicRecords,
          };
          break;

        case 'attendance':
          report = {
            ...report,
            personalInfo: beneficiary.personalInfo,
            attendanceRate: beneficiary.attendanceRate,
            attendance: beneficiary.attendance,
          };
          break;

        case 'financial':
          report = {
            ...report,
            personalInfo: beneficiary.personalInfo,
            financialInfo: beneficiary.financialInfo,
            scholarships: beneficiary.scholarships,
          };
          break;

        case 'achievements':
          report = {
            ...report,
            personalInfo: beneficiary.personalInfo,
            achievements: beneficiary.achievements,
            statistics: beneficiary.statistics,
          };
          break;

        case 'comprehensive':
        default:
          report = beneficiary;
          break;
      }

      // حفظ التقرير
      await this.db.collection('generatedReports').insertOne({
        beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId),
        reportType,
        content: report,
        createdAt: new Date(),
      });

      return report;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * طرق مساعدة (Helper Methods)
   */

  validateBeneficiaryData(data) {
    if (!data.personalData) throw new Error('Personal data is required');
    if (!data.personalData.firstName) throw new Error('First name is required');
    if (!data.personalData.lastName) throw new Error('Last name is required');
    if (!data.personalData.email) throw new Error('Email is required');
    if (!data.personalData.idNumber) throw new Error('ID Number is required');
    return true;
  }

  compareObjects(oldObj, newObj) {
    const changes = {};
    for (const key in newObj) {
      if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        changes[key] = {
          old: oldObj[key],
          new: newObj[key],
        };
      }
    }
    return changes;
  }

  buildSearchQuery(filters) {
    const query = {};

    if (filters.search) {
      query.$or = [
        { 'personalData.firstName': { $regex: escapeRegex(filters.search), $options: 'i' } },
        { 'personalData.lastName': { $regex: escapeRegex(filters.search), $options: 'i' } },
        { 'personalData.idNumber': filters.search },
      ];
    }

    if (filters.program) {
      query['academicInfo.currentProgram'] = filters.program;
    }

    if (filters.status) {
      query['academicInfo.status'] = filters.status;
    }

    if (filters.year) {
      query['academicInfo.currentYear'] = filters.year;
    }

    return query;
  }

  async calculateBeneficiaryStatistics(beneficiaryId) {
    try {
      const beneficiaryObjectId = new mongoose.Types.ObjectId(beneficiaryId);

      const grades = await this.db
        .collection('grades')
        .find({
          beneficiaryId: beneficiaryObjectId,
        })
        .toArray();

      const achievements = await this.db.collection('achievements').countDocuments({
        beneficiaryId: beneficiaryObjectId,
      });

      const scholarships = await this.db.collection('scholarships').countDocuments({
        beneficiaryId: beneficiaryObjectId,
        status: 'active',
      });

      return {
        totalCourses: grades.length,
        averageGrade:
          grades.length > 0
            ? (grades.reduce((sum, g) => sum + g.grade, 0) / grades.length).toFixed(2)
            : 0,
        passedCourses: grades.filter(g => g.grade >= 2.0).length,
        failedCourses: grades.filter(g => g.grade < 2.0).length,
        achievements,
        activeScholarships: scholarships,
      };
    } catch (error) {
      return {};
    }
  }
}

module.exports = BeneficiaryService;
