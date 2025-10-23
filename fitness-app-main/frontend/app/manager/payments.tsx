import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { paymentAPI } from '../../src/services/api';

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = async () => {
    try {
      // mock placeholder - replace with actual API
      setPayments([]);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const totalRevenue = payments.filter(p => p.status === 'success').reduce((s, p) => s + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const thisMonth = payments.filter(p => {
    const d = new Date(p.created_at);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() && p.status === 'success';
  }).reduce((s, p) => s + p.amount, 0);

  const scaleAnim = new Animated.Value(0.9);
  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading payment data...</Text>
      </View>
    );
  }

  return (
    <Animated.ScrollView
      style={styles.container}
      contentContainerStyle={{ backgroundColor: '#0a0a0a' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPayments(); }} tintColor="#FF6B35" />}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Payment Analytics</Text>
        <Text style={styles.subtitle}>Manage and track all your transactions</Text>
      </View>

      {/* SUMMARY CARDS */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#142b22' }]}>
          <Ionicons name="cash-outline" size={32} color="#FF6B35" />
          <Text style={styles.statValue}>₹{totalRevenue.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#3a1f10' }]}>
          <Ionicons name="calendar-outline" size={32} color="#FF6B35" />
          <Text style={styles.statValue}>₹{thisMonth.toLocaleString()}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#3d2b00' }]}>
          <Ionicons name="time-outline" size={32} color="#FF6B35" />
          <Text style={styles.statValue}>₹{pendingAmount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#10263a' }]}>
          <Ionicons name="checkmark-circle-outline" size={32} color="#FF6B35" />
          <Text style={styles.statValue}>{payments.filter(p => p.status === 'success').length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* TRANSACTIONS SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        {payments.length > 0 ? (
          payments.slice(0, 20).map((payment, index) => {
            const color =
              payment.status === 'success'
                ? '#4CAF50'
                : payment.status === 'pending'
                ? '#FFA726'
                : '#F44336';
            const icon =
              payment.status === 'success'
                ? 'checkmark-circle'
                : payment.status === 'pending'
                ? 'time'
                : 'close-circle';

            return (
              <View key={index} style={[styles.paymentCard, { shadowColor: color }]}>
                <View style={styles.paymentLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: color + '22' }]}>
                    <Ionicons name={icon} size={24} color={color} />
                  </View>
                  <View style={styles.paymentDetails}>
                    <Text style={styles.paymentType}>
                      {payment.payment_type.replace('_', ' ')}
                    </Text>
                    <Text style={styles.paymentDate}>
                      {new Date(payment.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.paymentAmount, { color }]}>
                  ₹{payment.amount.toLocaleString()}
                </Text>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={56} color="#555" />
            <Text style={styles.emptyText}>No Payment Records</Text>
            <Text style={styles.emptySubtext}>
              Once members make transactions, they’ll appear here with full details.
            </Text>
          </View>
        )}
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#aaa',
    marginTop: 10,
    fontSize: 14,
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  statCard: {
    flexBasis: '48%',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#FF6B35',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 2,
  },

  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 14,
  },

  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentDetails: { flex: 1 },
  paymentType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  paymentDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 4,
  },
});
