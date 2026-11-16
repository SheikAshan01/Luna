import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Brain, RefreshCw, Tag } from 'lucide-react-native';
import { MobileAPI } from '../services/api';

export const MemoryScreen: React.FC = () => {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const data = await MobileAPI.listMemories();
      setMemories(data);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>PERSISTENT MEMORY</Text>
          <Text style={styles.subTitle}>Synchronized User Context & Facts</Text>
        </View>
        <TouchableOpacity onPress={fetchMemories} style={styles.refreshBtn}>
          <RefreshCw size={14} color="#00CFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Fetching memories from PC...</Text>
      ) : memories.length === 0 ? (
        <Text style={styles.emptyText}>No memories logged yet.</Text>
      ) : (
        <View style={styles.list}>
          {memories.map((m) => (
            <View key={m.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.catBadge}>{m.category}</Text>
              </View>
              <Text style={styles.keyText}>{m.key}</Text>
              <Text style={styles.valText}>{m.value}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070B14' },
  content: { padding: 18, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { color: '#F4F8FF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
  subTitle: { color: '#91A0B7', fontSize: 11, marginTop: 4 },
  refreshBtn: { padding: 8, backgroundColor: '#0D1422', borderRadius: 8, borderWidth: 1, borderColor: '#1B2A4A' },
  loadingText: { color: '#91A0B7', textAlign: 'center', marginVertical: 20 },
  emptyText: { color: '#91A0B7', textAlign: 'center', marginVertical: 20 },
  list: { gap: 12 },
  card: { backgroundColor: '#0D1422', borderWidth: 1, borderColor: '#1B2A4A', borderRadius: 14, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catBadge: { color: '#00CFFF', fontSize: 9, fontWeight: '700', backgroundColor: 'rgba(0,207,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  keyText: { color: '#F4F8FF', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  valText: { color: '#91A0B7', fontSize: 12, lineHeight: 16 },
});
