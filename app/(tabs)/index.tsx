import { useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { getDashboardStats, generateMonthlyInvoices } from "../../lib/database";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingInvoices: 0,
    collectedThisMonth: 0,
    pendingAmount: 0,
    currentPeriod: "",
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    const s = await getDashboardStats();
    setStats(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const handleGenerateInvoices = () => {
    Alert.alert(
      "Generate Invoices",
      `Generate monthly invoices for ${stats.currentPeriod} for all active students?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Generate",
          onPress: async () => {
            const count = await generateMonthlyInvoices(stats.currentPeriod);
            Alert.alert("Done", `${count} invoice(s) generated.`);
            loadStats();
          },
        },
      ]
    );
  };

  const statCards = [
    {
      icon: "people" as const,
      label: "Active Students",
      value: String(stats.totalStudents),
      bg: "#e8f5e9",
      iconColor: "#2e7d32",
    },
    {
      icon: "alert-circle" as const,
      label: "Pending Invoices",
      value: String(stats.pendingInvoices),
      bg: "#fff3e0",
      iconColor: "#e65100",
    },
    {
      icon: "checkmark-circle" as const,
      label: "Collected",
      value: `₹${stats.collectedThisMonth.toLocaleString("en-IN")}`,
      bg: "#e3f2fd",
      iconColor: "#1565c0",
    },
    {
      icon: "time" as const,
      label: "Pending Amount",
      value: `₹${stats.pendingAmount.toLocaleString("en-IN")}`,
      bg: "#fce4ec",
      iconColor: "#c62828",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with cricket theme */}
      <LinearGradient
        colors={["#0d3311", "#1b5e20", "#2e7d32"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Cricket decorative elements */}
        <View style={styles.cricketBg}>
          <MaterialCommunityIcons
            name="cricket"
            size={140}
            color="rgba(255,255,255,0.04)"
            style={styles.bgIcon1}
          />
          <MaterialCommunityIcons
            name="baseball-bat"
            size={120}
            color="rgba(255,255,255,0.03)"
            style={styles.bgIcon2}
          />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <Image
              source={require("../../assets/RFC.png")}
              style={styles.logo}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.clubName}>Ranaghat Friends Club</Text>
              <Text style={styles.estd}>Est. 1968</Text>
            </View>
          </View>

          <View style={styles.periodRow}>
            <MaterialCommunityIcons name="cricket" size={18} color="rgba(255,255,255,0.6)" />
            <Text style={styles.periodText}>
              {stats.currentPeriod
                ? new Date(stats.currentPeriod + "-01").toLocaleDateString(
                    "en-IN",
                    { month: "long", year: "numeric" }
                  )
                : ""}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          {statCards.map((card, i) => (
            <Animated.View
              key={card.label}
              entering={FadeInUp.delay(80 + i * 60)
                .duration(400)}
              style={styles.statCardOuter}
            >
              <View style={[styles.statCard, { backgroundColor: card.bg }]}>
                <View style={styles.statIconRow}>
                  <View style={[styles.statIconBg, { backgroundColor: card.iconColor + "18" }]}>
                    <Ionicons name={card.icon} size={22} color={card.iconColor} />
                  </View>
                </View>
                <Text style={styles.statNumber}>{card.value}</Text>
                <Text style={styles.statLabel}>{card.label}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <Text style={styles.actionsTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/student/register")}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#1b5e20", "#2e7d32"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionCardInner}
          >
            <View style={styles.actionIconBg}>
              <Ionicons name="person-add" size={22} color="#1b5e20" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Register Student</Text>
              <Text style={styles.actionSubtitle}>Add new player to the club</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleGenerateInvoices}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#2e7d32", "#43a047"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionCardInner}
          >
            <View style={styles.actionIconBg}>
              <Ionicons name="receipt" size={22} color="#2e7d32" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Generate Invoices</Text>
              <Text style={styles.actionSubtitle}>Monthly fee invoices</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  header: {
    paddingTop: 52,
    paddingBottom: 40,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  cricketBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgIcon1: {
    position: "absolute",
    top: -10,
    right: -20,
    transform: [{ rotate: "-15deg" }],
  },
  bgIcon2: {
    position: "absolute",
    bottom: -15,
    left: -10,
    transform: [{ rotate: "30deg" }],
  },
  headerContent: {
    zIndex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  clubName: {
    fontSize: 22,
    fontFamily: "PoppinsExtraBold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  estd: {
    fontSize: 12,
    fontFamily: "PoppinsMedium",
    color: "rgba(255,255,255,0.5)",
    marginTop: -2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  periodText: {
    fontSize: 13,
    fontFamily: "PoppinsMedium",
    color: "rgba(255,255,255,0.8)",
  },
  statsContainer: {
    marginTop: -24,
    paddingHorizontal: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  statCardOuter: {
    width: "48%",
    margin: "1%",
  },
  statCard: {
    padding: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  statIconRow: {
    marginBottom: 12,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 24,
    fontFamily: "PoppinsExtraBold",
    color: "#1a1a1a",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "PoppinsMedium",
    color: "#666",
    marginTop: 2,
  },
  actions: {
    padding: 16,
    gap: 10,
  },
  actionsTitle: {
    fontSize: 16,
    fontFamily: "PoppinsBold",
    color: "#333",
    marginBottom: 4,
  },
  actionCard: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#1b5e20",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  actionCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: "PoppinsBold",
    color: "#fff",
  },
  actionSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins",
    color: "rgba(255,255,255,0.7)",
    marginTop: -2,
  },
});
