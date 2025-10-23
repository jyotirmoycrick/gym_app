import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { memberAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function MembersScreen() {
  const [showForm, setShowForm] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [membershipPlan, setMembershipPlan] = useState('Monthly');
  const [duration, setDuration] = useState('1');
  const [goal, setGoal] = useState('');
  const [role, setRole] = useState<'trainee' | 'trainer'>('trainee');

  const loadMembers = async () => {
  try {
    const [membersRes, trainersRes] = await Promise.all([
      memberAPI.getAllMembers(),
      memberAPI.getAllTrainers(),
    ]);

    const allMembers = membersRes.data || [];
    const allTrainers = trainersRes.data || [];

    // Merge trainer name for assigned trainees
    const merged = allMembers.map((m: any) => {
      if (m.assigned_trainer_id) {
  const trainer = allTrainers.find(
    (t: any) =>
      t.user_id === m.assigned_trainer_id ||
      t.id === m.assigned_trainer_id ||
      t._id === m.assigned_trainer_id
  );
  if (trainer) {
    m.assigned_trainer_name = trainer.user_name || trainer.name;
  }
}

      return m;
    });

    setMembers(merged);
    setTrainers(allTrainers);
  } catch (error) {
    console.error('Failed to load members:', error);
    Alert.alert('Error', 'Failed to load members');
  }
};


  useEffect(() => {
    loadMembers();
  }, []);

  const handleAssignTrainer = async () => {
    if (!selectedTrainer) {
      Alert.alert('Error', 'Please select a trainer');
      return;
    }

    setLoading(true);
    try {
      await memberAPI.assignTrainer(selectedMember.id, selectedTrainer);
      Alert.alert('Success', 'Trainer assigned successfully!');
      setShowAssignModal(false);
      setSelectedMember(null);
      setSelectedTrainer(null);
      await loadMembers();
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        'Error',
        error?.response?.data?.detail || error.message || 'Failed to assign trainer'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await memberAPI.addMember({
        name,
        email,
        phone,
        password,
        membership_plan: membershipPlan,
        plan_duration_months: parseInt(duration, 10),
        goal,
        is_trainer: role === 'trainer',
      });
      Alert.alert(
        'Success',
        `${role === 'trainee' ? 'Member' : 'Trainer'} added successfully!\n\nCredentials:\nEmail: ${email}\nPassword: ${password}`
      );
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setGoal('');
      setDuration('1');
      setShowForm(false);
      await loadMembers();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Delete Member',
      `Are you sure you want to delete ${memberName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await memberAPI.deleteMember(memberId);
              Alert.alert('Success', 'Deleted successfully');
              await loadMembers();
            } catch (error: any) {
              console.error(error);
              Alert.alert('Error', error?.response?.data?.detail || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  if (showForm) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.form}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>
              Add New {role === 'trainee' ? 'Member' : 'Trainer'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'trainee' && styles.roleActive]}
              onPress={() => setRole('trainee')}
            >
              <Text
                style={[styles.roleText, role === 'trainee' && styles.roleTextActive]}
              >
                Trainee
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'trainer' && styles.roleActive]}
              onPress={() => setRole('trainer')}
            >
              <Text
                style={[styles.roleText, role === 'trainer' && styles.roleTextActive]}
              >
                Trainer
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Full Name *"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email *"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone *"
            placeholderTextColor="#666"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Password *"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {role === 'trainee' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Membership Plan"
                placeholderTextColor="#666"
                value={membershipPlan}
                onChangeText={setMembershipPlan}
              />
              <TextInput
                style={styles.input}
                placeholder="Duration (months)"
                placeholderTextColor="#666"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Goal (optional)"
                placeholderTextColor="#666"
                value={goal}
                onChangeText={setGoal}
              />
            </>
          )}

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAddMember}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                Add {role === 'trainee' ? 'Member' : 'Trainer'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Members & Trainers</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {members.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={60} color="#666" />
            <Text style={styles.emptyText}>No members yet</Text>
          </View>
        ) : (
          members.map((member) => {
  const memberId = member.id || member._id;
  const isTrainer = member.role === 'trainer' || member.is_trainer === true;

  return (
    <View key={memberId} style={styles.memberCard}>
      <View style={styles.memberMainInfo}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {member.user_name || member.name}
          </Text>
          <Text style={styles.memberEmail}>
            {member.user_email || member.email}
          </Text>
          {isTrainer ? (
            <Text style={styles.trainerTag}>Trainer</Text>
          ) : (
            <>
              <Text style={styles.memberPlan}>
                Plan: {member.membership_plan}
              </Text>
              {member.assigned_trainer_name && (
                <Text style={styles.assignedTrainer}>
                  Trainer: {member.assigned_trainer_name}
                </Text>
              )}
            </>
          )}
        </View>
        <View
          style={[
            styles.statusBadge,
            member.status === 'active' && styles.statusActive,
          ]}
        >
          <Text style={styles.statusText}>
            {member.status || 'active'}
          </Text>
        </View>
      </View>

      {/* Actions inside the same card */}
      <View style={styles.memberActions}>
        {!isTrainer && (
          <TouchableOpacity
            style={[styles.actionBtn, { marginRight: 8 }]}
            onPress={() => {
              setSelectedMember(member);
              setShowAssignModal(true);
            }}
          >
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Assign</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() =>
            handleDeleteMember(memberId, member.user_name || member.name)
          }
        >
          <Ionicons name="trash" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View> // ✅ this closes the memberCard
  );
})

        )}
      </ScrollView>

      {/* Assign Modal */}
      {showAssignModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.assignModal}>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowAssignModal(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Assign Trainer</Text>
            <Text style={styles.modalSubtitle}>
              To: {selectedMember?.user_name || selectedMember?.name}
            </Text>

            <ScrollView style={styles.trainerList}>
              {trainers.length > 0 ? (
                trainers.map((trainer) => {
                  const tId = trainer.id || trainer.user_id;
                  return (
                    <TouchableOpacity
                      key={tId}
                      style={[
                        styles.trainerOption,
                        selectedTrainer === tId && styles.trainerSelected,
                      ]}
                      onPress={() => setSelectedTrainer(tId)}
                    >
                      <Ionicons
                        name={
                          selectedTrainer === tId
                            ? 'radio-button-on'
                            : 'radio-button-off'
                        }
                        size={24}
                        color={
                          selectedTrainer === tId ? '#FF6B35' : '#666'
                        }
                      />
                      <View style={styles.trainerInfo}>
                        <Text style={styles.trainerName}>
                          {trainer.user_name || trainer.name}
                        </Text>
                        <Text style={styles.trainerEmail}>
                          {trainer.user_email || trainer.email}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.noTrainersText}>
                  No trainers available. Add one first.
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.assignButton}
              onPress={handleAssignTrainer}
              disabled={!selectedTrainer || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.assignButtonText}>Assign Trainer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 32,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  addButton: {
    backgroundColor: '#FF6B35',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: '#666', marginTop: 12 },
  memberCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  memberMainInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  memberEmail: { fontSize: 12, color: '#999', marginTop: 4 },
  memberPlan: { fontSize: 12, color: '#FF6B35', marginTop: 4 },
  trainerTag: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '600',
  },
  assignedTrainer: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '600',
  },
  memberActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 6 },
  deleteBtn: { backgroundColor: '#dc3545' },
  statusBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: { backgroundColor: 'rgba(76,175,80,0.2)' },
  statusText: { color: '#4CAF50', fontSize: 12, fontWeight: '600' },
  form: { padding: 24, paddingTop: 16 },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  roleSelector: { flexDirection: 'row', marginBottom: 24 },
  roleButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  roleActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  roleText: { color: '#666', fontSize: 14, fontWeight: '600' },
  roleTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  assignModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  closeModalBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#999', marginBottom: 24 },
  trainerList: { maxHeight: 300, marginBottom: 24 },
  trainerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  trainerSelected: { borderColor: '#FF6B35', backgroundColor: 'rgba(255, 107, 53, 0.1)' },
  trainerInfo: { flex: 1, marginLeft: 12 },
  trainerName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  trainerEmail: { fontSize: 12, color: '#999', marginTop: 4 },
  noTrainersText: { fontSize: 14, color: '#666', textAlign: 'center', padding: 32 },
  assignButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  assignButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

