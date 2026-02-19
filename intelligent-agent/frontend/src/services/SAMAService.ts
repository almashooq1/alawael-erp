// SAMA Service - Frontend API Client
// Handles all communication with SAMA Banking Integration API

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

interface ApiConfig {
  token: string;
  headers?: Record<string, string>;
}

interface PaymentData {
  recipientIBAN: string;
  amount: number;
  description: string;
}

interface SchedulePaymentData {
  recipientIBAN: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  description: string;
}

interface IBANValidationData {
  iban: string;
}

class SAMAServiceClass {
  private getHeaders(token: string, additionalHeaders?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...additionalHeaders,
    };
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `API Error: ${response.statusText}`);
    }
    return response.json();
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return this.handleResponse(response);
  }

  async logout(token: string) {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  // IBAN and Account Operations
  async validateIBAN(token: string, data: IBANValidationData) {
    const response = await fetch(`${API_BASE_URL}/sama/iban/validate`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async verifyAccount(token: string, iban: string) {
    const response = await fetch(`${API_BASE_URL}/sama/account/verify`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ iban }),
    });
    return this.handleResponse(response);
  }

  async getAccountBalance(token: string, iban: string) {
    const response = await fetch(`${API_BASE_URL}/sama/account/${iban}/balance`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  // Payment Operations
  async processPayment(token: string, data: PaymentData) {
    const response = await fetch(`${API_BASE_URL}/sama/payments/transfer`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async schedulePayment(token: string, data: SchedulePaymentData) {
    const response = await fetch(`${API_BASE_URL}/sama/payments/schedule`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  // Analytics Operations
  async getCashFlowForecast(token: string) {
    const response = await fetch(`${API_BASE_URL}/sama/analytics/forecast`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  async getSpendingPatterns(token: string) {
    const response = await fetch(`${API_BASE_URL}/sama/analytics/spending-patterns`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  async getBudgetRecommendations(token: string) {
    const response = await fetch(`${API_BASE_URL}/sama/analytics/budget-recommendations`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  async getInvestmentSuggestions(token: string) {
    const response = await fetch(`${API_BASE_URL}/sama/analytics/investment-suggestions`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  async getFinancialScore(token: string) {
    const response = await fetch(`${API_BASE_URL}/sama/analytics/financial-score`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  async getMonthlyReport(token: string) {
    const response = await fetch(`${API_BASE_URL}/sama/analytics/monthly-report`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  // Fraud Detection Operations
  async detectFraud(token: string, transactionData: any) {
    const response = await fetch(`${API_BASE_URL}/sama/fraud/detect`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(transactionData),
    });
    return this.handleResponse(response);
  }

  async buildBehavioralProfile(token: string) {
    const response = await fetch(`${API_BASE_URL}/sama/fraud/profile/build`, {
      method: 'POST',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  async createFraudAlert(token: string, alertData: any) {
    const response = await fetch(`${API_BASE_URL}/sama/fraud/alert/create`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(alertData),
    });
    return this.handleResponse(response);
  }

  async resolveFraudAlert(token: string, alertId: string, status: string) {
    const response = await fetch(`${API_BASE_URL}/sama/fraud/alert/resolve`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ alertId, status }),
    });
    return this.handleResponse(response);
  }

  async addToBlacklist(token: string, iban: string) {
    const response = await fetch(`${API_BASE_URL}/sama/fraud/blacklist/add`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ iban }),
    });
    return this.handleResponse(response);
  }

  async addToWhitelist(token: string, iban: string) {
    const response = await fetch(`${API_BASE_URL}/sama/fraud/whitelist/add`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ iban }),
    });
    return this.handleResponse(response);
  }

  // Compliance Operations
  async getComplianceReport(token: string, iban: string) {
    const response = await fetch(`${API_BASE_URL}/sama/account/${iban}/compliance-report`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  // Dashboard Data
  async getDashboardData(token: string) {
    try {
      // Get multiple data sources in parallel
      const [balance, score, forecast, spending] = await Promise.all([
        this.getAccountBalance(token, localStorage.getItem('userIBAN') || ''),
        this.getFinancialScore(token),
        this.getCashFlowForecast(token),
        this.getSpendingPatterns(token),
      ]);

      // Aggregate data
      const balanceData = balance as any;
      const scoreData = score as any;
      const forecastData = forecast as any;
      const spendingData = spending as any;

      return {
        accountBalance: balanceData.balance || 0,
        monthlySpending: (spendingData[0]?.amount || 0) * 30,
        savingsRate: scoreData.savingsRate || 35,
        investmentValue: 0,
        alerts: 0,
        fraudScore: 100 - scoreData.score,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  // System Status
  async getSystemStatus(token: string) {
    const response = await fetch(`${API_BASE_URL}/sama/status`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  // Helper: Store auth token
  setAuthToken(token: string) {
    localStorage.setItem('authToken', token);
  }

  // Helper: Get stored auth token
  getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  // Helper: Clear auth token
  clearAuthToken() {
    localStorage.removeItem('authToken');
  }
}

// Export singleton instance
export const SAMAService = new SAMAServiceClass();

// Export type for API responses
export type { PaymentData, SchedulePaymentData, IBANValidationData };
