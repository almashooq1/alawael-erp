// EmployeeClient.ts
// عميل واجهات ملف الموظف الشامل

type ApiResponse<T> = {
  status: 'success' | 'error';
  data: T;
  message?: string;
};

export class EmployeeClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async getEmployeeProfile(employeeId: string) {
    return this.get<ApiResponse<any>>(`/api/employees/${employeeId}/profile`);
  }

  async searchEmployees(query: string) {
    const encoded = encodeURIComponent(query);
    return this.get<ApiResponse<any>>(`/api/employees/search?q=${encoded}`);
  }

  async listEmployees(params?: { skip?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.skip !== undefined) query.set('skip', String(params.skip));
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.get<ApiResponse<any[]>>(`/api/employees${suffix}`);
  }

  async updateEmployee(employeeId: string, data: any) {
    return this.put<ApiResponse<any>>(`/api/employees/${employeeId}`, data);
  }

  async deleteEmployee(employeeId: string) {
    return this.delete<ApiResponse<any>>(`/api/employees/${employeeId}`);
  }

  async transferEmployeeBranch(employeeId: string, newBranch: string, transferDate?: string) {
    return this.post<ApiResponse<any>>(`/api/employees/${employeeId}/transfer`, {
      newBranch,
      transferDate: transferDate || new Date().toISOString(),
    });
  }

  async getBranches() {
    return this.get<ApiResponse<string[]>>(`/api/branches`);
  }

  // ميزات جديدة متقدمة

  async createEmployee(data: any) {
    return this.post<ApiResponse<any>>(`/api/employees`, data);
  }

  async bulkImportEmployees(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.postFormData<ApiResponse<any>>(`/api/employees/bulk-import`, formData);
  }

  async exportEmployeesExcel(filters?: any) {
    const query = new URLSearchParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) query.set(key, String(filters[key]));
      });
    }
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.getBlob(`/api/employees/export/excel${suffix}`);
  }

  async addPerformanceReview(employeeId: string, review: any) {
    return this.post<ApiResponse<any>>(`/api/employees/${employeeId}/performance`, review);
  }

  async getPerformanceReviews(employeeId: string) {
    return this.get<ApiResponse<any[]>>(`/api/employees/${employeeId}/performance`);
  }

  async getLeaveRequests(employeeId?: string, status?: string) {
    const query = new URLSearchParams();
    if (employeeId) query.set('employeeId', employeeId);
    if (status) query.set('status', status);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.get<ApiResponse<any[]>>(`/api/leave-requests${suffix}`);
  }

  async approveLeaveRequest(requestId: string, approved: boolean, notes?: string) {
    return this.post<ApiResponse<any>>(`/api/leave-requests/${requestId}/approve`, {
      approved,
      notes,
    });
  }

  async getAuditLog(employeeId?: string, limit?: number) {
    const query = new URLSearchParams();
    if (employeeId) query.set('employeeId', employeeId);
    if (limit) query.set('limit', String(limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.get<ApiResponse<any[]>>(`/api/audit-log${suffix}`);
  }

  async advancedSearch(criteria: any) {
    return this.post<ApiResponse<any[]>>(`/api/employees/search/advanced`, criteria);
  }

  async getDashboardStats() {
    return this.get<ApiResponse<any>>(`/api/dashboard/stats`);
  }

  async getNotifications(userId: string, unreadOnly?: boolean) {
    const query = new URLSearchParams();
    if (unreadOnly) query.set('unreadOnly', 'true');
    return this.get<ApiResponse<any[]>>(
      `/api/notifications/${userId}${query.toString() ? '?' + query.toString() : ''}`
    );
  }

  async markNotificationRead(notificationId: string) {
    return this.post<ApiResponse<any>>(`/api/notifications/${notificationId}/read`, {});
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

  private async post<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  }

  private async put<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  }

  private async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  }

  private async postFormData<T>(path: string, formData: FormData): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  }

  private async getBlob(path: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.blob();
  }
}

export default new EmployeeClient();
