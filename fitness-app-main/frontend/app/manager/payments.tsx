import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { paymentAPI, memberAPI } from "../../src/services/api";

export default function PaymentsScreen() {
  // ✅ All hooks defined at the top — no early returns
  const [payments, setPayments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ✅ Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [payRes, profRes] = await Promise.all([
          paymentAPI.getMyPayments(),
          memberAPI.getMyProfile(),
        ]);
        setPayments(payRes?.data || []);
        setProfile(profRes?.data);
      } catch (error) {
        console.error("Failed to load payments:", error);
      } finally {
        setLoading(false);

        // Animate content when loaded
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    };

    fetchData();
  }, []);

  // ✅ Loader (after all hooks are declared)
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  const nextDueDate = profile?.membership_expiry
    ? new Date(profile.membership_expiry).toLocaleDateString()
    : "N/A";

  // ✅ Main content
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <Animated.ScrollView
        style={[styles.container, { opacity: fadeAnim }]}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {/* 💰 Next Payment Due Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Next Payment Due</Text>
          <Text style={styles.text}>Due Date: {nextDueDate}</Text>

          <TouchableOpacity style={styles.button}>
            <Ionicons name="cash-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>Pay Advance</Text>
          </TouchableOpacity>
        </View>

        {/* 📜 Payment History */}
        <View style={styles.card}>
          <Text style={styles.title}>Payment History</Text>

          {payments.length > 0 ? (
            payments.map((p, i) => (
              <View key={i} style={styles.row}>
                <Ionicons
                  name={
                    p.status === "success"
                      ? "checkmark-circle"
                      : "alert-circle"
                  }
                  size={18}
                  color={p.status === "success" ? "#4CAF50" : "#FF6B35"}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.text}>₹{p.amount}</Text>
                  <Text style={styles.subText}>
                    {p.status?.toUpperCase()} —{" "}
                    {new Date(p.date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.text}>No payments found</Text>
          )}
        </View>
      </Animated.ScrollView>
    </TouchableWithoutFeedback>
  );
}

// ✅ Styles (unchanged look)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  loadingText: { color: "#FF6B35", marginTop: 8 },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 8 },
  text: { color: "#ccc", fontSize: 13, marginBottom: 4 },
  subText: { color: "#777", fontSize: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#FF6B35",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontWeight: "600", marginLeft: 8 },
});
