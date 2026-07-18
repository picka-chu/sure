export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  business_id: string;
  business_name: string;
}

export interface StaffUser {
  id: string;
  full_name: string;
  business_id: string;
  business_name: string;
}

export interface Business {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  subscription_status: string;
  trial_end_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface BankAccount {
  id: string;
  business_id: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  initial_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface StaffMember {
  id: string;
  business_id: string;
  full_name: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface Verification {
  id: string;
  business_id: string;
  staff_id?: string;
  bank_account_id?: string;
  bank_name?: string;
  transaction_reference?: string;
  payer_name?: string;
  payer_account?: string;
  receiver_name?: string;
  receiver_account?: string;
  amount?: number;
  currency: string;
  status: string;
  receipt_url?: string;
  verification_data?: any;
  confidence_score?: number;
  error_message?: string;
  verified_at?: string;
  created_at: string;
}

export interface VerifyResult {
  verification: Verification;
  is_verified: boolean;
  matches_business_account: boolean;
}

export interface DashboardData {
  total_verifications: number;
  verified_today: number;
  scam_today: number;
  scam_rate: number;
  total_scans_today: number;
  recent_verifications: any[];
  daily_stats: any[];
  bank_breakdown: Record<string, number>;
}

export interface StaffTodayStats {
  total: number;
  verified: number;
  scam: number;
}

export interface SupportedBank {
  id: string;
  name: string;
}
