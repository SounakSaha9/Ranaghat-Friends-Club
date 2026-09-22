import { supabase } from "./supabase";
import { ADMISSION_FEE, MONTHLY_FEE } from "./types";

const STUDENTS = [
  { name: "Arjun Sharma", dob: "2012-03-15", guardian: "Rajesh Sharma", phone: "9876543210" },
  { name: "Priya Patel", dob: "2013-07-22", guardian: "Suresh Patel", phone: "9876543211" },
  { name: "Rohit Singh", dob: "2011-01-08", guardian: "Vikram Singh", phone: "9876543212" },
  { name: "Ananya Das", dob: "2014-11-30", guardian: "Amit Das", phone: "9876543213" },
  { name: "Kabir Khan", dob: "2010-05-12", guardian: "Farhan Khan", phone: "9876543214" },
  { name: "Sneha Gupta", dob: "2013-09-03", guardian: "Ravi Gupta", phone: "9876543215" },
  { name: "Vikash Yadav", dob: "2008-02-20", guardian: "Manoj Yadav", phone: "9876543216" },
  { name: "Ishaan Reddy", dob: "2012-06-18", guardian: "Srinivas Reddy", phone: "9876543217" },
  { name: "Meera Joshi", dob: "2015-04-25", guardian: "Prakash Joshi", phone: "9876543218" },
  { name: "Dev Malhotra", dob: "2009-12-10", guardian: "Sanjay Malhotra", phone: "9876543219" },
  { name: "Riya Banerjee", dob: "2014-08-14", guardian: "Dipak Banerjee", phone: "9876543220" },
  { name: "Aarav Mishra", dob: "2011-10-05", guardian: "Dinesh Mishra", phone: "9876543221" },
  { name: "Tanvi Nair", dob: "2013-01-17", guardian: "Sunil Nair", phone: "9876543222" },
  { name: "Sahil Chauhan", dob: "2010-09-28", guardian: "Ramesh Chauhan", phone: "9876543223" },
  { name: "Pooja Verma", dob: "2014-06-11", guardian: "Anil Verma", phone: "9876543224" },
  { name: "Aditya Kapoor", dob: "2012-12-04", guardian: "Vinod Kapoor", phone: "9876543225" },
  { name: "Nisha Thakur", dob: "2011-03-22", guardian: "Bharat Thakur", phone: "9876543226" },
  { name: "Karan Mehta", dob: "2009-07-09", guardian: "Pankaj Mehta", phone: "9876543227" },
  { name: "Simran Kaur", dob: "2013-05-30", guardian: "Gurpreet Singh", phone: "9876543228" },
  { name: "Rahul Dubey", dob: "2010-11-15", guardian: "Ashok Dubey", phone: "9876543229" },
  { name: "Anjali Tiwari", dob: "2015-02-08", guardian: "Raghav Tiwari", phone: "9876543230" },
  { name: "Vivek Saxena", dob: "2008-08-21", guardian: "Sudhir Saxena", phone: "9876543231" },
  { name: "Divya Pillai", dob: "2014-04-13", guardian: "Mohan Pillai", phone: "9876543232" },
  { name: "Manish Pandey", dob: "2011-07-26", guardian: "Girish Pandey", phone: "9876543233" },
];

