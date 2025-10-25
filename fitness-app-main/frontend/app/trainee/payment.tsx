import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { paymentAPI, memberAPI } from "../../src/services/api";

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [payRes, profRes] = await Promise.all([
          paymentAPI.getMyPayments(),
          memberAPI.getMyProfile(),
        ]);
        setPayments(payRes.data || []);
        setProfile(profRes.data);
      } catch (error) {
        console.error("Failed to load payments:", error);
        Alert.alert("Error", "Unable to load payment data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </SafeAreaView>
    );
  }

  const totalPaid = payments
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const nextDueDate = profile?.membership_expiry
    ? new Date(profile.membership_expiry).toLocaleDateString()
    : "N/A";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER SUMMARY SECTION */}
        <View style={styles.summaryContainer}>
          <Text style={styles.screenTitle}>My Payments</Text>
          <Text style={styles.subtitle}>Track your payments & membership</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Ionicons name="cash-outline" size={28} color="#FF6B35" />
              <Text style={styles.summaryLabel}>Total Paid</Text>
              <Text style={styles.summaryValue}>₹{totalPaid}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="calendar-outline" size={28} color="#FF6B35" />
              <Text style={styles.summaryLabel}>Next Due</Text>
              <Text style={styles.summaryValue}>{nextDueDate}</Text>
            </View>
          </View>
        </View>

        {/* PAY ACTION SECTION */}
        <View style={styles.actionCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Upcoming Payment</Text>
            <Text style={styles.actionSub}>Renew membership before {nextDueDate}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.payButton}
            onPress={() => Alert.alert("Payment", "Payment process not implemented yet.")}
          >
            <Ionicons name="card-outline" size={18} color="#fff" />
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
        </View>

        {/* PAYMENT HISTORY SECTION */}
        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {payments.length > 0 ? (
            payments.map((p, i) => (
              <View key={i} style={styles.historyItem}>
                <Ionicons
                  name={p.status === "success" ? "checkmark-circle" : "close-circle"}
                  size={22}
                  color={p.status === "success" ? "#4CAF50" : "#FF6B35"}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyAmount}>₹{p.amount}</Text>
                  <Text style={styles.historyDate}>
                    {p.date ? new Date(p.date).toLocaleDateString() : "No date"} •{" "}
                    {p.status?.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={26} color="#666" />
              <Text style={styles.emptyText}>No payment records found</Text>
            </View>
          )}
        </View>

        {/* FOOTER */}
        <Text style={styles.footerText}>
          All payments are securely processed through Fit Desert.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0B" },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B0B",
  },

  // Header
  screenTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: "#bbb",
    fontSize: 13,
    marginBottom: 18,
  },

  summaryContainer: {
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#1B1B1B",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#222",
  },
  summaryLabel: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 6,
  },
  summaryValue: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginTop: 4,
  },

  // Action section
  actionCard: {
    flexDirection: "row",
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 18,
  },
  actionTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  actionSub: {
    color: "#bbb",
    fontSize: 13,
    marginTop: 4,
  },
  payButton: {
    backgroundColor: "#FF6B35",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  payButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },

  // History
  historyCard: {
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  sectionTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 10,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    paddingVertical: 10,
  },
  historyAmount: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  historyDate: {
    color: "#888",
    fontSize: 12,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyText: {
    color: "#666",
    marginTop: 8,
    fontSize: 13,
  },

  // Footer
  footerText: {
    color: "#666",
    textAlign: "center",
    marginTop: 20,
    fontSize: 12,
  },
});
