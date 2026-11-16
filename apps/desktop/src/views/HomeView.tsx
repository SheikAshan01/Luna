import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Globe, Sparkles, Volume2 } from 'lucide-react';
import { LunaOrb } from '../components/LunaOrb';
import { useLunaStore } from '../store/useLunaStore';
import { speechEngine } from '../services/speech';

export const HomeView: React.FC = () => {
  const {
    assistantState,
    setAssistantState,
    sendMessage,
    messages,
    language,
    setLanguage,
  } = useLunaStore();

  const [liveTranscript, setLiveTranscript] = useState('');
  const [liveVolume, setLiveVolume] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // 1. When voice transcription is complete, auto-submit to AI Brain
    speechEngine.setAutoSubmitCallback((query: string) => {
      setLiveTranscript(`"${query}"`);
      sendMessage(query);
      setIsRecording(false);
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

    // 3. Audio volume visualizer
    speechEngine.setVolumeCallback((vol: number) => {
      setLiveVolume(vol);
    });

    return () => {
      speechEngine.stopSpeaking();
    };
  }, [sendMessage, setAssistantState]);

  const handleToggleVoice = async () => {
    const recordingNow = await speechEngine.toggleManualRecord();
    setIsRecording(recordingNow);
    if (recordingNow) {
      setAssistantState('listening');
      setLiveTranscript('🎙️ Listening... பேசுங்கள்...');
    } else {
      setAssistantState('idle');
      setLiveTranscript('');
    }
  };

  // Get the latest assistant response
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#02040a] relative overflow-hidden select-none justify-between items-center py-6 px-4">
      {/* 1. Deep Space Ambient Nebula Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/10 via-purple-600/15 to-transparent rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[100px] pointer-events-none" />
      </div>

      {/* 2. Top Ultra-Clean Minimal HUD Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between z-30 px-2">
        {/* Futuristic Brand Watermark */}
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shadow-[0_0_12px_#00f5ff]" />
          <span className="font-orbitron font-black text-sm tracking-[0.25em] text-white">
            LUNA <span className="text-cyan-400 font-semibold">JARVIS</span>
          </span>
        </div>

        {/* Right Subtle Language Pill */}
        <button
          onClick={() => setLanguage(language === 'ta-IN' ? 'en-US' : 'ta-IN')}
          className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-cyan-400/50 text-[11px] font-orbitron font-bold text-slate-300 hover:text-white transition-all flex items-center gap-2 backdrop-blur-xl shadow-lg"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>{language === 'ta-IN' ? 'தமிழ்' : 'ENGLISH'}</span>
        </button>
      </header>

      {/* 3. Pure Cinematic Center Stage: The Majestic Quantum Orb */}
      <main className="flex-1 flex flex-col items-center justify-center w-full z-20 my-auto relative">
        <div className="relative flex items-center justify-center scale-90 sm:scale-100 md:scale-110 transition-transform">
          <LunaOrb
            state={assistantState}
            size={340}
            liveVolume={liveVolume}
            onClick={handleToggleVoice}
          />
        </div>

        {/* 4. Elegant Floating Voice Subtitles & State Banner */}
        <div className="mt-8 w-full max-w-lg px-4 flex flex-col items-center min-h-[90px]">
          <AnimatePresence mode="wait">
            {liveTranscript ? (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="px-6 py-2.5 rounded-full bg-cyan-950/40 border border-cyan-400/40 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,245,255,0.3)] flex items-center gap-3 text-cyan-200 text-xs font-orbitron font-bold tracking-wider text-center"
              >
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-3 bg-cyan-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-5 bg-cyan-400 rounded-full animate-bounce delay-100" />
                  <span className="w-1.5 h-3 bg-cyan-400 rounded-full animate-bounce delay-200" />
                </div>
                <span className="truncate max-w-xs">{liveTranscript}</span>
              </motion.div>
            ) : assistantState === 'speaking' ? (
              <motion.div
                key="speaking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="px-6 py-2.5 rounded-full bg-purple-950/40 border border-purple-400/50 backdrop-blur-2xl shadow-[0_0_30px_rgba(168,85,247,0.35)] flex items-center gap-3 text-purple-200 text-xs font-orbitron font-extrabold tracking-wider"
              >
                <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
                <span>LUNA SPEAKING...</span>
              </motion.div>
            ) : assistantState === 'thinking' || assistantState === 'processing' ? (
              <motion.div
                key="thinking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="px-6 py-2.5 rounded-full bg-purple-950/40 border border-purple-400/40 backdrop-blur-2xl shadow-[0_0_25px_rgba(168,85,247,0.3)] flex items-center gap-2 text-purple-300 text-xs font-orbitron font-bold"
              >
                <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
                <span>AI REASONING...</span>
              </motion.div>
            ) : lastAssistantMsg ? (
              <motion.div
                key="lastmsg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-2xl text-center max-w-md shadow-2xl"
              >
                <p className="text-xs sm:text-sm font-semibold font-rajdhani text-slate-100 leading-relaxed">
                  {lastAssistantMsg.content}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <p className="text-xs font-orbitron text-slate-400 tracking-widest uppercase">
                  TAP ORB TO TALK
                </p>
                <p className="text-[11px] font-rajdhani text-slate-400 mt-1">
                  பேச திரையைத் தொடவும் அல்லது பட்டனை அழுத்தவும்
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 5. Bottom Ultra-Clean Push-To-Talk Button */}
      <footer className="w-full max-w-md z-30 pb-2 flex flex-col items-center">
        <button
          onClick={handleToggleVoice}
          className={`w-full py-4 px-6 rounded-2xl font-orbitron font-extrabold text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-2xl ${
            isRecording
              ? 'bg-rose-500 text-white shadow-[0_0_35px_rgba(244,63,94,0.6)] animate-pulse border border-rose-400'
              : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-cyan-400/40 shadow-[0_0_25px_rgba(0,245,255,0.2)] hover:shadow-[0_0_35px_rgba(0,245,255,0.4)]'
          }`}
        >
          <Mic className={`w-5 h-5 ${isRecording ? 'animate-bounce text-white' : 'text-cyan-400'}`} />
          <span>{isRecording ? 'LISTENING... (TAP TO STOP)' : 'TALK / பேசுங்கள்'}</span>
        </button>
      </footer>
    </div>
  );
};
