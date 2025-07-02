export type UserRole = 'Admin' | 'Photographer' | 'Videographer' | 'Editor' | 'Other';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  mobile_number: string;
  role: UserRole;
  firm_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Firm {
  id: string;
  name: string;
  spreadsheet_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AuthFormData {
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
  role: UserRole;
  firmId?: string;
  adminPin?: string;
}