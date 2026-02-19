const Supplier = require('../models/Supplier.model');
const PurchaseOrder = require('../models/PurchaseOrder.model');
const Contract = require('../models/Contract.model');

/**
 * Advanced Supplier Management Service
 * خدمة إدارة الموردين المتقدمة
 */
class AdvancedSupplierManagementService {

  /**
   * تقييم قدرات المورد
   * Supplier Capability Assessment
   */
  async assessSupplierCapabilities(supplierId) {
    try {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return { success: false, message: 'Supplier not found' };
      }

      const assessment = {
        supplierId,
        supplierName: supplier.name,
        assessmentDate: new Date(),
        capabilities: {
          productRange: {
            score: this.assessProductRange(supplier),
            description: 'Variety of products supplier can provide',
            details: {
              totalProducts: supplier.products?.length || 0,
              categories: [...new Set(supplier.products?.map(p => p.category))],
            },
          },
          priceCompetitiveness: {
            score: supplier.performance.priceCompetitiveness || 0,
            description: 'How competitive supplier pricing is',
          },
          quality: {
            score: supplier.performance.qualityRating || 0,
            description: 'Quality of supplied products',
          },
          delivery: {
            score: supplier.performance.deliveryRating || 0,
            description: 'On-time delivery performance',
          },
          service: {
            score: supplier.performance.serviceRating || 0,
            description: 'Customer service and responsiveness',
          },
          volume: {
            score: this.assessVolumeCapacity(supplier),
            description: 'Ability to handle volume requirements',
            details: {
              estimatedCapacity: supplier.performance.estimatedCapacity || 'Unknown',
              currentOrders: supplier.performance.totalOrders,
            },
          },
          innovation: {
            score: this.assessInnovation(supplier),
            description: 'Innovation and improvement track record',
          },
          sustainability: {
            score: this.assessSustainability(supplier),
            description: 'Environmental and social responsibility',
          },
        },
        overallCapabilityScore: 0,
        recommendedUseCase: '',
        strategicImportance: this.assessStrategicImportance(supplier),
      };

      // حساب النقاط الإجمالية
      const scores = Object.values(assessment.capabilities)
        .filter(c => typeof c.score === 'number')
        .map(c => c.score);
      
      assessment.overallCapabilityScore = scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : 0;

      // توصيات الاستخدام
      assessment.recommendedUseCase = this.getRecommendedUseCase(assessment);

      return {
        success: true,
        data: assessment,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * تقييم نطاق المنتجات
   */
  assessProductRange(supplier) {
    const productCount = supplier.products?.length || 0;
    
    if (productCount > 50) return 10;
    if (productCount > 30) return 9;
    if (productCount > 15) return 8;
    if (productCount > 5) return 7;
    if (productCount > 0) return 5;
    return 0;
  }

  /**
   * تقييم القدرة على الحجم
   */
  assessVolumeCapacity(supplier) {
    const orders = supplier.performance.totalOrders || 0;
    const avgValue = supplier.performance.estimatedCapacity || 0;

    if (orders > 100 && avgValue > 50000) return 10;
    if (orders > 50 && avgValue > 20000) return 8;
    if (orders > 20 && avgValue > 10000) return 6;
    if (orders > 5) return 4;
    return 2;
  }

  /**
   * تقييم الابتكار
   */
  assessInnovation(supplier) {
    // التحقق من تحديثات الشهادات والتحسينات
    const hasCertifications = supplier.certifications?.length > 0;
    const hasRecentUpdates = supplier.updatedAt && 
      (Date.now() - supplier.updatedAt) < (90 * 24 * 60 * 60 * 1000);

    let score = 5;
    if (hasCertifications) score += 3;
    if (hasRecentUpdates) score += 2;

    return Math.min(10, score);
  }

  /**
   * تقييم الاستدامة
   */
  assessSustainability(supplier) {
    let score = 5;

    // التحقق من شهادات الاستدامة
    if (supplier.certifications?.some(c => 
      ['ISO 14001', 'Green Cert', 'Sustainability'].includes(c.name)
    )) {
      score += 3;
    }

    // التحقق من سياسة الدفع العادلة
    if (supplier.paymentTerms?.netDays >= 30) {
      score += 2;
    }

    return Math.min(10, score);
  }

  /**
   * تقييم الأهمية الاستراتيجية
   */
  assessStrategicImportance(supplier) {
    const rating = supplier.performance.overallRating || 0;

    if (rating >= 4.5 && supplier.isPreferredVendor) {
      return 'STRATEGIC_PARTNER';
    } else if (rating >= 3.5) {
      return 'PREFERRED_SUPPLIER';
    } else if (rating >= 2.5) {
      return 'SECONDARY_SUPPLIER';
    } else {
      return 'BACKUP_SUPPLIER';
    }
  }

  /**
   * الحصول على حالات الاستخدام الموصى بها
   */
  getRecommendedUseCase(assessment) {
    const score = assessment.overallCapabilityScore;
    const strategic = assessment.strategicImportance;

    if (score >= 8.5 && strategic === 'STRATEGIC_PARTNER') {
      return 'Primary supplier for critical items with long-term contracts';
    } else if (score >= 7.5) {
      return 'Preferred supplier with framework agreements';
    } else if (score >= 5) {
      return 'Secondary supplier for non-critical items';
    } else {
      return 'Limited use; Consider for backup/emergency orders only';
    }
  }

  /**
   * إنشاء تجمع الموردين الديناميكي
   * Dynamic Supplier Pooling
   */
  async createDynamicSupplierPool(category, targetQuality = 3.5) {
    try {
      const suppliers = await Supplier.find({
        category,
        status: 'ACTIVE',
        'performance.overallRating': { $gte: targetQuality },
      }).sort({ 'performance.overallRating': -1 });

      const pool = {
        poolId: `POOL_${Date.now()}`,
        category,
        createdDate: new Date(),
        suppliers: [],
        poolStatistics: {
          totalSuppliers: 0,
          averageRating: 0,
          averagePrice: 0,
          riskLevel: 'LOW',
        },
        advantages: [],
      };

      let totalRating = 0;
      let totalPrice = 0;
      let priceCount = 0;

      for (const supplier of suppliers) {
        const products = supplier.products?.filter(p => p.category === category) || [];
        
        if (products.length > 0) {
          const avgPrice = products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length;

          pool.suppliers.push({
            supplierId: supplier._id,
            supplierName: supplier.name,
            rating: supplier.performance.overallRating,
            onTimePercentage: supplier.performance.onTimePercentage,
            priceRange: {
              min: Math.min(...products.map(p => p.price || 0)),
              max: Math.max(...products.map(p => p.price || 0)),
              average: avgPrice,
            },
            productCount: products.length,
            allocationWeight: 0, // سيتم حسابه لاحقاً
          });

          totalRating += supplier.performance.overallRating;
          totalPrice += avgPrice;
          priceCount++;
        }
      }

      pool.poolStatistics.totalSuppliers = pool.suppliers.length;
      pool.poolStatistics.averageRating = pool.suppliers.length > 0
        ? (totalRating / pool.suppliers.length).toFixed(2)
        : 0;
      pool.poolStatistics.averagePrice = priceCount > 0 ? 
        (totalPrice / priceCount).toFixed(2) : 0;

      // حساب أوزان التخصيص
      if (pool.suppliers.length > 0) {
        const ratingSum = pool.suppliers.reduce((sum, s) => sum + s.rating, 0);
        for (const supplier of pool.suppliers) {
          supplier.allocationWeight = (supplier.rating / ratingSum * 100).toFixed(1);
        }
      }

      // تقييم مستوى المخاطر
      const diversification = pool.suppliers.length >= 3;
      const reliabilityScore = pool.poolStatistics.averageRating >= 3.5;

      pool.poolStatistics.riskLevel = diversification && reliabilityScore ? 'LOW' : 'MEDIUM';

      // الفوائد
      pool.advantages = [
        `Diversification across ${pool.suppliers.length} suppliers reduces supply risk`,
        'Dynamic allocation based on performance metrics',
        'Backup suppliers available in case of delivery issues',
        `Average quality rating: ${pool.poolStatistics.averageRating}`,
        'Price transparency and competitive bidding',
      ];

      return {
        success: true,
        data: pool,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * تحسين تخصيص الطلبيات
   * Optimize Order Allocation
   */
  async optimizeOrderAllocation(itemsNeeded, category) {
    try {
      // إنشاء تجمع الموردين
      const poolResult = await this.createDynamicSupplierPool(category);
      if (!poolResult.success) return poolResult;

      const pool = poolResult.data;
      const allocation = {
        allocationId: `ALLOC_${Date.now()}`,
        itemsNeeded,
        category,
        allocations: [],
        totalCost: 0,
        riskMitigation: {
          concentrationRatio: 0,
          redundancyLevel: 'LOW',
        },
      };

      // حساب التخصيصات على أساس الأداء والسعر
      let totalAllocation = 0;

      for (const supplier of pool.suppliers) {
        const weight = parseFloat(supplier.allocationWeight) / 100;
        const allocatedQuantity = Math.round(itemsNeeded * weight);

        if (allocatedQuantity > 0) {
          const cost = allocatedQuantity * supplier.priceRange.average;

          allocation.allocations.push({
            supplierId: supplier.supplierId,
            supplierName: supplier.name,
            allocatedQuantity,
            unitPrice: supplier.priceRange.average,
            totalCost: cost,
            allocationPercentage: (weight * 100).toFixed(1),
            deliveryRisk: 100 - supplier.onTimePercentage,
          });

          allocation.totalCost += cost;
          totalAllocation += allocatedQuantity;
        }
      }

      // حساب مقاييس المخاطر
      if (allocation.allocations.length > 0) {
        const topSupplierPercentage = Math.max(
          ...allocation.allocations.map(a => parseFloat(a.allocationPercentage))
        );
        allocation.riskMitigation.concentrationRatio = topSupplierPercentage.toFixed(1);
        allocation.riskMitigation.redundancyLevel = 
          pool.suppliers.length >= 3 ? 'HIGH' : 
          pool.suppliers.length === 2 ? 'MEDIUM' : 'LOW';
      }

      return {
        success: true,
        data: allocation,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * إدارة العلاقات مع الموردين
   */
  async manageSupplierRelationships(supplierId) {
    try {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return { success: false, message: 'Supplier not found' };
      }

      // جمع البيانات التاريخية
      const orders = await PurchaseOrder.find({
        'supplier.supplierId': supplierId,
      });

      const contracts = await Contract.find({
        supplier: supplierId,
      });

      const relationshipProfile = {
        supplierId,
        supplierName: supplier.name,
        relationshipLevel: this.determineRelationshipLevel(supplier, orders, contracts),
        
        engagement: {
          totalOrders: orders.length,
          activeContracts: contracts.filter(c => c.status === 'ACTIVE').length,
          averageOrderValue: orders.length > 0 
            ? (orders.reduce((sum, o) => sum + (o.summary.grandTotal || 0), 0) / orders.length).toFixed(2)
            : 0,
          yearsOfBusiness: this.calculateYearsOfBusiness(orders),
        },

        communication: {
          recommendedFrequency: this.getRecommendedContactFrequency(supplier),
          keyContacts: supplier.contactPerson ? [
            {
              name: supplier.contactPerson.name,
              title: supplier.contactPerson.title,
              email: supplier.contactPerson.email,
              phone: supplier.contactPerson.phone,
            }
          ] : [],
          lastInteraction: this.getLastInteractionDate(orders, contracts),
        },

        collaboration: {
          suggestions: this.generateCollaborationSuggestions(supplier, orders),
          improvementAreas: this.identifyImprovementAreas(supplier),
          growthOpportunities: this.identifyGrowthOpportunities(supplier, orders),
        },

        strategyRecommendation: this.getRelationshipStrategy(supplier, orders, contracts),
      };

      return {
        success: true,
        data: relationshipProfile,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * تحديد مستوى العلاقة
   */
  determineRelationshipLevel(supplier, orders, contracts) {
    const rating = supplier.performance.overallRating || 0;
    const orderCount = orders.length;
    const contractCount = contracts.filter(c => c.status === 'ACTIVE').length;

    if (rating >= 4.2 && orderCount > 50 && contractCount > 0) {
      return 'STRATEGIC_PARTNER';
    } else if (rating >= 3.5 && orderCount > 20) {
      return 'KEY_SUPPLIER';
    } else if (rating >= 2.5 && orderCount > 5) {
      return 'REGULAR_SUPPLIER';
    } else if (orderCount <= 5) {
      return 'OCCASIONAL_SUPPLIER';
    } else {
      return 'UNDER_EVALUATION';
    }
  }

  /**
   * حساب سنوات العمل
   */
  calculateYearsOfBusiness(orders) {
    if (orders.length === 0) return 0;

    const oldestOrder = orders.reduce((min, order) =>
      order.createdAt < min.createdAt ? order : min
    );

    const yearsDiff = (new Date() - oldestOrder.createdAt) / (1000 * 60 * 60 * 24 * 365);
    return Math.floor(yearsDiff);
  }

  /**
   * الحصول على التكرار الموصى به للاتصال
   */
  getRecommendedContactFrequency(supplier) {
    const rating = supplier.performance.overallRating || 0;

    if (rating >= 4) return 'Quarterly business review';
    if (rating >= 3) return 'Every 6 months';
    if (rating >= 2) return 'Annual meeting';
    return 'As needed for corrective actions';
  }

  /**
   * الحصول على تاريخ آخر تفاعل
   */
  getLastInteractionDate(orders, contracts) {
    const dates = [
      ...orders.map(o => o.createdAt),
      ...contracts.map(c => c.createdAt),
    ];

    return dates.length > 0 ? new Date(Math.max(...dates)) : null;
  }

  /**
   * توليد اقتراحات التعاون
   */
  generateCollaborationSuggestions(supplier, orders) {
    const suggestions = [];

    if (supplier.products?.length > 10 && orders.length > 20) {
      suggestions.push('Consider establishing a strategic partnership or exclusive arrangement');
    }

    if (supplier.performance.qualityRating >= 4) {
      suggestions.push('Leverage supplier for quality improvement initiatives');
    }

    if (supplier.performance.deliveryRating >= 4) {
      suggestions.push('Implement just-in-time inventory practices with this supplier');
    }

    suggestions.push('Schedule quarterly business reviews for continuous improvement');

    return suggestions;
  }

  /**
   * تحديد مجالات التحسين
   */
  identifyImprovementAreas(supplier) {
    const areas = [];

    if (supplier.performance.qualityRating < 3.5) {
      areas.push({
        area: 'Quality',
        currentLevel: supplier.performance.qualityRating,
        targetLevel: 4.0,
        recommendation: 'Request quality improvement plan and additional certifications',
      });
    }

    if (supplier.performance.deliveryRating < 3.5) {
      areas.push({
        area: 'On-Time Delivery',
        currentLevel: supplier.performance.deliveryRating,
        targetLevel: 4.0,
        recommendation: 'Discuss delivery commitments and penalty clauses',
      });
    }

    if (supplier.performance.serviceRating < 3.5) {
      areas.push({
        area: 'Customer Service',
        currentLevel: supplier.performance.serviceRating,
        targetLevel: 4.0,
        recommendation: 'Implement SLA (Service Level Agreement) for response times',
      });
    }

    return areas;
  }

  /**
   * تحديد فرص النمو
   */
  identifyGrowthOpportunities(supplier, orders) {
    const opportunities = [];

    // فرص التوسع في المنتجات
    if (supplier.products && supplier.products.length < 20) {
      opportunities.push({
        type: 'PRODUCT_EXPANSION',
        description: 'Would supplier be interested in adding products X, Y, Z?',
        potentialImpact: 'Increased volume and reduced supplier base',
      });
    }

    // فرص الخدمات الإضافية
    if (!supplier.paymentTerms || supplier.paymentTerms === 'COD') {
      opportunities.push({
        type: 'PAYMENT_TERMS',
        description: 'Negotiate extended payment terms for larger orders',
        potentialImpact: 'Improved cash flow management',
      });
    }

    // فرص التكنولوجيا
    opportunities.push({
      type: 'EDI_INTEGRATION',
      description: 'Implement EDI for automated order and invoice processing',
      potentialImpact: 'Faster order processing and fewer errors',
    });

    return opportunities;
  }

  /**
   * استراتيجية العلاقة الموصى بها
   */
  getRelationshipStrategy(supplier, orders, contracts) {
    const relationshipLevel = this.determineRelationshipLevel(supplier, orders, contracts);

    const strategies = {
      STRATEGIC_PARTNER: {
        approach: 'Long-term partnership and continuous improvement',
        actions: [
          'Establish long-term contracts with volume commitments',
          'Share demand forecasts for better planning',
          'Regular business reviews and strategic alignment',
          'Joint improvement initiatives',
          'Preferred pricing and terms for volume commitments',
        ],
      },
      KEY_SUPPLIER: {
        approach: 'Build stronger relationship with performance improvement',
        actions: [
          'Establish framework agreements for key categories',
          'Regular performance reviews',
          'Support supplier improvement initiatives',
          'Volume discounts based on commitments',
          'Backup relationships maintained',
        ],
      },
      REGULAR_SUPPLIER: {
        approach: 'Maintain transactional relationship with alternatives',
        actions: [
          'Competitive bidding on major orders',
          'Standard payment and delivery terms',
          'Regular performance monitoring',
          'Keep alternative suppliers active',
        ],
      },
      OCCASIONAL_SUPPLIER: {
        approach: 'Use as backup supplier only',
        actions: [
          'Limited to emergency or overflow orders',
          'Maintain basic relationship information',
          'Monitor for potential growth opportunities',
        ],
      },
    };

    return strategies[relationshipLevel] || strategies.REGULAR_SUPPLIER;
  }
}

module.exports = new AdvancedSupplierManagementService();
