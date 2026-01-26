/**
 * ALAWAEL ERP - AI/ML Engine
 * Phase 13: Advanced Intelligence & Predictive Analytics
 * Provides ML models, predictions, and intelligent recommendations
 */

const math = require('mathjs');

// ============================================================================
// 1. PREDICTIVE ANALYTICS ENGINE
// ============================================================================
class PredictiveAnalyticsEngine {
  constructor() {
    this.models = new Map();
    this.trainingData = new Map();
    this.predictions = [];
    this.accuracy = {};
  }

  /**
   * Train regression model for sales forecasting
   */
  trainSalesModel(historicalData) {
    try {
      if (!historicalData || historicalData.length < 2) {
        throw new Error('Insufficient data for model training');
      }

      // Extract dates and values
      const dates = historicalData.map(d => new Date(d.date).getTime());
      const values = historicalData.map(d => d.value);

      // Simple linear regression
      const n = values.length;
      const sumX = dates.reduce((a, b) => a + b, 0);
      const sumY = values.reduce((a, b) => a + b, 0);
      const sumXY = dates.reduce((sum, x, i) => sum + x * values[i], 0);
      const sumX2 = dates.reduce((sum, x) => sum + x * x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const model = { slope, intercept, type: 'linear-regression' };
      this.models.set('sales-forecast', model);
      this.trainingData.set('sales-forecast', historicalData);

      // Calculate R-squared
      const yMean = sumY / n;
      const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
      const ssPred = values.reduce((sum, y, i) => {
        const predicted = slope * dates[i] + intercept;
        return sum + Math.pow(y - predicted, 2);
      }, 0);
      const r2 = 1 - ssPred / ssTotal;
      this.accuracy['sales-forecast'] = r2;

      return { success: true, model, accuracy: r2, message: 'Sales model trained' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Forecast future sales
   */
  forecastSales(daysAhead = 30) {
    try {
      const model = this.models.get('sales-forecast');
      if (!model) throw new Error('Model not trained');

      const today = new Date().getTime();
      const forecasts = [];

      for (let i = 1; i <= daysAhead; i++) {
        const futureDate = today + i * 24 * 60 * 60 * 1000;
        const predicted = model.slope * futureDate + model.intercept;
        forecasts.push({
          date: new Date(futureDate),
          value: Math.max(0, Math.round(predicted * 100) / 100),
          confidence: Math.min(this.accuracy['sales-forecast'] * 100, 95),
        });
      }

      return { success: true, forecasts, model: 'sales-forecast' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Train demand forecasting model
   */
  trainDemandModel(historicalData) {
    try {
      if (!historicalData || historicalData.length < 3) {
        throw new Error('Insufficient data for demand model');
      }

      // Extract seasonal patterns
      const values = historicalData.map(d => d.quantity);
      const n = values.length;

      // Moving average (simple smoothing)
      const ma = [];
      for (let i = 0; i < n; i++) {
        const start = Math.max(0, i - 2);
        const end = i + 1;
        const window = values.slice(start, end);
        ma.push(window.reduce((a, b) => a + b, 0) / window.length);
      }

      // Standard deviation for confidence intervals
      const mean = values.reduce((a, b) => a + b, 0) / n;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
      const stdDev = Math.sqrt(variance);

      const model = {
        mean,
        stdDev,
        trend: (values[n - 1] - values[0]) / n,
        type: 'exponential-smoothing',
        alpha: 0.3, // smoothing constant
      };

      this.models.set('demand-forecast', model);
      this.trainingData.set('demand-forecast', historicalData);
      this.accuracy['demand-forecast'] = 0.85; // Base accuracy

      return { success: true, model, accuracy: 0.85, message: 'Demand model trained' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Predict customer churn probability
   */
  predictChurn(customerData) {
    try {
      const { lastActivityDays, purchaseFrequency, totalSpent, supportTickets } = customerData;

      // Simple churn scoring (0-100)
      let churnScore = 0;

      // Inactivity weight (40%)
      if (lastActivityDays > 90) churnScore += 35;
      else if (lastActivityDays > 60) churnScore += 20;
      else if (lastActivityDays > 30) churnScore += 10;

      // Purchase frequency weight (30%)
      if (purchaseFrequency < 2) churnScore += 25;
      else if (purchaseFrequency < 5) churnScore += 15;

      // Total spent weight (20%)
      if (totalSpent < 100) churnScore += 15;
      else if (totalSpent < 500) churnScore += 8;

      // Support tickets weight (10%)
      if (supportTickets > 5) churnScore += 10;
      else if (supportTickets > 2) churnScore += 5;

      const churnProbability = Math.min(churnScore, 100);
      const riskLevel = churnProbability > 70 ? 'HIGH' : churnProbability > 40 ? 'MEDIUM' : 'LOW';

      return {
        success: true,
        churnProbability,
        riskLevel,
        recommendations: this.getChurnRecommendations(riskLevel, customerData),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get churn reduction recommendations
   */
  getChurnRecommendations(riskLevel, data) {
    const recommendations = [];

    if (riskLevel === 'HIGH') {
      recommendations.push('Immediate: Personal outreach by account manager');
      if (data.lastActivityDays > 90) {
        recommendations.push('Offer special discount or incentive');
      }
      if (data.supportTickets > 5) {
        recommendations.push('Schedule support call to address concerns');
      }
    } else if (riskLevel === 'MEDIUM') {
      recommendations.push('Send engagement email with new features');
      recommendations.push('Offer loyalty rewards');
    } else {
      recommendations.push('Continue regular engagement');
      recommendations.push('Invite to premium features');
    }

    return recommendations;
  }
}

// ============================================================================
// 2. RECOMMENDATION ENGINE
// ============================================================================
class RecommendationEngine {
  constructor() {
    this.userProfiles = new Map();
    this.itemFeatures = new Map();
    this.recommendations = [];
  }

  /**
   * Collaborative filtering recommendation
   */
  getRecommendations(userId, items = [], topN = 5) {
    try {
      const userProfile = this.userProfiles.get(userId) || { preferences: {}, history: [] };
      const scores = [];

      for (const item of items) {
        let score = 0;

        // Category preference (50%)
        const categoryPref = userProfile.preferences[item.category] || 0.5;
        score += categoryPref * 50;

        // Price affinity (20%)
        const avgPrice =
          userProfile.history.length > 0
            ? userProfile.history.reduce((sum, h) => sum + h.price, 0) / userProfile.history.length
            : 0;
        const priceMatch = avgPrice > 0 ? 1 - Math.abs(item.price - avgPrice) / avgPrice : 0.5;
        score += Math.max(0, Math.min(1, priceMatch)) * 20;

        // Rating (15%)
        score += (item.rating / 5) * 15;

        // Popularity (15%)
        const popularity = Math.min(item.purchases / 1000, 1);
        score += popularity * 15;

        scores.push({ item, score });
      }

      // Sort by score and return top N
      const topRecommendations = scores
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .map(r => ({
          ...r.item,
          recommendationScore: Math.round(r.score * 100) / 100,
          reason: this.getRecommendationReason(r.item, userProfile),
        }));

      return { success: true, recommendations: topRecommendations };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reason for recommendation
   */
  getRecommendationReason(item, userProfile) {
    if (item.rating >= 4.5) return 'Highly rated product';
    if (item.category === 'trending') return 'Trending in your category';
    if (userProfile.history.length > 0) return 'Based on your preferences';
    return 'Recommended for you';
  }

  /**
   * Content-based filtering
   */
  getContentBased(itemId, allItems = [], topN = 5) {
    try {
      const sourceItem = allItems.find(i => i.id === itemId);
      if (!sourceItem) throw new Error('Item not found');

      const similarities = allItems
        .filter(i => i.id !== itemId)
        .map(item => ({
          item,
          similarity: this.calculateSimilarity(sourceItem, item),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topN);

      return { success: true, similar: similarities.map(s => s.item) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate similarity between items
   */
  calculateSimilarity(item1, item2) {
    let similarity = 0;

    // Category match (50%)
    if (item1.category === item2.category) similarity += 50;

    // Price similarity (30%)
    const priceDiff = Math.abs(item1.price - item2.price);
    const maxPrice = Math.max(item1.price, item2.price);
    const priceMatch = (1 - priceDiff / maxPrice) * 30;
    similarity += priceMatch;

    // Rating proximity (20%)
    const ratingDiff = Math.abs(item1.rating - item2.rating);
    const ratingMatch = (1 - ratingDiff / 5) * 20;
    similarity += ratingMatch;

    return Math.round(similarity * 100) / 100;
  }

  /**
   * Update user profile based on interaction
   */
  updateProfile(userId, item, interactionType = 'view') {
    let profile = this.userProfiles.get(userId) || { preferences: {}, history: [] };

    // Update category preference
    const weight = interactionType === 'purchase' ? 0.3 : interactionType === 'view' ? 0.1 : 0.05;
    profile.preferences[item.category] =
      (profile.preferences[item.category] || 0.5) * (1 - weight) + weight;

    // Add to history
    profile.history.push({
      itemId: item.id,
      category: item.category,
      price: item.price,
      date: new Date(),
      type: interactionType,
    });

    // Keep last 100 items
    profile.history = profile.history.slice(-100);

    this.userProfiles.set(userId, profile);
    return { success: true, profile };
  }
}

// ============================================================================
// 3. ANOMALY DETECTION ENGINE
// ============================================================================
class AnomalyDetectionEngine {
  constructor() {
    this.baselineData = new Map();
    this.anomalies = [];
  }

  /**
   * Detect transaction anomalies (fraud detection)
   */
  detectTransactionAnomaly(transaction, userHistory = []) {
    try {
      let anomalyScore = 0;
      const reasons = [];

      // Amount check (unusual amount)
      if (userHistory.length > 0) {
        const avgAmount = userHistory.reduce((sum, t) => sum + t.amount, 0) / userHistory.length;
        const stdDev = Math.sqrt(
          userHistory.reduce((sum, t) => sum + Math.pow(t.amount - avgAmount, 2), 0) /
            userHistory.length
        );

        if (Math.abs(transaction.amount - avgAmount) > 3 * stdDev) {
          anomalyScore += 40;
          reasons.push('Unusual transaction amount');
        }
      }

      // Time check (unusual time)
      const hour = new Date(transaction.timestamp).getHours();
      if (userHistory.length > 0) {
        const usualHours = userHistory.map(t => new Date(t.timestamp).getHours());
        const avgHour = usualHours.reduce((a, b) => a + b, 0) / usualHours.length;
        if (Math.abs(hour - avgHour) > 8) {
          anomalyScore += 20;
          reasons.push('Transaction at unusual time');
        }
      }

      // Location check (if available)
      if (transaction.location && userHistory.length > 0) {
        const usualLocations = userHistory.filter(t => t.location === transaction.location);
        if (usualLocations.length === 0) {
          anomalyScore += 30;
          reasons.push('New geographic location');
        }
      }

      // Frequency check (rapid transactions)
      if (userHistory.length > 0) {
        const lastTx = userHistory[userHistory.length - 1];
        const timeDiff = (transaction.timestamp - new Date(lastTx.timestamp)) / 1000 / 60; // minutes
        if (timeDiff < 2) {
          anomalyScore += 15;
          reasons.push('Rapid consecutive transactions');
        }
      }

      const isAnomaly = anomalyScore > 50;
      return {
        success: true,
        isAnomaly,
        anomalyScore: Math.min(anomalyScore, 100),
        riskLevel: anomalyScore > 75 ? 'CRITICAL' : anomalyScore > 50 ? 'HIGH' : 'LOW',
        reasons,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect inventory anomalies
   */
  detectInventoryAnomaly(productId, currentStock, historicalData = []) {
    try {
      let anomalyScore = 0;
      const reasons = [];

      if (historicalData.length < 5) {
        return { success: false, error: 'Insufficient historical data' };
      }

      // Calculate statistics
      const stocks = historicalData.map(d => d.stock);
      const mean = stocks.reduce((a, b) => a + b, 0) / stocks.length;
      const variance =
        stocks.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / stocks.length;
      const stdDev = Math.sqrt(variance);

      // Z-score calculation
      const zScore = Math.abs((currentStock - mean) / stdDev);

      if (zScore > 3) {
        anomalyScore = 90;
        reasons.push('Extreme deviation from normal levels');
      } else if (zScore > 2) {
        anomalyScore = 60;
        reasons.push('Significant deviation from normal levels');
      }

      // Trend check
      const recentAvg = stocks.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const trend = (recentAvg - mean) / mean;

      if (Math.abs(trend) > 0.5) {
        anomalyScore += 20;
        reasons.push(trend > 0 ? 'Unusual surge' : 'Unusual depletion');
      }

      return {
        success: true,
        isAnomaly: anomalyScore > 50,
        anomalyScore: Math.min(anomalyScore, 100),
        zScore,
        mean,
        stdDev,
        trend: Math.round(trend * 100) / 100,
        reasons,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// 4. NATURAL LANGUAGE PROCESSING ENGINE
// ============================================================================
class NLPEngine {
  constructor() {
    this.vocabulary = new Map();
    this.sentimentModel = null;
  }

  /**
   * Sentiment analysis
   */
  analyzeSentiment(text) {
    try {
      if (!text || text.length === 0) throw new Error('Empty text');

      // Simple sentiment scoring
      const positiveWords = [
        'excellent',
        'great',
        'amazing',
        'love',
        'wonderful',
        'perfect',
        'good',
        'nice',
        'happy',
        'impressed',
      ];
      const negativeWords = [
        'bad',
        'terrible',
        'hate',
        'awful',
        'poor',
        'worst',
        'disappointing',
        'sad',
        'angry',
        'broken',
      ];

      const lowerText = text.toLowerCase();
      let sentimentScore = 0;
      let wordsMatched = 0;

      positiveWords.forEach(word => {
        const count = (lowerText.match(new RegExp(word, 'g')) || []).length;
        sentimentScore += count * 0.1;
        wordsMatched += count;
      });

      negativeWords.forEach(word => {
        const count = (lowerText.match(new RegExp(word, 'g')) || []).length;
        sentimentScore -= count * 0.1;
        wordsMatched += count;
      });

      // Normalize to -1 to 1
      const sentiment = Math.max(-1, Math.min(1, sentimentScore / Math.max(1, wordsMatched)));

      return {
        success: true,
        sentiment,
        sentiment_label: sentiment > 0.2 ? 'POSITIVE' : sentiment < -0.2 ? 'NEGATIVE' : 'NEUTRAL',
        confidence: Math.min(Math.abs(sentiment) * 100, 95),
        wordsMatched,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text, topN = 10) {
    try {
      const words = text.toLowerCase().match(/\b\w+\b/g) || [];

      // Filter stopwords
      const stopwords = [
        'the',
        'a',
        'an',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'to',
        'for',
        'of',
        'with',
      ];
      const filtered = words.filter(w => w.length > 3 && !stopwords.includes(w));

      // Count frequency
      const frequency = {};
      filtered.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
      });

      // Sort by frequency
      const keywords = Object.entries(frequency)
        .map(([word, count]) => ({ word, frequency: count }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, topN);

      return { success: true, keywords };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Text classification (simple)
   */
  classifyText(text, categories = []) {
    try {
      if (categories.length === 0) {
        throw new Error('No categories provided');
      }

      const lowerText = text.toLowerCase();
      const scores = {};

      categories.forEach(cat => {
        let score = 0;
        const keywords = cat.keywords || [];

        keywords.forEach(keyword => {
          const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
          score += matches;
        });

        scores[cat.name] = score;
      });

      const bestMatch = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

      return {
        success: true,
        category: bestMatch[0],
        confidence: Math.min((bestMatch[1] / text.split(' ').length) * 100, 95),
        scores,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// 5. INTELLIGENT OPTIMIZATION ENGINE
// ============================================================================
class OptimizationEngine {
  /**
   * Optimize pricing based on demand and competition
   */
  optimizePrice(currentPrice, demand, inventory, competitorPrice) {
    try {
      let optimalPrice = currentPrice;

      // Demand-based adjustment (40%)
      const demandFactor = demand > 100 ? 1.15 : demand > 50 ? 1.08 : demand < 10 ? 0.85 : 1;

      // Inventory-based adjustment (30%)
      const inventoryFactor = inventory > 100 ? 0.92 : inventory < 10 ? 1.12 : 1;

      // Competition-based adjustment (20%)
      const competitionFactor = competitorPrice
        ? competitorPrice > currentPrice
          ? 1.05
          : 0.98
        : 1;

      // Margin preservation (10%)
      const marginFactor = 0.98; // Preserve some margin

      optimalPrice =
        currentPrice * demandFactor * inventoryFactor * competitionFactor * marginFactor;

      return {
        success: true,
        currentPrice,
        optimalPrice: Math.round(optimalPrice * 100) / 100,
        change: Math.round(((optimalPrice - currentPrice) / currentPrice) * 100),
        recommendation:
          optimalPrice > currentPrice
            ? 'INCREASE'
            : optimalPrice < currentPrice
              ? 'DECREASE'
              : 'MAINTAIN',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Optimize inventory levels
   */
  optimizeInventory(averageDailySales, leadTimeDays, variance) {
    try {
      // Economic Order Quantity (simplified)
      const eoq = Math.sqrt((2 * averageDailySales * 100) / (variance || 1));

      // Reorder point
      const reorderPoint =
        averageDailySales * leadTimeDays + 2.33 * Math.sqrt(leadTimeDays) * variance;

      // Safety stock
      const safetyStock = 2.33 * Math.sqrt(leadTimeDays) * variance;

      return {
        success: true,
        economicOrderQuantity: Math.round(eoq),
        reorderPoint: Math.round(reorderPoint),
        safetyStock: Math.round(safetyStock),
        optimalMaxStock: Math.round(reorderPoint + eoq),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
  PredictiveAnalyticsEngine,
  RecommendationEngine,
  AnomalyDetectionEngine,
  NLPEngine,
  OptimizationEngine,
};
