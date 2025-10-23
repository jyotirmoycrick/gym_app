import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { gymAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboard() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGyms = async () => {
    try {
      const response = await gymAPI.getAllGyms();
      setGyms(response.data);
    } catch (error) {
      console.error('Failed to load gyms:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGyms();
  }, []);

  const handleToggleStatus = async (gymId: string, isActive: boolean) => {
    Alert.alert(
      isActive ? 'Activate Gym' : 'Suspend Gym',
      `Are you sure you want to ${isActive ? 'activate' : 'suspend'} this gym?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isActive ? 'Activate' : 'Suspend',
          onPress: async () => {
            try {
              await gymAPI.toggleStatus(gymId, isActive);
              Alert.alert('Success', `Gym ${isActive ? 'activated' : 'suspended'} successfully!`);
              loadGyms();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to update status');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGym = (gymId: string, gymName: string) => {
    Alert.alert(
      'Delete Gym',
      `Are you sure you want to permanently delete "${gymName}"? This will delete all trainers, members, and data associated with this gym. This action cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await gymAPI.deleteGym(gymId);
              Alert.alert('Success', 'Gym and all related data deleted successfully!');
              loadGyms();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete gym');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGyms(); }} tintColor="#FF6B35" />}>
      <View style={styles.header}>
        <Text style={styles.title}>FitDesert Admin</Text>
        <Text style={styles.subtitle}>{gyms.length} Gyms Registered</Text>
      </View>

      <View style={styles.gymsList}>
        {gyms.map((gym) => (
          <View key={gym.id} style={styles.gymCard}>
            <View style={styles.gymHeader}>
              <Ionicons name="business" size={24} color="#FF6B35" />
              <View style={styles.gymInfo}>
                <Text style={styles.gymName}>{gym.name}</Text>
                <Text style={styles.gymLocation}>{gym.city}, {gym.state}</Text>
              </View>
              <View style={[styles.statusBadge, gym.is_active && styles.statusActive]}>
                <Text style={styles.statusText}>{gym.is_active ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
            <View style={styles.gymStats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{gym.stats?.total_members || 0}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{gym.stats?.active_members || 0}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{gym.subscription_plan}</Text>
                <Text style={styles.statLabel}>Plan</Text>
              </View>
            </View>
            <View style={styles.gymActions}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleToggleStatus(gym.id, !gym.is_active)}
              >
                <Ionicons name={gym.is_active ? "pause" : "play"} size={16} color="#fff" />
                <Text style={styles.actionText}>{gym.is_active ? 'Suspend' : 'Activate'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]} 
                onPress={() => handleDeleteGym(gym.id, gym.name)}
              >
                <Ionicons name="trash" size={16} color="#fff" />
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { padding: 24, paddingTop: 32 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 8 },
  gymsList: { paddingHorizontal: 24, paddingBottom: 24 },
  gymCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  gymHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  gymInfo: { flex: 1, marginLeft: 12 },
  gymName: { fontSize: 18, fontWeight: '600', color: '#fff' },
  gymLocation: { fontSize: 12, color: '#999', marginTop: 4 },
  statusBadge: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: 'rgba(76, 175, 80, 0.2)' },
  statusText: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
  gymStats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  gymActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#333' },
  actionButton: { flex: 1, flexDirection: 'row', backgroundColor: '#FF6B35', borderRadius: 8, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 6 },
  deleteButton: { backgroundColor: '#ff3b30' },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
