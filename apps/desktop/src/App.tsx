import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { QuickCommandBar } from './components/QuickCommandBar';
import { ConfirmationModal } from './components/ConfirmationModal';
import { useLunaStore } from './store/useLunaStore';

// Views
import { HomeView } from './views/HomeView';
import { AskLunaView } from './views/AskLunaView';
import { VoiceAssistantView } from './views/VoiceAssistantView';
import { ChatHistoryView } from './views/ChatHistoryView';
import { MemoryView } from './views/MemoryView';
import { PCControlView } from './views/PCControlView';
import { AndroidDevicesView } from './views/AndroidDevicesView';
import { AutomationView } from './views/AutomationView';
import { VisionView } from './views/VisionView';
import { SystemMonitorView } from './views/SystemMonitorView';
import { SettingsView } from './views/SettingsView';

export const App: React.FC = () => {
  const { activeView, fetchSystemHealth } = useLunaStore();

  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 5000);
    return () => clearInterval(interval);
  }, [fetchSystemHealth]);

  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView />;
      case 'chat':
        return <AskLunaView />;
      case 'voice':
        return <VoiceAssistantView />;
      case 'history':
        return <ChatHistoryView />;
      case 'memory':
        return <MemoryView />;
      case 'pc-control':
        return <PCControlView />;
      case 'devices':
        return <AndroidDevicesView />;
      case 'automation':
        return <AutomationView />;
      case 'vision':
        return <VisionView />;
      case 'system':
        return <SystemMonitorView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-luna-bg select-none">
      {/* Top HUD Header */}
      <Header />

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Center Stage */}
        <main className="flex-1 flex flex-col bg-luna-bg/50 overflow-hidden relative">
          {renderActiveView()}
          <QuickCommandBar />
        </main>
      </div>

      {/* Sensitive Action Challenge Modal */}
      <ConfirmationModal />
    </div>
  );
};
