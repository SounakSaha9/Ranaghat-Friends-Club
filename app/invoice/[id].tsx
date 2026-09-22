import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { getInvoice, markInvoicePaid } from "../../lib/database";
import { Invoice } from "../../lib/types";
import { generateInvoiceHTML } from "../../lib/invoice-html";
import { format } from "date-fns";

export default function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const inv = await getInvoice(id);
    setInvoice(inv);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      const html = generateInvoiceHTML(invoice);
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to print");
    }
  };

  const handleShare = async () => {
    if (!invoice) return;
    try {
      const html = generateInvoiceHTML(invoice);
      const result = await Print.printToFileAsync({ html, base64: true });

      // Build descriptive filename: invoice-admission-2026 or invoice-september-2026
      let pdfName: string;
      if (invoice.period === "admission") {
        const year = new Date(invoice.created_at).getFullYear();
        pdfName = `invoice-admission-${year}.pdf`;
      } else {
        const periodDate = new Date(invoice.period + "-01");
        const month = format(periodDate, "MMMM").toLowerCase();
        const year = periodDate.getFullYear();
        pdfName = `invoice-${month}-${year}.pdf`;
      }

      // Write base64 PDF to cache directory which is accessible for sharing
      const pdfFile = new File(Paths.cache, pdfName);
      const binaryString = atob(result.base64!);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const stream = pdfFile.writableStream();
      const writer = stream.getWriter();
      await writer.write(bytes);
      await writer.close();

      await Sharing.shareAsync(pdfFile.uri, {
        mimeType: "application/pdf",
        dialogTitle: pdfName.replace(".pdf", ""),
        UTI: "com.adobe.pdf",
      });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to share invoice");
    }
  };

  const handleCollect = () => {
    if (!invoice) return;
    Alert.alert(
      "Collect Fee",
      `Mark ₹${invoice.amount} as paid for ${invoice.student_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Cash",
          onPress: async () => {
            await markInvoicePaid(invoice.id, "Cash");
            await load();
            handleShare();
          },
        },
        {
          text: "UPI",
          onPress: async () => {
            await markInvoicePaid(invoice.id, "UPI");
            await load();
            handleShare();
          },
        },
      ]
    );
  };

  if (!invoice) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const isAdmission = invoice.period === "admission";
  const periodLabel = isAdmission
    ? "Admission Fee"
    : format(new Date(invoice.period + "-01"), "MMMM yyyy");

  return (
    <ScrollView style={styles.container}>
      {/* Invoice Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="receipt" size={24} color="#1b5e20" />
          <Text style={styles.invoiceId}>
            #{invoice.id.slice(0, 8).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.period}>{periodLabel}</Text>

        <View style={styles.divider} />

        <DetailRow icon="person-outline" label="Student" value={invoice.student_name} />
        <DetailRow icon="people-outline" label="Guardian" value={invoice.guardian_name} />
        <DetailRow icon="call-outline" label="Phone" value={invoice.guardian_phone} />
        <DetailRow icon="document-text-outline" label="Type" value={invoice.description || "Monthly Fee"} />

        <View style={styles.divider} />

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>
            ₹{invoice.amount.toLocaleString("en-IN")}
          </Text>
        </View>

        {invoice.status === "paid" && (
          <>
            <View style={styles.divider} />
            <DetailRow
              icon="cash-outline"
              label="Payment Method"
              value={invoice.payment_method || "—"}
            />
            <DetailRow
              icon="time-outline"
              label="Paid On"
              value={
                invoice.paid_at
                  ? format(new Date(invoice.paid_at), "dd MMM yyyy, hh:mm a")
                  : "—"
              }
            />
            <View style={styles.paidStamp}>
              <Ionicons name="checkmark-circle" size={20} color="#2e7d32" />
              <Text style={styles.paidStampText}>PAID</Text>
            </View>
          </>
        )}
      </View>

      {/* Actions */}
      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        {invoice.status === "pending" && (
          <TouchableOpacity activeOpacity={0.8} onPress={handleCollect}>
            <LinearGradient
              colors={["#1b5e20", "#2e7d32"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionBtnGradient}
            >
              <Ionicons name="cash" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Collect Payment</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {invoice.status === "paid" && (
          <>
            <TouchableOpacity activeOpacity={0.8} onPress={handleShare}>
              <LinearGradient
                colors={["#1b5e20", "#2e7d32"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                <Ionicons name="share" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Share as PDF</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={handlePrint}
            >
              <Ionicons name="print" size={20} color="#1b5e20" />
              <Text style={styles.actionBtnOutlineText}>Print Receipt</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function DetailRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelRow}>
        <Ionicons name={icon} size={16} color="#888" />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    marginTop: 16,
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  invoiceId: { fontSize: 14, color: "#888", fontFamily: "PoppinsSemiBold" },
  period: { fontSize: 24, fontFamily: "PoppinsExtraBold", color: "#1a1a1a", marginTop: 6 },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { fontSize: 14, fontFamily: "Poppins", color: "#888" },
  detailValue: { fontSize: 14, color: "#1a1a1a", fontFamily: "PoppinsSemiBold" },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: { fontSize: 16, fontFamily: "PoppinsBold", color: "#333" },
  amountValue: { fontSize: 26, fontFamily: "PoppinsExtraBold", color: "#1b5e20" },
  paidStamp: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#e8f5e9",
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  paidStampText: {
    fontSize: 16,
    fontFamily: "PoppinsExtraBold",
    color: "#2e7d32",
    letterSpacing: 2,
  },
  actions: { padding: 16, gap: 12 },
  actionBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
  },
  actionBtnText: { color: "#fff", fontSize: 16, fontFamily: "PoppinsBold" },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#1b5e20",
    backgroundColor: "#fff",
  },
  actionBtnOutlineText: { color: "#1b5e20", fontSize: 16, fontFamily: "PoppinsBold" },
});
