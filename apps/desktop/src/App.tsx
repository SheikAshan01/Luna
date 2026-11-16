import React, { useEffect } from 'react';
import { HomeView } from './views/HomeView';
import { useLunaStore } from './store/useLunaStore';

export const App: React.FC = () => {
  const { fetchSystemHealth } = useLunaStore();

  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchSystemHealth]);

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-[#02040a] select-none relative flex flex-col">
      <HomeView />
    </div>
  );
};
