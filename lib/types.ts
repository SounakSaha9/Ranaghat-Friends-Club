export const DEFAULT_ADMISSION_FEE = 1500;
export const DEFAULT_MONTHLY_FEE = 500;

export interface Student {
  id: string;
  name: string;
  date_of_birth: string; // ISO date
  guardian_name: string;
  guardian_phone: string;
  joining_date: string; // ISO date
  photo_uri?: string;
  address?: string;
  batting_style?: string;
  bowling_style?: string;
  playing_role?: string;
  blood_group?: string;
  emergency_contact?: string;
  school_name?: string;
  id_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  student_id: string;
  student_name: string;
  guardian_name: string;
  guardian_phone: string;
  period: string; // e.g. "2026-09" (YYYY-MM) or "admission"
  description: string; // e.g. "Monthly Fee" or "Admission Fee"
  amount: number;
  status: "pending" | "paid";
  paid_at?: string;
  payment_method?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO date (YYYY-MM-DD)
  category?: string;
  created_at: string;
}

export type AgeBracket = "U-11" | "U-13" | "U-15" | "U-19" | "Senior";

export function getAgeBracket(dob: string): AgeBracket {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  if (age < 11) return "U-11";
  if (age < 13) return "U-13";
  if (age < 15) return "U-15";
  if (age < 19) return "U-19";
  return "Senior";
}
