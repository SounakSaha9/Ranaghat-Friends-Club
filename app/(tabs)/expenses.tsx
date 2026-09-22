import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getExpenses, addExpense, deleteExpense } from "../../lib/database";
import { Expense } from "../../lib/types";
import { format, subMonths } from "date-fns";

const CATEGORIES = [
  "Equipment",
  "Ground Rent",
  "Transport",
  "Refreshments",
  "Utilities",
  "Maintenance",
  "Salary",
  "Other",
];

function getMonthOptions() {
  const options: { period: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = format(d, "MMM yyyy");
    options.push({ period, label });
  }
  return options;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const monthOptions = useMemo(() => getMonthOptions(), []);

  // Add form state
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const data = await getExpenses({ month: selectedMonth });
    setExpenses(data);
  }, [selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      const cat = e.category || "Other";
      map[cat] = (map[cat] || 0) + e.amount;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const handleAdd = async () => {
    if (!desc.trim()) return Alert.alert("Error", "Description is required");
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return Alert.alert("Error", "Enter a valid amount");

    setSubmitting(true);
    try {
      await addExpense({
        description: desc.trim(),
        amount: numAmount,
        date: new Date().toISOString().slice(0, 10),
        category,
      });
      setDesc("");
      setAmount("");
      setCategory("Other");
      setShowAdd(false);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      "Delete Expense",
      `Remove "${expense.description}" (₹${expense.amount})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteExpense(expense.id);
            load();
          },
        },
      ]
    );
  };

  const renderExpense = ({ item, index }: { item: Expense; index: number }) => (
    <Animated.View entering={FadeInDown.delay(30 + index * 25).duration(300)}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.cardIcon}>
          <Ionicons
            name={getCategoryIcon(item.category)}
            size={20}
            color="#1b5e20"
          />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardDesc}>{item.description}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardCategory}>{item.category || "Other"}</Text>
            <Text style={styles.cardDate}>
              {format(new Date(item.date), "dd MMM")}
            </Text>
          </View>
        </View>
        <Text style={styles.cardAmount}>
          ₹{item.amount.toLocaleString("en-IN")}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Month filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.monthScroll}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 10 }}
      >
        {monthOptions.map((m) => (
          <TouchableOpacity
            key={m.period}
            onPress={() => setSelectedMonth(m.period)}
          >
            {selectedMonth === m.period ? (
              <LinearGradient
                colors={["#1b5e20", "#2e7d32"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.monthChipActive}
              >
                <Text style={styles.monthChipTextActive}>{m.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.monthChip}>
                <Text style={styles.monthChipText}>{m.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel}>Total Spent</Text>
          <Text style={styles.summaryAmount}>
            ₹{totalAmount.toLocaleString("en-IN")}
          </Text>
          <Text style={styles.summaryCount}>
            {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
          </Text>
        </View>
        {categoryTotals.length > 0 && (
          <View style={styles.summaryRight}>
            {categoryTotals.slice(0, 3).map(([cat, amt]) => (
              <View key={cat} style={styles.catRow}>
                <Text style={styles.catName}>{cat}</Text>
                <Text style={styles.catAmt}>₹{amt.toLocaleString("en-IN")}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Expense list */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
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
            <Ionicons name="receipt-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No expenses this month</Text>
            <Text style={styles.emptySubtext}>
              Tap + to add your first expense
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Expense Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Description *</Text>
              <View style={styles.inputRow}>
                <Ionicons name="document-text-outline" size={18} color="#999" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., New cricket balls"
                  placeholderTextColor="#999"
                  value={desc}
                  onChangeText={setDesc}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Amount (₹) *</Text>
              <View style={styles.inputRow}>
                <Ionicons name="cash-outline" size={18} color="#999" />
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#999"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                  >
                    {category === cat ? (
                      <LinearGradient
                        colors={["#1b5e20", "#2e7d32"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.catChipActive}
                      >
                        <Text style={styles.catChipTextActive}>{cat}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.catChip}>
                        <Text style={styles.catChipText}>{cat}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              onPress={handleAdd}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={submitting ? ["#999", "#aaa"] : ["#1b5e20", "#2e7d32"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>
                  {submitting ? "Adding..." : "Add Expense"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function getCategoryIcon(category?: string): any {
  switch (category) {
    case "Equipment": return "baseball-outline";
    case "Ground Rent": return "location-outline";
    case "Transport": return "car-outline";
    case "Refreshments": return "cafe-outline";
    case "Utilities": return "flash-outline";
    case "Maintenance": return "hammer-outline";
    case "Salary": return "people-outline";
    default: return "pricetag-outline";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  monthScroll: { flexGrow: 0 },
  monthChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e8e8e8",
  },
  monthChipActive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  monthChipText: { fontSize: 13, fontFamily: "PoppinsMedium", color: "#666" },
  monthChipTextActive: { color: "#fff", fontFamily: "PoppinsBold", fontSize: 13 },
  summaryCard: {
    flexDirection: "row",
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
  summaryLeft: { flex: 1 },
  summaryLabel: { fontSize: 12, fontFamily: "Poppins", color: "#888" },
  summaryAmount: { fontSize: 28, fontFamily: "PoppinsExtraBold", color: "#c62828", marginTop: 2 },
  summaryCount: { fontSize: 12, fontFamily: "PoppinsMedium", color: "#999", marginTop: 2 },
  summaryRight: { justifyContent: "center", gap: 4 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catName: { fontSize: 11, fontFamily: "PoppinsMedium", color: "#888", width: 80, textAlign: "right" },
  catAmt: { fontSize: 12, fontFamily: "PoppinsBold", color: "#333" },
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
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardDesc: { fontSize: 14, fontFamily: "PoppinsSemiBold", color: "#1a1a1a" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  cardCategory: { fontSize: 11, fontFamily: "PoppinsMedium", color: "#1b5e20", backgroundColor: "#e8f5e9", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  cardDate: { fontSize: 11, fontFamily: "Poppins", color: "#999" },
  cardAmount: { fontSize: 16, fontFamily: "PoppinsExtraBold", color: "#c62828" },
  empty: { alignItems: "center", padding: 40, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "PoppinsMedium", color: "#999" },
  emptySubtext: { fontSize: 13, fontFamily: "Poppins", color: "#bbb" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#c62828",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#c62828",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontFamily: "PoppinsBold", color: "#1a1a1a" },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "PoppinsBold", color: "#333", marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
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
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  catChipActive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  catChipText: { fontSize: 12, fontFamily: "PoppinsMedium", color: "#666" },
  catChipTextActive: { color: "#fff", fontFamily: "PoppinsBold", fontSize: 12 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "PoppinsBold" },
});
