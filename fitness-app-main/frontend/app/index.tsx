import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Navigate based on role
      if (user.role === 'head_admin') {
        router.replace('/admin');
      } else if (user.role === 'gym_manager') {
        router.replace('/manager');
      } else if (user.role === 'trainee') {
        router.replace('/trainee');
      } else if (user.role === 'trainer') {
        router.replace('/trainer');
      }
    }
  }, [isAuthenticated, user, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="fitness" size={120} color="#FF6B35" />
        <Text style={styles.title}>FitDesert</Text>
        <Text style={styles.subtitle}>Train. Track. Transform.</Text>
        <Text style={styles.description}>
          A unified fitness ecosystem for gym management, trainers, and trainees
        </Text>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#FF6B35" />
            <Text style={styles.infoText}>
              Contact your gym administrator for login credentials
            </Text>
          </View>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="barcode" size={24} color="#FF6B35" />
            <Text style={styles.featureText}>QR Attendance</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="fitness-outline" size={24} color="#FF6B35" />
            <Text style={styles.featureText}>Workout Plans</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="nutrition" size={24} color="#FF6B35" />
            <Text style={styles.featureText}>Diet Tracking</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="sparkles" size={24} color="#FF6B35" />
            <Text style={styles.featureText}>AI Assistant</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 18,
    color: '#FF6B35',
    marginTop: 8,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 32,
  },
  buttonsContainer: {
    width: '100%',
    marginTop: 48,
    gap: 16,
  },
  loginButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 48,
    gap: 24,
  },
  feature: {
    alignItems: 'center',
    width: 80,
  },
  featureText: {
    color: '#999',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});
