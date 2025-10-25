import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  FlatList,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { paymentAPI, memberAPI } from "../../src/services/api";
import { BarChart, PieChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width - 32;

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // form
  const [paymentType, setPaymentType] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [searchText, setSearchText] = useState("");
  const [amount, setAmount] = useState("");
  const [durationMonths, setDurationMonths] = useState("");

  // new member form
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");

  const fadeAnim = React.useRef(new Animated.Value(0)).current;


  const loadPayments = async () => {
    try {
      const res = await paymentAPI.getGymPayments();
      const data = Array.isArray(res?.data) ? res.data : [];
setPayments(data.filter((p) => p.status === "success"));
console.log("Loading payments...");

    } catch (error) {
      console.error("Failed to load payments:", error);
      
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMembers = async () => {
    try {
      const res = await memberAPI.getAllMembers();
      const data = Array.isArray(res?.data) ? res.data : [];
      setMembers(res.data || []);
      setFilteredMembers(res.data.slice(0, 3));
    } catch (error) {
      console.error("Failed to load members:", error); 
    } 
  };

  useEffect(() => {
    loadPayments();
    loadMembers();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.trim() === "") {
      setFilteredMembers(members.slice(0, 3));
    } else {
      const filtered = members.filter(
        (m) =>
          m.user_name?.toLowerCase().includes(text.toLowerCase()) ||
          m.user_email?.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  };

  const handleConfirmPayment = async () => {
    try {
      if (!amount || !paymentType) {
        Alert.alert("Missing Info", "Please fill required fields.");
        return;
      }

      setLoading(true);

      if (paymentType === "new_membership") {
        if (!newMemberName || !newMemberEmail || !newMemberPhone || !newMemberPassword || !durationMonths) {
          Alert.alert("Error", "Please fill all new member details.");
          return;
        }

        const res = await memberAPI.addMember({
          name: newMemberName,
          email: newMemberEmail,
          phone: newMemberPhone,
          password: newMemberPassword,
          membership_plan: "Monthly",
          plan_duration_months: parseInt(durationMonths),
          goal: "Fitness",
          is_trainer: false,
        });

        await paymentAPI.createOrder({
          member_id: res.data.member_id,
          amount: parseFloat(amount),
          payment_type: paymentType,
        });

        Alert.alert("Success", "New member added & payment recorded.");
      } else if (paymentType === "renewal") {
        if (!selectedMember) {
          Alert.alert("Error", "Please select an existing member.");
          return;
        }

        await paymentAPI.createOrder({
          member_id: selectedMember.id,
          amount: parseFloat(amount),
          payment_type: paymentType,
        });

        await memberAPI.extendMembership(
          selectedMember.id,
          parseInt(durationMonths) * 30
        );

        Alert.alert("Success", "Membership renewed successfully!");
      } else {
        if (!selectedMember) {
          Alert.alert("Error", "Select member for this payment.");
          return;
        }

        await paymentAPI.createOrder({
          member_id: selectedMember.id,
          amount: parseFloat(amount),
          payment_type: paymentType,
        });

        Alert.alert("Success", "Payment added successfully!");
      }

      setShowAddModal(false);
      setPaymentType("");
      setSelectedMember(null);
      setSearchText("");
      setAmount("");
      setDurationMonths("");
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberPhone("");
      setNewMemberPassword("");
      await loadPayments();
    } catch (err) {
      console.error("Add payment error:", err);
      Alert.alert("Error", "Failed to record payment.");
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const completedPayments = payments.length;

  const chartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [
      { data: [4000, 6000, 8000, 3000, 9000] },
    ],
  };

  const pieData = [
    { name: "Membership", amount: 12000, color: "#4CAF50", legendFontColor: "#fff", legendFontSize: 12 },
    { name: "Training", amount: 8000, color: "#FF6B35", legendFontColor: "#fff", legendFontSize: 12 },
    { name: "Add-ons", amount: 3000, color: "#2196F3", legendFontColor: "#fff", legendFontSize: 12 },
  ];

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );

  return (<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={styles.container}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPayments();
              loadMembers();
            }}
            tintColor="#FF6B35"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Payment Analytics</Text>
          <Text style={styles.subtitle}>Track your gym’s financial performance</Text>
        </View>

        {/* Analytics Section */}
        <View style={styles.analyticsRow}>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Total Revenue</Text>
            <Text style={styles.analyticsValue}>₹{totalRevenue}</Text>
          </View>

          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Completed</Text>
            <Text style={styles.analyticsValue}>{completedPayments}</Text>
          </View>
        </View>

        <View style={styles.analyticsRow}>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>This Month</Text>
            <Text style={styles.analyticsValue}>
              ₹
              {payments
                .filter(
                  (p) => new Date(p.created_at).getMonth() === new Date().getMonth()
                )
                .reduce((sum, p) => sum + p.amount, 0)}
            </Text>
          </View>

          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>This Week</Text>
            <Text style={styles.analyticsValue}>
              ₹
              {payments
                .filter((p) => {
                  const paymentDate = new Date(p.created_at);
                  const now = new Date();
                  const diff = (now.getTime() - paymentDate.getTime()) / (1000 * 3600 * 24);
                  return diff <= 7;
                })
                .reduce((sum, p) => sum + p.amount, 0)}
            </Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={56} color="#555" />
              <Text style={styles.emptyText}>No Payments Yet</Text>
            </View>
          ) : (
            payments.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.paymentCard}
                onPress={() =>
                  Alert.alert(
                    "Transaction Details",
                    `Type: ${p.payment_type}\nAmount: ₹${p.amount}\nDate: ${new Date(
                      p.created_at
                    ).toLocaleString()}`
                  )
                }
              >
                <View>
                  <Text style={styles.paymentType}>{p.payment_type}</Text>
                  <Text style={styles.paymentDate}>
                    {new Date(p.created_at).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>₹{p.amount}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </Animated.ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

        {/* Add Payment Modal */}
        <Modal visible={showAddModal} transparent animationType="fade">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <Animated.View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Add Payment</Text>

                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={paymentType}
                    onValueChange={(v) => setPaymentType(v)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Payment Type" value="" color="#777" />
                    <Picker.Item label="New Membership" value="new_membership" />
                    <Picker.Item label="Renewal" value="renewal" />
                    <Picker.Item label="Personal Training" value="personal_training" />
                    <Picker.Item label="Diet Plan" value="diet_plan" />
                    <Picker.Item label="Add-on" value="add_on" />
                  </Picker>
                </View>

                {paymentType === "new_membership" ? (
                  <>
                    <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#777" value={newMemberName} onChangeText={setNewMemberName} />
                    <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#777" value={newMemberEmail} onChangeText={setNewMemberEmail} keyboardType="email-address" />
                    <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#777" value={newMemberPhone} onChangeText={setNewMemberPhone} keyboardType="phone-pad" />
                    <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#777" secureTextEntry value={newMemberPassword} onChangeText={setNewMemberPassword} />
                    <TextInput style={styles.input} placeholder="Duration (months)" placeholderTextColor="#777" keyboardType="numeric" value={durationMonths} onChangeText={setDurationMonths} />
                  </>
                ) : (
                  <>
                    <TextInput style={styles.input} placeholder="Search Member..." placeholderTextColor="#777" value={searchText} onChangeText={handleSearch} />
                    <FlatList
                      data={filteredMembers}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => {
                        const isExpired = item.membership_expiry ? new Date(item.membership_expiry) < new Date() : true;
                        return (
                          <TouchableOpacity
                            style={[
                              styles.memberItem,
                              selectedMember?.id === item.id && styles.memberSelected,
                            ]}
                            onPress={() => setSelectedMember(item)}
                          >
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                              <View>
                                <Text style={styles.memberName}>{item.user_name}</Text>
                                <Text style={styles.memberEmail}>{item.user_email}</Text>
                              </View>
                              <Text style={{ color: isExpired ? "#ff4444" : "#4CAF50", fontWeight: "600" }}>
                                {isExpired ? "Expired" : "Active"}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      }}
                    />
                    {paymentType === "renewal" && (
                      <TextInput style={styles.input} placeholder="Duration (months)" placeholderTextColor="#777" keyboardType="numeric" value={durationMonths} onChangeText={setDurationMonths} />
                    )}
                  </>
                )}

                <TextInput style={styles.input} placeholder="Amount (₹)" placeholderTextColor="#777" keyboardType="numeric" value={amount} onChangeText={setAmount} />

                <TouchableOpacity style={styles.saveBtn} onPress={handleConfirmPayment}>
                  <Text style={styles.saveBtnText}>Confirm Payment</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const chartConfig = {
  backgroundGradientFrom: "#0a0a0a",
  backgroundGradientTo: "#0a0a0a",
  color: (opacity = 1) => `rgba(255,107,53,${opacity})`,
  labelColor: () => "#999",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#aaa", marginTop: 10 },
  header: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: "bold", color: "#fff" },
  subtitle: { fontSize: 13, color: "#999", marginTop: 4 },
  chartCard: { backgroundColor: "#111", padding: 16, borderRadius: 12, marginHorizontal: 16, marginBottom: 16 },
  chartTitle: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 8 },
  chartStyle: { borderRadius: 12 },
  section: { padding: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#fff" },
  paymentCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#141414", borderRadius: 10, padding: 14, marginBottom: 10 },
  paymentType: { fontSize: 15, color: "#fff", fontWeight: "600" },
  paymentDate: { fontSize: 12, color: "#888" },
  paymentAmount: { fontSize: 16, fontWeight: "bold", color: "#FF6B35" },
  fab: { position: "absolute", bottom: 30, right: 25, backgroundColor: "#FF6B35", width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" },
  modalCard: { backgroundColor: "#1a1a1a", padding: 24, borderRadius: 20, width: "90%" },
  modalTitle: { color: "#fff", fontWeight: "700", fontSize: 20, marginBottom: 16, textAlign: "center" },
  input: { backgroundColor: "#111", borderRadius: 10, color: "#fff", padding: 14, marginBottom: 12 },
  pickerContainer: { backgroundColor: "#111", borderRadius: 10, marginBottom: 12, overflow: "hidden" },
  picker: { color: "#fff", height: Platform.OS === "ios" ? 150 : 50 },
  saveBtn: { backgroundColor: "#FF6B35", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 6 },
  saveBtnText: { color: "#fff", fontWeight: "bold" },
  cancelBtn: { marginTop: 10, alignItems: "center" },
  cancelText: { color: "#bbb" },
  memberItem: { backgroundColor: "#111", padding: 12, borderRadius: 8, marginBottom: 8 },
  memberSelected: { borderWidth: 1, borderColor: "#FF6B35" },
  memberName: { color: "#fff", fontWeight: "600" },
  memberEmail: { color: "#999", fontSize: 12 },
  analyticsRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingHorizontal: 20,
  marginBottom: 10,
},
analyticsCard: {
  backgroundColor: "#141414",
  borderRadius: 12,
  padding: 16,
  flex: 1,
  marginHorizontal: 4,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 5,
},
analyticsLabel: {
  color: "#aaa",
  fontSize: 13,
},
analyticsValue: {
  color: "#fff",
  fontWeight: "bold",
  fontSize: 20,
  marginTop: 6,
},
emptyState: {
  alignItems: "center",
  justifyContent: "center",
  marginTop: 40,
},
emptyText: {
  color: "#999",
  marginTop: 8,
  fontSize: 14,
},

});
