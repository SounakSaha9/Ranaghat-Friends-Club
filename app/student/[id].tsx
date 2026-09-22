import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { getStudent, updateStudent, getInvoices, getFeeSettings } from "../../lib/database";
import { Student, Invoice, getAgeBracket } from "../../lib/types";

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editing, setEditing] = useState(false);
  const [monthlyFee, setMonthlyFee] = useState(0);

  const [studentName, setStudentName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [editingBasic, setEditingBasic] = useState(false);
  const [address, setAddress] = useState("");
  const [battingStyle, setBattingStyle] = useState("");
  const [bowlingStyle, setBowlingStyle] = useState("");
  const [playingRole, setPlayingRole] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [schoolName, setSchoolName] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    const s = await getStudent(id);
    if (s) {
      setStudent(s);
      setStudentName(s.name);
      setGuardianName(s.guardian_name);
      setGuardianPhone(s.guardian_phone);
      setAddress(s.address || "");
      setBattingStyle(s.batting_style || "");
      setBowlingStyle(s.bowling_style || "");
      setPlayingRole(s.playing_role || "");
      setBloodGroup(s.blood_group || "");
      setEmergencyContact(s.emergency_contact || "");
      setSchoolName(s.school_name || "");
    }
    const inv = await getInvoices({ studentId: id });
    setInvoices(inv);
    const fees = await getFeeSettings();
    setMonthlyFee(fees.monthly_fee);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      await updateStudent(id!, { photo_uri: compressed.uri } as any);
      load();
    }
  };

  const handleSaveBasic = async () => {
    if (!studentName.trim()) return Alert.alert("Error", "Student name is required");
    if (!guardianName.trim()) return Alert.alert("Error", "Guardian name is required");
    if (!guardianPhone.trim() || guardianPhone.length < 10)
      return Alert.alert("Error", "Valid phone number is required");
    await updateStudent(id!, {
      name: studentName.trim(),
      guardian_name: guardianName.trim(),
      guardian_phone: guardianPhone.trim(),
    } as any);
    setEditingBasic(false);
    Alert.alert("Saved", "Basic info updated");
    load();
  };

  const handleSave = async () => {
    await updateStudent(id!, {
      address: address || undefined,
      batting_style: battingStyle || undefined,
      bowling_style: bowlingStyle || undefined,
      playing_role: playingRole || undefined,
      blood_group: bloodGroup || undefined,
      emergency_contact: emergencyContact || undefined,
      school_name: schoolName || undefined,
    } as any);
    setEditing(false);
    Alert.alert("Saved", "Student details updated");
    load();
  };

  const handleDeactivate = () => {
    Alert.alert(
      "Deactivate Student",
      `Remove ${student?.name} from active roster? Their records will be preserved.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            await updateStudent(id!, { is_active: false } as any);
            router.back();
          },
        },
      ]
    );
  };

  if (!student) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <LinearGradient
        colors={["#1b5e20", "#2e7d32", "#388e3c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileHeader}
      >
        <TouchableOpacity onPress={handlePickPhoto}>
          {student.photo_uri ? (
            <Image source={{ uri: student.photo_uri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>
                {student.name.charAt(0).toUpperCase()}
              </Text>
              <Text style={styles.tapText}>Tap to add photo</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.profileName}>{student.name}</Text>
        <View style={styles.profileBadgeRow}>
          <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.profileBadge}>
            {getAgeBracket(student.date_of_birth)}
          </Text>
        </View>
      </LinearGradient>

      {/* Core Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="person" size={18} color="#1b5e20" />
            <Text style={styles.sectionTitle}>Basic Info</Text>
          </View>
          <TouchableOpacity onPress={() => setEditingBasic(!editingBasic)}>
            <Text style={styles.editBtn}>
              {editingBasic ? "Cancel" : "Edit"}
            </Text>
          </TouchableOpacity>
        </View>
        {editingBasic ? (
          <>
            <EditRow label="Student Name" value={studentName} onChange={setStudentName} />
            <EditRow label="Guardian Name" value={guardianName} onChange={setGuardianName} />
            <EditRow label="Guardian Phone" value={guardianPhone} onChange={setGuardianPhone} keyboardType="phone-pad" />
            <InfoRow icon="calendar-outline" label="Date of Birth" value={student.date_of_birth} />
            <InfoRow icon="log-in-outline" label="Joined" value={student.joining_date} />
            <InfoRow icon="wallet-outline" label="Monthly Fee" value={`₹${monthlyFee}`} />
            <TouchableOpacity onPress={handleSaveBasic} activeOpacity={0.8}>
              <LinearGradient
                colors={["#1b5e20", "#2e7d32"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Basic Info</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <InfoRow icon="calendar-outline" label="Date of Birth" value={student.date_of_birth} />
            <InfoRow icon="people-outline" label="Guardian" value={student.guardian_name} />
            <InfoRow icon="call-outline" label="Phone" value={student.guardian_phone} />
            <InfoRow icon="log-in-outline" label="Joined" value={student.joining_date} />
            <InfoRow icon="wallet-outline" label="Monthly Fee" value={`₹${monthlyFee}`} />
          </>
        )}
      </View>

      {/* Extended Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="list" size={18} color="#1b5e20" />
            <Text style={styles.sectionTitle}>Details</Text>
          </View>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Text style={styles.editBtn}>
              {editing ? "Cancel" : "Edit"}
            </Text>
          </TouchableOpacity>
        </View>

        {editing ? (
          <>
            <EditRow label="Address" value={address} onChange={setAddress} />
            <EditRow label="Batting Style" value={battingStyle} onChange={setBattingStyle} placeholder="e.g., Right-hand bat" />
            <EditRow label="Bowling Style" value={bowlingStyle} onChange={setBowlingStyle} placeholder="e.g., Right-arm medium" />
            <EditRow label="Playing Role" value={playingRole} onChange={setPlayingRole} placeholder="e.g., All-rounder" />
            <EditRow label="Blood Group" value={bloodGroup} onChange={setBloodGroup} placeholder="e.g., B+" />
            <EditRow label="Emergency Contact" value={emergencyContact} onChange={setEmergencyContact} keyboardType="phone-pad" />
            <EditRow label="School" value={schoolName} onChange={setSchoolName} />
            <TouchableOpacity onPress={handleSave} activeOpacity={0.8}>
              <LinearGradient
                colors={["#1b5e20", "#2e7d32"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Details</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <InfoRow icon="location-outline" label="Address" value={address || "—"} />
            <InfoRow icon="baseball-outline" label="Batting" value={battingStyle || "—"} />
            <InfoRow icon="baseball-outline" label="Bowling" value={bowlingStyle || "—"} />
            <InfoRow icon="shield-outline" label="Role" value={playingRole || "—"} />
            <InfoRow icon="water-outline" label="Blood Group" value={bloodGroup || "—"} />
            <InfoRow icon="call-outline" label="Emergency" value={emergencyContact || "—"} />
            <InfoRow icon="school-outline" label="School" value={schoolName || "—"} />
          </>
        )}
      </View>

      {/* Recent Invoices */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="receipt" size={18} color="#1b5e20" />
          <Text style={styles.sectionTitle}>Recent Invoices</Text>
        </View>
        {invoices.length === 0 ? (
          <View style={styles.emptyInvoice}>
            <Ionicons name="document-outline" size={32} color="#ccc" />
            <Text style={styles.emptyText}>No invoices yet</Text>
          </View>
        ) : (
          invoices.slice(0, 6).map((inv) => (
            <TouchableOpacity
              key={inv.id}
              style={styles.invoiceRow}
              onPress={() => router.push(`/invoice/${inv.id}`)}
            >
              <Ionicons
                name={inv.status === "paid" ? "checkmark-circle" : "time"}
                size={18}
                color={inv.status === "paid" ? "#2e7d32" : "#e65100"}
              />
              <Text style={styles.invoicePeriod}>{inv.period}</Text>
              <Text style={styles.invoiceAmount}>₹{inv.amount}</Text>
              <View
                style={[
                  styles.statusBadge,
                  inv.status === "paid" ? styles.paidBg : styles.pendingBg,
                ]}
              >
                <Text
                  style={inv.status === "paid" ? styles.paidText : styles.pendingText}
                >
                  {inv.status}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.deactivateBtn} onPress={handleDeactivate}>
        <Ionicons name="person-remove-outline" size={18} color="#e53935" />
        <Text style={styles.deactivateText}>Deactivate Student</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelRow}>
        <Ionicons name={icon} size={16} color="#888" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EditRow({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        style={styles.editInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || label}
        placeholderTextColor="#bbb"
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 28,
    paddingBottom: 36,
  },
  photo: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: "#fff" },
  photoPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    borderStyle: "dashed",
  },
  photoPlaceholderText: { fontSize: 30, color: "#fff", fontFamily: "PoppinsBold" },
  tapText: { fontSize: 8, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  profileName: { fontSize: 24, fontFamily: "PoppinsExtraBold", color: "#fff", marginTop: 12 },
  profileBadgeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  profileBadge: { fontSize: 14, fontFamily: "PoppinsMedium", color: "rgba(255,255,255,0.7)" },
  section: {
    backgroundColor: "#fff",
    margin: 12,
    marginBottom: 0,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontFamily: "PoppinsBold", color: "#1b5e20" },
  editBtn: { color: "#1b5e20", fontFamily: "PoppinsBold", fontSize: 14 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  infoLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 14, fontFamily: "Poppins", color: "#888" },
  infoValue: { fontSize: 14, color: "#1a1a1a", fontFamily: "PoppinsSemiBold" },
  editLabel: { fontSize: 13, color: "#666", marginBottom: 4 },
  editInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "PoppinsBold" },
  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    gap: 8,
  },
  invoicePeriod: { flex: 1, fontSize: 14, color: "#333" },
  invoiceAmount: { fontSize: 14, fontFamily: "PoppinsBold", marginRight: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  paidBg: { backgroundColor: "#d4edda" },
  pendingBg: { backgroundColor: "#fff3cd" },
  paidText: { color: "#155724", fontSize: 11, fontWeight: "600" },
  pendingText: { color: "#856404", fontSize: 11, fontWeight: "600" },
  emptyInvoice: { alignItems: "center", padding: 16, gap: 8 },
  emptyText: { fontSize: 14, color: "#bbb", textAlign: "center" },
  deactivateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e53935",
  },
  deactivateText: { color: "#e53935", fontFamily: "PoppinsBold" },
});
