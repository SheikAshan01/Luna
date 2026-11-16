import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code,
  Battery,
  Lock,
  Mic,
  MicOff,
  Globe,
  Volume2,
  Sparkles,
  Cpu,
  Zap,
  Terminal,
  Send,
  Eye,
  Sun,
  Music,
  FolderSync,
  Trash2,
  Activity,
  Layers,
} from 'lucide-react';
import { LunaOrb } from '../components/LunaOrb';
import { useLunaStore } from '../store/useLunaStore';
import { speechEngine } from '../services/speech';

export const HomeView: React.FC = () => {
  const {
    assistantState,
    setAssistantState,
    systemHealth,
    sendMessage,
    messages,
    language,
    setLanguage,
    clearChat,
  } = useLunaStore();

  const [autoDuplex, setAutoDuplex] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [liveVolume, setLiveVolume] = useState(0);
  const [manualInput, setManualInput] = useState('');
  const [isManualRecording, setIsManualRecording] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. When voice is transcribed, submit to AI Brain
    speechEngine.setAutoSubmitCallback((query: string) => {
      setLiveTranscript(`"${query}"`);
      sendMessage(query);
      setIsManualRecording(false);
    });

    // 2. Transcription and state progress
    speechEngine.setSpeechCallback((text: string, isFinal: boolean) => {
      setLiveTranscript(text);
      if (text) {
        setAssistantState('listening');
      } else {
        setAssistantState('idle');
      }
    });

    // 3. Real-time microphone audio volume for Orb kinetic waves
    speechEngine.setVolumeCallback((vol: number) => {
      setLiveVolume(vol);
    });

    // 4. Start auto-listening
    if (autoDuplex) {
      speechEngine.startContinuousAutoListen();
    }

    return () => {
      speechEngine.stopContinuousAutoListen();
    };
  }, [autoDuplex, sendMessage, setAssistantState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  const toggleAutoDuplex = () => {
    const nextState = !autoDuplex;
    setAutoDuplex(nextState);
    if (nextState) {
      speechEngine.startContinuousAutoListen();
    } else {
      speechEngine.stopContinuousAutoListen();
      setAssistantState('idle');
      setLiveTranscript('');
      setLiveVolume(0);
      setIsManualRecording(false);
    }
  };

  const handleOrbClick = async () => {
    const recordingNow = await speechEngine.toggleManualRecord();
    setIsManualRecording(recordingNow);
    if (recordingNow) {
      setAssistantState('listening');
    }
  };

  const handleSendManual = () => {
    if (!manualInput.trim()) return;
    sendMessage(manualInput.trim());
    setManualInput('');
  };

  const quickActions = [
    { title: 'Inspect Screen', prompt: 'Luna, screen-la enna irukku nu paaru', icon: Eye, color: '#00F5FF' },
    { title: 'Morning Briefing', prompt: 'Good morning Luna, daily briefing update sollu', icon: Sun, color: '#F59E0B' },
    { title: 'Play / Pause', prompt: 'Luna, toggle media playback', icon: Music, color: '#A855F7' },
    { title: 'Sort Downloads', prompt: 'Luna, Downloads folder organize pannu', icon: FolderSync, color: '#10B981' },
    { title: 'VS Code', prompt: 'Luna, VS Code open pannu', icon: Code, color: '#3B82F6' },
    { title: 'Lock PC', prompt: 'Luna, lock PC', icon: Lock, color: '#EF4444' },
  ];

  const recentMessages = messages.slice(-3);

  return (
    <div className="flex-1 flex flex-col h-full cyber-backdrop cyber-grid relative overflow-hidden select-none">
      {/* Top Floating Hologram Bar */}
      <div className="p-4 flex items-center justify-between z-20">
        {/* Left Telemetry Chips */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full cyber-glass flex items-center gap-2 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,245,255,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-orbitron text-[10px] text-cyan-300 font-extrabold tracking-widest">
              LUNA QUANTUM CORE
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full cyber-glass text-[11px] font-mono text-slate-300">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Cpu className="w-3.5 h-3.5" />
              {systemHealth?.cpuUsagePercent ?? 0}%
            </span>
            <span className="text-white/20">|</span>
            <span className="flex items-center gap-1.5 text-purple-400 font-bold">
              <Zap className="w-3.5 h-3.5" />
              {systemHealth?.memoryUsagePercent ?? 0}%
            </span>
            {systemHealth?.batteryPercent !== null && (
              <>
                <span className="text-white/20">|</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Battery className="w-3.5 h-3.5" />
                  {systemHealth.batteryPercent}%
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Controls: Language & Hands-Free Toggle */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setLanguage(language === 'ta-IN' ? 'en-US' : 'ta-IN')}
            className="px-3.5 py-1.5 rounded-full cyber-pill hover:border-cyan-400 text-xs font-orbitron font-bold text-white transition-all flex items-center gap-1.5"
            title="Toggle Voice Dialect"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'ta-IN' ? 'TAMIL' : 'ENGLISH'}</span>
          </button>

          <button
            onClick={toggleAutoDuplex}
            className={`px-4 py-1.5 rounded-full text-xs font-orbitron font-extrabold tracking-wider transition-all flex items-center gap-2 ${
              autoDuplex
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                : 'cyber-pill text-slate-400'
            }`}
          >
            {autoDuplex ? (
              <span className="flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>HANDS-FREE ON</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <MicOff className="w-3.5 h-3.5 text-slate-400" />
                <span>HANDS-FREE OFF</span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Center Stage: The Majestic Quantum Core Orb */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 -mt-2">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative flex items-center justify-center"
        >
          <LunaOrb
            state={assistantState}
            size={330}
            liveVolume={liveVolume}
            onClick={handleOrbClick}
          />
        </motion.div>

        {/* Live Audio Visualizer Pill or Status Banner */}
        <div className="mt-3 min-h-[38px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {liveTranscript ? (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="px-5 py-2 rounded-full cyber-glass-glow text-xs font-orbitron font-bold text-cyan-300 flex items-center gap-3 max-w-lg shadow-[0_0_25px_rgba(0,245,255,0.4)]"
              >
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-4 bg-cyan-400 rounded-full animate-soundwave-1" />
                  <span className="w-1.5 h-6 bg-cyan-400 rounded-full animate-soundwave-2" />
                  <span className="w-1.5 h-3 bg-cyan-400 rounded-full animate-soundwave-3" />
                  <span className="w-1.5 h-5 bg-cyan-400 rounded-full animate-soundwave-4" />
                </div>
                <span className="truncate">{liveTranscript}</span>
              </motion.div>
            ) : assistantState === 'speaking' ? (
              <motion.div
                key="speaking"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="px-5 py-2 rounded-full cyber-glass border-pink-500/40 text-xs font-orbitron font-extrabold text-pink-400 flex items-center gap-2.5 shadow-[0_0_20px_rgba(236,72,153,0.35)]"
              >
                <Volume2 className="w-4 h-4 text-pink-400 animate-bounce" />
                <span>LUNA NEURAL VOICE SPEAKING...</span>
              </motion.div>
            ) : assistantState === 'thinking' ? (
              <motion.div
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-5 py-2 rounded-full cyber-glass border-purple-500/40 text-xs font-orbitron font-extrabold text-purple-300 flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.35)]"
              >
                <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
                <span>GROQ 120B REASONING...</span>
              </motion.div>
            ) : (
              <div
                key="idle"
                className="flex items-center gap-2 text-xs font-rajdhani text-slate-400"
              >
                <span className="text-cyan-400 font-bold">● Standby:</span>
                <span>Speak naturally or click the Orb to command.</span>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Dialogue Box (Clean, High Contrast, Futuristic) */}
      <div className="max-w-3xl w-full mx-auto px-4 mb-2 z-20">
        <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
          {recentMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-2xl text-xs font-rajdhani leading-relaxed ${
                msg.role === 'user'
                  ? 'cyber-glass border-cyan-400/40 text-cyan-200 ml-16 text-right'
                  : 'cyber-glass border-purple-500/30 text-slate-100 mr-16'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-orbitron font-black text-[10px] text-cyan-400 tracking-wider">
                  {msg.role === 'user' ? 'YOU (VOICE / TEXT)' : 'LUNA (JARVIS)'}
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p className="text-sm font-semibold whitespace-pre-wrap">{msg.content}</p>
            </motion.div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Bottom Command & Action Deck */}
      <div className="p-4 z-20 max-w-3xl w-full mx-auto space-y-2">
        {/* Quick Action Hologram Pills */}
        <div className="flex items-center justify-center flex-wrap gap-2">
          {quickActions.map((act, i) => {
            const Icon = act.icon;
            return (
              <button
                key={i}
                onClick={() => sendMessage(act.prompt)}
                className="px-3.5 py-1.5 rounded-xl cyber-pill hover:border-cyan-400 text-xs font-orbitron font-bold text-slate-200 hover:text-white flex items-center gap-2 group"
                title={act.prompt}
              >
                <Icon
                  className="w-3.5 h-3.5 transition-transform group-hover:scale-125"
                  style={{ color: act.color }}
                />
                <span>{act.title}</span>
              </button>
            );
          })}
        </div>

        {/* Input Dock & Microphone Push-To-Talk */}
        <div className="cyber-glass p-2 rounded-2xl flex items-center gap-2 border border-white/10 shadow-2xl">
          {/* Push to Talk Button */}
          <button
            onClick={handleOrbClick}
            className={`p-2.5 rounded-xl font-orbitron text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              isManualRecording
                ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-black border border-cyan-400/40'
            }`}
            title="Click to Speak / Stop"
          >
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline font-bold">
              {isManualRecording ? 'STOP' : 'TALK'}
            </span>
          </button>

          {/* Text Input */}
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendManual()}
              placeholder="Speak naturally or type your command here..."
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs font-rajdhani text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {manualInput.trim() && (
              <button
                onClick={handleSendManual}
                className="absolute right-1.5 p-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-bold transition-all shadow-[0_0_10px_rgba(0,245,255,0.4)]"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Clear Chat Button */}
          <button
            onClick={clearChat}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
