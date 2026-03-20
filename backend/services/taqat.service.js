/**
 * خدمة منصة طاقات - توظيف ذوي الإعاقة
 * Taqat Platform Service - Employment for People with Disabilities
 */

const logger = require('../utils/logger');
const {
  TaqatJobSeeker,
  TaqatJobOpportunity,
  TaqatJobApplication,
  TaqatTrainingProgram,
  TaqatEmploymentStats,
} = require('../models/taqat.models');

class TaqatService {
  // ============================================================
  // إدارة الباحثين عن عمل — Job Seekers
  // ============================================================

  async createJobSeeker(data, userId) {
    try {
      const seeker = await TaqatJobSeeker.create({
        ...data,
        createdBy: userId,
        taqatProfileStatus: 'draft',
      });
      logger.info(`Taqat job seeker created: ${seeker.nationalId}`);
      return seeker;
    } catch (error) {
      logger.error('Error creating job seeker:', error);
      throw error;
    }
  }

  async updateJobSeeker(id, data, userId) {
    try {
      const seeker = await TaqatJobSeeker.findByIdAndUpdate(
        id,
        { ...data, updatedBy: userId },
        { new: true, runValidators: true }
      );
      if (!seeker) throw new Error('الباحث عن عمل غير موجود');
      return seeker;
    } catch (error) {
      logger.error('Error updating job seeker:', error);
      throw error;
    }
  }

  async getJobSeekers(filters = {}, page = 1, limit = 20) {
    try {
      const query = { isDeleted: false };
      if (filters.disabilityType) query.disabilityType = filters.disabilityType;
      if (filters.status) query.taqatProfileStatus = filters.status;
      if (filters.city) query.city = filters.city;
      if (filters.educationLevel) query['education.level'] = filters.educationLevel;
      if (filters.search) {
        query.$or = [
          { 'fullName.ar': { $regex: filters.search, $options: 'i' } },
          { 'fullName.en': { $regex: filters.search, $options: 'i' } },
          { nationalId: filters.search },
        ];
      }

      const [seekers, total] = await Promise.all([
        TaqatJobSeeker.find(query)
          .populate('beneficiary', 'name')
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ createdAt: -1 }),
        TaqatJobSeeker.countDocuments(query),
      ]);

      return { seekers, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch (error) {
      logger.error('Error fetching job seekers:', error);
      throw error;
    }
  }

  async getJobSeekerById(id) {
    try {
      const seeker = await TaqatJobSeeker.findById(id).populate('beneficiary').populate('student');
      if (!seeker) throw new Error('الباحث عن عمل غير موجود');
      return seeker;
    } catch (error) {
      logger.error('Error fetching job seeker:', error);
      throw error;
    }
  }

  async assessEmploymentReadiness(seekerId, assessmentData, userId) {
    try {
      const seeker = await TaqatJobSeeker.findById(seekerId);
      if (!seeker) throw new Error('الباحث عن عمل غير موجود');

      // حساب درجة الجاهزية
      let score = 0;
      if (seeker.education?.level) {
        const educationScores = {
          none: 0,
          primary: 5,
          intermediate: 10,
          secondary: 20,
          diploma: 35,
          bachelor: 50,
          master: 60,
          phd: 70,
        };
        score += educationScores[seeker.education.level] || 0;
      }
      if (seeker.skills?.length) score += Math.min(seeker.skills.length * 5, 15);
      if (seeker.certifications?.length) score += Math.min(seeker.certifications.length * 5, 10);
      if (seeker.trainingPrograms?.length) score += Math.min(seeker.trainingPrograms.length * 3, 5);

      seeker.employmentReadiness = {
        score: Math.min(score, 100),
        assessedAt: new Date(),
        assessedBy: userId,
        strengths: assessmentData.strengths || [],
        areasForImprovement: assessmentData.areasForImprovement || [],
        recommendedTraining: assessmentData.recommendedTraining || [],
      };

      await seeker.save();
      return seeker;
    } catch (error) {
      logger.error('Error assessing employment readiness:', error);
      throw error;
    }
  }

  // ============================================================
  // إدارة الفرص الوظيفية — Job Opportunities
  // ============================================================

  async createJobOpportunity(data, userId) {
    try {
      const job = await TaqatJobOpportunity.create({ ...data, createdBy: userId });
      logger.info(`Job opportunity created: ${job.title?.ar}`);
      return job;
    } catch (error) {
      logger.error('Error creating job opportunity:', error);
      throw error;
    }
  }

  async updateJobOpportunity(id, data, _userId) {
    try {
      const job = await TaqatJobOpportunity.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
      if (!job) throw new Error('الفرصة الوظيفية غير موجودة');
      return job;
    } catch (error) {
      logger.error('Error updating job opportunity:', error);
      throw error;
    }
  }

