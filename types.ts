
export type UserType = 'STUDENT' | 'STAFF' | 'UNKNOWN';

export interface Entry {
  id: string;
  regNo: string;
  name: string;
  department: string;
  userType: UserType;
  checkInTime: string;          // ISO datetime from backend
  checkOutTime: string | null;  // ISO datetime or null
}

export interface UserProfile {
  regNo: string;
  name: string;
  department: string;
  userType: UserType;
}

export enum AppTab {
  DASHBOARD = 'DASHBOARD',
  REPORTS = 'REPORTS',
  STATISTICS = 'STATISTICS',
  NOT_CHECKED_OUT = 'NOT_CHECKED_OUT',
  DATA_MANAGEMENT = 'DATA_MANAGEMENT',
  UNKNOWN_ENTRIES = 'UNKNOWN_ENTRIES', // New Tab
  SETTINGS = 'SETTINGS'
}

export interface DailyStats {
  date: string;
  count: number;
}