export async function seedMockData() {
  // Check if mock data was already seeded
  const { data: existing } = await supabase
    .from("students")
    .select("id")
    .eq("name", "Arjun Sharma")
    .limit(1);

  if (existing && existing.length > 0) return false;

  const now = new Date();
  const studentIds: string[] = [];

  // Insert students one by one to get their IDs
  for (const s of STUDENTS) {
    const joinDate = new Date(now);
    joinDate.setMonth(joinDate.getMonth() - Math.floor(Math.random() * 8 + 1));

    const { data: studentData, error } = await supabase
      .from("students")
      .insert({
        name: s.name,
        date_of_birth: s.dob,
        guardian_name: s.guardian,
        guardian_phone: s.phone,
        joining_date: joinDate.toISOString().slice(0, 10),
        batting_style: ["Right-hand bat", "Left-hand bat"][Math.floor(Math.random() * 2)],
        bowling_style: ["Right-arm medium", "Right-arm off-spin", "Left-arm spin", "Right-arm fast"][Math.floor(Math.random() * 4)],
        playing_role: ["Batsman", "Bowler", "All-rounder", "Wicket-keeper"][Math.floor(Math.random() * 4)],
        id_verified: Math.random() > 0.3,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    studentIds.push(studentData.id);

    // Record consent
    await supabase.from("consents").insert({
      student_id: studentData.id,
      guardian_name: s.guardian,
      consented_on: now.toISOString(),
      consent_method: "in-app registration",
    });

    // Admission fee invoice (all paid)
    const admPaidDate = new Date(joinDate);
    admPaidDate.setDate(admPaidDate.getDate() + Math.floor(Math.random() * 3));
    await supabase.from("invoices").insert({
      student_id: studentData.id,
      student_name: s.name,
      guardian_name: s.guardian,
      guardian_phone: s.phone,
      period: "admission",
      description: "Admission Fee",
      amount: ADMISSION_FEE,
      status: "paid",
      paid_at: admPaidDate.toISOString(),
      payment_method: Math.random() > 0.5 ? "UPI" : "Cash",
      created_at: joinDate.toISOString(),
    });
  }

  // Generate monthly invoices for past 5 months + current month
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const invoiceDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const period = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, "0")}`;

    const invoiceBatch = [];
    for (let i = 0; i < studentIds.length; i++) {
      const s = STUDENTS[i];

      let status: string;
      let paidAt: string | null = null;
      let paymentMethod: string | null = null;

      if (monthOffset === 0) {
        if (i < 6) {
          status = "paid";
          const paidDate = new Date(now);
          paidDate.setDate(Math.floor(Math.random() * Math.min(now.getDate(), 28)) + 1);
          paidAt = paidDate.toISOString();
          paymentMethod = ["Cash", "UPI", "UPI", "Cash", "UPI", "UPI"][i];
        } else {
          status = "pending";
        }
      } else if (monthOffset === 1) {
        if (i >= 8 && i <= 13) {
          status = "pending";
        } else {
          status = "paid";
          const paidDate = new Date(invoiceDate);
          paidDate.setDate(Math.floor(Math.random() * 25) + 3);
          paidAt = paidDate.toISOString();
          paymentMethod = Math.random() > 0.5 ? "UPI" : "Cash";
        }
      } else if (monthOffset === 2) {
        if ([14, 17, 20, 22].includes(i)) {
          status = "pending";
        } else {
          status = "paid";
          const paidDate = new Date(invoiceDate);
          paidDate.setDate(Math.floor(Math.random() * 25) + 3);
          paidAt = paidDate.toISOString();
          paymentMethod = Math.random() > 0.5 ? "UPI" : "Cash";
        }
      } else if (monthOffset === 3) {
        if ([17, 22].includes(i)) {
          status = "pending";
        } else {
          status = "paid";
          const paidDate = new Date(invoiceDate);
          paidDate.setDate(Math.floor(Math.random() * 25) + 3);
          paidAt = paidDate.toISOString();
          paymentMethod = Math.random() > 0.5 ? "UPI" : "Cash";
        }
      } else {
        status = "paid";
        const paidDate = new Date(invoiceDate);
        paidDate.setDate(Math.floor(Math.random() * 25) + 3);
        paidAt = paidDate.toISOString();
        paymentMethod = Math.random() > 0.5 ? "UPI" : "Cash";
      }

      invoiceBatch.push({
        student_id: studentIds[i],
        student_name: s.name,
        guardian_name: s.guardian,
        guardian_phone: s.phone,
        period,
        description: "Monthly Fee",
        amount: MONTHLY_FEE,
        status,
        paid_at: paidAt,
        payment_method: paymentMethod,
        created_at: invoiceDate.toISOString(),
      });
    }

    // Insert in batch
    const { error } = await supabase.from("invoices").insert(invoiceBatch);
    if (error) throw error;
  }

  return true;
}
