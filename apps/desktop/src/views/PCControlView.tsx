import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Code,
  Globe,
  FileText,
  Calculator,
  Folder,
  Terminal,
  Lock,
  Power,
  RotateCcw,
  Search,
  XCircle,
  Play,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { LunaAPI } from '../services/api';
import { useLunaStore } from '../store/useLunaStore';

export const PCControlView: React.FC = () => {
  const { setPendingConfirmation } = useLunaStore();
  const [processes, setProcesses] = useState<any[]>([]);
  const [loadingProc, setLoadingProc] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const allowlistedApps = [
    { id: 'code', name: 'VS Code', desc: 'Code Editor', icon: Code, color: '#00CFFF' },
    { id: 'chrome', name: 'Google Chrome', desc: 'Web Browser', icon: Globe, color: '#367BFF' },
    { id: 'notepad', name: 'Notepad', desc: 'Text Editor', icon: FileText, color: '#00E676' },
    { id: 'calc', name: 'Calculator', desc: 'Math Utility', icon: Calculator, color: '#FFB020' },
    { id: 'explorer', name: 'File Explorer', desc: 'Disk Files', icon: Folder, color: '#C04BF7' },
    { id: 'wt', name: 'Windows Terminal', desc: 'Command Shell', icon: Terminal, color: '#FF3366' },
  ];

  const fetchProcesses = async () => {
    try {
      setLoadingProc(true);
      const res = await LunaAPI.executeAction('system.get_processes', { limit: 12 });
      if (res.success && res.data?.processes) {
        setProcesses(res.data.processes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProc(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const handleLaunchApp = async (appId: string, argument?: string) => {
    setStatusMsg(`Launching ${appId}...`);
    try {
      const res = await LunaAPI.executeAction('app.open', { app_name: appId, argument });
      if (res.success) {
        setStatusMsg(`Launched ${appId} successfully.`);
      } else {
        setStatusMsg(`Failed: ${res.error}`);
      }
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    }
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleTerminateApp = async (pname: string) => {
    // Intercept with confirmation challenge
    const res = await LunaAPI.executeAction('app.close', { app_name: pname });
    if (res.confirmationRequired) {
      setPendingConfirmation({
        confirmationToken: res.confirmationToken,
        actionId: res.actionId,
        permissionLevel: res.permissionLevel || 'SENSITIVE',
        parameters: res.parameters || { app_name: pname },
        message: `Are you sure you want to terminate process '${pname}'? Unsaved work may be lost.`,
      });
    }
  };

  const handleSystemAction = async (actionId: string) => {
    const res = await LunaAPI.executeAction(actionId, {});
    if (res.confirmationRequired) {
      setPendingConfirmation({
        confirmationToken: res.confirmationToken,
        actionId: res.actionId,
        permissionLevel: res.permissionLevel || 'DESTRUCTIVE',
        parameters: res.parameters || {},
        message: `Critical Action Authorization: You are about to initiate '${actionId}'.`,
      });
    }
  };

  const handleFileSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileSearchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await LunaAPI.executeAction('files.search', { query: fileSearchQuery });
      if (res.success && res.data?.matches) {
        setSearchResults(res.data.matches);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-orbitron font-bold text-luna-text flex items-center gap-2">
            WINDOWS PC AGENT & CONTROL
          </h2>
          <p className="text-xs text-luna-muted font-rajdhani">
            Strictly Guarded Allowlisted Execution & Process Management
          </p>
        </div>
        {statusMsg && (
          <div className="px-3 py-1 rounded-lg bg-luna-cyan/10 border border-luna-cyan text-luna-cyan text-xs font-rajdhani animate-pulse">
            {statusMsg}
          </div>
        )}
      </div>

      {/* Allowlisted Application Launcher */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-orbitron font-semibold text-luna-muted uppercase tracking-wider">
            Allowlisted Applications
          </span>
          <span className="text-[11px] text-emerald-400 font-rajdhani flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Security Guard Enforced
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allowlistedApps.map((app) => {
            const Icon = app.icon;
            return (
              <div
                key={app.id}
                className="glass-panel p-3.5 rounded-xl border border-luna-border/70 flex items-center justify-between group hover:border-luna-cyan/60 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${app.color}20`, color: app.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-orbitron font-semibold text-xs text-luna-text group-hover:text-luna-cyan transition-colors">
                      {app.name}
                    </div>
                    <div className="text-[10px] text-luna-muted font-rajdhani">{app.desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleLaunchApp(app.id)}
                  className="px-2.5 py-1 rounded bg-luna-surfaceHover hover:bg-luna-cyan hover:text-black border border-luna-border text-xs font-orbitron font-semibold text-luna-cyan transition-all flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Launch
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Project Launcher (e.g. MechFind) */}
      <div className="glass-panel p-4 rounded-xl border border-luna-cyan/30 flex items-center justify-between">
        <div>
          <span className="text-xs font-orbitron font-semibold text-luna-cyan">Quick Project Workspace</span>
          <p className="text-xs text-luna-text font-rajdhani mt-0.5">
            Launch VS Code in project folder <code className="text-luna-cyan">c:\projects\MechFind</code>
          </p>
        </div>
        <button
          onClick={() => handleLaunchApp('code', 'c:\\projects\\MechFind')}
          className="px-4 py-1.5 rounded-lg bg-luna-cyan text-black hover:bg-cyan-400 text-xs font-orbitron font-bold transition-all shadow-[0_0_15px_rgba(0,207,255,0.3)] flex items-center gap-1.5"
        >
          <Code className="w-4 h-4" />
          Open MechFind
        </button>
      </div>

      {/* System Power & Lock Controls */}
      <div>
        <span className="text-xs font-orbitron font-semibold text-luna-muted uppercase tracking-wider">
          System Actions
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          <button
            onClick={() => handleSystemAction('pc.lock')}
            className="glass-panel p-3 rounded-xl border border-luna-border hover:border-luna-warning/60 text-left flex items-center gap-3 transition-colors"
          >
            <Lock className="w-5 h-5 text-luna-warning" />
            <div>
              <div className="text-xs font-orbitron font-semibold text-luna-text">Lock Workstation</div>
              <div className="text-[10px] text-luna-muted font-rajdhani">Instant Windows desktop lock</div>
            </div>
          </button>
          <button
            onClick={() => handleSystemAction('pc.restart')}
            className="glass-panel p-3 rounded-xl border border-luna-border hover:border-luna-danger/60 text-left flex items-center gap-3 transition-colors"
          >
            <RotateCcw className="w-5 h-5 text-luna-danger" />
            <div>
              <div className="text-xs font-orbitron font-semibold text-luna-text">Restart PC</div>
              <div className="text-[10px] text-luna-muted font-rajdhani">Requires user confirmation</div>
            </div>
          </button>
          <button
            onClick={() => handleSystemAction('pc.shutdown')}
            className="glass-panel p-3 rounded-xl border border-luna-border hover:border-luna-danger/60 text-left flex items-center gap-3 transition-colors"
          >
            <Power className="w-5 h-5 text-luna-danger" />
            <div>
              <div className="text-xs font-orbitron font-semibold text-luna-text">Shutdown PC</div>
              <div className="text-[10px] text-luna-muted font-rajdhani">Requires user confirmation</div>
            </div>
          </button>
        </div>
      </div>

      {/* Running Processes Inspector */}
      <div className="glass-panel p-4 rounded-xl border border-luna-border/70">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-orbitron font-semibold text-luna-muted uppercase tracking-wider">
            Active Top Processes
          </span>
          <button
            onClick={fetchProcesses}
            className="text-[11px] font-rajdhani text-luna-cyan hover:underline"
          >
            Refresh Processes
          </button>
        </div>
        {loadingProc ? (
          <div className="text-center py-6 text-xs text-luna-muted font-rajdhani animate-pulse">
            Inspecting Windows process table...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-rajdhani">
              <thead>
                <tr className="border-b border-luna-border/50 text-luna-muted text-[10px] font-orbitron">
                  <th className="pb-2">PID</th>
                  <th className="pb-2">PROCESS NAME</th>
                  <th className="pb-2">CPU %</th>
                  <th className="pb-2">RAM %</th>
                  <th className="pb-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luna-border/30">
                {processes.map((p) => (
                  <tr key={p.pid} className="hover:bg-luna-surfaceHover">
                    <td className="py-2 text-luna-muted font-mono">{p.pid}</td>
                    <td className="py-2 font-semibold text-luna-text">{p.name}</td>
                    <td className="py-2 text-luna-cyan">{p.cpuPercent}%</td>
                    <td className="py-2 text-luna-blue">{p.memoryPercent}%</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleTerminateApp(p.name)}
                        className="px-2 py-0.5 rounded bg-luna-danger/20 hover:bg-luna-danger text-luna-danger hover:text-white text-[10px] font-orbitron transition-colors"
                      >
                        Terminate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
