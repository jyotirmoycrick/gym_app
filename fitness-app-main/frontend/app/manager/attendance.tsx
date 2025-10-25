import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { attendanceAPI, memberAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AttendanceScreen() {
  const [stats, setStats] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const loadData = async (selectedDate?: Date) => {
  try {
    // ✅ Use local date, not UTC ISO
    const formattedDate = selectedDate
      ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
      : undefined;

    console.log("📡 Fetching attendance for:", formattedDate || "today");

    const [statsRes, membersRes] = await Promise.all([
      attendanceAPI.getGymStats(formattedDate),
      memberAPI.getAllMembers(),
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
    setLoading(true);
    loadData(date);
  }, [date]);
  // ✅ This

  
  const handleExportCSV = async () => {
    if (!stats?.today_records || stats.today_records.length === 0) {
      alert('No attendance data to export');
      return;
    }

    const csvRows = [
      'Member Name,Email,Check-in Time',
      ...stats.today_records.map((r: any) => {
        const m = members.find((x) => x.id === r.member_id);
        const name = m?.user_name || 'Unknown';
        const email = m?.user_email || '-';
        const time = new Date(r.check_in_time).toLocaleTimeString();
        return `${name},${email},${time}`;
      }),
    ];

    const csvString = csvRows.join('\n');
    const fileUri = `${FileSystem.cacheDirectory}attendance_${date.toISOString().split('T')[0]}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      await Clipboard.setStringAsync(csvString);
      alert('CSV copied to clipboard!');
    }
  };

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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData(date);
          }}
          tintColor="#FF6B35"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Attendance Analytics</Text>

        {/* Filter + Export Buttons */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowPicker(true)}>
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={styles.filterText}>{date.toDateString()}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
            <Ionicons name="download-outline" size={16} color="#fff" />
            <Text style={styles.filterText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker */}
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(e, selected) => {
            setShowPicker(false);
            if (selected) {
              setDate(selected);
              setLoading(true);
              loadData(selected);
            }
          }}
        />
      )}

      {/* Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroContent}>
          <View style={styles.heroIcon}>
            <Ionicons name="checkmark-circle" size={48} color="#FF6B35" />
          </View>
          <View style={styles.heroStats}>
            <Text style={styles.heroValue}>{stats?.today_count || 0}</Text>
            <Text style={styles.heroLabel}>Members Checked In</Text>
            <View style={styles.heroProgress}>
              <View
                style={[
                  styles.heroProgressBar,
                  { width: `${members.length > 0 ? Math.round((stats?.today_count || 0) / members.length * 100) : 0}%` },
                ]}
              />
            </View>
            <Text style={styles.heroPercentage}>
              {members.length > 0 ? Math.round((stats?.today_count || 0) / members.length * 100) : 0}% attendance rate
            </Text>
          </View>
        </View>
      </View>

      {/* Weekly stats */}
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

      {/* Attendance List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendance Report</Text>
        {stats?.today_records?.length > 0 ? (
        stats.today_records.map((record: any, index: number) => {
          

            const member = members.find((m) => m.id === record.member_id);
            return (
              <View key={index} style={styles.attendanceCard}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <View style={styles.attendanceDetails}>
                  <Text style={styles.memberName}>{member?.user_name || 'Member'}</Text>
                  <Text style={styles.attendanceTime}>
                    {new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No attendance for this date</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { padding: 24, paddingTop: 32, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  filterRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  filterBtn: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 6,
  },
  exportBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 6,
  },
  filterText: { color: '#fff', fontSize: 13 },
  heroCard: {
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  heroContent: { flexDirection: 'row', alignItems: 'center' },
  heroIcon: { marginRight: 20 },
  heroStats: { flex: 1 },
  heroValue: { fontSize: 46, fontWeight: 'bold', color: '#fff' },
  heroLabel: { fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', marginTop: 4, fontWeight: '600' },
  heroProgress: { height: 8, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  heroProgressBar: { height: '100%', backgroundColor: '#FF6B35', borderRadius: 4 },
  heroPercentage: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 8 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 20 },
  miniCard: { flex: 1, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  miniValue: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  miniLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '600' },
  section: { padding: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  attendanceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceDetails: { marginLeft: 12 },
  memberName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  attendanceTime: { fontSize: 12, color: '#999', marginTop: 4 },
  emptyState: { alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: '#666', marginTop: 12 },
});
