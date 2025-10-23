import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function TrainerDashboard() {
  const user = useAuthStore((state) => state.user);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, Trainer!</Text>
        <Text style={styles.name}>{user?.name}</Text>
      </View>

      <View style={styles.card}>
        <Ionicons name="people" size={48} color="#FF6B35" />
        <Text style={styles.cardTitle}>Trainer Dashboard</Text>
        <Text style={styles.cardText}>Manage your clients and create workout plans</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { padding: 24, paddingTop: 32 },
  greeting: { fontSize: 14, color: '#999' },
  name: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  card: { margin: 24, marginTop: 0, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  cardTitle: { fontSize: 20, fontWeight: '600', color: '#fff', marginTop: 16 },
  cardText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8 },
});
