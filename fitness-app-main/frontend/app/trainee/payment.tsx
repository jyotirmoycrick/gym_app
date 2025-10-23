import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { paymentAPI, memberAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

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
        console.error('Failed to load payments:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B35" /></View>;
  }

  const nextDueDate = new Date(profile?.membership_expiry).toLocaleDateString();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Next Payment Due</Text>
        <Text style={styles.text}>Due Date: {nextDueDate}</Text>
        <TouchableOpacity style={styles.button}>
          <Ionicons name="cash-outline" size={18} color="#fff" />
          <Text style={styles.buttonText}>Pay Advance</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Payment History</Text>
        {payments.length > 0 ? (
          payments.map((p, i) => (
            <View key={i} style={styles.row}>
              <Ionicons
                name={p.status === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={p.status === 'success' ? '#4CAF50' : '#FF6B35'}
              />
              <Text style={styles.text}>
                ₹{p.amount} — {p.status?.toUpperCase()}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.text}>No payments found</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  text: { color: '#ccc', fontSize: 13, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  button: { backgroundColor: '#FF6B35', padding: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
});
