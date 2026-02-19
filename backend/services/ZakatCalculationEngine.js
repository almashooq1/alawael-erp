/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                      🧮 ADVANCED ZAKAT CALCULATION ENGINE                      ║
 * ║                    محرك حساب الزكاة الذكي والمتقدم                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * محرك متقدم لحساب جميع أنواع الزكاة وفق الشريعة الإسلامية
 * يتضمن معادلات شرعية دقيقة وحسابات ذكية
 */

const { ZAKAT_CONFIG } = require('../models/Zakat.model');

// ============================================================================
// 📊 ZAKAT CALCULATION ENGINE
// ============================================================================

class ZakatCalculationEngine {
  /**
   * حساب زكاة النقود والأموال السائلة
   * Calculate Zakat on Cash and Liquid Assets
   */
  static calculateCashZakat(amount, nisab = ZAKAT_CONFIG.THRESHOLDS.CASH_NISAB) {
    const isAboveNisab = amount >= nisab;
    
    if (!isAboveNisab) {
      return {
        totalAmount: amount,
        nisab: nisab,
        isAboveNisab: false,
        zakatAmount: 0,
        rate: ZAKAT_CONFIG.RATES.CASH,
        message: `المبلغ أقل من النصاب. النصاب الحالي: ${nisab} SAR`
      };
    }

    const zakatAmount = amount * ZAKAT_CONFIG.RATES.CASH;

    return {
      totalAmount: amount,
      nisab: nisab,
      isAboveNisab: true,
      zakatAmount: Math.round(zakatAmount * 100) / 100,
      rate: ZAKAT_CONFIG.RATES.CASH,
      message: `المبلغ فوق النصاب. الزكاة المستحقة: ${zakatAmount.toFixed(2)} SAR`
    };
  }

  /**
   * حساب زكاة الذهب
   * Calculate Zakat on Gold
   */
  static calculateGoldZakat(grams, pricePerGram) {
    const totalValue = grams * pricePerGram;
    const nisab = ZAKAT_CONFIG.THRESHOLDS.GOLD.current;
    const isAboveNisab = totalValue >= nisab;

    if (!isAboveNisab) {
      return {
        grams: grams,
        pricePerGram: pricePerGram,
        totalValue: totalValue,
        nisab: nisab,
        isAboveNisab: false,
        zakatAmount: 0,
        zakatGrams: 0,
        rate: ZAKAT_CONFIG.RATES.GOLD,
        message: `وزن الذهب أقل من النصاب (85 جرام). الوزن الحالي: ${grams} جرام`
      };
    }

    const zakatAmount = totalValue * ZAKAT_CONFIG.RATES.GOLD;
    const zakatGrams = zakatAmount / pricePerGram;

    return {
      grams: grams,
      pricePerGram: pricePerGram,
      totalValue: totalValue,
      nisab: nisab,
      isAboveNisab: true,
      zakatAmount: Math.round(zakatAmount * 100) / 100,
      zakatGrams: Math.round(zakatGrams * 100) / 100,
      rate: ZAKAT_CONFIG.RATES.GOLD,
      message: `الذهب فوق النصاب. الزكاة المستحقة: ${zakatAmount.toFixed(2)} SAR أو ${zakatGrams.toFixed(2)} جرام`
    };
  }

  /**
   * حساب زكاة الفضة
   * Calculate Zakat on Silver
   */
  static calculateSilverZakat(grams, pricePerGram) {
    const totalValue = grams * pricePerGram;
    const nisab = ZAKAT_CONFIG.THRESHOLDS.SILVER.current;
    const isAboveNisab = totalValue >= nisab;

    if (!isAboveNisab) {
      return {
        grams: grams,
        pricePerGram: pricePerGram,
        totalValue: totalValue,
        nisab: nisab,
        isAboveNisab: false,
        zakatAmount: 0,
        zakatGrams: 0,
        rate: ZAKAT_CONFIG.RATES.SILVER,
        message: `وزن الفضة أقل من النصاب (595 جرام). الوزن الحالي: ${grams} جرام`
      };
    }

    const zakatAmount = totalValue * ZAKAT_CONFIG.RATES.SILVER;
    const zakatGrams = zakatAmount / pricePerGram;

    return {
      grams: grams,
      pricePerGram: pricePerGram,
      totalValue: totalValue,
      nisab: nisab,
      isAboveNisab: true,
      zakatAmount: Math.round(zakatAmount * 100) / 100,
      zakatGrams: Math.round(zakatGrams * 100) / 100,
      rate: ZAKAT_CONFIG.RATES.SILVER,
      message: `الفضة فوق النصاب. الزكاة المستحقة: ${zakatAmount.toFixed(2)} SAR أو ${zakatGrams.toFixed(2)} جرام`
    };
  }

