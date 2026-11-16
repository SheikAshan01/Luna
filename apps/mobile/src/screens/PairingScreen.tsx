import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { QrCode, ShieldCheck, Wifi, Trash2 } from 'lucide-react-native';
import { MobileAPI } from '../services/api';
import { MobileStorage } from '../services/storage';

export const PairingScreen: React.FC = () => {
  const [serverUrl, setServerUrl] = useState('http://192.168.31.113:8000');
  const [pairingCode, setPairingCode] = useState('');
  const [pairedToken, setPairedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const url = await MobileStorage.getServerUrl();
    const token = await MobileStorage.getAuthToken();
    setServerUrl(url || 'http://192.168.31.113:8000');
    setPairedToken(token);
  };

  const handlePair = async () => {
    if (!pairingCode.trim()) {
      Alert.alert('Required', 'Please enter the 6-digit pairing code shown on your PC.');
      return;
    }

    setLoading(true);
    try {
      await MobileStorage.setServerUrl(serverUrl.trim());
      const devName = Platform.OS === 'ios' ? 'Apple iPhone' : 'Android Device';
      const res = await MobileAPI.pairWithPC(pairingCode.trim(), devName);
      setPairedToken(res.token);
      Alert.alert('Success', `Device paired successfully as '${res.deviceName}'!`);
      setPairingCode('');
    } catch (e: any) {
      Alert.alert('Pairing Failed', e.message || 'Unable to connect to PC.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnpair = async () => {
    await MobileStorage.clearAuthToken();
    setPairedToken(null);
    Alert.alert('Unpaired', 'Mobile authorization token removed.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SECURE DEVICE PAIRING</Text>
        <Text style={styles.subTitle}>Cryptographic Handshake with Windows Workstation</Text>
      </View>

      {pairedToken ? (
        <View style={styles.pairedBox}>
          <ShieldCheck size={36} color="#00E676" />
          <Text style={styles.pairedTitle}>DEVICE CURRENTLY PAIRED</Text>
          <Text style={styles.pairedDesc}>
            Your phone is authorized to securely transmit voice commands and PC actions.
          </Text>
          <TouchableOpacity style={styles.unpairBtn} onPress={handleUnpair}>
            <Trash2 size={16} color="#FF3366" />
            <Text style={styles.unpairText}>Unpair & Revoke Token</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>PC Server URL / LAN IP Address</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="e.g. http://192.168.1.50:8000"
              placeholderTextColor="#91A0B7"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>One-Time Pairing Code (from PC Screen)</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={pairingCode}
              onChangeText={setPairingCode}
              placeholder="e.g. LN-784-291"
              placeholderTextColor="#91A0B7"
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={styles.pairBtn}
            onPress={handlePair}
            disabled={loading}
          >
            <Text style={styles.pairBtnText}>
              {loading ? 'AUTHENTICATING...' : 'AUTHORIZE PAIRING'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070B14', padding: 18 },
  header: { marginBottom: 20 },
  title: { color: '#F4F8FF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
  subTitle: { color: '#91A0B7', fontSize: 11, marginTop: 4 },
  formCard: {
    backgroundColor: '#0D1422',
    borderWidth: 1,
    borderColor: '#1B2A4A',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  field: { gap: 6 },
  label: { color: '#91A0B7', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  input: {
    backgroundColor: '#070B14',
    borderWidth: 1,
    borderColor: '#1B2A4A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F4F8FF',
    fontSize: 13,
  },
  codeInput: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
    color: '#00CFFF',
    textAlign: 'center',
  },
  pairBtn: {
    backgroundColor: '#00CFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  pairBtnText: { color: '#070B14', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  pairedBox: {
    backgroundColor: '#0D1422',
    borderWidth: 1,
    borderColor: '#00E676',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  pairedTitle: { color: '#00E676', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  pairedDesc: { color: '#91A0B7', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  unpairBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    borderWidth: 1,
    borderColor: '#FF3366',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  unpairText: { color: '#FF3366', fontSize: 12, fontWeight: 'bold' },
});
