
import { User, AttendanceRecord, LeaveRequest, Class, AuditEntry, HardwareNode } from '../types';

const API_BASE_URL = 'https://attendance-attendify.onrender.com';

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
      console.warn(`Backend error at ${endpoint}, falling back to LocalStorage:`, error);
      throw error;
    }
  }

  private getLocal<T>(key: string): T[] {
    const data = localStorage.getItem(`attendify_${key}`);
    return data ? JSON.parse(data) : [];
  }

  private setLocal<T>(key: string, data: T[]): void {
    localStorage.setItem(`attendify_${key}`, JSON.stringify(data));
  }

  // User Operations
  async getUsers(): Promise<User[]> {
    try {
      return await this.request<User[]>('/users');
    } catch {
      return this.getLocal<User>('users');
    }
  }

  async saveUser(user: User): Promise<User> {
    try {
      const users = await this.getUsers();
      const exists = users.find(u => u.id === user.id || u.email === user.email);
      
      let savedUser: User;
      if (exists) {
        savedUser = await this.request<User>(`/users/${exists.id}`, {
          method: 'PUT',
          body: JSON.stringify(user),
        });
      } else {
        savedUser = await this.request<User>('/users', {
          method: 'POST',
          body: JSON.stringify(user),
        });
      }
      return savedUser;
    } catch {
      const localUsers = this.getLocal<User>('users');
      const idx = localUsers.findIndex(u => u.id === user.id || u.email === user.email);
      if (idx > -1) {
        localUsers[idx] = user;
      } else {
        localUsers.push(user);
      }
      this.setLocal('users', localUsers);
      return user;
    }
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  // Hardware Node Operations
  async getHardwareNodes(): Promise<HardwareNode[]> {
    try {
      return await this.request<HardwareNode[]>('/hardware');
    } catch {
      return this.getLocal<HardwareNode>('hardware');
    }
  }

  async addHardwareNode(node: HardwareNode): Promise<void> {
    try {
      await this.request('/hardware', {
        method: 'POST',
        body: JSON.stringify(node),
      });
    } catch {
      const nodes = this.getLocal<HardwareNode>('hardware');
      nodes.push(node);
      this.setLocal('hardware', nodes);
    }
  }

  async deleteHardwareNode(nodeId: string): Promise<void> {
    try {
      await this.request(`/hardware/${nodeId}`, { method: 'DELETE' });
    } catch {
      const nodes = this.getLocal<HardwareNode>('hardware');
      this.setLocal('hardware', nodes.filter(n => n.id !== nodeId));
    }
  }

  // Class Operations
  async getClasses(): Promise<Class[]> {
    try {
      return await this.request<Class[]>('/classes');
    } catch {
      return this.getLocal<Class>('classes');
    }
  }

  async addClass(newClass: Class): Promise<void> {
    try {
      await this.request('/classes', {
        method: 'POST',
        body: JSON.stringify(newClass),
      });
    } catch {
      const classes = this.getLocal<Class>('classes');
      classes.push(newClass);
      this.setLocal('classes', classes);
    }
  }

  async deleteClass(classId: string): Promise<void> {
    try {
      await this.request(`/classes/${classId}`, { method: 'DELETE' });
    } catch {
      const classes = this.getLocal<Class>('classes');
      this.setLocal('classes', classes.filter(c => c.id !== classId));
    }
  }

  // Attendance Operations
  async getAttendance(userId?: string): Promise<AttendanceRecord[]> {
    try {
      const records = await this.request<AttendanceRecord[]>('/attendance');
      return userId ? records.filter(r => r.userId === userId) : records;
    } catch {
      const localRecords = this.getLocal<AttendanceRecord>('attendance');
      return userId ? localRecords.filter(r => r.userId === userId) : localRecords;
    }
  }

  async addAttendance(record: AttendanceRecord): Promise<void> {
    try {
      await this.request('/attendance', {
        method: 'POST',
        body: JSON.stringify(record),
      });
    } catch {
      const localRecords = this.getLocal<AttendanceRecord>('attendance');
      localRecords.unshift(record);
      this.setLocal('attendance', localRecords);
    }
  }

  // Leave Operations
  async getLeaveRequests(userId?: string): Promise<LeaveRequest[]> {
    try {
      const requests = await this.request<LeaveRequest[]>('/leave-requests');
      return userId ? requests.filter(r => r.userId === userId) : requests;
    } catch {
      const localRequests = this.getLocal<LeaveRequest>('leave_requests');
      return userId ? localRequests.filter(r => r.userId === userId) : localRequests;
    }
  }

  async addLeaveRequest(request: LeaveRequest): Promise<void> {
    try {
      await this.request('/leave-requests', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch {
      const localRequests = this.getLocal<LeaveRequest>('leave_requests');
      localRequests.unshift(request);
      this.setLocal('leave_requests', localRequests);
    }
  }

  async updateLeaveStatus(requestId: string, status: 'APPROVED' | 'REJECTED'): Promise<void> {
    try {
      await this.request(`/leave-requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch {
      const localRequests = this.getLocal<LeaveRequest>('leave_requests');
      const idx = localRequests.findIndex(r => r.id === requestId);
      if (idx > -1) {
        localRequests[idx].status = status;
        this.setLocal('leave_requests', localRequests);
      }
    }
  }

  // Audit Logs
  async getAuditLogs(): Promise<AuditEntry[]> {
    try {
      return await this.request<AuditEntry[]>('/audit-logs');
    } catch {
      return this.getLocal<AuditEntry>('audit_logs');
    }
  }

  async addAuditEntry(entry: AuditEntry): Promise<void> {
    try {
      await this.request('/audit-logs', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
    } catch {
      const logs = this.getLocal<AuditEntry>('audit_logs');
      logs.unshift(entry);
      this.setLocal('audit_logs', logs);
    }
  }
}

export const db = new DatabaseService();
