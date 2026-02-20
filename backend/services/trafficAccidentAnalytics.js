/**
 * Traffic Accident Analytics Module - وحدة تحليل الحوادث المرورية
 * تحليلات متقدمة ورؤى حول الحوادث المرورية
 */

const TrafficAccidentReport = require('../models/TrafficAccidentReport');
const logger = require('../utils/logger');

class TrafficAccidentAnalytics {
  /**
   * تحليل الاتجاهات على مدى الوقت
   */
  async analyzeTimelineTrends(startDate, endDate) {
    try {
      const trends = await TrafficAccidentReport.aggregate([
        {
          $match: {
            archived: false,
            'accidentInfo.accidentDateTime': {
              $gte: new Date(startDate),
              $lt: new Date(endDate)
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$accidentInfo.accidentDateTime' },
              month: { $month: '$accidentInfo.accidentDateTime' },
              day: { $dayOfMonth: '$accidentInfo.accidentDateTime' }
            },
            totalReports: { $sum: 1 },
            injuries: { $sum: { $size: '$people.injuries' } },
            deaths: { $sum: '$people.deaths.count' },
            totalLoss: { $sum: '$financialImpact.totalLoss' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      return trends;
    } catch (error) {
      logger.error('Error analyzing timeline trends', { error: error.message });
      throw error;
    }
  }

  /**
   * تحليل الأماكن (Hotspots)
   */
  async analyzeHotspots(limit = 10) {
    try {
      const hotspots = await TrafficAccidentReport.aggregate([
        {
          $match: { archived: false }
        },
        {
          $group: {
            _id: {
              city: '$accidentInfo.location.city',
              address: '$accidentInfo.location.address'
            },
            count: { $sum: 1 },
            injuries: { $sum: { $size: '$people.injuries' } },
            deaths: { $sum: '$people.deaths.count' },
            avgLoss: { $avg: '$financialImpact.totalLoss' }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: limit
        }
      ]);

      return hotspots;
    } catch (error) {
      logger.error('Error analyzing hotspots', { error: error.message });
      throw error;
    }
  }

  /**
   * تحليل أنواع المخالفات
   */
  async analyzeViolationPatterns() {
    try {
      const patterns = await TrafficAccidentReport.aggregate([
        {
          $match: { archived: false }
        },
        {
          $unwind: '$violations'
        },
        {
          $group: {
            _id: '$violations.violationType',
            count: { $sum: 1 },
            severityBreakdown: {
              $push: '$violations.severity'
            },
            avgFineAmount: { $avg: '$violations.fineAmount' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return patterns;
    } catch (error) {
      logger.error('Error analyzing violation patterns', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * تحليل معدلات الإصابات والوفيات
   */
  async analyzeInjuryAndFatalityRates(filters = {}) {
    try {
      const matchStage = { archived: false };

      if (filters.startDate && filters.endDate) {
        matchStage['accidentInfo.accidentDateTime'] = {
          $gte: new Date(filters.startDate),
          $lt: new Date(filters.endDate)
        };
      }

      const stats = await TrafficAccidentReport.aggregate([
        { $match: matchStage },
        {
          $facet: {
            totalReports: [{ $count: 'count' }],
            totalInjuries: [
              {
                $group: {
                  _id: null,
                  total: { $sum: { $size: '$people.injuries' } }
                }
              }
            ],
            totalDeaths: [
              {
                $group: {
                  _id: null,
                  total: { $sum: '$people.deaths.count' }
                }
              }
            ],
            injuryBySeverity: [
              {
                $unwind: '$people.injuries'
              },
              {
                $group: {
                  _id: '$people.injuries.type',
                  count: { $sum: 1 }
                }
              }
            ]
          }
        }
      ]);

      const result = stats[0];

      // Calculate rates
      const totalReports = result.totalReports[0]?.count || 0;
      const totalInjuries = result.totalInjuries[0]?.total || 0;
      const totalDeaths = result.totalDeaths[0]?.total || 0;

      return {
        totalReports,
        totalInjuries,
        totalDeaths,
        injuryRatePerReport: totalReports > 0 ? (totalInjuries / totalReports).toFixed(2) : 0,
        fatalityRatePerReport: totalReports > 0 ? (totalDeaths / totalReports).toFixed(2) : 0,
        injuryBySeverity: result.injuryBySeverity
      };
    } catch (error) {
      logger.error('Error analyzing injury rates', { error: error.message });
      throw error;
    }
  }

  /**
   * تحليل الخسائر المالية
   */
  async analyzeFinancialImpact(filters = {}) {
    try {
      const matchStage = { archived: false };

      if (filters.severity) {
        matchStage.severity = filters.severity;
      }

      if (filters.startDate && filters.endDate) {
        matchStage['accidentInfo.accidentDateTime'] = {
          $gte: new Date(filters.startDate),
          $lt: new Date(filters.endDate)
        };
      }

      const analysis = await TrafficAccidentReport.aggregate([
        { $match: matchStage },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  totalLoss: { $sum: '$financialImpact.totalLoss' },
                  avgLoss: { $avg: '$financialImpact.totalLoss' },
                  highestLoss: { $max: '$financialImpact.totalLoss' },
                  lowestLoss: { $min: '$financialImpact.totalLoss' },
                  medicalCosts: { $sum: '$financialImpact.medicalCosts' },
                  repairCosts: { $sum: '$financialImpact.repairCosts' },
                  finesTotal: { $sum: '$financialImpact.finesAmount' }
                }
              }
            ],
            bySeverity: [
              {
                $group: {
                  _id: '$severity',
                  totalLoss: { $sum: '$financialImpact.totalLoss' },
                  avgLoss: { $avg: '$financialImpact.totalLoss' },
                  count: { $sum: 1 }
                }
              }
            ]
          }
        }
      ]);

      return analysis[0];
    } catch (error) {
      logger.error('Error analyzing financial impact', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * تقرير الأداء حسب المحقق
   */
  async getInvestigatorPerformance() {
    try {
      const performance = await TrafficAccidentReport.aggregate([
        {
          $match: { archived: false }
        },
        {
          $group: {
            _id: '$investigation.investigatingOfficer',
            totalInvestigations: { $sum: 1 },
            completedCount: {
              $sum: {
                $cond: [
                  { $eq: ['$investigation.status', 'completed'] },
                  1,
                  0
                ]
              }
            },
            inProgressCount: {
              $sum: {
                $cond: [
                  { $eq: ['$investigation.status', 'in_progress'] },
                  1,
                  0
                ]
              }
            },
            avgResolutionTime: {
              $avg: {
                $cond: [
                  { $gte: ['$investigation.completedDate', null] },
                  {
                    $divide: [
                      {
                        $subtract: [
                          '$investigation.completedDate',
                          '$investigation.startDate'
                        ]
                      },
                      86400000 // Convert milliseconds to days
                    ]
                  },
                  null
                ]
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'officer'
          }
        },
        {
          $unwind: {
            path: '$officer',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            officerName: { $ifNull: ['$officer.name', 'Unknown'] },
            totalInvestigations: 1,
            completedCount: 1,
            inProgressCount: 1,
            completionRate: {
              $cond: [
                { $gt: ['$totalInvestigations', 0] },
                {
                  $multiply: [
                    {
                      $divide: ['$completedCount', '$totalInvestigations']
                    },
                    100
                  ]
                },
                0
              ]
            },
            avgResolutionTime: {
              $ceil: { $ifNull: ['$avgResolutionTime', 0] }
            }
          }
        },
        {
          $sort: { totalInvestigations: -1 }
        }
      ]);

      return performance;
    } catch (error) {
      logger.error('Error analyzing investigator performance', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * تحليل الاتجاهات الموسمية
   */
  async analyzeSeasonalTrends() {
    try {
      const trends = await TrafficAccidentReport.aggregate([
        {
          $match: { archived: false }
        },
        {
          $group: {
            _id: { $month: '$accidentInfo.accidentDateTime' },
            count: { $sum: 1 },
            injuries: { $sum: { $size: '$people.injuries' } },
            deaths: { $sum: '$people.deaths.count' },
            avgLoss: { $avg: '$financialImpact.totalLoss' }
          }
        },
        {
          $sort: { _id: 1 }
        },
        {
          $project: {
            _id: 0,
            month: '$_id',
            monthName: {
              $arrayElemAt: [
                [
                  'يناير',
                  'فبراير',
                  'مارس',
                  'أبريل',
                  'مايو',
                  'يونيو',
                  'يوليو',
                  'أغسطس',
                  'سبتمبر',
                  'أكتوبر',
                  'نوفمبر',
                  'ديسمبر'
                ],
                { $subtract: ['$month', 1] }
              ]
            },
            count: 1,
            injuries: 1,
            deaths: 1,
            avgLoss: { $round: ['$avgLoss', 2] }
          }
        }
      ]);

      return trends;
    } catch (error) {
      logger.error('Error analyzing seasonal trends', { error: error.message });
      throw error;
    }
  }

  /**
   * تقرير الملخص الشامل
   */
  async generateComprehensiveSummary(filters = {}) {
    try {
      const [
        statistics,
        hotspots,
        violationPatterns,
        injuryRates,
        financialImpact,
        investigatorPerformance,
        seasonalTrends
      ] = await Promise.all([
        TrafficAccidentReport.getStatistics(filters),
        this.analyzeHotspots(5),
        this.analyzeViolationPatterns(),
        this.analyzeInjuryAndFatalityRates(filters),
        this.analyzeFinancialImpact(filters),
        this.getInvestigatorPerformance(),
        this.analyzeSeasonalTrends()
      ]);

      return {
        generatedAt: new Date(),
        filters,
        summary: statistics[0] || {},
        hotspots,
        violationPatterns,
        injuryRates,
        financialImpact,
        investigatorPerformance,
        seasonalTrends
      };
    } catch (error) {
      logger.error('Error generating comprehensive summary', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * استخراج الرؤى الرئيسية (Key Insights)
   */
  async extractKeyInsights(filters = {}) {
    try {
      const summary = await this.generateComprehensiveSummary(filters);
      const stats = summary.summary;

      const insights = [];

      // Insight 1: Total Cases
      if (stats.totalReports > 0) {
        insights.push({
          type: 'CASE_VOLUME',
          title: 'حجم القضايا',
          value: stats.totalReports,
          description: `تم تسجيل ${stats.totalReports} حادثة مرورية`
        });
      }

      // Insight 2: Severity Distribution
      if (stats.criticalSeverity > 0) {
        const criticalPercentage = (
          (stats.criticalSeverity / stats.totalReports) *
          100
        ).toFixed(1);
        insights.push({
          type: 'CRITICAL_CASES',
          title: 'الحالات الحرجة',
          value: stats.criticalSeverity,
          percentage: criticalPercentage,
          description: `${criticalPercentage}% من الحوادث حالات حرجة`,
          alert: true
        });
      }

      // Insight 3: Fatality Rate
      if (stats.totalDeaths > 0) {
        insights.push({
          type: 'FATALITY_RATE',
          title: 'معدل الوفيات',
          value: stats.totalDeaths,
          description: `${stats.totalDeaths} وفيات مسجلة`,
          alert: true
        });
      }

      // Insight 4: Financial Impact
      if (stats.totalFinancialLoss > 0) {
        insights.push({
          type: 'FINANCIAL_LOSS',
          title: 'الخسائر المالية',
          value: `${stats.totalFinancialLoss.toLocaleString('ar-SA')} SAR`,
          average: `${(stats.averageFinancialLoss || 0).toLocaleString('ar-SA')} SAR`,
          description: 'إجمالي الخسائر المالية من الحوادث'
        });
      }

      // Insight 5: Hotspot Alert
      if (summary.hotspots && summary.hotspots.length > 0) {
        insights.push({
          type: 'HOTSPOT',
          title: 'منطقة الخطر',
          location: summary.hotspots[0]._id.city,
          count: summary.hotspots[0].count,
          description: `أكثر المناطق خطورة: ${summary.hotspots[0]._id.city}`
        });
      }

      // Insight 6: Top Violation
      if (summary.violationPatterns && summary.violationPatterns.length > 0) {
        insights.push({
          type: 'VIOLATION_PATTERN',
          title: 'أكثر المخالفات شيوعاً',
          violation: summary.violationPatterns[0]._id,
          count: summary.violationPatterns[0].count,
          description: `المخالفة الأكثر شيوعاً: ${summary.violationPatterns[0]._id}`
        });
      }

      return insights;
    } catch (error) {
      logger.error('Error extracting key insights', { error: error.message });
      throw error;
    }
  }
}

module.exports = new TrafficAccidentAnalytics();
