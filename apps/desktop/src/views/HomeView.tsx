import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Globe,
  Sparkles,
  Volume2,
  Activity,
  Cpu,
  Zap,
  Camera,
  RotateCcw,
  X,
  Eye,
  CheckCircle2,
  Loader2,
  Clock,
  ShieldCheck,
  PhoneCall,
} from 'lucide-react';
import { LunaOrb } from '../components/LunaOrb';
import { useLunaStore } from '../store/useLunaStore';
import { speechEngine } from '../services/speech';
import { ApiService } from '../services/api';

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

  // Active in-memory voice countdown timer
  const [activeTimerSeconds, setActiveTimerSeconds] = useState<number | null>(null);
  const [timerLabel, setTimerLabel] = useState<string>('Timer');

  // Camera Vision Mode states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [visionResultText, setVisionResultText] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Countdown timer effect (In-memory only, 0 data saved)
  useEffect(() => {
    if (activeTimerSeconds === null || activeTimerSeconds <= 0) return;
    const interval = setInterval(() => {
      setActiveTimerSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          speechEngine.speak(
            language === 'ta-IN' ? 'நீங்கள் கேட்ட டைமர் முடிந்தது!' : 'Your timer has finished!',
            language
          );
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimerSeconds, language]);

  useEffect(() => {
    // 1. Instantly auto-submit transcribed query to AI Brain with acoustic gender detection
    speechEngine.setAutoSubmitCallback(async (query: string, gender?: 'male' | 'female') => {
      setIsHearingSpeech(false);
      const q = query.trim();
      const honorific =
        gender === 'female'
          ? language === 'ta-IN'
            ? 'மேடம்'
            : "Ma'am"
          : language === 'ta-IN'
          ? 'சார்'
          : 'Sir';

      // Feature A: Instant Voice Calling Intent
      // e.g. "call 9876543210", "கால் 9876543210", "9876543210 ku call pannu"
      const phoneMatch =
        q.match(/(?:call|கால்)\s*([0-9\+\s]{10,14})/i) ||
        q.match(/([0-9]{10})\s*(?:க்கு\s*கால்|ku\s*call)/i);
      if (phoneMatch) {
        const rawNum = phoneMatch[1].replace(/\s+/g, '');
        if (rawNum.length >= 10) {
          const speakText =
            language === 'ta-IN'
              ? `${honorific}, ${rawNum} எண்ணிற்கு கால் செய்கிறேன்.`
              : `${honorific}, calling ${rawNum} now.`;
          await speechEngine.speak(speakText, language);
          window.location.href = `tel:${rawNum}`;
          return;
        }
      }

      // Feature B: Instant Voice Countdown Timer
      // e.g. "5 minutes timer", "10 seconds timer", "5 நிமிடம் டைமர்", "30 வினாடி டைமர்"
      const timerMatch =
        q.match(/(\d+)\s*(நிமிடம்|நிமிஷம்|வினாடி|minutes?|secs?|seconds?)\s*(?:டைமர்|timer)/i) ||
        q.match(/(?:டைமர்|timer)\s*(\d+)\s*(நிமிடம்|நிமிஷம்|வினாடி|minutes?|secs?|seconds?)/i);
      if (timerMatch) {
        const amount = parseInt(timerMatch[1], 10);
        const unit = timerMatch[2].toLowerCase();
        const isMin = unit.includes('நிமி') || unit.includes('min');
        const totalSecs = isMin ? amount * 60 : amount;
        setActiveTimerSeconds(totalSecs);
        setTimerLabel(`${amount} ${isMin ? 'Min' : 'Sec'} Timer`);
        const confirmText =
          language === 'ta-IN'
            ? `${honorific}, ${amount} ${isMin ? 'நிமிடத்திற்கு' : 'வினாடிக்கு'} டைமர் செட் செய்யப்பட்டது.`
            : `${honorific}, timer set for ${amount} ${isMin ? 'minutes' : 'seconds'}.`;
        await speechEngine.speak(confirmText, language);
        return;
      }

      // Feature C: Instant YouTube Music Player Trigger
      // e.g. "அனிருத் பாட்டு போடு", "பாடல் போடு Master", "play song Believer"
      const musicMatch = q.match(/(?:பாட்டு\s*போடு|பாடல்\s*போடு|play\s*song)\s*(.*)/i);
      if (musicMatch && musicMatch[1].trim()) {
        const songName = musicMatch[1].trim();
        const confirmText =
          language === 'ta-IN'
            ? `${honorific}, யூடியூபில் '${songName}' பாடலை இயக்குகிறேன்!`
            : `${honorific}, playing '${songName}' on YouTube!`;
        await speechEngine.speak(confirmText, language);
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(songName)}`, '_blank');
        return;
      }

      // Feature D: Zero-Data Ephemeral AI Chat & Dynamic Multi-User Honorific
      await sendMessage(query, gender);
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
      stopCamera();
    };
  }, [sendMessage, setAssistantState, language]);

  // Screen WakeLock for continuous hands-free (keeps screen awake like Siri/Alexa desk mode)
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      if (isHandsFreeActive && typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch {}
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [isHandsFreeActive]);

  // Synchronously unlock audio hardware on every user gesture
  const handleUserGesture = async () => {
    speechEngine.unlockAudio();
    if (!isHandsFreeActive && !isCameraActive) {
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

  // One-tap Morning Briefing trigger
  const handleMorningBriefing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    speechEngine.unlockAudio();
    setAssistantState('thinking');
    const briefingPrompt =
      language === 'ta-IN'
        ? 'காலை வணக்கம் லூனா! இன்றைய நாளின் சுருக்கமான பிரீஃபிங் மற்றும் ஒரு நல்ல சிந்தனை சொல்லு.'
        : 'Good morning Luna! Give me a brief morning status update and motivational thought.';
    await sendMessage(briefingPrompt);
  };

  // Camera Vision Mode controls
  const startCamera = async (mode: 'environment' | 'user' = 'environment') => {
    speechEngine.unlockAudio();
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      setVisionResultText(null);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      alert('Camera access could not be enabled. Please ensure camera permissions are allowed in your browser.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setIsAnalyzingPhoto(false);
  };

  const handleToggleCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera(facingMode);
    }
  };

  const handleFlipCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleCaptureAndAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current || isAnalyzingPhoto) return;
    setIsAnalyzingPhoto(true);
    setAssistantState('thinking');

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const maxDim = 800;
      let w = video.videoWidth || 640;
      let h = video.videoHeight || 480;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const b64 = canvas.toDataURL('image/jpeg', 0.85);

        const promptText =
          language === 'ta-IN'
            ? 'இந்தப் படத்தை முழுமையாகப் பார்த்து, அதில் உள்ளதை அழகிய இயல்பான தமிழில் 2 வாக்கியங்களில் விளக்கு.'
            : 'Look at this photo carefully and describe what you see in natural spoken English in 2 sentences.';

        const res = await ApiService.analyzeVision(b64, promptText, language);
        const explanation =
          res.summary ||
          res.tamilExplanation ||
          (language === 'ta-IN' ? 'படம் வெற்றிகரமாக ஆராயப்பட்டது.' : 'Scene analyzed successfully.');

        setVisionResultText(explanation);
        setAssistantState('speaking');

        // Luna speaks scene description aloud
        await speechEngine.speak(explanation, language);
        setAssistantState('idle');
      }
    } catch (err) {
      console.error('Vision analysis error:', err);
      const errMsg =
        language === 'ta-IN' ? 'படத்தை ஆராய்வதில் சிக்கல் ஏற்பட்டது.' : 'Scene analysis failed. Please try again.';
      setVisionResultText(errMsg);
      await speechEngine.speak(errMsg, language);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // Animated spectrum equalizer heights for desktop HUD
  const spectrumBars = [35, 60, 85, 45, 95, 70, 50, 90, 65, 40, 80, 55, 75, 45, 85, 60];

  return (
    <div
      onClick={handleUserGesture}
      onTouchStart={() => speechEngine.unlockAudio()}
      className="flex-1 flex flex-col h-full w-full bg-[#02040a] relative overflow-hidden select-none justify-between items-center py-4 sm:py-5 px-3 sm:px-8 cursor-pointer"
    >
      {/* 1. Deep Space Cosmic Nebula Ambient Lighting (Desktop Enhanced) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="absolute w-[500px] sm:w-[900px] h-[500px] sm:h-[900px] bg-gradient-to-tr from-cyan-500/15 via-purple-600/20 to-transparent rounded-full blur-[120px] sm:blur-[180px] pointer-events-none" />
        <div className="absolute w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-cyan-400/12 rounded-full blur-[90px] sm:blur-[130px] pointer-events-none" />

        {/* Desktop Sci-Fi Orbital Grid Rings */}
        <div className="hidden lg:block absolute w-[720px] h-[720px] rounded-full border border-cyan-500/10 pointer-events-none animate-spin [animation-duration:140s]" />
        <div className="hidden lg:block absolute w-[940px] h-[940px] rounded-full border border-purple-500/10 border-dashed pointer-events-none animate-spin [animation-duration:90s] [animation-direction:reverse]" />
        <div className="hidden xl:block absolute w-[1160px] h-[1160px] rounded-full border border-cyan-400/5 pointer-events-none" />
      </div>

      {/* 2. Top Ultra-Clean Minimal HUD Bar */}
      <header className="w-full max-w-6xl flex items-center justify-between z-30 px-1 sm:px-4 cursor-default">
        {/* Futuristic Pure Brand Watermark (Strictly LUNA with Live Glow Dot) */}
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isHandsFreeActive
                ? 'bg-emerald-400 animate-ping shadow-[0_0_14px_#34d399]'
                : 'bg-cyan-400 shadow-[0_0_12px_#00f5ff]'
            }`}
          />
          <span className="font-orbitron font-black text-sm sm:text-base tracking-[0.3em] text-white drop-shadow-[0_0_12px_rgba(0,245,255,0.7)]">
            LUNA
          </span>

          {/* Zero Data Retention Privacy Badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-orbitron text-emerald-400 font-semibold"
            title="Zero Data Retention Active - No conversations or calls stored"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="hidden md:inline">ZERO RETENTION</span>
          </div>
        </div>

        {/* Right Action Controls: Vision AI, Morning Briefing, Test Sound & Language */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Camera Vision AI Trigger Button */}
          <button
            onClick={handleToggleCamera}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full border text-[11px] font-orbitron font-bold transition-all flex items-center gap-1.5 backdrop-blur-xl shadow-lg cursor-pointer ${
              isCameraActive
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(0,245,255,0.4)]'
                : 'bg-white/5 border-white/10 hover:border-cyan-400/50 text-slate-300 hover:text-white hover:shadow-[0_0_15px_rgba(0,245,255,0.25)]'
            }`}
            title="Camera AI Vision Mode"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">VISION</span>
          </button>

          {/* Morning Routine / Daily Briefing Button */}
          <button
            onClick={handleMorningBriefing}
            className="px-2.5 sm:px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-purple-400/50 text-[11px] font-orbitron font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 backdrop-blur-xl shadow-lg cursor-pointer hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]"
            title="Morning Briefing & Status"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">BRIEFING</span>
          </button>

          {/* Test Sound Button */}
          <button
            onClick={handleTestAudio}
            className="px-2.5 sm:px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-cyan-400/50 text-[11px] font-orbitron font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 backdrop-blur-xl shadow-lg cursor-pointer hover:shadow-[0_0_15px_rgba(0,245,255,0.25)]"
            title="Test Voice Sound"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">TEST</span>
          </button>

          {/* Language Toggle Pill */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLanguage(language === 'ta-IN' ? 'en-US' : 'ta-IN');
            }}
            className="px-3 sm:px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-cyan-400/50 text-[11px] font-orbitron font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 backdrop-blur-xl shadow-lg cursor-pointer hover:shadow-[0_0_15px_rgba(0,245,255,0.25)]"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'ta-IN' ? 'தமிழ்' : 'ENG'}</span>
          </button>
        </div>
      </header>

      {/* 3. Pure Cinematic Center Stage: Majestic Desktop Quantum Core */}
      <main className="flex-1 flex items-center justify-center w-full max-w-6xl z-20 my-auto relative px-2 sm:px-6">
        {/* Left Desktop Holographic Telemetry HUD (Hidden on mobile) */}
        <div className="hidden lg:flex flex-col gap-4 w-60 xl:w-64 p-4 rounded-2xl bg-white/[0.02] border border-cyan-500/15 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,245,255,0.06)] pointer-events-none select-none transition-all">
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
              <span className="text-emerald-400 font-bold">650ms TUNED</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">PRIVACY</span>
              <span className="text-emerald-400 font-bold">ZERO RETENTION</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">STATUS</span>
              <span className="text-cyan-300 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                ONLINE
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
            className="relative flex items-center justify-center scale-95 sm:scale-105 md:scale-115 lg:scale-120 xl:scale-130 transition-all duration-500 cursor-pointer"
          >
            <LunaOrb
              state={assistantState}
              size={360}
              liveVolume={liveVolume}
            />
          </div>
        </div>

        {/* Right Desktop Holographic Acoustic Spectrum HUD (Hidden on mobile) */}
        <div className="hidden lg:flex flex-col gap-4 w-60 xl:w-64 p-4 rounded-2xl bg-white/[0.02] border border-purple-500/15 backdrop-blur-2xl shadow-[0_0_30px_rgba(168,85,247,0.06)] pointer-events-none select-none transition-all">
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
              <span>MIC INPUT GAIN</span>
              <span className="text-purple-300 font-bold">{Math.round(liveVolume)}%</span>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Active Voice Timer HUD (Transient, 0 saved data) */}
      <AnimatePresence>
        {activeTimerSeconds !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTimerSeconds(null);
            }}
            className="fixed bottom-24 z-40 px-5 py-2.5 rounded-full bg-cyan-950/90 border border-cyan-400/60 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,245,255,0.4)] flex items-center gap-2.5 cursor-pointer hover:border-rose-400 transition-all text-xs font-orbitron font-bold text-cyan-300"
            title="Click to cancel timer"
          >
            <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>
              {timerLabel}: {Math.floor(activeTimerSeconds / 60).toString().padStart(2, '0')}:
              {(activeTimerSeconds % 60).toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] text-white/50 ml-1 hover:text-rose-300">(TAP TO CANCEL)</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Bottom Ultra-Clean Status / Action Button & Device Advisory */}
      <footer className="w-full max-w-sm sm:max-w-md lg:max-w-lg z-30 pb-2 sm:pb-3 flex flex-col items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleHandsFree();
          }}
          className={`w-full py-3.5 sm:py-4 px-6 sm:px-8 rounded-2xl font-orbitron font-extrabold text-xs sm:text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-2xl cursor-pointer ${
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

      {/* 5. Futuristic Camera Vision AI Viewfinder Modal */}
      <AnimatePresence>
        {isCameraActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl"
          >
            <div className="relative w-full max-w-xl bg-[#030712] border-2 border-cyan-400/50 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,245,255,0.35)] flex flex-col">
              {/* Header HUD */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span className="font-orbitron font-extrabold text-xs text-cyan-300 tracking-[0.2em]">
                    LUNA CAMERA VISION
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFlipCamera}
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Flip Camera (Front/Rear)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={stopCamera}
                    className="p-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-100 transition-all cursor-pointer"
                    title="Close Camera"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewfinder Video Stream Frame */}
              <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Cybernetic Targeting Reticle Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-cyan-400/30 border-dashed animate-spin [animation-duration:35s]" />
                  <div className="absolute w-20 h-20 rounded-full border border-purple-400/40 animate-pulse" />
                  <div className="absolute w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400/70" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400/70" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-400/70" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-400/70" />
                </div>

                {/* Analyzing Overlay Spinner */}
                {isAnalyzingPhoto && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                    <span className="font-orbitron font-black text-xs text-cyan-300 tracking-widest animate-pulse">
                      LUNA IS ANALYZING SCENE...
                    </span>
                  </div>
                )}
              </div>

              {/* Spoken Tamil/English Observation Text Result */}
              {visionResultText && (
                <div className="p-4 bg-cyan-950/40 border-t border-cyan-500/20 text-slate-200 text-xs sm:text-sm font-rajdhani font-semibold tracking-wide flex items-start gap-2.5 max-h-32 overflow-y-auto">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{visionResultText}</p>
                </div>
              )}

              {/* Bottom Camera Action Bar */}
              <div className="p-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-center gap-3">
                <button
                  onClick={handleCaptureAndAnalyze}
                  disabled={isAnalyzingPhoto}
                  className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-orbitron font-extrabold text-xs sm:text-sm tracking-widest uppercase transition-all shadow-[0_0_30px_rgba(0,245,255,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isAnalyzingPhoto ? 'ANALYZING...' : 'SNAP & SCAN'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