  /**
   * حساب زكاة الماشية (الإبل)
   * Calculate Zakat on Camels
   * 
   * الحساب الشرعي:
   * 5 إبل: شاة واحدة
   * 10 إبل: شاتان
   * 15 إبل: 3 شاات
   * 20 إبل: 4 شاات
   * 25 إبل: خمس شاات
   * 26-35: ابنة مخاض (سنة ونصف)
   * 36-45: ابنة لبون (سنتان)
   * 46-60: حقة (ثلاث سنوات)
   * 61-75: جذعة (أربع سنوات)
   * 76-90: حقتان
   */
  static calculateCamelZakat(count) {
    if (count < 5) {
      return {
        count: count,
        zakatAmount: 0,
        zakatType: 'NONE',
        message: 'عدد الإبل أقل من النصاب (5 إبل)'
      };
    }

    let zakatType, zakatCount;

    if (count >= 5 && count <= 9) {
      zakatCount = Math.floor(count / 5);
      zakatType = 'SHEEP';
    } else if (count >= 10 && count <= 14) {
      zakatCount = Math.floor(count / 5);
      zakatType = 'SHEEP';
    } else if (count >= 15 && count <= 19) {
      zakatCount = 3;
      zakatType = 'SHEEP';
    } else if (count >= 20 && count <= 24) {
      zakatCount = 4;
      zakatType = 'SHEEP';
    } else if (count >= 25 && count <= 35) {
      zakatCount = 1;
      zakatType = 'DAUGHTER_OF_ONE_YEAR';
    } else if (count >= 36 && count <= 45) {
      zakatCount = 1;
      zakatType = 'DAUGHTER_OF_TWO_YEARS';
    } else if (count >= 46 && count <= 60) {
      zakatCount = 1;
      zakatType = 'THREE_YEAR_OLD';
    } else if (count >= 61 && count <= 75) {
      zakatCount = 1;
      zakatType = 'FOUR_YEAR_OLD';
    } else if (count >= 76 && count <= 90) {
      zakatCount = 2;
      zakatType = 'THREE_YEAR_OLD';
    } else {
      // أكثر من 90
      zakatCount = 1;
      zakatType = 'FOUR_YEAR_OLD';
      const remainder = count - 90;
      if (remainder >= 50) {
        zakatCount += 1;
        zakatType = 'FOUR_YEAR_OLD';
      } else if (remainder >= 30) {
        zakatCount += Math.floor(remainder / 30);
        zakatType = 'THREE_YEAR_OLD';
      }
    }

    return {
      count: count,
      zakatCount: zakatCount,
      zakatType: zakatType,
      zakatDescription: this.getZakatTypeDescription(zakatType),
      message: `الزكاة المستحقة: ${zakatCount} من ${zakatType}`
    };
  }

  /**
   * حساب زكاة الماشية (الأبقار والجاموس)
   * Calculate Zakat on Cattle and Buffalo
   * 
   * 30 بقرة: عجل أو تيس (سنة)
   * 40 بقرة: بقرة أو تيس (سنتان)
   * 60 بقرة: عجلان
   * 70 بقرة: عجل وبقرة
   */
  static calculateCattleZakat(count) {
    if (count < 30) {
      return {
        count: count,
        zakatAmount: 0,
        zakatType: 'NONE',
        message: 'عدد البقر أقل من النصاب (30 بقرة)'
      };
    }

    let zakatType, zakatCount;

    if (count >= 30 && count <= 39) {
      zakatCount = 1;
      zakatType = 'YOUNG_CALF_ONE_YEAR';
    } else if (count >= 40 && count <= 59) {
      zakatCount = 1;
      zakatType = 'FEMALE_CATTLE_TWO_YEARS';
    } else if (count >= 60 && count <= 69) {
      zakatCount = 2;
      zakatType = 'YOUNG_CALF_ONE_YEAR';
    } else {
      zakatCount = 1;
      zakatType = 'YOUNG_CALF_ONE_YEAR';
      zakatCount += 1;
      zakatType = 'FEMALE_CATTLE_TWO_YEARS';
    }

    return {
      count: count,
      zakatCount: zakatCount,
      zakatType: zakatType,
      zakatDescription: this.getZakatTypeDescription(zakatType),
      message: `الزكاة المستحقة: ${zakatCount} من ${zakatType}`
    };
  }

