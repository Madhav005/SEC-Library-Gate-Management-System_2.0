
import { Entry, UserProfile, UserType } from '../types';

/**
 * SPRING BOOT API CONFIGURATION
 */
const hostname = window.location.hostname || 'localhost';
const API_BASE_URL = (hostname === 'localhost' || hostname === '127.0.0.1')
  ? 'http://localhost:8080/api'
  : `http://${hostname}:8080/api`;

export class DBService {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }

      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (err: any) {
      if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
        throw new Error(`CRITICAL: Backend unreachable at ${API_BASE_URL}. Ensure your Spring Boot server is running on port 8080 and MySQL 'library_db' is active.`);
      }
      throw err;
    }
  }

  static getStatus(): string {
    return 'SPRING BOOT + MYSQL: ACTIVE';
  }

  static getUserType(regNo: string): UserType {
    return /^[a-zA-Z]/.test(regNo) ? 'STAFF' : 'STUDENT';
  }

  static async getMasterStudents(): Promise<Omit<UserProfile, 'userType'>[]> {
    return this.request<Omit<UserProfile, 'userType'>[]>('/students_data');
  }

  static async getMasterStaff(): Promise<Omit<UserProfile, 'userType'>[]> {
    return this.request<Omit<UserProfile, 'userType'>[]>('/staff_data');
  }

  static async addMasterUser(user: Omit<UserProfile, 'userType'>): Promise<void> {
    const type = this.getUserType(user.regNo);
    const endpoint = type === 'STUDENT' ? '/students_data' : '/staff_data';
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  static async updateMasterUser(user: Omit<UserProfile, 'userType'>): Promise<void> {
    const type = this.getUserType(user.regNo);
    const endpoint = type === 'STUDENT' ? `/students_data/${user.regNo}` : `/staff_data/${user.regNo}`;
    // Reusing POST for simplicity if update endpoint isn't explicit, but typically this should be PUT
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  static async lookupUserFromMaster(regNo: string): Promise<UserProfile | undefined> {
    return this.request<UserProfile | undefined>(`/lookup/${regNo}`);
  }

  static async bulkDeleteMasterUsers(regNos: string[]): Promise<{ deletedCount: number }> {
    return this.request('/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ regNos }),
    });
  }

  static async getEntries(): Promise<Entry[]> {
    return this.request<Entry[]>('/log_entry');
  }

  static async addEntry(regNo: string, profile: Omit<UserProfile, 'regNo'>): Promise<Entry> {
    return this.request<Entry>('/log_entry', {
      method: 'POST',
      body: JSON.stringify({ regNo, ...profile }),
    });
  }

  static async manualCheckout(entryId: string): Promise<Entry> {
    return this.request<Entry>(`/log_entry/${entryId}/checkout`, {
      method: 'PUT',
    });
  }

  static async checkoutAllActive(): Promise<void> {
    return this.request('/log_entry/checkout-all', {
      method: 'PUT',
    });
  }

  static async registerUnknownUser(user: UserProfile): Promise<void> {
    return this.request('/register-unknown', {
      method: 'POST',
      body: JSON.stringify(user)
    });
  }

  static async syncUnknownEntryLogs(): Promise<{ resolvedCount: number }> {
    return this.request('/sync-unknown', { method: 'POST' });
  }
}
