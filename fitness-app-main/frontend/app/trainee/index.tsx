import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, StyleSheet,TouchableOpacity,
  Alert, } from 'react-native';
import { memberAPI, attendanceAPI, paymentAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useRouter } from 'expo-router';

const router = useRouter();

export default function TraineeDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const { user, logout } = useAuthStore();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [profileRes, attendanceRes, paymentRes] = await Promise.all([
        memberAPI.getMyProfile(),
        attendanceAPI.getMyHistory(),
        paymentAPI.getMyPayments(),
      ]);

      setProfile(profileRes.data);
      setAttendance(attendanceRes.data || []);
      setPayments(paymentRes.data || []);
    } catch (error) {
      console.error('Failed to load trainee dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadData();
        }} tintColor="#FF6B35" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {user?.name || 'Member'}</Text>
        <Text style={styles.subtitle}>{profile?.gym_name}</Text>
      </View>

      <View style={styles.cardWrapper}>
  <View style={styles.premiumCard}>
    {/* Fake Light Reflection */}
    <View style={styles.lightReflection} />

    {/* Card Header */}
    <View style={styles.cardTop}>
      <Text style={styles.cardPlan}>
        {profile?.membership_plan?.toUpperCase() || 'PREMIUM'}
      </Text>
      <Ionicons name="flash" size={20} color="#fff" />
    </View>

    {/* Member Info */}
    <Text style={styles.memberName}>{user?.name?.toUpperCase() || 'Member'}</Text>
    <Text style={styles.memberGoal}>{profile?.goal || 'Fitness Enthusiast'}</Text>

    {/* Card Bottom */}
    <View style={styles.cardBottom}>
      <View>
        <Text style={styles.label}>Valid Till</Text>
        <Text style={styles.value}>
          {profile?.membership_expiry
            ? new Date(profile?.membership_expiry).toLocaleDateString()
            : 'Not Active'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.label}>Status</Text>
        <Text
          style={[
            styles.value,
            { color: profile?.status === 'active' ? '#4CAF50' : '#FF3B30' },
          ]}
        >
          {profile?.status?.toUpperCase()}
        </Text>
      </View>
    </View>
  </View>
</View>




    {/* ===================== ATTENDANCE SECTION ===================== */}
<View style={styles.attendanceContainer}>
  <Text style={styles.attendanceTitle}>Attendance Overview</Text>

  <View style={styles.attendanceCard}>
    {/* Glow layer */}
    <View style={styles.cardGlow} />

    <View style={styles.metricRow}>
      <View style={styles.metricItem}>
        <Ionicons name="calendar" size={22} color="#FFD580" />
        <View>
          <Text style={styles.metricLabel}>Total Days</Text>
          <Text style={styles.metricValue}>{attendance.length}</Text>
        </View>
      </View>

      <View style={styles.metricItem}>
        <Ionicons name="bar-chart" size={22} color="#FF6B35" />
        <View>
          <Text style={styles.metricLabel}>This Month</Text>
          <Text style={styles.metricValue}>
            {attendance.filter((item) => {
              const d = new Date(item.check_in_time);
              const now = new Date();
              return (
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
              );
            }).length}
          </Text>
        </View>
      </View>
    </View>

    <View style={styles.metricRow}>
      <View style={styles.metricItem}>
        <Ionicons name="flame" size={22} color="#FF9D00" />
        <View>
          <Text style={styles.metricLabel}>Current Streak</Text>
          <Text style={styles.metricValue}>
            {Math.min(attendance.length, 5)} Days
          </Text>
        </View>
      </View>

      <View style={styles.metricItem}>
        <Ionicons name="time" size={22} color="#4CAF50" />
        <View>
          <Text style={styles.metricLabel}>Last Check-in</Text>
          <Text style={styles.metricValue}>
            {attendance[0]?.check_in_time
              ? new Date(attendance[0].check_in_time).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'Asia/Kolkata',
                })
              : '--'}
          </Text>
        </View>
      </View>
    </View>

   <TouchableOpacity
  style={styles.analyticsButton}
  onPress={() => router.push('/trainee/TraineeAnalytics' as any)}
>
  <Ionicons name="stats-chart" size={18} color="#fff" />
  <Text style={styles.analyticsButtonText}>View Full Analytics</Text>
</TouchableOpacity>

  </View>
</View>





      {/* Payment Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment History</Text>
        {payments.length > 0 ? (
          payments.map((pay, i) => (
            <View key={i} style={styles.row}>
              <Ionicons
                name={pay.status === 'success' ? 'cash' : 'alert-circle'}
                size={18}
                color={pay.status === 'success' ? '#4CAF50' : '#FF6B35'}
              />
              <Text style={styles.text}>
                ₹{pay.amount} — {pay.status?.toUpperCase()}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.text}>No payments yet</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 24, paddingTop: 32 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#aaa', marginTop: 4 },
  card: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  text: { color: '#ccc', fontSize: 13, marginBottom: 4 },
  status: { marginTop: 4, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  cardWrapper: {
  marginHorizontal: 16,
  marginBottom: 16,
  borderRadius: 20,
  overflow: 'hidden',
  shadowColor: '#FF6B35',
  shadowOpacity: 0.3,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
},

  premiumCard: {
    backgroundColor: '#141414', // dark metallic base
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',

    // metallic shimmer illusion
    shadowColor: '#FF9234',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 3, height: 3 },
  },

  lightReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ skewY: '-15deg' }],
    opacity: 0.12,
  },
  textSmall: {
  color: '#aaa',
  fontSize: 12,
  marginLeft: 4,
},


  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  cardPlan: {
    color: '#FFD580',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  memberName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  memberGoal: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: 26,
  },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
  },

  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginBottom: 2,
  },

  value: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  brandArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 16,
  },

  brandText: {
    color: '#FF6B35',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '600',
  },

  summaryContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginVertical: 10,
},
summaryItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
summaryText: {
  color: '#fff',
  fontSize: 13,
},
dividerLine: {
  height: 1,
  backgroundColor: '#333',
  marginVertical: 12,
},
attendanceRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
  gap: 10,
},
analyticsBtn: {
  marginTop: 10,
  backgroundColor: '#FF6B35',
  paddingVertical: 10,
  borderRadius: 8,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},
analyticsBtnText: {
  color: '#fff',
  fontWeight: '600',
  fontSize: 14,
},
attendanceContainer: {
  marginHorizontal: 16,
  marginBottom: 24,
},
attendanceTitle: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '700',
  marginBottom: 12,
  letterSpacing: 0.5,
},

attendanceCard: {
  backgroundColor: '#1a1a1a',
  borderRadius: 20,
  padding: 18,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  position: 'relative',
  overflow: 'hidden',
  shadowColor: '#FF6B35',
  shadowOpacity: 0.25,
  shadowRadius: 12,
  elevation: 10,
},
cardGlow: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'linear-gradient(135deg, rgba(255,107,53,0.1), rgba(255,211,150,0.1))',
  opacity: 0.6,
},

metricRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 16,
},
metricItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  flex: 1,
},
metricLabel: {
  color: '#aaa',
  fontSize: 12,
},
metricValue: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},
analyticsButton: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#FF6B35',
  paddingVertical: 10,
  borderRadius: 10,
  marginTop: 10,
  gap: 8,
},
analyticsButtonText: {
  color: '#fff',
  fontWeight: '700',
  fontSize: 14,
},


});
