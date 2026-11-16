import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Home, MessageSquare, Monitor, QrCode, Brain } from 'lucide-react-native';

import { DashboardScreen } from './screens/DashboardScreen';
import { VoiceChatScreen } from './screens/VoiceChatScreen';
import { PCHubScreen } from './screens/PCHubScreen';
import { PairingScreen } from './screens/PairingScreen';
import { MemoryScreen } from './screens/MemoryScreen';

type Tab = 'dashboard' | 'chat' | 'pc-hub' | 'pairing' | 'memory';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardScreen
            onNavigateToVoice={() => setActiveTab('chat')}
            onNavigateToPCHub={() => setActiveTab('pc-hub')}
          />
        );
      case 'chat':
        return <VoiceChatScreen />;
      case 'pc-hub':
        return <PCHubScreen />;
      case 'pairing':
        return <PairingScreen />;
      case 'memory':
        return <MemoryScreen />;
      default:
        return <DashboardScreen onNavigateToVoice={() => setActiveTab('chat')} onNavigateToPCHub={() => setActiveTab('pc-hub')} />;
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'chat', label: 'Luna Chat', icon: MessageSquare },
    { id: 'pc-hub', label: 'PC Hub', icon: Monitor },
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'pairing', label: 'Pairing', icon: QrCode },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Active Screen Stage */}
        <View style={styles.contentStage}>{renderScreen()}</View>

        {/* Bottom Holographic Tab Bar */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Icon size={18} color={isActive ? '#00CFFF' : '#91A0B7'} />
                <Text style={[styles.tabLabel, { color: isActive ? '#00CFFF' : '#91A0B7' }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070B14' },
  container: { flex: 1, backgroundColor: '#070B14' },
  contentStage: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#0D1422',
    borderTopWidth: 1,
    borderColor: '#1B2A4A',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
