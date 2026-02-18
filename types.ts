
export enum UserRole {
  STUDENT = 'STUDENT',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Stored in DB
  rollNumber: string;
  className?: string; // New: Assigned class/section
  role: UserRole;
  avatar?: string;
  facialTemplate?: string; // Base64 encoded facial signature
  biometricsSkipped?: boolean; 
  phone?: string;
  gender?: string;
  dob?: string;
  address?: string;
  isVerified: boolean;
  lastLogin?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  time: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  location: {
    lat: number;
    lng: number;
  };
  device: string;
  facialMatchScore?: number;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  type: 'LEAVE' | 'OD';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}
