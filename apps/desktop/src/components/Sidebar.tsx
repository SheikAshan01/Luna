import React from 'react';
import { Mic, Brain, Settings, Zap } from 'lucide-react';
import { useLunaStore, ActiveView } from '../store/useLunaStore';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView } = useLunaStore();

  // Core Essential Navigation (Clutter-free)
  const navItems: { id: ActiveView; label: string; icon: any; color: string }[] = [
    { id: 'home', label: 'Quantum Voice HUD', icon: Mic, color: '#00F5FF' },
    { id: 'memory', label: 'Memory Bank', icon: Brain, color: '#A855F7' },
    { id: 'settings', label: 'Configuration & AI', icon: Settings, color: '#10B981' },
  ];

  return (
    <aside className="hidden md:flex w-60 border-r border-white/10 bg-[#060812]/90 backdrop-blur-2xl flex-col justify-between py-5 select-none z-40 shrink-0">
      <div className="flex flex-col gap-3 px-4">
        <div className="px-3 py-1 text-[10px] font-orbitron font-extrabold tracking-[0.2em] text-cyan-400/70 uppercase flex items-center justify-between">
          <span>LUNA HUD</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
        </div>

        {/* Primary Navigation */}
        <div className="space-y-2 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-orbitron font-bold transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 via-purple-500/15 to-transparent text-white border border-cyan-400/50 shadow-[0_0_20px_rgba(0,245,255,0.25)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-cyan-400 drop-shadow-[0_0_8px_#00F5FF]' : 'text-slate-400'
                  }`}
                  style={{ color: isActive ? item.color : undefined }}
                />
                <span className="tracking-wider">{item.label}</span>
                {isActive && (
                  <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00F5FF]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Telemetry Chip */}
      <div className="px-4">
        <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shadow-[0_0_8px_#00F5FF]" />
            <div>
              <div className="text-[10px] font-orbitron font-bold text-white tracking-wider">
                LUNA QUANTUM CORE
              </div>
              <div className="text-[9px] font-mono text-cyan-400">INSTABOX CLOUD • ONLINE</div>
            </div>
          </div>
          <Zap className="w-4 h-4 text-purple-400" />
        </div>
      </div>
    </aside>
  );
};
