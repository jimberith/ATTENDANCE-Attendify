
import { User, AttendanceRecord, LeaveRequest, Class, AuditEntry, HardwareNode } from '../types';

class DatabaseService {
  private getLocal<T>(key: string): T[] {
    const data = localStorage.getItem(`attendify_${key}`);
    return data ? JSON.parse(data) : [];
  }

  private setLocal<T>(key: string, data: T[]): void {
    localStorage.setItem(`attendify_${key}`, JSON.stringify(data));
  }

  // User Operations
  async getUsers(): Promise<User[]> {
    return this.getLocal<User>('users');
  }

  async saveUser(user: User): Promise<User> {
    const users = this.getLocal<User>('users');
    const idx = users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx > -1) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    this.setLocal('users', users);
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const users = this.getLocal<User>('users');
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  // Hardware Node Operations
  async getHardwareNodes(): Promise<HardwareNode[]> {
    return this.getLocal<HardwareNode>('hardware');
  }

  async addHardwareNode(node: HardwareNode): Promise<void> {
    const nodes = this.getLocal<HardwareNode>('hardware');
    nodes.push(node);
    this.setLocal('hardware', nodes);
  }

  async deleteHardwareNode(nodeId: string): Promise<void> {
    const nodes = this.getLocal<HardwareNode>('hardware');
    this.setLocal('hardware', nodes.filter(n => n.id !== nodeId));
  }

  // Class Operations
  async getClasses(): Promise<Class[]> {
    return this.getLocal<Class>('classes');
  }

  async addClass(newClass: Class): Promise<void> {
    const classes = this.getLocal<Class>('classes');
    const idx = classes.findIndex(c => c.id === newClass.id);
    if (idx > -1) {
      classes[idx] = newClass;
    } else {
      classes.push(newClass);
    }
    this.setLocal('classes', classes);
  }

  async deleteClass(classId: string): Promise<void> {
    const classes = this.getLocal<Class>('classes');
    this.setLocal('classes', classes.filter(c => c.id !== classId));
  }

  // Attendance Operations
  async getAttendance(userId?: string): Promise<AttendanceRecord[]> {
    const records = this.getLocal<AttendanceRecord>('attendance');
    return userId ? records.filter(r => r.userId === userId) : records;
  }

  async addAttendance(record: AttendanceRecord): Promise<void> {
    const records = this.getLocal<AttendanceRecord>('attendance');
    records.unshift(record);
    this.setLocal('attendance', records);
  }

  // Leave Operations
  async getLeaveRequests(userId?: string): Promise<LeaveRequest[]> {
    const requests = this.getLocal<LeaveRequest>('leave_requests');
    return userId ? requests.filter(r => r.userId === userId) : requests;
  }

  async addLeaveRequest(request: LeaveRequest): Promise<void> {
    const requests = this.getLocal<LeaveRequest>('leave_requests');
    requests.unshift(request);
    this.setLocal('leave_requests', requests);
  }

  async updateLeaveStatus(requestId: string, status: 'APPROVED' | 'REJECTED'): Promise<void> {
    const requests = this.getLocal<LeaveRequest>('leave_requests');
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx > -1) {
      requests[idx].status = status;
      this.setLocal('leave_requests', requests);
    }
  }

  // Audit Logs
  async getAuditLogs(): Promise<AuditEntry[]> {
    return this.getLocal<AuditEntry>('audit_logs');
  }

  async addAuditEntry(entry: AuditEntry): Promise<void> {
    const logs = this.getLocal<AuditEntry>('audit_logs');
    logs.unshift(entry);
    this.setLocal('audit_logs', logs);
  }
}

export const db = new DatabaseService();
