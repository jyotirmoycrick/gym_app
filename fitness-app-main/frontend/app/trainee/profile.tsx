import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <Ionicons name="person-circle" size={80} color="#FF6B35" />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>Trainee</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 24 },
  profileCard: { alignItems: 'center', padding: 24, backgroundColor: '#1a1a1a', borderRadius: 12, marginTop: 32, borderWidth: 1, borderColor: '#333' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  email: { fontSize: 14, color: '#999', marginTop: 8 },
  role: { fontSize: 12, color: '#FF6B35', marginTop: 4 },
  logoutButton: { flexDirection: 'row', backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