  async getJobOpportunities(filters = {}, page = 1, limit = 20) {
    try {
      const query = { isDeleted: false };
      if (filters.status) query.status = filters.status;
      if (filters.disabilityType) query.suitableDisabilityTypes = filters.disabilityType;
      if (filters.jobType) query.jobType = filters.jobType;
      if (filters.sector) query.sector = filters.sector;
      if (filters.location) query.location = { $regex: filters.location, $options: 'i' };
      if (filters.hadafSupported !== undefined) query.hadafSupported = filters.hadafSupported;
      if (filters.search) {
        query.$or = [
          { 'title.ar': { $regex: filters.search, $options: 'i' } },
          { 'title.en': { $regex: filters.search, $options: 'i' } },
          { 'employer.name': { $regex: filters.search, $options: 'i' } },
        ];
      }

      const [jobs, total] = await Promise.all([
        TaqatJobOpportunity.find(query)
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ publishedAt: -1, createdAt: -1 }),
        TaqatJobOpportunity.countDocuments(query),
      ]);

      return { jobs, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch (error) {
      logger.error('Error fetching job opportunities:', error);
      throw error;
    }
  }

  async matchJobsToSeeker(seekerId) {
    try {
      const seeker = await TaqatJobSeeker.findById(seekerId);
      if (!seeker) throw new Error('الباحث عن عمل غير موجود');

      const matchQuery = {
        status: 'published',
        isDeleted: false,
        suitableDisabilityTypes: seeker.disabilityType,
      };

      if (seeker.preferredCities?.length) {
        matchQuery.location = { $in: seeker.preferredCities };
      }

      const jobs = await TaqatJobOpportunity.find(matchQuery).limit(50);

      // حساب نسبة التطابق لكل وظيفة
      const matchedJobs = jobs.map(job => {
        let score = 50; // أساسي لتطابق نوع الإعاقة

        // تطابق المؤهل
        const eduOrder = [
          'none',
          'primary',
          'intermediate',
          'secondary',
          'diploma',
          'bachelor',
          'master',
          'phd',
        ];
        const seekerEdu = eduOrder.indexOf(seeker.education?.level || 'none');
        const jobEdu = eduOrder.indexOf(job.requiredEducation || 'none');
        if (seekerEdu >= jobEdu) score += 20;

        // تطابق المهارات
        if (job.requiredSkills?.length && seeker.skills?.length) {
          const seekerSkillNames = seeker.skills.map(s => s.name.toLowerCase());
          const matched = job.requiredSkills.filter(s =>
            seekerSkillNames.includes(s.toLowerCase())
          );
          score += Math.round((matched.length / job.requiredSkills.length) * 20);
        }

        // تطابق المدينة
        if (seeker.preferredCities?.includes(job.location)) score += 10;

        return { job, matchScore: Math.min(score, 100) };
      });

      // ترتيب حسب التطابق
      matchedJobs.sort((a, b) => b.matchScore - a.matchScore);

      return matchedJobs.slice(0, 20);
    } catch (error) {
      logger.error('Error matching jobs to seeker:', error);
      throw error;
    }
  }

  // ============================================================
  // طلبات التوظيف — Job Applications
  // ============================================================

  async submitApplication(seekerId, jobId, applicationData, userId) {
    try {
      const [seeker, job] = await Promise.all([
        TaqatJobSeeker.findById(seekerId),
        TaqatJobOpportunity.findById(jobId),
      ]);

      if (!seeker) throw new Error('الباحث عن عمل غير موجود');
      if (!job) throw new Error('الفرصة الوظيفية غير موجودة');
      if (job.status !== 'published') throw new Error('الفرصة الوظيفية مغلقة');

      const application = await TaqatJobApplication.create({
        jobSeeker: seekerId,
        jobOpportunity: jobId,
        coverLetter: applicationData.coverLetter,
        status: 'submitted',
        statusHistory: [
          {
            status: 'submitted',
            changedBy: userId,
            notes: 'تم تقديم الطلب',
          },
        ],
        createdBy: userId,
      });

      // تحديث عداد التقديمات
      await TaqatJobOpportunity.findByIdAndUpdate(jobId, { $inc: { applicationsCount: 1 } });

      return application;
    } catch (error) {
      logger.error('Error submitting application:', error);
      throw error;
    }
  }

  async updateApplicationStatus(applicationId, newStatus, notes, userId) {
    try {
      const application = await TaqatJobApplication.findById(applicationId);
      if (!application) throw new Error('الطلب غير موجود');

      application.status = newStatus;
      application.statusHistory.push({
        status: newStatus,
        changedAt: new Date(),
        changedBy: userId,
        notes,
      });

      if (newStatus === 'hired') {
        application.postHiring = {
          actualStartDate: new Date(),
          retentionStatus: 'probation',
        };
        // تحديث حالة الباحث
        await TaqatJobSeeker.findByIdAndUpdate(application.jobSeeker, {
          taqatProfileStatus: 'employed',
        });
        await TaqatJobOpportunity.findByIdAndUpdate(application.jobOpportunity, {
          $inc: { hiredCount: 1 },
        });
      }

      if (newStatus === 'rejected') {
        application.rejectionReason = notes;
      }

      await application.save();
      return application;
    } catch (error) {
      logger.error('Error updating application status:', error);
      throw error;
    }
  }

