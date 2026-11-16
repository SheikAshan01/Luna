import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Cpu, Zap, Battery, Monitor, Mic, Code, Lock } from 'lucide-react-native';
import { MobileLunaOrb } from '../components/MobileLunaOrb';
import { MobileAPI } from '../services/api';

interface Props {
  onNavigateToVoice: () => void;
  onNavigateToPCHub: () => void;
}

export const DashboardScreen: React.FC<Props> = ({ onNavigateToVoice, onNavigateToPCHub }) => {
  const [pcHealth, setPcHealth] = useState<any>(null);
  const [state, setState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

  useEffect(() => {
    fetchHealth();
    const timer = setInterval(fetchHealth, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchHealth = async () => {
    try {
      const data = await MobileAPI.getPCHalth();
      setPcHealth(data);
    } catch {
      // offline or not paired
    }
  };

  const handleQuickCommand = async (cmd: string) => {
    setState('thinking');
    try {
      await MobileAPI.sendChatMessage(cmd, 'ta-IN');
      setState('speaking');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('idle');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>LUNA MOBILE</Text>
          <Text style={styles.subTitle}>Personal Intelligent Assistant</Text>
        </View>
        <View style={styles.onlineBadge}>
          <View style={styles.dot} />
          <Text style={styles.onlineText}>{pcHealth ? 'PC CONNECTED' : 'STANDBY'}</Text>
        </View>
      </View>

      {/* Central Animated Orb */}
      <View style={styles.orbWrapper}>
        <MobileLunaOrb
          state={state}
          size={210}
          onPress={onNavigateToVoice}
        />
        <Text style={styles.tapPrompt}>Tap Orb or Hold Mic to Speak in Tamil</Text>
      </View>

      {/* Connected PC Telemetry HUD */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onNavigateToPCHub}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Monitor size={18} color="#00CFFF" />
          <Text style={styles.cardTitle}>WINDOWS PC METRICS</Text>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Cpu size={14} color="#00CFFF" />
            <Text style={styles.metricVal}>{pcHealth?.cpuUsagePercent ?? '--'}%</Text>
            <Text style={styles.metricLabel}>CPU</Text>
          </View>
          <View style={styles.metricItem}>
            <Zap size={14} color="#367BFF" />
            <Text style={styles.metricVal}>{pcHealth?.memoryUsagePercent ?? '--'}%</Text>
            <Text style={styles.metricLabel}>RAM</Text>
          </View>
          <View style={styles.metricItem}>
            <Battery size={14} color="#00E676" />
            <Text style={styles.metricVal}>
              {pcHealth?.batteryPercent !== null && pcHealth?.batteryPercent !== undefined
                ? `${pcHealth.batteryPercent}%`
                : 'AC'}
            </Text>
            <Text style={styles.metricLabel}>POWER</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Remote Quick Commands */}
      <View style={styles.quickSection}>
        <Text style={styles.sectionTitle}>QUICK REMOTE COMMANDS</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => handleQuickCommand('Luna, VS Code open pannu')}
          >
            <Code size={16} color="#00CFFF" />
            <Text style={styles.quickBtnText}>Open VS Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => handleQuickCommand('Luna, PC battery status sollu')}
          >
            <Battery size={16} color="#00E676" />
            <Text style={styles.quickBtnText}>Battery Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => handleQuickCommand('Luna, lock PC')}
          >
            <Lock size={16} color="#FFB020" />
            <Text style={styles.quickBtnText}>Lock Workstation</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070B14' },
  content: { padding: 18, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  brandTitle: { color: '#F4F8FF', fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
  subTitle: { color: '#91A0B7', fontSize: 11, marginTop: 2 },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#0D1422',
    borderWidth: 1,
    borderColor: '#1B2A4A',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00CFFF', marginRight: 6 },
  onlineText: { color: '#00CFFF', fontSize: 9, fontWeight: '700' },
  orbWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#0D1422',
    borderWidth: 1,
    borderColor: '#1B2A4A',
  },
  tapPrompt: { color: '#91A0B7', fontSize: 11, marginTop: 12 },
  card: {
    backgroundColor: '#0D1422',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1B2A4A',
    marginBottom: 20,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { color: '#F4F8FF', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  metricItem: { alignItems: 'center', gap: 4 },
  metricVal: { color: '#F4F8FF', fontSize: 18, fontWeight: 'bold' },
  metricLabel: { color: '#91A0B7', fontSize: 9, fontWeight: '600' },
  quickSection: { marginTop: 4 },
  sectionTitle: { color: '#91A0B7', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  quickGrid: { gap: 10 },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0D1422',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1B2A4A',
  },
  quickBtnText: { color: '#F4F8FF', fontSize: 13, fontWeight: '600' },
});
