import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { attendanceAPI, memberAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function AttendanceScreen() {
  const [stats, setStats] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, membersRes] = await Promise.all([
  attendanceAPI.getGymStats(),
  memberAPI.getAllMembers()
]);
const onlyTrainees = (membersRes.data || []).filter(
  (m: any) => m.role !== 'trainer' && !m.is_trainer
);
setStats(statsRes.data);
setMembers(onlyTrainees);

    } catch (error) {
      console.error('Failed to load attendance data:', error);
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#FF6B35" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Attendance Analytics</Text>
      </View>

      {/* Hero Stats Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroContent}>
          <View style={styles.heroIcon}>
            <Ionicons name="checkmark-circle" size={48} color="#FF6B35" />
          </View>
          <View style={styles.heroStats}>
            <Text style={styles.heroValue}>{stats?.today_count || 0}</Text>
            <Text style={styles.heroLabel}>Members Checked In Today</Text>
            <View style={styles.heroProgress}>
              <View style={[styles.heroProgressBar, { width: `${members.length > 0 ? Math.round((stats?.today_count || 0) / members.length * 100) : 0}%` }]} />
            </View>
            <Text style={styles.heroPercentage}>
              {members.length > 0 ? Math.round((stats?.today_count || 0) / members.length * 100) : 0}% attendance rate
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.miniCard, { backgroundColor: '#1a4d2e' }]}>
          <Ionicons name="trending-up" size={24} color="#4CAF50" />
          <Text style={styles.miniValue}>{stats?.week_count || 0}</Text>
          <Text style={styles.miniLabel}>This Week</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: '#1a2a4d' }]}>
          <Ionicons name="people" size={24} color="#2196F3" />
          <Text style={styles.miniValue}>{members.length}</Text>
          <Text style={styles.miniLabel}>Total Members</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Attendance</Text>
        {stats?.today_records && stats.today_records.length > 0 ? (
          stats.today_records.map((record: any, index: number) => {
            const member = members.find(m => m.id === record.member_id);
            return (
              <View key={index} style={styles.attendanceCard}>
                <View style={styles.attendanceInfo}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <View style={styles.attendanceDetails}>
                    <Text style={styles.memberName}>{member?.user_name || 'Member'}</Text>
                    <Text style={styles.attendanceTime}>
                      {new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No attendance today</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Member Status</Text>
        {members.map((member) => {
          const todayAttended = stats?.today_records?.some((r: any) => r.member_id === member.id);
          return (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.user_name}</Text>
                <Text style={styles.memberEmail}>{member.user_email}</Text>
              </View>
              <View style={[styles.statusBadge, todayAttended && styles.statusPresent]}>
                <Text style={styles.statusText}>{todayAttended ? 'Present' : 'Absent'}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { padding: 24, paddingTop: 32, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  heroCard: { marginHorizontal: 24, marginBottom: 20, backgroundColor: 'linear-gradient(135deg, #FF6B35 0%, #FF8C35 100%)', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255, 107, 53, 0.3)', shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  heroContent: { flexDirection: 'row', alignItems: 'center' },
  heroIcon: { marginRight: 20 },
  heroStats: { flex: 1 },
  heroValue: { fontSize: 48, fontWeight: 'bold', color: '#fff' },
  heroLabel: { fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', marginTop: 4, fontWeight: '600' },
  heroProgress: { height: 8, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  heroProgressBar: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  heroPercentage: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 8 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 20 },
  miniCard: { flex: 1, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  miniValue: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  miniLabel: { fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4, fontWeight: '600' },
  section: { padding: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  attendanceCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  attendanceInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  attendanceDetails: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  attendanceTime: { fontSize: 12, color: '#999', marginTop: 4 },
  memberCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  memberInfo: { flex: 1 },
  memberEmail: { fontSize: 12, color: '#999', marginTop: 4 },
  statusBadge: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusPresent: { backgroundColor: 'rgba(76, 175, 80, 0.2)' },
  statusText: { fontSize: 12, color: '#999', fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: '#666', marginTop: 12 },
});