  async getApplications(filters = {}, page = 1, limit = 20) {
    try {
      const query = { isDeleted: false };
      if (filters.jobSeeker) query.jobSeeker = filters.jobSeeker;
      if (filters.jobOpportunity) query.jobOpportunity = filters.jobOpportunity;
      if (filters.status) query.status = filters.status;

      const [applications, total] = await Promise.all([
        TaqatJobApplication.find(query)
          .populate('jobSeeker', 'fullName nationalId disabilityType')
          .populate('jobOpportunity', 'title employer.name jobType')
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ createdAt: -1 }),
        TaqatJobApplication.countDocuments(query),
      ]);

      return { applications, total, page, limit };
    } catch (error) {
      logger.error('Error fetching applications:', error);
      throw error;
    }
  }

  // ============================================================
  // برامج التدريب — Training Programs
  // ============================================================

  async createTrainingProgram(data, userId) {
    try {
      const program = await TaqatTrainingProgram.create({ ...data, createdBy: userId });
      return program;
    } catch (error) {
      logger.error('Error creating training program:', error);
      throw error;
    }
  }

  async getTrainingPrograms(filters = {}) {
    try {
      const query = { isDeleted: false };
      if (filters.status) query.status = filters.status;
      if (filters.disabilityType) query.targetDisabilityTypes = filters.disabilityType;
      if (filters.programType) query.programType = filters.programType;

      return await TaqatTrainingProgram.find(query).sort({ startDate: -1 });
    } catch (error) {
      logger.error('Error fetching training programs:', error);
      throw error;
    }
  }

  // ============================================================
  // الإحصائيات — Statistics & Dashboard
  // ============================================================

  async generateEmploymentStats(period, periodType) {
    try {
      const [seekers, activeSeekers, applications, hired] = await Promise.all([
        TaqatJobSeeker.countDocuments({ isDeleted: false }),
        TaqatJobSeeker.countDocuments({ taqatProfileStatus: 'active', isDeleted: false }),
        TaqatJobApplication.countDocuments({ isDeleted: false }),
        TaqatJobApplication.countDocuments({ status: 'hired', isDeleted: false }),
      ]);

      // تفصيل حسب نوع الإعاقة
      const byDisabilityType = await TaqatJobSeeker.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$disabilityType',
            seekers: { $sum: 1 },
          },
        },
      ]);

      const stats = await TaqatEmploymentStats.findOneAndUpdate(
        { period, periodType },
        {
          period,
          periodType,
          totalJobSeekers: seekers,
          activeJobSeekers: activeSeekers,
          totalApplications: applications,
          totalHired: hired,
          employmentRate: seekers > 0 ? Math.round((hired / seekers) * 100 * 100) / 100 : 0,
          byDisabilityType: byDisabilityType.map(d => ({
            type: d._id,
            seekers: d.seekers,
            applications: 0,
            hired: 0,
            rate: 0,
          })),
          generatedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      return stats;
    } catch (error) {
      logger.error('Error generating employment stats:', error);
      throw error;
    }
  }

  async getDashboardStats() {
    try {
      const [
        totalSeekers,
        activeSeekers,
        employedSeekers,
        openJobs,
        totalApplications,
        pendingApplications,
        activeTraining,
      ] = await Promise.all([
        TaqatJobSeeker.countDocuments({ isDeleted: false }),
        TaqatJobSeeker.countDocuments({ taqatProfileStatus: 'active', isDeleted: false }),
        TaqatJobSeeker.countDocuments({ taqatProfileStatus: 'employed', isDeleted: false }),
        TaqatJobOpportunity.countDocuments({ status: 'published', isDeleted: false }),
        TaqatJobApplication.countDocuments({ isDeleted: false }),
        TaqatJobApplication.countDocuments({
          status: { $in: ['submitted', 'under_review'] },
          isDeleted: false,
        }),
        TaqatTrainingProgram.countDocuments({ status: 'in_progress', isDeleted: false }),
      ]);

      // التوزيع حسب نوع الإعاقة
      const disabilityDistribution = await TaqatJobSeeker.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$disabilityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      return {
        overview: {
          totalSeekers,
          activeSeekers,
          employedSeekers,
          openJobs,
          totalApplications,
          pendingApplications,
          activeTraining,
        },
        employmentRate:
          totalSeekers > 0 ? Math.round((employedSeekers / totalSeekers) * 100 * 100) / 100 : 0,
        disabilityDistribution,
      };
    } catch (error) {
      logger.error('Error fetching Taqat dashboard:', error);
      throw error;
    }
  }
}

module.exports = new TaqatService();
