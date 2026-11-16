import React from 'react';
import { Mic, Brain, Settings } from 'lucide-react';
import { useLunaStore, ActiveView } from '../store/useLunaStore';

export const MobileBottomNav: React.FC = () => {
  const { activeView, setActiveView } = useLunaStore();

  const navItems: { id: ActiveView; label: string; icon: any; color: string }[] = [
    { id: 'home', label: 'Voice HUD', icon: Mic, color: '#00F5FF' },
    { id: 'memory', label: 'Memory', icon: Brain, color: '#A855F7' },
    { id: 'settings', label: 'Settings', icon: Settings, color: '#10B981' },
  ];

  return (
    <nav className="md:hidden flex items-center justify-around bg-[#060812]/95 backdrop-blur-2xl border-t border-white/10 px-4 py-2 z-50 select-none pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition-all duration-200 relative ${
              isActive
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-cyan-500/20 shadow-[0_0_12px_rgba(0,245,255,0.4)] border border-cyan-400/40'
                  : ''
              }`}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: isActive ? item.color : undefined }}
              />
            </div>
            <span className="text-[10px] font-orbitron tracking-wider mt-0.5">
              {item.label}
            </span>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#00F5FF] mt-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
