
import { User, AttendanceRecord, LeaveRequest } from '../types';

const API_BASE_URL = 'https://attendance-backend-7m9r.onrender.com';

class DatabaseService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  // User Operations
  async getUsers(): Promise<User[]> {
    try {
      return await this.request<User[]>('/users');
    } catch (error) {
      return [];
    }
  }

  async saveUser(user: User): Promise<User> {
    const users = await this.getUsers();
    const exists = users.find(u => u.id === user.id || u.email === user.email);
    
    if (exists) {
      return await this.request<User>(`/users/${exists.id || user.id}`, {
        method: 'PUT',
        body: JSON.stringify(user),
      });
    } else {
      return await this.request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(user),
      });
    }
  }

  // Attendance Operations
  async getAttendance(userId?: string): Promise<AttendanceRecord[]> {
    try {
      const records = await this.request<AttendanceRecord[]>('/attendance');
      return userId ? records.filter(r => r.userId === userId) : records;
    } catch (error) {
      return [];
    }
  }

  async addAttendance(record: AttendanceRecord): Promise<void> {
    await this.request('/attendance', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  // Leave Operations
  async getLeaveRequests(userId?: string): Promise<LeaveRequest[]> {
    try {
      const requests = await this.request<LeaveRequest[]>('/leave-requests');
      return userId ? requests.filter(r => r.userId === userId) : requests;
    } catch (error) {
      return [];
    }
  }

  async addLeaveRequest(request: LeaveRequest): Promise<void> {
    await this.request('/leave-requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updateLeaveStatus(requestId: string, status: 'APPROVED' | 'REJECTED'): Promise<void> {
    await this.request(`/leave-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const db = new DatabaseService();
