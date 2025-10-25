import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authAPI } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, setSessionToken } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Small fade animation for header text
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      const { session_token, user } = response.data;

      await SecureStore.setItemAsync('session_token', session_token);
      await setSessionToken(session_token);
      setUser(user);

      if (user.role === 'head_admin') router.replace('/admin');
      else if (user.role === 'gym_manager') router.replace('/manager');
      else if (user.role === 'trainee') router.replace('/trainee');
      else if (user.role === 'trainer') router.replace('/trainer');
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <Ionicons name="fitness" size={82} color="#FF6B35" />
          <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
            FitDesert
          </Animated.Text>
          <Text style={styles.subtitle}>Train • Track • Transform</Text>
        </View>

        {/* FORM SECTION */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color="#FF6B35" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#FF6B35" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#FF6B35"
                style={styles.eyeIcon}
              />
            </TouchableOpacity>
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => Alert.alert('Coming Soon', 'Password reset feature coming soon!')}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && { opacity: 0.8 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={styles.loginButtonText}>Login</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Create account */}
          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => Alert.alert('Coming Soon', 'Signup feature coming soon!')}
          >
            <Text style={styles.createAccountText}>
              Don’t have an account? <Text style={{ color: '#FF6B35' }}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

          {/* Security info */}
          <View style={styles.infoContainer}>
            <Ionicons name="shield-checkmark" size={16} color="#777" />
            <Text style={styles.infoText}>Secure access controlled by FitDesert HQ</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: '#aaa',
    marginTop: 6,
    letterSpacing: 0.8,
  },
  form: { width: '100%' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151515',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 16 },
  eyeIcon: { padding: 8 },
  forgotButton: { alignSelf: 'flex-end', marginBottom: 12 },
  forgotText: { color: '#FF6B35', fontSize: 13, fontWeight: '600' },
  loginButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  createAccountButton: { marginTop: 20, alignItems: 'center' },
  createAccountText: { color: '#aaa', fontSize: 14 },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    gap: 8,
  },
  infoText: { color: '#777', fontSize: 12 },
});
