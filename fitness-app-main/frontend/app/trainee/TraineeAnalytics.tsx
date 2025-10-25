import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { memberAPI, attendanceAPI, paymentAPI } from '../../src/services/api';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function TraineeAnalytics() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showAll, setShowAll] = useState(false);

  const loadAll = async () => {
    try {
      const [aRes] = await Promise.all([
        attendanceAPI.getMyHistory(),
        memberAPI.getMyProfile(),
        paymentAPI.getMyPayments(),
      ]);
      setAttendance(aRes.data || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadAll();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
  }, []);

  // --- Derived analytics ---
  const last30 = useMemo(() => {
    const map: Record<string, number> = {};
    const labels: string[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      map[key] = 0;
      labels.push(d.getDate().toString());
    }
    attendance.forEach((rec) => {
      if (!rec.check_in_time) return;
      const k = new Date(rec.check_in_time).toISOString().slice(0, 10);
      if (map[k] !== undefined) map[k] += 1;
    });
    const data = Object.keys(map).map((k) => map[k]);
    return { labels, data };
  }, [attendance]);

  const weeklyCounts = useMemo(() => {
    const res: number[] = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dayKey = d.toISOString().slice(0, 10);
      const count = attendance.filter(
        (r) =>
          r.date === dayKey ||
          new Date(r.check_in_time).toISOString().slice(0, 10) === dayKey
      ).length;
      res.push(count);
    }
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      labels.push(days[d.getDay()]);
    }
    return { labels, data: res };
  }, [attendance]);

  const attendanceRate = useMemo(() => {
    const daysWith = last30.data.filter((v) => v > 0).length;
    return Math.round((daysWith / 30) * 100);
  }, [last30]);

  const streak = useMemo(() => {
    const setDates = new Set(
      attendance.map((r) =>
        new Date(r.check_in_time).toISOString().slice(0, 10)
      )
    );
    let s = 0;
    let d = new Date();
    while (true) {
      const k = d.toISOString().slice(0, 10);
      if (setDates.has(k)) {
        s++;
        d = new Date(d.getTime() - 86400000);
      } else break;
    }
    return s;
  }, [attendance]);

  const summaryRecords = showAll ? attendance : attendance.slice(0, 8);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FF6B35"
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {/* KPI Row */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{attendance.length}</Text>
          <Text style={styles.kpiLabel}>Total Visits</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{attendanceRate}%</Text>
          <Text style={styles.kpiLabel}>30d Rate</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{streak}</Text>
          <Text style={styles.kpiLabel}>Streak</Text>
        </View>
      </View>

      {/* Line Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Last 30 Days</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={{
              labels: last30.labels,
              datasets: [{ data: last30.data }],
            }}
            width={screenWidth * 1.5}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chartStyle}
          />
        </ScrollView>
      </View>

      {/* Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Weekly Pattern</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={{
              labels: weeklyCounts.labels,
              datasets: [{ data: weeklyCounts.data }],
            }}
            width={screenWidth * 0.9}
            height={200}
            chartConfig={chartConfig}
            style={styles.chartStyle}
          />
        </ScrollView>
      </View>

      {/* Pie Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Attendance Summary</Text>
        <View style={styles.center}>
          <PieChart
            data={[
              {
                name: 'Visited',
                population: last30.data.filter((v) => v > 0).length,
                color: '#4CAF50',
                legendFontColor: '#fff',
                legendFontSize: 12,
              },
              {
                name: 'Missed',
                population: 30 - last30.data.filter((v) => v > 0).length,
                color: '#FF6B35',
                legendFontColor: '#fff',
                legendFontSize: 12,
              },
            ]}
            width={screenWidth - 60}
            height={180}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
          />
        </View>
      </View>

      {/* Attendance history */}
      <View style={styles.cardSmall}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Recent Attendance</Text>
          <TouchableOpacity onPress={() => setShowAll(!showAll)}>
            <Text style={styles.showMore}>
              {showAll ? 'Show Less' : 'Show All'}
            </Text>
          </TouchableOpacity>
        </View>

        {summaryRecords.length === 0 ? (
          <Text style={styles.text}>No records</Text>
        ) : (
          summaryRecords.map((r, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.attRow}
              onPress={() => {
                setSelectedRecord(r);
                setModalVisible(true);
              }}
            >
              <View>
                <Text style={styles.attDate}>
                  {new Date(r.check_in_time).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                  })}
                </Text>
                <Text style={styles.attTimes}>
                  In:{' '}
                  {r.check_in_time
                    ? new Date(r.check_in_time).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata',
                      })
                    : '--'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.attTimes}>
                  Out:{' '}
                  {r.check_out_time
                    ? new Date(r.check_out_time).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata',
                      })
                    : '—'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Attendance Detail</Text>
            {selectedRecord && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.text}>
                  Date:{' '}
                  {new Date(selectedRecord.check_in_time).toLocaleDateString()}
                </Text>
                <Text style={styles.text}>
                  Check-in:{' '}
                  {selectedRecord.check_in_time
                    ? new Date(selectedRecord.check_in_time).toLocaleTimeString(
                        'en-IN',
                        { hour: '2-digit', minute: '2-digit', hour12: true }
                      )
                    : '--'}
                </Text>
                <Text style={styles.text}>
                  Check-out:{' '}
                  {selectedRecord.check_out_time
                    ? new Date(selectedRecord.check_out_time).toLocaleTimeString(
                        'en-IN',
                        { hour: '2-digit', minute: '2-digit', hour12: true }
                      )
                    : '—'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: '#fff' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const chartConfig = {
  backgroundGradientFrom: '#0a0a0a',
  backgroundGradientTo: '#0a0a0a',
  color: (opacity = 1) => `rgba(255,107,53,${opacity})`,
  labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
  propsForDots: { r: '3', strokeWidth: '1', stroke: '#fff' },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', padding: 16 },
  center: { justifyContent: 'center', alignItems: 'center' },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#111',
    marginHorizontal: 4,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  kpiValue: { color: '#fff', fontSize: 20, fontWeight: '700' },
  kpiLabel: { color: '#aaa', fontSize: 12 },
  chartCard: {
    marginTop: 16,
    backgroundColor: '#101010',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  chartStyle: { borderRadius: 10, marginVertical: 6 },
  cardTitle: { color: '#fff', fontWeight: '700', marginBottom: 8, fontSize: 15 },
  cardSmall: {
    marginTop: 20,
    backgroundColor: '#111',
    padding: 14,
    borderRadius: 14,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  showMore: { color: '#FF6B35', fontWeight: '600' },
  attRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  attDate: { color: '#fff', fontWeight: '700' },
  attTimes: { color: '#ccc', fontSize: 13 },
  text: { color: '#ccc', fontSize: 13 },
  modalWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    width: '90%',
    backgroundColor: '#0d0d0d',
    padding: 16,
    borderRadius: 12,
  },
  closeBtn: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-end',
    marginTop: 16,
  },
});
