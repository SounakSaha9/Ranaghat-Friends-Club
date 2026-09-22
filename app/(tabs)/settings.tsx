import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getFeeSettings, updateFeeSetting } from "../../lib/database";

export default function SettingsScreen() {
  const [admissionFee, setAdmissionFee] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadFees = useCallback(async () => {
    setLoading(true);
    const fees = await getFeeSettings();
    setAdmissionFee(String(fees.admission_fee));
    setMonthlyFee(String(fees.monthly_fee));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFees();
    }, [loadFees])
  );

  const handleSave = async () => {
    const admission = parseFloat(admissionFee);
    const monthly = parseFloat(monthlyFee);

    if (isNaN(admission) || admission < 0) {
      return Alert.alert("Invalid", "Enter a valid admission fee");
    }
    if (isNaN(monthly) || monthly < 0) {
      return Alert.alert("Invalid", "Enter a valid monthly fee");
    }

    setSaving(true);
    try {
      await updateFeeSetting("admission_fee", admission);
      await updateFeeSetting("monthly_fee", monthly);
      Alert.alert("Saved", "Fee settings updated. New invoices will use these amounts.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1b5e20" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="pricetag" size={18} color="#1b5e20" />
          <Text style={styles.sectionTitle}>Fee Structure</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Changes apply to new invoices only. Existing invoices are not affected.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Admission Fee (one-time)</Text>
          <View style={styles.inputRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.input}
              value={admissionFee}
              onChangeText={setAdmissionFee}
              keyboardType="numeric"
              placeholder="1500"
              placeholderTextColor="#bbb"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Monthly Fee</Text>
          <View style={styles.inputRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.input}
              value={monthlyFee}
              onChangeText={setMonthlyFee}
              keyboardType="numeric"
              placeholder="500"
              placeholderTextColor="#bbb"
            />
          </View>
        </View>

        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          <LinearGradient
            colors={saving ? ["#999", "#aaa"] : ["#1b5e20", "#2e7d32"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>
              {saving ? "Saving..." : "Save Fee Settings"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="information-circle" size={18} color="#1b5e20" />
          <Text style={styles.sectionTitle}>About</Text>
        </View>
        <View style={styles.aboutRow}>
          <Ionicons name="trophy-outline" size={18} color="#888" />
          <Text style={styles.aboutText}>Ranaghat Friends Club v1.0.0</Text>
        </View>
        <View style={styles.aboutRow}>
          <Ionicons name="cloud-outline" size={18} color="#888" />
          <Text style={styles.aboutText}>Cloud-synced via Supabase</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5", padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  section: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "PoppinsBold",
    color: "#1b5e20",
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins",
    color: "#999",
    marginBottom: 16,
  },
  fieldGroup: { marginBottom: 14 },
  label: {
    fontSize: 14,
    fontFamily: "PoppinsSemiBold",
    color: "#333",
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  rupee: {
    fontSize: 18,
    fontFamily: "PoppinsBold",
    color: "#2e7d32",
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    fontFamily: "PoppinsBold",
    color: "#1a1a1a",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "PoppinsBold" },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  aboutText: { fontSize: 14, fontFamily: "Poppins", color: "#888" },
});
