import { supabase } from "./supabase";
import { Student, Invoice, Expense, DEFAULT_ADMISSION_FEE, DEFAULT_MONTHLY_FEE } from "./types";

// ── Fee Settings ──

let _cachedFees: { admission_fee: number; monthly_fee: number } | null = null;

export async function getFeeSettings(): Promise<{ admission_fee: number; monthly_fee: number }> {
  if (_cachedFees) return _cachedFees;

  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["admission_fee", "monthly_fee"]);

  if (error) throw error;

  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    map[row.key] = parseFloat(row.value);
  }

  _cachedFees = {
    admission_fee: map.admission_fee || DEFAULT_ADMISSION_FEE,
    monthly_fee: map.monthly_fee || DEFAULT_MONTHLY_FEE,
  };
  return _cachedFees;
}

export async function updateFeeSetting(key: "admission_fee" | "monthly_fee", value: number): Promise<void> {
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value: String(value) }, { onConflict: "key" });

  if (error) throw error;
  _cachedFees = null; // bust cache
}

// ── Students ──

export async function getStudents(activeOnly = true): Promise<Student[]> {
  let query = supabase
    .from("students")
    .select("*")
    .order("name");

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getStudent(id: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

export async function addStudent(
  student: Omit<Student, "id" | "created_at" | "updated_at" | "is_active">,
  options?: { skipAdmissionFee?: boolean }
): Promise<string> {
  const now = new Date().toISOString();

  // Insert student
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .insert({
      name: student.name,
      date_of_birth: student.date_of_birth,
      guardian_name: student.guardian_name,
      guardian_phone: student.guardian_phone,
      joining_date: student.joining_date,
      photo_uri: student.photo_uri || null,
      address: student.address || null,
      batting_style: student.batting_style || null,
      bowling_style: student.bowling_style || null,
      playing_role: student.playing_role || null,
      blood_group: student.blood_group || null,
      emergency_contact: student.emergency_contact || null,
      school_name: student.school_name || null,
      id_verified: student.id_verified ?? false,
      is_active: true,
    })
    .select("id")
    .single();

  if (studentError) throw studentError;
  const id = studentData.id;

  // Record consent
  await supabase.from("consents").insert({
    student_id: id,
    guardian_name: student.guardian_name,
    consented_on: now,
    consent_method: "in-app registration",
  });

  // Generate admission fee invoice (skip for old/returning students)
  if (!options?.skipAdmissionFee) {
    const fees = await getFeeSettings();
    await supabase.from("invoices").insert({
      student_id: id,
      student_name: student.name,
      guardian_name: student.guardian_name,
      guardian_phone: student.guardian_phone,
      period: "admission",
      description: "Admission Fee",
      amount: fees.admission_fee,
      status: "pending",
    });
  }

  return id;
}

export async function updateStudent(
  id: string,
  updates: Partial<Student>
): Promise<void> {
  const allowed = [
    "name", "date_of_birth", "guardian_name", "guardian_phone",
    "photo_uri", "address", "batting_style", "bowling_style",
    "playing_role", "blood_group", "emergency_contact", "school_name",
    "id_verified", "is_active",
  ] as const;

  const payload: Record<string, any> = {};
  for (const key of allowed) {
    if (key in updates) {
      payload[key] = updates[key as keyof Student] ?? null;
    }
  }

  if (Object.keys(payload).length === 0) return;

  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("students")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

// ── Invoices ──

export async function getInvoices(
  filters?: { studentId?: string; period?: string; status?: string }
): Promise<Invoice[]> {
  let query = supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.studentId) {
    query = query.eq("student_id", filters.studentId);
  }
  if (filters?.period) {
    query = query.eq("period", filters.period);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

export async function generateMonthlyInvoices(period: string): Promise<number> {
  // Get all active students
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("*")
    .eq("is_active", true);

  if (studentsError) throw studentsError;
  if (!students || students.length === 0) return 0;

  // Get existing invoices for this period to avoid duplicates
  const { data: existingInvoices, error: existingError } = await supabase
    .from("invoices")
    .select("student_id")
    .eq("period", period);

  if (existingError) throw existingError;

  const existingStudentIds = new Set(
    (existingInvoices ?? []).map((inv) => inv.student_id)
  );

  const fees = await getFeeSettings();
  const newInvoices = students
    .filter((s) => !existingStudentIds.has(s.id))
    .map((s) => ({
      student_id: s.id,
      student_name: s.name,
      guardian_name: s.guardian_name,
      guardian_phone: s.guardian_phone,
      period,
      description: "Monthly Fee",
      amount: fees.monthly_fee,
      status: "pending",
    }));

  if (newInvoices.length === 0) return 0;

  const { error: insertError } = await supabase
    .from("invoices")
    .insert(newInvoices);

  if (insertError) throw insertError;
  return newInvoices.length;
}

export async function markInvoicePaid(
  id: string,
  paymentMethod: string
): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod,
    })
    .eq("id", id);

  if (error) throw error;
}

// ── Expenses ──

export async function getExpenses(filters?: {
  month?: string; // YYYY-MM
}): Promise<Expense[]> {
  let query = supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });

  if (filters?.month) {
    const startDate = `${filters.month}-01`;
    const [y, m] = filters.month.split("-").map(Number);
    const endDate = new Date(y, m, 0); // last day of month
    const endStr = `${y}-${String(m).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    query = query.gte("date", startDate).lte("date", endStr);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function addExpense(expense: {
  description: string;
  amount: number;
  date: string;
  category?: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      category: expense.category || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ── Dashboard Stats ──

export async function getDashboardStats() {
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [studentsRes, pendingRes, paidRes, pendingAmountRes] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("invoices")
      .select("amount")
      .eq("status", "paid")
      .eq("period", currentPeriod),
    supabase
      .from("invoices")
      .select("amount")
      .eq("status", "pending"),
  ]);

  const collectedThisMonth = (paidRes.data ?? []).reduce(
    (sum, row) => sum + (row.amount || 0),
    0
  );
  const pendingAmount = (pendingAmountRes.data ?? []).reduce(
    (sum, row) => sum + (row.amount || 0),
    0
  );

  return {
    totalStudents: studentsRes.count ?? 0,
    pendingInvoices: pendingRes.count ?? 0,
    collectedThisMonth,
    pendingAmount,
    currentPeriod,
  };
}
