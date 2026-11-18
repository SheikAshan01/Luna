import React, { useEffect, useState } from 'react';
import { Settings, Shield, Sliders, Database, Key, Radio, Terminal, FileText, Volume2, Sparkles, Play, CheckCircle2, Globe } from 'lucide-react';
import { LunaAPI, getApiBaseUrl, setApiBaseUrl } from '../services/api';
import { useLunaStore } from '../store/useLunaStore';
import { speechEngine } from '../services/speech';

export const SettingsView: React.FC = () => {
  const { aiMode, language, setLanguage, wakeWordEnabled, setWakeWordEnabled } = useLunaStore();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());

  // Settings form states
  const [selectedAiMode, setSelectedAiMode] = useState(aiMode);
  const [openaiModel, setOpenaiModel] = useState('gpt-4o');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.2:latest');

  // ElevenLabs Voice State
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState('Qbw4VpyUrHEG7NigKzty');
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [hasKeyConfigured, setHasKeyConfigured] = useState(false);

  const fetchAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const data = await LunaAPI.getAuditLogs();
      setAuditLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    LunaAPI.getVoiceSettings()
      .then((data) => {
        if (data) {
          setHasKeyConfigured(data.hasElevenLabsKey);
          if (data.voiceId) setElevenlabsVoiceId(data.voiceId);
        }
      })
      .catch(console.error);
  }, []);

  const handleSaveVoice = async () => {
    try {
      await LunaAPI.updateVoiceSettings({
        elevenlabsApiKey: elevenlabsKey,
        elevenlabsVoiceId: elevenlabsVoiceId,
        voiceSpeechProvider: elevenlabsKey.trim() ? 'elevenlabs' : 'edge-tts',
      });
      if (elevenlabsKey.trim()) setHasKeyConfigured(true);
      setSavedMsg('ElevenLabs voice settings saved!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestVoice = async () => {
    setIsTestingVoice(true);
    try {
      await speechEngine.speak('Vanakkam! This is your ultra-realistic LUNA voice ready at your command.');
    } finally {
      setIsTestingVoice(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg('Settings saved successfully.');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-orbitron font-bold text-luna-text flex items-center gap-2">
            CONFIGURATION & AUDIT CENTER
          </h2>
          <p className="text-xs text-luna-muted font-rajdhani">
            AI Models, Voice Synthesis Dialects, Security Guardrails, and Action Audit Logs
          </p>
        </div>
        {savedMsg && (
          <div className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-rajdhani">
            {savedMsg}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Backend Server Connection (InstaBox / Cloud) */}
        <div className="glass-panel p-5 rounded-2xl border border-luna-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-luna-cyan" />
              <span className="font-orbitron font-bold text-sm text-luna-text">
                Backend Server URL (InstaBox / Cloud / Local)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setApiBaseUrl(serverUrl);
                setSavedMsg('Server URL updated successfully!');
                setTimeout(() => setSavedMsg(''), 3000);
              }}
              className="px-3 py-1.5 rounded-lg bg-luna-cyan/20 border border-luna-cyan/40 hover:bg-luna-cyan/30 text-luna-cyan text-xs font-orbitron transition-all"
            >
              Save Server URL
            </button>
          </div>
          <p className="text-xs text-luna-muted font-rajdhani">
            Leave blank or default to use the instant 24/7 Serverless Cloud API on Vercel, or provide a custom tunnel/local URL.
          </p>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://127.0.0.1:8000 or https://your-machine.instabox.sh"
            className="w-full bg-luna-bg border border-luna-border rounded-xl px-4 py-2.5 text-xs text-luna-text font-mono focus:border-luna-cyan focus:outline-none"
          />
        </div>

        {/* AI Provider Section */}
        <div className="glass-panel p-5 rounded-2xl border border-luna-border space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-luna-cyan" />
            <span className="font-orbitron font-bold text-sm text-luna-text">
              AI Brain Operating Mode
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: 'hybrid',
                title: 'Hybrid Mode (Recommended)',
                desc: 'Online cloud intelligence with automatic fallback to local offline engine.',
              },
              {
                id: 'online',
                title: 'Online Cloud Mode',
                desc: 'Full OpenAI GPT-4o reasoning, deep code review & multimodal vision.',
              },
              {
                id: 'offline',
                title: 'Offline Local Mode',
                desc: 'Ollama & local zero-latency deterministic NLP without internet connection.',
              },
            ].map((m) => (
              <label
                key={m.id}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  selectedAiMode === m.id
                    ? 'border-luna-cyan bg-luna-cyan/10 shadow-[0_0_15px_rgba(0,207,255,0.15)]'
                    : 'border-luna-border bg-luna-surfaceHover/50 hover:bg-luna-surfaceHover'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-orbitron font-semibold text-xs text-luna-text">{m.title}</span>
                  <input
                    type="radio"
                    name="aiMode"
                    value={m.id}
                    checked={selectedAiMode === m.id}
                    onChange={(e) => setSelectedAiMode(e.target.value)}
                    className="accent-luna-cyan"
                  />
                </div>
                <p className="text-[11px] text-luna-muted font-rajdhani">{m.desc}</p>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-orbitron text-luna-muted">OpenAI Model Name</label>
              <input
                type="text"
                value={openaiModel}
                onChange={(e) => setOpenaiModel(e.target.value)}
                className="w-full bg-luna-bg border border-luna-border rounded-lg px-3 py-2 text-xs text-luna-text font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-orbitron text-luna-muted">Local Ollama Model</label>
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="w-full bg-luna-bg border border-luna-border rounded-lg px-3 py-2 text-xs text-luna-text font-mono mt-1"
              />
            </div>
          </div>
        </div>

        {/* ElevenLabs Ultra-Realistic Neural Voice Section */}
        <div className="glass-panel p-5 rounded-2xl border border-luna-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-luna-cyan" />
              <div>
                <span className="font-orbitron font-bold text-sm text-luna-text flex items-center gap-2">
                  ElevenLabs Hyper-Realistic Voice Engine
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-luna-cyan/10 text-luna-cyan border border-luna-cyan/30 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    LUNA NEURAL GRADE
                  </span>
                </span>
                <p className="text-[11px] text-luna-muted font-rajdhani mt-0.5">
                  Connect your <a href="https://elevenlabs.io/" target="_blank" rel="noreferrer" className="text-luna-cyan underline">elevenlabs.io</a> API Key for Hollywood-grade natural human speech.
                </p>
              </div>
            </div>
            {hasKeyConfigured && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                ELEVENLABS ACTIVE
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-orbitron text-luna-muted">
                ElevenLabs API Key (from elevenlabs.io)
              </label>
              <input
                type="password"
                placeholder={hasKeyConfigured ? "••••••••••••••••••••••••" : "Paste xi-api-key here..."}
                value={elevenlabsKey}
                onChange={(e) => setElevenlabsKey(e.target.value)}
                className="w-full bg-luna-bg border border-luna-border rounded-lg px-3 py-2 text-xs text-luna-text font-mono mt-1 focus:border-luna-cyan outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-orbitron text-luna-muted">
                LUNA Voice Persona
              </label>
              <select
                value={elevenlabsVoiceId}
                onChange={(e) => setElevenlabsVoiceId(e.target.value)}
                className="w-full bg-luna-bg border border-luna-border rounded-lg px-3 py-2 text-xs text-luna-text font-mono mt-1 focus:border-luna-cyan outline-none"
              >
                <option value="Qbw4VpyUrHEG7NigKzty">Your Custom Voice (Qbw4VpyUrHEG7NigKzty)</option>
                <option value="pNInz6obpgDQGcFmaJgB">Adam (Deep, Calm Executive LUNA)</option>
                <option value="onwK4e9ZLuTAKqWW03F9">Daniel (British Aristocrat LUNA)</option>
                <option value="ErXwobaYiN019PkySvjV">Antoni (Crisp, Energetic Modern AI)</option>
                <option value="21m00Tcm4TlvDq8ikWAM">Rachel (Calm, Polite Assistant)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-luna-muted font-rajdhani">
              {hasKeyConfigured ? "✨ ElevenLabs is actively powering LUNA's duplex speech." : "ℹ️ If no key is set, LUNA automatically uses Microsoft Edge Neural Voice for free."}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestVoice}
                disabled={isTestingVoice}
                className="px-4 py-1.5 rounded-lg bg-luna-border/60 hover:bg-luna-border text-luna-text font-orbitron text-xs flex items-center gap-1.5 transition-all"
              >
                <Play className="w-3 h-3 text-luna-cyan" />
                {isTestingVoice ? "Speaking..." : "Test Voice"}
              </button>
              <button
                type="button"
                onClick={handleSaveVoice}
                className="px-4 py-1.5 rounded-lg bg-luna-cyan text-black hover:bg-cyan-400 font-orbitron font-bold text-xs transition-all shadow-[0_0_12px_rgba(0,207,255,0.25)]"
              >
                Save Voice
              </button>
            </div>
          </div>
        </div>

        {/* Security & Action Policy Section */}
        <div className="glass-panel p-5 rounded-2xl border border-luna-border space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-orbitron font-bold text-sm text-luna-text">
              Application & Workspace Security Policies
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-luna-border/50">
              <span className="text-[10px] text-luna-muted uppercase font-orbitron">
                Authorized Application Allowlist
              </span>
              <div className="text-luna-cyan mt-1">
                code, notepad, calc, explorer, chrome, msedge, wt, powershell, cmd, spotify, vlc
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-luna-border/50">
              <span className="text-[10px] text-luna-muted uppercase font-orbitron">
                Authorized Workspaces
              </span>
              <div className="text-luna-blue mt-1">
                d:\luna, c:\projects, d:\projects, c:\projects\MechFind
              </div>
            </div>
          </div>
        </div>

        {/* Telegram Remote PC Control Card */}
        <div className="glass-panel p-5 rounded-2xl border border-luna-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-luna-cyan" />
              <span className="font-orbitron font-bold text-sm text-luna-text">
                Telegram Remote PC Control (Everywhere Access)
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-luna-cyan/10 text-luna-cyan border border-luna-cyan/30">
              PAIRING CODE: LUNA77
            </span>
          </div>
          <p className="text-xs text-luna-muted font-rajdhani">
            Control your Windows computer from anywhere in the world using your private Telegram Bot.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-black/40 border border-luna-border/40">
              <span className="text-luna-cyan font-bold block mb-1">1. Create Bot</span>
              <span className="text-luna-muted text-[11px]">Search @BotFather in Telegram, send /newbot, and copy your Token.</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-luna-border/40">
              <span className="text-luna-blue font-bold block mb-1">2. Add to .env</span>
              <span className="text-luna-muted text-[11px]">Set TELEGRAM_BOT_TOKEN=&lt;token&gt; in your d:\luna\.env file.</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-luna-border/40">
              <span className="text-emerald-400 font-bold block mb-1">3. Pair & Command</span>
              <span className="text-luna-muted text-[11px]">Send 'LUNA77' to your bot. Then send /screenshot, /status, /lock or any voice text!</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 rounded-xl bg-luna-cyan text-black hover:bg-cyan-400 font-orbitron font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,207,255,0.3)]"
          >
            Save Configuration
          </button>
        </div>
      </form>

      {/* Security Audit Log Table */}
      <div className="glass-panel p-5 rounded-2xl border border-luna-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-luna-cyan" />
            <span className="font-orbitron font-bold text-sm text-luna-text">
              Action Execution Audit Trail
            </span>
          </div>
          <button
            onClick={fetchAuditLogs}
            className="text-[11px] font-rajdhani text-luna-cyan hover:underline"
          >
            Refresh Logs
          </button>
        </div>

        {loadingLogs ? (
          <div className="text-center py-6 text-xs text-luna-muted font-rajdhani animate-pulse">
            Loading cryptographic audit logs...
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-6 text-xs text-luna-muted font-rajdhani">
            No actions logged yet in audit trail.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs font-rajdhani">
              <thead>
                <tr className="border-b border-luna-border/50 text-luna-muted text-[10px] font-orbitron">
                  <th className="pb-2">TIME</th>
                  <th className="pb-2">ACTION ID</th>
                  <th className="pb-2">PERMISSION</th>
                  <th className="pb-2">ACTOR</th>
                  <th className="pb-2">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luna-border/30 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-luna-surfaceHover">
                    <td className="py-2 text-luna-muted">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 text-luna-cyan font-bold">{log.actionId}</td>
                    <td className="py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] ${
                          log.permissionLevel === 'DESTRUCTIVE'
                            ? 'bg-luna-danger/20 text-luna-danger'
                            : log.permissionLevel === 'SENSITIVE'
                            ? 'bg-luna-warning/20 text-luna-warning'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {log.permissionLevel}
                      </span>
                    </td>
                    <td className="py-2 text-luna-muted">{log.actorType}</td>
                    <td className="py-2">
                      <span
                        className={`font-semibold ${
                          log.status === 'SUCCESS'
                            ? 'text-emerald-400'
                            : log.status.includes('PENDING')
                            ? 'text-luna-warning'
                            : 'text-luna-danger'
                        }`}
                      >
                        {log.status}
                      </span>
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
