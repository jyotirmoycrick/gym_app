import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{ tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#333' }, tabBarActiveTintColor: '#FF6B35', tabBarInactiveTintColor: '#666', headerStyle: { backgroundColor: '#1a1a1a' }, headerTintColor: '#fff' }}>
      <Tabs.Screen name="index" options={{ title: 'Gyms', tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} /> }} />
      <Tabs.Screen name="create-gym" options={{ title: 'Create Gym', tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}
