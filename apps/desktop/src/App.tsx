import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ConfirmationModal } from './components/ConfirmationModal';
import { useLunaStore } from './store/useLunaStore';

// Views
import { HomeView } from './views/HomeView';
import { MemoryView } from './views/MemoryView';
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
      case 'memory':
        return <MemoryView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-luna-bg select-none">
      {/* Top HUD Header */}
      <Header />

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar (Desktop) */}
        <Sidebar />

        {/* Dynamic Center Stage */}
        <main className="flex-1 flex flex-col bg-luna-bg/50 overflow-hidden relative">
          {renderActiveView()}
        </main>
      </div>

      {/* Bottom Navigation (Mobile iOS & Android) */}
      <MobileBottomNav />

      {/* Confirmation Dialog for Sensitive Actions */}
      <ConfirmationModal />
    </div>
  );
};
