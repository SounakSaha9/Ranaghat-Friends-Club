import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SectionList,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getInvoices, markInvoicePaid } from "../../lib/database";
import { Invoice } from "../../lib/types";
import { format, subMonths } from "date-fns";

type FilterTab = "pending" | "paid";

type ConsolidatedInvoice = Invoice & {
  _consolidated: boolean;
  _totalAmount: number;
  _monthCount: number;
  _invoiceIds: string[];
  _oldestPeriod: string;
};

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

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

export default function FeesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentPeriod());
  const currentPeriod = getCurrentPeriod();
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const load = useCallback(async () => {
    const filters = filter === "paid" ? { status: "paid" as const } : { status: "pending" as const };
    const data = await getInvoices(filters);
    setInvoices(data);
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pendingSections = useMemo(() => {
    if (filter !== "pending") return [];
    const query = search.toLowerCase();
    const filtered = query
      ? invoices.filter(
          (inv) =>
            inv.student_name.toLowerCase().includes(query) ||
            inv.guardian_phone.includes(query)
        )
      : invoices;

    const currentMonthInvs: Invoice[] = [];
    const admissionInvs: Invoice[] = [];
    const overdueByStudent: Record<string, Invoice[]> = {};

    for (const inv of filtered) {
      if (inv.period === "admission") {
        admissionInvs.push(inv);
      } else if (inv.period === currentPeriod) {
        currentMonthInvs.push(inv);
      } else if (inv.period < currentPeriod) {
        if (!overdueByStudent[inv.student_id]) overdueByStudent[inv.student_id] = [];
        overdueByStudent[inv.student_id].push(inv);
      }
    }

    const consolidatedOverdue: ConsolidatedInvoice[] = [];
    for (const studentId in overdueByStudent) {
      const studentInvs = overdueByStudent[studentId].sort((a, b) => a.period.localeCompare(b.period));
      const latest = studentInvs[studentInvs.length - 1];
      const totalAmount = studentInvs.reduce((sum, i) => sum + i.amount, 0);
      consolidatedOverdue.push({
        ...latest,
        _consolidated: true,
        _totalAmount: totalAmount,
        _monthCount: studentInvs.length,
        _invoiceIds: studentInvs.map((i) => i.id),
        _oldestPeriod: studentInvs[0].period,
      });
    }
    consolidatedOverdue.sort((a, b) => b._totalAmount - a._totalAmount);

    const sections: {
      title: string;
      overdue: boolean;
      pendingCount: number;
      totalPending: number;
      data: ConsolidatedInvoice[];
    }[] = [];

    if (currentMonthInvs.length > 0) {
      const periodDate = new Date(currentPeriod + "-01");
      sections.push({
        title: `This Month — ${format(periodDate, "MMMM yyyy")}`,
        overdue: false,
        pendingCount: currentMonthInvs.length,
        totalPending: currentMonthInvs.reduce((s, i) => s + i.amount, 0),
        data: currentMonthInvs.map((i) => ({ ...i, _consolidated: false, _totalAmount: i.amount, _monthCount: 1, _invoiceIds: [i.id], _oldestPeriod: i.period })),
      });
    }

    if (consolidatedOverdue.length > 0) {
      sections.push({
        title: "Overdue",
        overdue: true,
        pendingCount: consolidatedOverdue.length,
        totalPending: consolidatedOverdue.reduce((s, i) => s + i._totalAmount, 0),
        data: consolidatedOverdue,
      });
    }

    if (admissionInvs.length > 0) {
      sections.push({
        title: "Admission Fees",
        overdue: false,
        pendingCount: admissionInvs.length,
        totalPending: admissionInvs.reduce((s, i) => s + i.amount, 0),
        data: admissionInvs.map((i) => ({ ...i, _consolidated: false, _totalAmount: i.amount, _monthCount: 1, _invoiceIds: [i.id], _oldestPeriod: i.period })),
      });
    }

    return sections;
  }, [invoices, currentPeriod, filter, search]);

  const paidAdmission = useMemo(() => {
    if (filter !== "paid") return [];
    const query = search.toLowerCase();
    return invoices
      .filter((inv) => inv.period === "admission")
      .filter((inv) =>
        query
          ? inv.student_name.toLowerCase().includes(query) ||
            inv.guardian_phone.includes(query)
          : true
      );
  }, [invoices, filter, search]);

  const paidMonthly = useMemo(() => {
    if (filter !== "paid") return [];
    const query = search.toLowerCase();
    return invoices
      .filter((inv) => inv.period === selectedMonth)
      .filter((inv) =>
        query
          ? inv.student_name.toLowerCase().includes(query) ||
            inv.guardian_phone.includes(query)
          : true
      );
  }, [invoices, filter, selectedMonth, search]);

  const handleCollect = (item: ConsolidatedInvoice) => {
    const ids = item._invoiceIds;
    const amount = item._totalAmount;
    const months = item._monthCount;
    const label = months > 1
      ? `Collect ₹${amount} (${months} months) from ${item.student_name}?`
      : `Mark ₹${amount} as paid for ${item.student_name}?`;

    Alert.alert("Collect Fee", label, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Cash",
        onPress: async () => {
          for (const id of ids) await markInvoicePaid(id, "Cash");
          load();
          router.push(`/invoice/${ids[ids.length - 1]}`);
        },
      },
      {
        text: "UPI",
        onPress: async () => {
          for (const id of ids) await markInvoicePaid(id, "UPI");
          load();
          router.push(`/invoice/${ids[ids.length - 1]}`);
        },
      },
    ]);
  };

  const renderInvoiceCard = (item: ConsolidatedInvoice, index: number = 0) => {
    const overdue = item._consolidated;
    const displayAmount = item._totalAmount;

    let subtitle = item.description || "Monthly Fee";
    if (item._consolidated && item._monthCount > 1) {
      const oldest = format(new Date(item._oldestPeriod + "-01"), "MMM");
      const newest = format(new Date(item.period + "-01"), "MMM yyyy");
      subtitle = `${item._monthCount} months unpaid (${oldest} – ${newest})`;
    }

    return (
      <Animated.View
        key={item.id}
        entering={FadeInDown.delay(50 + index * 40)
          .duration(350)}
      >
        <TouchableOpacity
          style={[styles.card, overdue && styles.cardOverdue]}
          onPress={() => router.push(`/invoice/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardLeft}>
            <View style={styles.nameRow}>
              <Text style={styles.studentName}>{item.student_name}</Text>
              {overdue && (
                <LinearGradient
                  colors={["#c62828", "#e53935"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.overduePill}
                >
                  <Ionicons name="warning" size={10} color="#fff" />
                  <Text style={styles.overduePillText}>
                    {item._monthCount > 1 ? `${item._monthCount}M` : "OVERDUE"}
                  </Text>
                </LinearGradient>
              )}
            </View>
            <View style={styles.cardDetailRow}>
              <Ionicons name="document-text-outline" size={12} color="#888" />
              <Text style={styles.cardDetail}>{subtitle}</Text>
            </View>
            <View style={styles.cardDetailRow}>
              <Ionicons name="call-outline" size={12} color="#888" />
              <Text style={styles.cardDetail}>{item.guardian_phone}</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.amount, overdue && { color: "#c62828" }]}>
              ₹{displayAmount.toLocaleString("en-IN")}
            </Text>
            {item.status === "pending" ? (
              <TouchableOpacity
                style={[styles.collectBtn, overdue && { backgroundColor: "#c62828" }]}
                onPress={() => handleCollect(item)}
              >
                <Ionicons name="cash-outline" size={14} color="#fff" />
                <Text style={styles.collectBtnText}>Collect</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.paidBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#155724" />
                <Text style={styles.paidText}>Paid</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderSectionItem = ({ item, index }: { item: ConsolidatedInvoice; index: number }) =>
    renderInvoiceCard(item, index);

  const renderSectionHeader = ({
    section,
  }: {
    section: { title: string; overdue: boolean; pendingCount: number; totalPending: number };
  }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Ionicons
          name={section.overdue ? "alert-circle" : section.title.includes("Admission") ? "ribbon" : "calendar"}
          size={18}
          color={section.overdue ? "#c62828" : "#1b5e20"}
        />
        <Text style={[styles.sectionTitle, section.overdue && { color: "#c62828" }]}>
          {section.title}
        </Text>
      </View>
      {section.pendingCount > 0 && (
        <Text style={styles.sectionSubtitle}>
          {section.pendingCount} pending · ₹{section.totalPending.toLocaleString("en-IN")}
        </Text>
      )}
    </View>
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(["pending", "paid"] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, filter === tab && styles.tabActive]}
            onPress={() => setFilter(tab)}
          >
            <Ionicons
              name={tab === "pending" ? "time-outline" : "checkmark-done-outline"}
              size={16}
              color={filter === tab ? "#1b5e20" : "#888"}
            />
            <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#999" style={{ marginRight: 8 }} />
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

      {filter === "pending" ? (
        <SectionList
          sections={pendingSections}
          keyExtractor={(item) => item.id}
          renderItem={renderSectionItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
          stickySectionHeadersEnabled={false}
          refreshControl={refreshControl}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No pending invoices</Text>
              <Text style={styles.emptySubtext}>Generate invoices from the Home tab</Text>
            </View>
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
          refreshControl={refreshControl}
        >
          <View style={styles.sectionTitleRow}>
            <Ionicons name="calendar" size={18} color="#1b5e20" />
            <Text style={styles.sectionTitle}>Monthly Fees</Text>
          </View>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.monthScroll}
            contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
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

          {paidMonthly.length > 0 ? (
            <>
              <Text style={styles.sectionSubtitle}>
                {paidMonthly.length} paid · ₹{paidMonthly.reduce((s, i) => s + i.amount, 0).toLocaleString("en-IN")}
              </Text>
              {paidMonthly.map((inv, i) => renderInvoiceCard({ ...inv, _consolidated: false, _totalAmount: inv.amount, _monthCount: 1, _invoiceIds: [inv.id], _oldestPeriod: inv.period }, i))}
            </>
          ) : (
            <View style={styles.emptySmall}>
              <Ionicons name="document-outline" size={32} color="#ccc" />
              <Text style={styles.emptyText}>No paid invoices for this month</Text>
            </View>
          )}

          {paidAdmission.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="ribbon" size={18} color="#1b5e20" />
                  <Text style={styles.sectionTitle}>Admission Fees</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  {paidAdmission.length} paid · ₹{paidAdmission.reduce((s, i) => s + i.amount, 0).toLocaleString("en-IN")}
                </Text>
              </View>
              {paidAdmission.map((inv, i) => renderInvoiceCard({ ...inv, _consolidated: false, _totalAmount: inv.amount, _monthCount: 1, _invoiceIds: [inv.id], _oldestPeriod: inv.period }, i))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchBar: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Poppins",
  },
  tabs: {
    flexDirection: "row",
    margin: 12,
    backgroundColor: "#e8e8e8",
    borderRadius: 12,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: "#fff", elevation: 2, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  tabText: { fontSize: 14, color: "#888", fontFamily: "PoppinsMedium" },
  tabTextActive: { color: "#1b5e20", fontFamily: "PoppinsBold" },
  monthScroll: { marginBottom: 8 },
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
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "PoppinsBold",
    color: "#1b5e20",
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins",
    color: "#666",
    marginTop: 2,
    marginBottom: 8,
    marginLeft: 24,
  },
  card: {
    flexDirection: "row",
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
  cardOverdue: {
    backgroundColor: "#fff5f5",
    borderLeftWidth: 3,
    borderLeftColor: "#c62828",
  },
  cardLeft: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  studentName: { fontSize: 15, fontFamily: "PoppinsBold", color: "#1a1a1a" },
  cardDetailRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  cardDetail: { fontSize: 12, fontFamily: "Poppins", color: "#888" },
  cardRight: { alignItems: "flex-end", justifyContent: "center" },
  amount: { fontSize: 17, fontFamily: "PoppinsExtraBold", color: "#1a1a1a", marginBottom: 6 },
  overduePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  overduePillText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "PoppinsExtraBold",
    letterSpacing: 0.5,
  },
  collectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2e7d32",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  collectBtnText: { color: "#fff", fontSize: 13, fontFamily: "PoppinsBold" },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#d4edda",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  paidText: { color: "#155724", fontSize: 12, fontFamily: "PoppinsSemiBold" },
  empty: { alignItems: "center", padding: 40, gap: 8 },
  emptySmall: { alignItems: "center", padding: 20, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "PoppinsMedium", color: "#999" },
  emptySubtext: { fontSize: 13, fontFamily: "Poppins", color: "#bbb" },
});