  /**
   * حساب زكاة الماشية (الغنم والماعز)
   * Calculate Zakat on Sheep and Goats
   * 
   * 40 إلى 120: شاة واحدة
   * 121 إلى 200: شاتان
   * 201 إلى 300: ثلاث شاات
   * أكثر من 300: لكل 100 شاة، شاة
   */
  static calculateSheepGoatsZakat(count) {
    if (count < 40) {
      return {
        count: count,
        zakatAmount: 0,
        zakatType: 'NONE',
        message: 'عدد الغنم أقل من النصاب (40 رأس)'
      };
    }

    let zakatCount;

    if (count >= 40 && count <= 120) {
      zakatCount = 1;
    } else if (count >= 121 && count <= 200) {
      zakatCount = 2;
    } else if (count >= 201 && count <= 300) {
      zakatCount = 3;
    } else {
      zakatCount = 3 + Math.floor((count - 300) / 100);
    }

    return {
      count: count,
      zakatCount: zakatCount,
      zakatType: 'SHEEP',
      message: `الزكاة المستحقة: ${zakatCount} من الغنم`
    };
  }

  /**
   * حساب زكاة المحاصيل والحبوب
   * Calculate Zakat on Crops
   */
  static calculateCropsZakat(tons, irrigationType = 'irrigated') {
    const wasq = ZAKAT_CONFIG.THRESHOLDS.CROPS.wasq / 1000; // تحويل من كغ إلى أطنان
    
    if (tons < wasq) {
      return {
        tons: tons,
        nisab: wasq,
        zakatAmount: 0,
        message: `المحصول أقل من النصاب (${wasq} طن)`
      };
    }

    const rate = irrigationType === 'irrigated' 
      ? ZAKAT_CONFIG.RATES.CROPS_IRRIGATED 
      : ZAKAT_CONFIG.RATES.CROPS_RAINFALL;

    const zakatTons = tons * rate;

    return {
      tons: tons,
      nisab: wasq,
      irrigationType: irrigationType,
      rate: rate,
      zakatTons: Math.round(zakatTons * 100) / 100,
      message: `الزكاة المستحقة: ${zakatTons.toFixed(2)} طن (${(rate * 100)}%)`
    };
  }

  /**
   * حساب زكاة الأصول التجارية
   * Calculate Zakat on Business Inventory
   */
  static calculateBusinessInventoryZakat(totalValue, nisab = ZAKAT_CONFIG.THRESHOLDS.CASH_NISAB) {
    const isAboveNisab = totalValue >= nisab;

    if (!isAboveNisab) {
      return {
        totalValue: totalValue,
        nisab: nisab,
        isAboveNisab: false,
        zakatAmount: 0,
        message: `قيمة المخزون أقل من النصاب (${nisab} SAR)`
      };
    }

    const zakatAmount = totalValue * ZAKAT_CONFIG.RATES.BUSINESS_INVENTORY;

    return {
      totalValue: totalValue,
      nisab: nisab,
      isAboveNisab: true,
      zakatAmount: Math.round(zakatAmount * 100) / 100,
      rate: ZAKAT_CONFIG.RATES.BUSINESS_INVENTORY,
      message: `الزكاة المستحقة: ${zakatAmount.toFixed(2)} SAR`
    };
  }

  /**
   * دالة مساعدة لوصف أنواع الزكاة
   */
  static getZakatTypeDescription(type) {
    const descriptions = {
      'SHEEP': 'شاة',
      'DAUGHTER_OF_ONE_YEAR': 'بنت مخاض (سنة ونصف)',
      'DAUGHTER_OF_TWO_YEARS': 'بنت لبون (سنتان)',
      'THREE_YEAR_OLD': 'حقة (ثلاث سنوات)',
      'FOUR_YEAR_OLD': 'جذعة (أربع سنوات)',
      'YOUNG_CALF_ONE_YEAR': 'عجل (سنة واحدة)',
      'FEMALE_CATTLE_TWO_YEARS': 'بقرة أنثى (سنتان)'
    };
    return descriptions[type] || type;
  }

