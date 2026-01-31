// AIClient.ts
// عميل متقدم للتواصل مع API الذكاء الاصطناعي

export class AIClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  // واجهات AI الأساسية
  async suggestNextStep() {
    return this.get('/api/ai/suggest-next-step');
  }

  async analyzePerformance() {
    return this.get('/api/ai/analyze-performance');
  }

  async detectIssues() {
    return this.get('/api/ai/detect-issues');
  }

  // التنبؤات
  async predictNextStep() {
    return this.get('/api/ai/predict-next-step');
  }

  async predictDuration() {
    return this.get('/api/ai/predict-duration');
  }

  // ML
  async classifyRisk() {
    return this.get('/api/ai/risk-classification');
  }

  async getRecommendation() {
    return this.get('/api/ai/recommendation');
  }

  async fullAnalysis() {
    return this.get('/api/ai/full-analysis');
  }

  // NLP
  async extractKeywords(text: string) {
    return this.get('/api/ai/extract-keywords');
  }

  async processSummary() {
    return this.get('/api/ai/process-summary');
  }

  // التحسينات
  async getProcessScore() {
    return this.get('/api/ai/process-score');
  }

  async optimizeSequence() {
    return this.get('/api/ai/optimize-sequence');
  }

  // الأنماط
  async detectPatterns() {
    return this.get('/api/ai/detect-patterns');
  }

  async stepImpact() {
    return this.get('/api/ai/step-impact');
  }

  // الأتمتة
  async automationOpportunities() {
    return this.get('/api/ai/automation-opportunities');
  }

  async smartTasks() {
    return this.get('/api/ai/smart-tasks');
  }

  // التحليلات الشاملة
  async getMetrics() {
    return this.get('/api/ai/metrics');
  }

  async getTrends() {
    return this.get('/api/ai/trends');
  }

  async getForecast() {
    return this.get('/api/ai/forecast');
  }

  async getHealthReport() {
    return this.get('/api/ai/health-report');
  }

  async getDashboard() {
    return this.get('/api/ai/dashboard');
  }

  // تكامل المحاسبة والذكاء الاصطناعي
  async getAccountingHealth() {
    return this.get('/api/ai/accounting/health');
  }

  async getAccountingSummary(params?: { asOfDate?: string; startDate?: string; endDate?: string }) {
    const query = this.buildQuery(params);
    return this.get(`/api/ai/accounting/summary${query}`);
  }

  async getAccountingInsights(params?: { asOfDate?: string; startDate?: string; endDate?: string }) {
    const query = this.buildQuery(params);
    return this.get(`/api/ai/accounting/insights${query}`);
  }

  async getAccountingAdvancedReport(params?: { asOfDate?: string; startDate?: string; endDate?: string }) {
    const query = this.buildQuery(params);
    return this.get(`/api/ai/accounting/reports/advanced${query}`);
  }

  async getAccountingForecast(params?: { asOfDate?: string; historyMonths?: number; forecastMonths?: number }) {
    const query = this.buildQuery(params);
    return this.get(`/api/ai/accounting/forecast${query}`);
  }

  // دالة مساعدة للطلبات
  private async get(endpoint: string) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  private buildQuery(params?: Record<string, string | number | undefined>) {
    if (!params) return '';
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }
}

export default new AIClient();
