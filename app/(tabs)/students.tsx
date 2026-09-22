import { useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInRight } from "react-native-reanimated";
import { getStudents, getFeeSettings } from "../../lib/database";
import { Student, getAgeBracket } from "../../lib/types";

export default function StudentsScreen() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyFee, setMonthlyFee] = useState(0);

  const load = useCallback(async () => {
    const [s, fees] = await Promise.all([getStudents(), getFeeSettings()]);
    setStudents(s);
    setMonthlyFee(fees.monthly_fee);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.guardian_phone.includes(search)
  );

  const renderStudent = ({ item, index }: { item: Student; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 30).duration(300)}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/student/${item.id}`)}
        activeOpacity={0.7}
      >
        {item.photo_uri ? (
          <Image source={{ uri: item.photo_uri }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={12} color="#888" />
            <Text style={styles.detail}>{getAgeBracket(item.date_of_birth)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={12} color="#888" />
            <Text style={styles.detail}>{item.guardian_phone}</Text>
          </View>
        </View>
        <View style={styles.fee}>
          <Text style={styles.feeText}>₹{monthlyFee}</Text>
          <Text style={styles.feeLabel}>/month</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#ccc" />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchBar}
          placeholder="Search by name or phone..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderStudent}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No students found</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push("/student/register")}
            >
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Register First Student</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/student/register")}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchIcon: { marginRight: 8 },
  searchBar: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#1b5e20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontSize: 18, fontFamily: "PoppinsBold" },
  info: { flex: 1 },
  name: { fontSize: 16, fontFamily: "PoppinsBold", color: "#1a1a1a" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  detail: { fontSize: 12, fontFamily: "Poppins", color: "#888" },
  fee: { alignItems: "flex-end", marginRight: 6 },
  feeText: { fontSize: 16, fontFamily: "PoppinsExtraBold", color: "#2e7d32" },
  feeLabel: { fontSize: 10, fontFamily: "Poppins", color: "#888" },
  empty: { alignItems: "center", padding: 40, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "PoppinsMedium", color: "#999" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1b5e20",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontFamily: "PoppinsSemiBold" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1b5e20",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#1b5e20",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
