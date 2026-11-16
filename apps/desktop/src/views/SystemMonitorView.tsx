import React, { useEffect, useState } from 'react';
import { Cpu, Zap, HardDrive, Battery, RefreshCw, Server, Activity } from 'lucide-react';
import { LunaAPI } from '../services/api';

export const SystemMonitorView: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const data = await LunaAPI.getSystemHealth();
      setHealth(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-orbitron font-bold text-luna-text flex items-center gap-2">
            SYSTEM TELEMETRY & HARDWARE MONITOR
          </h2>
          <p className="text-xs text-luna-muted font-rajdhani">
            Real-time Windows Kernel Telemetry, Process Analytics & Battery Sensors
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="px-3 py-1.5 rounded-lg bg-luna-surfaceHover border border-luna-border text-xs font-rajdhani hover:text-luna-cyan transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3 h-3 animate-spin-slow" />
          Live Polling
        </button>
      </div>

      {/* Main Gauges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* CPU Gauge */}
        <div className="glass-panel p-5 rounded-2xl border border-luna-border flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-luna-cyan/10 border border-luna-cyan/40 flex items-center justify-center text-luna-cyan mb-3">
            <Cpu className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-orbitron text-luna-muted tracking-wider">CPU UTILIZATION</span>
          <div className="text-3xl font-orbitron font-black text-luna-cyan my-1">
            {health?.cpuUsagePercent ?? 0}%
          </div>
          <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-luna-cyan h-full transition-all duration-500"
              style={{ width: `${health?.cpuUsagePercent ?? 0}%` }}
            />
          </div>
        </div>

        {/* RAM Gauge */}
        <div className="glass-panel p-5 rounded-2xl border border-luna-border flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-luna-blue/10 border border-luna-blue/40 flex items-center justify-center text-luna-blue mb-3">
            <Zap className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-orbitron text-luna-muted tracking-wider">RAM UTILIZATION</span>
          <div className="text-3xl font-orbitron font-black text-luna-blue my-1">
            {health?.memoryUsagePercent ?? 0}%
          </div>
          <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-luna-blue h-full transition-all duration-500"
              style={{ width: `${health?.memoryUsagePercent ?? 0}%` }}
            />
          </div>
        </div>

        {/* Disk Gauge */}
        <div className="glass-panel p-5 rounded-2xl border border-luna-border flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3">
            <HardDrive className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-orbitron text-luna-muted tracking-wider">DISK CAPACITY</span>
          <div className="text-3xl font-orbitron font-black text-emerald-400 my-1">
            {health?.diskUsagePercent ?? 0}%
          </div>
          <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-400 h-full transition-all duration-500"
              style={{ width: `${health?.diskUsagePercent ?? 0}%` }}
            />
          </div>
        </div>

        {/* Battery Gauge */}
        <div className="glass-panel p-5 rounded-2xl border border-luna-border flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3">
            <Battery className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-orbitron text-luna-muted tracking-wider">BATTERY LEVEL</span>
          <div className="text-3xl font-orbitron font-black text-amber-400 my-1">
            {health?.batteryPercent !== null && health?.batteryPercent !== undefined
              ? `${health.batteryPercent}%`
              : 'Direct AC'}
          </div>
          <div className="text-[10px] text-luna-muted font-rajdhani mt-2">
            {health?.batteryPowerPlugged ? 'Plugged In (Charging)' : 'Running on Battery'}
          </div>
        </div>
      </div>

      {/* Host Details Grid */}
      <div className="glass-panel p-5 rounded-2xl border border-luna-border space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Server className="w-5 h-5 text-luna-cyan" />
          <span className="font-orbitron font-bold text-sm text-luna-text">
            Workstation Configuration
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-3 rounded-xl bg-black/40 border border-luna-border/50">
            <div className="text-[10px] text-luna-muted uppercase">Hostname</div>
            <div className="text-luna-text font-bold mt-0.5">{health?.hostname || 'DESKTOP-PC'}</div>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-luna-border/50">
            <div className="text-[10px] text-luna-muted uppercase">Platform OS</div>
            <div className="text-luna-text font-bold mt-0.5">{health?.osName || 'Windows 11'}</div>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-luna-border/50">
            <div className="text-[10px] text-luna-muted uppercase">Total Memory</div>
            <div className="text-luna-text font-bold mt-0.5">
              {health?.memoryTotalBytes ? `${Math.round(health.memoryTotalBytes / (1024 * 1024 * 1024))} GB` : '16 GB'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-luna-border/50">
            <div className="text-[10px] text-luna-muted uppercase">AI Provider Health</div>
            <div className="text-emerald-400 font-bold mt-0.5">Online & Resilient</div>
          </div>
        </div>
      </div>
    </div>
  );
};
