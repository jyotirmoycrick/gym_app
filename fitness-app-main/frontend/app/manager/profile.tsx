import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { authAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  console.log("✅ Opened Manager [ScreenName]");
  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword(oldPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully!');
      setShowChangePassword(false);
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <Ionicons name="person-circle" size={80} color="#FF6B35" />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>Gym Manager</Text>
      </View>

      <TouchableOpacity 
        style={styles.changePasswordButton} 
        onPress={() => setShowChangePassword(true)}
      >
        <Ionicons name="key" size={20} color="#fff" />
        <Text style={styles.buttonText}>Change Password</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={20} color="#fff" />
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      {/* Change Password Modal */}
      {showChangePassword && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowChangePassword(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput style={styles.input} placeholder="Old Password" placeholderTextColor="#666" value={oldPassword} onChangeText={setOldPassword} secureTextEntry />
            <TextInput style={styles.input} placeholder="New Password" placeholderTextColor="#666" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <TextInput style={styles.input} placeholder="Confirm New Password" placeholderTextColor="#666" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            <TouchableOpacity style={styles.submitButton} onPress={handleChangePassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 24 },
  profileCard: { alignItems: 'center', padding: 24, backgroundColor: '#1a1a1a', borderRadius: 12, marginTop: 32, borderWidth: 1, borderColor: '#333' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  email: { fontSize: 14, color: '#999', marginTop: 8 },
  role: { fontSize: 12, color: '#FF6B35', marginTop: 4 },
  changePasswordButton: { flexDirection: 'row', backgroundColor: '#4CAF50', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  logoutButton: { flexDirection: 'row', backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 24, zIndex: 1000 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#333' },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  input: { backgroundColor: '#0a0a0a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 14, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  submitButton: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
