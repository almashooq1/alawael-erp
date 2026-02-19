// SaudiClient.ts
// عميل واجهات النظام السعودي

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export class SaudiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async getOverview() {
    return this.get<ApiResponse<any>>('/api/saudi-dashboard/overview');
  }

  async getExpirations(days: number = 30) {
    return this.get<ApiResponse<any>>(`/api/saudi-dashboard/expirations?days=${days}`);
  }

  async getComplianceReport() {
    return this.get<ApiResponse<any>>('/api/saudi-dashboard/compliance-report');
  }

  async getNitaqat() {
    return this.get<ApiResponse<any>>('/api/saudi-dashboard/nitaqat');
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  }
}

export default new SaudiClient();
