
export enum UserRole {
  STUDENT = 'STUDENT',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN'
}

export interface Class {
  id: string;
  name: string;
  description?: string;
  location?: {
    lat: number;
    lng: number;
  };
  geofenceRadius?: number; // meters
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
}

export interface UserSettings {
  notificationsEnabled: boolean;
  workdayStart: string; // HH:mm
  workdayEnd: string;   // HH:mm
  twoFactorEnabled: boolean;
  faceRecognitionSensitivity: number; // 0-100
  require2FABeforeFaceScan: boolean;
  autoAttendanceEnabled?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  rollNumber: string;
  classId?: string;
  className?: string;
  role: UserRole;
  avatar?: string;
  facialTemplates?: string[]; // Array of base64 images
  biometricsSkipped?: boolean; 
  phone?: string;
  gender?: string;
  dob?: string;
  address?: string;
  isVerified: boolean;
  lastLogin?: string;
  settings?: UserSettings;
}

export interface HardwareNode {
  id: string;
  name: string;
  type: 'ESP32_CAM' | 'DOOR_LOCK' | 'BIOMETRIC_READER';
  ipAddress: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSeen?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  time: string;
  status: 'PRESENT' | 'ABSENT' | 'OD' | 'PENDING' | 'REJECTED';
  location: {
    lat: number;
    lng: number;
  };
  device: string;
  facialMatchScore?: number;
  leftGeofenceAt?: string;
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

export interface AuditEntry {
  id: string;
  timestamp: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string;
}
