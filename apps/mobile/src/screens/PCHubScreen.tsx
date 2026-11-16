import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Code, Globe, FileText, Lock, Battery, Power, ShieldAlert, CheckCircle2 } from 'lucide-react-native';
import { MobileAPI } from '../services/api';

export const PCHubScreen: React.FC = () => {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExecute = async (actionId: string, params: Record<string, any> = {}) => {
    setLoading(true);
    setStatus(`Dispatching ${actionId}...`);
    try {
      const res = await MobileAPI.executePCAction(actionId, params);
      if (res.confirmationRequired) {
        Alert.alert(
          'Security Authorization Required',
          res.message || 'This sensitive command requires confirmation.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Confirm & Authorize',
              style: 'destructive',
              onPress: async () => {
                const confRes = await MobileAPI.executePCAction(actionId, params, res.confirmationToken);
                setStatus(confRes.success ? 'Action executed on Windows PC.' : `Error: ${confRes.error}`);
              },
            },
          ]
        );
      } else if (res.success) {
        setStatus(`Success: ${actionId} executed.`);
      } else {
        setStatus(`Error: ${res.error}`);
      }
    } catch (e: any) {
      setStatus(`Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const remoteActions = [
    { id: 'app.open', params: { app_name: 'code' }, title: 'Launch VS Code', icon: Code, color: '#00CFFF' },
    { id: 'app.open', params: { app_name: 'chrome' }, title: 'Launch Chrome Browser', icon: Globe, color: '#367BFF' },
    { id: 'app.open', params: { app_name: 'notepad' }, title: 'Open Notepad', icon: FileText, color: '#00E676' },
    { id: 'system.get_battery', params: {}, title: 'Check PC Battery', icon: Battery, color: '#FFB020' },
    { id: 'pc.lock', params: {}, title: 'Lock Workstation', icon: Lock, color: '#C04BF7' },
    { id: 'pc.shutdown', params: { delay_seconds: 60 }, title: 'Shutdown PC (Safe)', icon: Power, color: '#FF3366' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>REMOTE PC AGENT CONTROL</Text>
        <Text style={styles.subTitle}>
          Authenticated Device-to-PC Command Dispatching
        </Text>
      </View>

      {status && (
        <View style={styles.statusBanner}>
          <CheckCircle2 size={14} color="#00CFFF" />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      )}

      <View style={styles.actionsGrid}>
        {remoteActions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              style={styles.actionCard}
              onPress={() => handleExecute(action.id, action.params)}
              disabled={loading}
            >
              <View style={[styles.iconWrapper, { backgroundColor: `${action.color}20` }]}>
                <Icon size={20} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070B14' },
  content: { padding: 18, paddingBottom: 40 },
  header: { marginBottom: 18 },
  title: { color: '#F4F8FF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
  subTitle: { color: '#91A0B7', fontSize: 11, marginTop: 4 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D223F',
    borderWidth: 1,
    borderColor: '#00CFFF',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: { color: '#00CFFF', fontSize: 11, fontWeight: '600' },
  actionsGrid: { gap: 12 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#0D1422',
    borderWidth: 1,
    borderColor: '#1B2A4A',
    borderRadius: 16,
    padding: 16,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { color: '#F4F8FF', fontSize: 14, fontWeight: '600' },
});
