import React, { useState } from 'react';
import {
  Mic,
  Monitor,
  Settings,
  ChevronDown,
  ChevronUp,
  Brain,
  History,
  Smartphone,
  Eye,
  CalendarCheck,
  Radio,
  Zap,
} from 'lucide-react';
import { useLunaStore, ActiveView } from '../store/useLunaStore';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView } = useLunaStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Essential Primary JARVIS Screens
  const essentialNav: { id: ActiveView; label: string; icon: any; color: string }[] = [
    { id: 'home', label: 'Quantum Voice HUD', icon: Mic, color: '#00F5FF' },
    { id: 'pc-control', label: 'PC & Workspaces', icon: Monitor, color: '#A855F7' },
    { id: 'settings', label: 'Configuration & AI', icon: Settings, color: '#10B981' },
  ];

  // Secondary Tools (Hidden in collapsible menu)
  const secondaryNav: { id: ActiveView; label: string; icon: any }[] = [
    { id: 'memory', label: 'Memory Bank', icon: Brain },
    { id: 'history', label: 'History Logs', icon: History },
    { id: 'devices', label: 'Android Sync', icon: Smartphone },
    { id: 'vision', label: 'Vision Analyzer', icon: Eye },
    { id: 'automation', label: 'Automation', icon: CalendarCheck },
  ];

  return (
    <aside className="w-56 border-r border-white/10 bg-[#060812]/80 backdrop-blur-2xl flex flex-col justify-between py-4 select-none z-40">
      <div className="flex flex-col gap-2 px-3">
        <div className="px-3 py-1 text-[10px] font-orbitron font-extrabold tracking-[0.2em] text-cyan-400/70 uppercase flex items-center justify-between">
          <span>HUD Interface</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
        </div>

        {/* Primary Essential Navigation */}
        <div className="space-y-1.5">
          {essentialNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-orbitron font-bold transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 via-purple-500/15 to-transparent text-white border border-cyan-400/50 shadow-[0_0_20px_rgba(0,245,255,0.25)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-cyan-400 drop-shadow-[0_0_8px_#00F5FF]' : 'text-slate-400'
                  }`}
                />
                <span className="tracking-wider">{item.label}</span>
                {isActive && (
                  <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00F5FF]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Collapsible Secondary Tools */}
        <div className="mt-4 pt-3 border-t border-white/5">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-orbitron font-bold tracking-wider text-slate-400 hover:text-white transition-colors"
          >
            <span>ADVANCED UTILITIES</span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {showAdvanced && (
            <div className="space-y-1 mt-1 pl-1 animate-fadeIn">
              {secondaryNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-rajdhani font-semibold transition-all ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Telemetry Chip */}
      <div className="px-3">
        <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shadow-[0_0_8px_#00F5FF]" />
            <div>
              <div className="text-[10px] font-orbitron font-bold text-white tracking-wider">
                LUNA AI CORE
              </div>
              <div className="text-[9px] font-mono text-cyan-400">ONLINE • STANDBY</div>
            </div>
          </div>
          <Zap className="w-3.5 h-3.5 text-purple-400" />
        </div>
      </div>
    </aside>
  );
};
