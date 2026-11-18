import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Globe, Sparkles, Volume2, Activity, Cpu, ShieldCheck, Zap } from 'lucide-react';
import { LunaOrb } from '../components/LunaOrb';
import { useLunaStore } from '../store/useLunaStore';
import { speechEngine } from '../services/speech';

export const HomeView: React.FC = () => {
  const {
    assistantState,
    setAssistantState,
    sendMessage,
    language,
    setLanguage,
  } = useLunaStore();

  const [liveVolume, setLiveVolume] = useState(0);
  const [isHandsFreeActive, setIsHandsFreeActive] = useState(false);
  const [isHearingSpeech, setIsHearingSpeech] = useState(false);

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    // 1. Instantly auto-submit transcribed query to AI Brain
    speechEngine.setAutoSubmitCallback(async (query: string) => {
      setIsHearingSpeech(false);
      await sendMessage(query);
    });

    // 2. Real-time voice onset detection (No text display)
    speechEngine.setSpeechCallback((text: string, isFinal: boolean) => {
      if (text && !isFinal) {
        setIsHearingSpeech(true);
        setAssistantState('listening');
      } else if (isFinal) {
        setIsHearingSpeech(false);
      }
    });

    // 3. Audio volume visualizer for the Orb & HUD
    speechEngine.setVolumeCallback((vol: number) => {
      setLiveVolume(vol);
    });

    return () => {
      speechEngine.stopContinuousAutoListen();
      speechEngine.stopSpeaking();
    };
  }, [sendMessage, setAssistantState]);

  // Synchronously unlock audio hardware on every user gesture
  const handleUserGesture = async () => {
    speechEngine.unlockAudio();
    if (!isHandsFreeActive) {
      await speechEngine.startContinuousAutoListen();
      setIsHandsFreeActive(true);
    }
  };

  // Toggle continuous hands-free duplex voice mode
  const handleToggleHandsFree = async () => {
    speechEngine.unlockAudio();
    if (isHandsFreeActive) {
      speechEngine.stopContinuousAutoListen();
      setIsHandsFreeActive(false);
      setIsHearingSpeech(false);
      setAssistantState('idle');
    } else {
      await speechEngine.startContinuousAutoListen();
      setIsHandsFreeActive(true);
    }
  };

  // Audio output test for mobile/iPhone/Desktop
  const handleTestAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    speechEngine.unlockAudio();
    setAssistantState('speaking');
    await speechEngine.speak(
      language === 'ta-IN'
        ? 'வணக்கம்! நான் லூனா, உங்கள் குரலைக் கேட்க தயாராக இருக்கிறேன்.'
        : 'Hello! I am Luna, ready to speak and assist you.',
      language
    );
    setAssistantState('idle');
  };

  // Animated spectrum equalizer heights for desktop HUD
  const spectrumBars = [35, 60, 85, 45, 95, 70, 50, 90, 65, 40, 80, 55, 75, 45, 85, 60];

  return (
    <div
      onClick={handleUserGesture}
      onTouchStart={() => speechEngine.unlockAudio()}
      className="flex-1 flex flex-col h-full w-full bg-[#02040a] relative overflow-hidden select-none justify-between items-center py-5 px-4 sm:px-8 cursor-pointer"
    >
      {/* 1. Deep Space Cosmic Nebula Ambient Lighting (Desktop Enhanced) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="absolute w-[600px] sm:w-[900px] h-[600px] sm:h-[900px] bg-gradient-to-tr from-cyan-500/15 via-purple-600/20 to-transparent rounded-full blur-[140px] sm:blur-[180px] pointer-events-none" />
        <div className="absolute w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-cyan-400/12 rounded-full blur-[100px] sm:blur-[130px] pointer-events-none" />

        {/* Desktop Sci-Fi Orbital Grid Rings */}
        <div className="hidden lg:block absolute w-[720px] h-[720px] rounded-full border border-cyan-500/10 pointer-events-none animate-spin [animation-duration:140s]" />
        <div className="hidden lg:block absolute w-[940px] h-[940px] rounded-full border border-purple-500/10 border-dashed pointer-events-none animate-spin [animation-duration:90s] [animation-direction:reverse]" />
        <div className="hidden xl:block absolute w-[1160px] h-[1160px] rounded-full border border-cyan-400/5 pointer-events-none" />
      </div>

      {/* 2. Top Ultra-Clean Minimal HUD Bar */}
      <header className="w-full max-w-6xl flex items-center justify-between z-30 px-2 sm:px-4 cursor-default">
        {/* Futuristic Brand Watermark with Live Status Dot */}
        <div className="flex items-center gap-3">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isHandsFreeActive
                ? 'bg-emerald-400 animate-ping shadow-[0_0_14px_#34d399]'
                : 'bg-cyan-400 shadow-[0_0_12px_#00f5ff]'
            }`}
          />
          <span className="font-orbitron font-black text-sm sm:text-base tracking-[0.28em] text-white">
            LUNA <span className="text-cyan-400 font-semibold">JARVIS</span>
          </span>
        </div>

        {/* Right Action Controls: Test Sound & Language Pill */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTestAudio}
            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-cyan-400/50 text-[11px] font-orbitron font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 backdrop-blur-xl shadow-lg cursor-pointer hover:shadow-[0_0_20px_rgba(0,245,255,0.25)]"
            title="Test Voice Sound"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">TEST SOUND</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setLanguage(language === 'ta-IN' ? 'en-US' : 'ta-IN');
            }}
            className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-cyan-400/50 text-[11px] font-orbitron font-bold text-slate-300 hover:text-white transition-all flex items-center gap-2 backdrop-blur-xl shadow-lg cursor-pointer hover:shadow-[0_0_20px_rgba(0,245,255,0.25)]"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'ta-IN' ? 'தமிழ்' : 'ENGLISH'}</span>
          </button>
        </div>
      </header>

      {/* 3. Pure Cinematic Center Stage: Majestic Desktop Quantum Core */}
      <main className="flex-1 flex items-center justify-center w-full max-w-6xl z-20 my-auto relative px-2 sm:px-6">
        {/* Left Desktop Holographic Telemetry HUD (Hidden on mobile) */}
        <div className="hidden lg:flex flex-col gap-4 w-64 p-4 rounded-2xl bg-white/[0.02] border border-cyan-500/15 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,245,255,0.06)] pointer-events-none select-none transition-all">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-orbitron font-black tracking-[0.2em] text-cyan-300">
              CORE TELEMETRY
            </span>
          </div>

          <div className="space-y-2.5 text-[10px] font-orbitron text-slate-400">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">AI BRAIN</span>
              <span className="text-cyan-300 font-bold">GROQ 20B</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">VOICE TTS</span>
              <span className="text-purple-300 font-bold">EDGE NEURAL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">ACOUSTIC VAD</span>
              <span className="text-emerald-400 font-bold">400ms FAST</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">STATUS</span>
              <span className="text-cyan-300 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                OPTIMAL
              </span>
            </div>
          </div>
        </div>

        {/* Center: The Majestic Quantum Orb */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleToggleHandsFree();
            }}
            className="relative flex items-center justify-center scale-95 sm:scale-105 md:scale-115 lg:scale-125 xl:scale-135 transition-all duration-500 cursor-pointer"
          >
            <LunaOrb
              state={assistantState}
              size={360}
              liveVolume={liveVolume}
            />
          </div>

          {/* Realtime Active Voice State Pill (ONLY shown during active speech/listening/thinking) */}
          <div className="mt-8 sm:mt-10 w-full max-w-xs flex flex-col items-center min-h-[38px]">
            <AnimatePresence mode="wait">
              {isHearingSpeech || assistantState === 'listening' ? (
                <motion.div
                  key="listening"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="px-5 py-2 rounded-full bg-cyan-950/60 border border-cyan-400/60 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,245,255,0.35)] flex items-center gap-2.5 text-cyan-200 text-xs font-orbitron font-extrabold tracking-widest"
                >
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-3.5 bg-cyan-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-5 bg-cyan-400 rounded-full animate-bounce delay-100" />
                    <span className="w-1.5 h-3.5 bg-cyan-400 rounded-full animate-bounce delay-200" />
                  </div>
                  <span>LISTENING</span>
                </motion.div>
              ) : assistantState === 'speaking' ? (
                <motion.div
                  key="speaking"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="px-5 py-2 rounded-full bg-purple-950/60 border border-purple-400/60 backdrop-blur-2xl shadow-[0_0_30px_rgba(168,85,247,0.4)] flex items-center gap-2 text-purple-200 text-xs font-orbitron font-extrabold tracking-widest"
                >
                  <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span>SPEAKING</span>
                </motion.div>
              ) : assistantState === 'thinking' || assistantState === 'processing' ? (
                <motion.div
                  key="thinking"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="px-5 py-2 rounded-full bg-purple-950/60 border border-purple-400/50 backdrop-blur-2xl shadow-[0_0_25px_rgba(168,85,247,0.3)] flex items-center gap-2 text-purple-300 text-xs font-orbitron font-bold tracking-widest"
                >
                  <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
                  <span>THINKING</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Desktop Holographic Acoustic Spectrum HUD (Hidden on mobile) */}
        <div className="hidden lg:flex flex-col gap-4 w-64 p-4 rounded-2xl bg-white/[0.02] border border-purple-500/15 backdrop-blur-2xl shadow-[0_0_30px_rgba(168,85,247,0.06)] pointer-events-none select-none transition-all">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-orbitron font-black tracking-[0.2em] text-purple-300">
              ACOUSTIC SPECTRUM
            </span>
          </div>

          {/* Reactive Equalizer Spectrum Bars */}
          <div className="flex items-end justify-between h-14 px-1 gap-1">
            {spectrumBars.map((baseH, i) => {
              const dynHeight = Math.min(100, Math.max(12, baseH * (0.35 + (liveVolume / 100) * 0.95)));
              return (
                <motion.div
                  key={i}
                  className="w-2 rounded-full bg-gradient-to-t from-purple-500/30 to-cyan-400"
                  animate={{ height: `${dynHeight}%` }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                />
              );
            })}
          </div>

          <div className="space-y-1.5 text-[9px] font-orbitron text-slate-400 border-t border-white/5 pt-2">
            <div className="flex justify-between">
              <span>FREQUENCY</span>
              <span className="text-cyan-300">20Hz — 20kHz</span>
            </div>
            <div className="flex justify-between">
              <span>INPUT GAIN</span>
              <span className="text-purple-300 font-bold">{Math.round(liveVolume)}%</span>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Bottom Ultra-Clean Status / Action Button & Device Advisory */}
      <footer className="w-full max-w-sm sm:max-w-md lg:max-w-lg z-30 pb-2 sm:pb-3 flex flex-col items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleHandsFree();
          }}
          className={`w-full py-4 sm:py-4.5 px-6 sm:px-8 rounded-2xl font-orbitron font-extrabold text-xs sm:text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-2xl cursor-pointer ${
            isHearingSpeech
              ? 'bg-rose-500 text-white shadow-[0_0_40px_rgba(244,63,94,0.65)] animate-pulse border border-rose-400'
              : isHandsFreeActive
              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white border border-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.25)] hover:shadow-[0_0_40px_rgba(52,211,153,0.4)]'
              : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-cyan-400/40 shadow-[0_0_30px_rgba(0,245,255,0.2)] hover:shadow-[0_0_45px_rgba(0,245,255,0.45)]'
          }`}
        >
          {isHearingSpeech ? (
            <>
              <Mic className="w-5 h-5 animate-bounce text-white" />
              <span>HEARING YOU...</span>
            </>
          ) : isHandsFreeActive ? (
            <>
              <Zap className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span>HANDS-FREE ACTIVE • (TAP TO PAUSE)</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 text-cyan-400" />
              <span>START HANDS-FREE</span>
            </>
          )}
        </button>

        {isIOS && (
          <p className="text-[10px] text-amber-300/80 font-rajdhani text-center tracking-wide">
            🔔 iPhone: Ensure physical Silent switch is OFF and Volume is UP
          </p>
        )}
      </footer>
    </div>
  );
};
