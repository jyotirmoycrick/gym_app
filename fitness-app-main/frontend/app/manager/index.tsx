import React, { useEffect, useState ,useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { gymAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";

const qrCardRef = useRef();


export default function ManagerDashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [gym, setGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const loadGymData = async () => {
    try {
      const response = await gymAPI.getMyGym();
      setGym(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No gym registered yet
        setGym(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGymData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadGymData();
  };

  const handleRegisterGym = () => {
    Alert.prompt(
      'Register Gym',
      'Enter gym name',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: async (gymName) => {
            if (!gymName) return;
            
            // For demo, we'll use simplified registration
            try {
              await gymAPI.register({
                name: gymName,
                address: 'Sample Address',
                city: 'City',
                state: 'State',
                phone: user?.phone || '1234567890',
                email: user?.email || 'gym@example.com',
              });
              Alert.alert('Success', 'Gym registered successfully!');
              loadGymData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to register gym');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!gym) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
      >
        <Ionicons name="business-outline" size={80} color="#666" />
        <Text style={styles.emptyTitle}>No Gym Registered</Text>
        <Text style={styles.emptyText}>
          Register your gym to start managing members and tracking attendance
        </Text>
        <TouchableOpacity style={styles.registerButton} onPress={handleRegisterGym}>
          <Text style={styles.registerButtonText}>Register Gym</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.gymName}>{gym.name}</Text>
        </View>
        <TouchableOpacity style={styles.qrButton} onPress={() => setShowQR(true)}>
          <Ionicons name="qr-code" size={32} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      {/* QR Code Modal */}
      {showQR && gym.qr_code && (
  <View style={styles.qrModal}>
    <View style={styles.qrModalContent}>
      <TouchableOpacity style={styles.closeButton} onPress={() => setShowQR(false)}>
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Gym Branded QR Card */}
      <View
        ref={qrCardRef}
        style={styles.qrCardContainer}
        collapsable={false}
      >
        <Text style={styles.qrCardTitle}>{gym.name}</Text>
        <View style={styles.qrCardFrame}>
          <Image
            source={{ uri: `data:image/png;base64,${gym.qr_code}` }}
            style={styles.qrImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.qrCardSubtitle}>Scan to Check-In</Text>
        <Text style={styles.qrCardDate}>
          Generated on: {new Date().toLocaleDateString()}
        </Text>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={async () => {
          try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== "granted") {
              Alert.alert("Permission Denied", "Cannot save without permission.");
              return;
            }

            const uri = await captureRef(qrCardRef, {
              format: "jpg",
              quality: 1,
            });

            await MediaLibrary.saveToLibraryAsync(uri);
            Alert.alert("Saved ✅", "QR poster saved to your gallery!");
          } catch (error) {
            console.error("Save QR error:", error);
            Alert.alert("Error", "Failed to save QR poster.");
          }
        }}
      >
        <Ionicons name="download-outline" size={20} color="#fff" />
        <Text style={styles.saveButtonText}>Save Gym QR Poster</Text>
      </TouchableOpacity>
    </View>
  </View>
)}


      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#FF6B35" />
          <Text style={styles.statValue}>{gym.stats?.total_members || 0}</Text>
          <Text style={styles.statLabel}>Total Members</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{gym.stats?.active_members || 0}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color="#2196F3" />
          <Text style={styles.statValue}>{gym.stats?.today_attendance || 0}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/manager/members')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="person-add" size={24} color="#FF6B35" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Add Member</Text>
            <Text style={styles.actionDescription}>Register a new member</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/manager/attendance')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="stats-chart" size={24} color="#FF6B35" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>View Attendance</Text>
            <Text style={styles.actionDescription}>Check attendance stats</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 32,
  },
  registerButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 32,
  },
  greeting: {
    fontSize: 14,
    color: '#999',
  },
  gymName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  qrButton: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  quickActions: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  qrModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1000,
  },
  qrModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#333',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
    textAlign: 'center',
  },
  qrImageContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  qrGymName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B35',
    marginBottom: 8,
  },
  qrInstruction: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
qrCardContainer: {
  backgroundColor: "#fff",
  borderRadius: 20,
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  width: 280,
  elevation: 5,
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
},
qrCardTitle: {
  fontSize: 20,
  fontWeight: "bold",
  color: "#FF6B35",
  marginBottom: 12,
},
qrCardFrame: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 10,
  borderWidth: 2,
  borderColor: "#FF6B35",
},
qrImage: {
  width: 200,
  height: 200,
},
qrCardSubtitle: {
  marginTop: 10,
  fontSize: 14,
  color: "#333",
  fontWeight: "600",
},
qrCardDate: {
  marginTop: 6,
  fontSize: 12,
  color: "#666",
},
saveButton: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#FF6B35",
  borderRadius: 10,
  paddingVertical: 12,
  paddingHorizontal: 18,
  marginTop: 20,
},
saveButtonText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "600",
  marginLeft: 8,
},


});
