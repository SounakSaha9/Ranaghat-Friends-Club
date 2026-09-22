import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { addStudent, getFeeSettings } from "../../lib/database";

export default function RegisterScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [fees, setFees] = useState({ admission_fee: 0, monthly_fee: 0 });

  useEffect(() => {
    getFeeSettings().then(setFees);
  }, []);

  const [name, setName] = useState("");
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [isOldStudent, setIsOldStudent] = useState(false);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take a photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
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
      setPhotoUri(compressed.uri);
    }
  };

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
      setPhotoUri(compressed.uri);
    }
  };

  const handlePhotoPress = () => {
    Alert.alert("Add Photo", "Choose a source", [
      { text: "Camera", onPress: handleTakePhoto },
      { text: "Gallery", onPress: handlePickPhoto },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDobDate(selectedDate);
    }
  };

  const formatDob = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatDobDisplay = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) return Alert.alert("Error", "Student name is required");
    if (!dobDate) return Alert.alert("Error", "Date of birth is required");
    if (dobDate > new Date()) return Alert.alert("Error", "Date of birth cannot be in the future");
    if (!guardianName.trim())
      return Alert.alert("Error", "Guardian name is required");
    if (!guardianPhone.trim() || guardianPhone.length < 10)
      return Alert.alert("Error", "Valid phone number is required");

    setSubmitting(true);
    try {
      await addStudent(
        {
          name: name.trim(),
          date_of_birth: formatDob(dobDate),
          guardian_name: guardianName.trim(),
          guardian_phone: guardianPhone.trim(),
          joining_date: new Date().toISOString().slice(0, 10),
          id_verified: false,
          photo_uri: photoUri || undefined,
        },
        { skipAdmissionFee: isOldStudent }
      );
      const successMsg = isOldStudent
        ? `${name.trim()} registered as returning student!`
        : `${name.trim()} registered! Admission fee of ₹${fees.admission_fee} invoice generated.`;
      Alert.alert("Success", successMsg, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* Photo Section */}
        <TouchableOpacity style={styles.photoSection} onPress={handlePhotoPress} activeOpacity={0.8}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera" size={32} color="#1b5e20" />
              <Text style={styles.photoText}>Add Photo</Text>
            </View>
          )}
          <View style={styles.photoBadge}>
            <Ionicons name="camera-outline" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Fee Info */}
        <LinearGradient
          colors={["#e8f5e9", "#c8e6c9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.feeInfo}
        >
          <View style={styles.feeInfoHeader}>
            <Ionicons name="pricetag" size={18} color="#1b5e20" />
            <Text style={styles.feeInfoTitle}>Fee Structure</Text>
          </View>
          <View style={styles.feeInfoRow}>
            <Ionicons name="ribbon-outline" size={16} color="#2e7d32" />
            <Text style={styles.feeInfoText}>Admission Fee: ₹{fees.admission_fee} (one-time)</Text>
          </View>
          <View style={styles.feeInfoRow}>
            <Ionicons name="calendar-outline" size={16} color="#2e7d32" />
            <Text style={styles.feeInfoText}>Monthly Fee: ₹{fees.monthly_fee}/month</Text>
          </View>
        </LinearGradient>

        {/* Form Fields */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Student Name *</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date of Birth *</Text>
          <TouchableOpacity
            style={styles.inputRow}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={18} color="#999" />
            <Text style={[styles.input, !dobDate && { color: "#999" }]}>
              {dobDate ? formatDobDisplay(dobDate) : "Select date of birth"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#999" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dobDate || new Date(2012, 0, 1)}
              mode="date"
              display="default"
              maximumDate={new Date()}
              minimumDate={new Date(2000, 0, 1)}
              onChange={onDateChange}
            />
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Guardian Name *</Text>
          <View style={styles.inputRow}>
            <Ionicons name="people-outline" size={18} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="Parent/Guardian full name"
              placeholderTextColor="#999"
              value={guardianName}
              onChangeText={setGuardianName}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Guardian Phone *</Text>
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={18} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor="#999"
              value={guardianPhone}
              onChangeText={setGuardianPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
        </View>

        {/* Old Student Toggle */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Returning / Old Student</Text>
            <Text style={styles.switchHint}>
              Skip admission fee for re-joining students
            </Text>
          </View>
          <Switch
            value={isOldStudent}
            onValueChange={setIsOldStudent}
            trackColor={{ false: "#ddd", true: "#a5d6a7" }}
            thumbColor={isOldStudent ? "#1b5e20" : "#f4f3f4"}
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={submitting ? ["#999", "#aaa"] : ["#1b5e20", "#2e7d32"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtn}
          >
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>
              {submitting ? "Registering..." : "Register Student"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.consentNote}>
          By registering, the guardian consents to the club storing the
          student's name, date of birth, and contact information for
          administrative purposes.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  form: { padding: 16 },
  photoSection: {
    alignSelf: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  photo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#1b5e20",
  },
  photoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1b5e20",
    borderStyle: "dashed",
  },
  photoText: {
    fontSize: 12,
    fontFamily: "PoppinsMedium",
    color: "#1b5e20",
    marginTop: 4,
  },
  photoBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1b5e20",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  feeInfo: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#1b5e20",
  },
  feeInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  feeInfoTitle: { fontSize: 15, fontFamily: "PoppinsExtraBold", color: "#1b5e20" },
  feeInfoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  feeInfoText: { fontSize: 14, fontFamily: "PoppinsMedium", color: "#2e7d32" },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontFamily: "PoppinsBold",
    color: "#333",
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Poppins",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontFamily: "PoppinsBold",
    color: "#333",
  },
  switchHint: {
    fontSize: 12,
    fontFamily: "Poppins",
    color: "#999",
    marginTop: 2,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  submitBtnText: { color: "#fff", fontSize: 17, fontFamily: "PoppinsBold" },
  consentNote: {
    fontSize: 12,
    fontFamily: "Poppins",
    color: "#999",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
