import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { aiAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', message: input, timestamp: new Date() };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await aiAPI.chat({ message: input });
      const aiMessage = { role: 'assistant', message: response.data.response, timestamp: new Date() };
      setMessages((prev) => [...prev, aiMessage]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('AI error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={24} color="#FF6B35" />
        <Text style={styles.headerText}>FitDesert AI</Text>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.chatContainer} contentContainerStyle={styles.chatContent}>
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles" size={60} color="#666" />
            <Text style={styles.emptyText}>Ask me anything about fitness, workouts, or nutrition!</Text>
          </View>
        )}
        {messages.map((msg, index) => (
          <View key={index} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.messageText, msg.role === 'user' ? styles.userText : styles.aiText]}>{msg.message}</Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <ActivityIndicator size="small" color="#FF6B35" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask a question..."
          placeholderTextColor="#666"
          value={input}
          onChangeText={setInput}
          multiline
          maxHeight={100}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={!input.trim() || loading}>
          <Ionicons name="send" size={20} color={input.trim() && !loading ? '#fff' : '#666'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#333', backgroundColor: '#1a1a1a' },
  headerText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  chatContainer: { flex: 1 },
  chatContent: { padding: 16, flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 16, paddingHorizontal: 32 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#FF6B35' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  messageText: { fontSize: 14 },
  userText: { color: '#fff' },
  aiText: { color: '#fff' },
  inputContainer: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#333', alignItems: 'center', gap: 12, backgroundColor: '#0a0a0a' },
  input: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 20, padding: 12, paddingHorizontal: 16, color: '#fff', fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: '#333' },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
});