  /**
   * حساب شامل لجميع أنواع الزكاة
   * Comprehensive Zakat Calculation
   */
  static calculateTotalZakat(assets) {
    const results = {
      cash: { zakatAmount: 0 },
      gold: { zakatAmount: 0 },
      silver: { zakatAmount: 0 },
      livestock: { zakatAmount: 0 },
      crops: { zakatAmount: 0 },
      businessInventory: { zakatAmount: 0 },
      financialAssets: { zakatAmount: 0 },
      totalZakat: 0,
      assetDetails: [],
      warnings: [],
      recommendations: []
    };

    // معالجة كل نوع من الأصول
    assets.forEach(asset => {
      switch (asset.type) {
        case 'CASH':
          results.cash = this.calculateCashZakat(asset.amount);
          results.totalZakat += results.cash.zakatAmount;
          break;

        case 'GOLD':
          results.gold = this.calculateGoldZakat(asset.quantity, asset.currentPrice / asset.quantity);
          results.totalZakat += results.gold.zakatAmount;
          break;

        case 'SILVER':
          results.silver = this.calculateSilverZakat(asset.quantity, asset.currentPrice / asset.quantity);
          results.totalZakat += results.silver.zakatAmount;
          break;

        case 'LIVESTOCK_CAMELS':
          results.livestock.camels = this.calculateCamelZakat(asset.quantity);
          break;

        case 'LIVESTOCK_CATTLE':
          results.livestock.cattle = this.calculateCattleZakat(asset.quantity);
          break;

        case 'LIVESTOCK_SHEEP_GOATS':
          results.livestock.sheepGoats = this.calculateSheepGoatsZakat(asset.quantity);
          break;

        case 'CROPS_GRAINS':
        case 'CROPS_FRUITS':
          results.crops[asset.type.toLowerCase()] = this.calculateCropsZakat(
            asset.quantity,
            asset.irrigationType
          );
          break;

        case 'BUSINESS_INVENTORY':
          results.businessInventory = this.calculateBusinessInventoryZakat(asset.amount);
          results.totalZakat += results.businessInventory.zakatAmount;
          break;

        case 'FINANCIAL_ASSETS':
          results.financialAssets = this.calculateCashZakat(asset.amount);
          results.totalZakat += results.financialAssets.zakatAmount;
          break;
      }

      results.assetDetails.push({
        name: asset.name,
        type: asset.type,
        value: asset.amount || asset.currentPrice || 0
      });
    });

    // إضافة التوصيات الذكية
    this.addSmartRecommendations(results, assets);

    return {
      ...results,
      totalZakat: Math.round(results.totalZakat * 100) / 100
    };
  }

  /**
   * إضافة توصيات ذكية بناءً على الحسابات
   */
  static addSmartRecommendations(results, assets) {
    // التوصيات
    if (results.totalZakat > 10000) {
      results.recommendations.push('💡 الزكاة المستحقة كبيرة. يُنصح بتقسيمها على عدة دفعات');
    }

    if (assets.some(a => a.type === 'CASH' && a.amount < results.cash.nisab * 0.5)) {
      results.recommendations.push('⚠️ احتفظ بسيولة كافية للاحتياجات الطارئة');
    }

    results.recommendations.push('✅ تأكد من دفع الزكاة قبل انتهاء السنة الهجرية');
  }
}

// ============================================================================
// 🔍 VALIDATION HELPERS
// ============================================================================

class ZakatValidation {
  /**
   * التحقق من صحة بيانات الأصول
   */
  static validateAsset(asset) {
    const errors = [];

    if (!asset.type || !ZAKAT_CONFIG.ZAKAT_TYPES.includes(asset.type)) {
      errors.push('نوع الأصل غير صحيح');
    }

    if (!asset.name || asset.name.trim() === '') {
      errors.push('يجب إدخال اسم الأصل');
    }

    if (asset.amount !== undefined && asset.amount < 0) {
      errors.push('المبلغ لا يمكن أن يكون سالباً');
    }

    if (asset.quantity !== undefined && asset.quantity < 0) {
      errors.push('الكمية لا يمكن أن تكون سالبة');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * التحقق من استحقاق الزكاة
   */
  static validateZakatDue(totalAssetsValue, nisab) {
    return {
      isAboveNisab: totalAssetsValue >= nisab,
      message: totalAssetsValue >= nisab
        ? ✅ المبلغ فوق النصاب - الزكاة مستحقة'
        : '⛔ المبلغ أقل من النصاب - الزكاة غير مستحقة'
    };
  }
}

// ============================================================================
// 📤 EXPORT
// ============================================================================

module.exports = {
  ZakatCalculationEngine,
  ZakatValidation,
  ZAKAT_CONFIG
};
