import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { gymAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function CreateGymScreen() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !city || !state || !email || !ownerEmail || !tempPassword) {
      Alert.alert('Error', 'Please fill all required fields including password');
      return;
    }

    setLoading(true);
    try {
      await gymAPI.createByAdmin({ name, address: address || 'N/A', city, state, phone: phone || '0000000000', email }, ownerEmail, tempPassword);
      Alert.alert(
        'Gym Created Successfully!', 
        `Gym Manager Credentials:\n\nEmail: ${ownerEmail}\nPassword: ${tempPassword}\n\nShare these credentials with the gym manager.`,
        [{ text: 'OK', onPress: () => {
          setName(''); setAddress(''); setCity(''); setState(''); setPhone(''); setEmail(''); setOwnerEmail(''); setTempPassword('');
        }}]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create gym');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="business" size={48} color="#FF6B35" />
          <Text style={styles.title}>Create New Gym</Text>
        </View>

        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Gym Name *" placeholderTextColor="#666" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Address" placeholderTextColor="#666" value={address} onChangeText={setAddress} />
          <TextInput style={styles.input} placeholder="City *" placeholderTextColor="#666" value={city} onChangeText={setCity} />
          <TextInput style={styles.input} placeholder="State *" placeholderTextColor="#666" value={state} onChangeText={setState} />
          <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#666" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Gym Email *" placeholderTextColor="#666" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Gym Manager Account</Text>
          
          <TextInput style={styles.input} placeholder="Manager Email *" placeholderTextColor="#666" value={ownerEmail} onChangeText={setOwnerEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Temporary Password *" placeholderTextColor="#666" value={tempPassword} onChangeText={setTempPassword} secureTextEntry />

          <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Gym</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 24, paddingTop: 32 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  form: { gap: 16 },
  input: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#333' },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FF6B35', marginBottom: 16 },
  button: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
