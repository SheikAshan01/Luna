import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AssistantState } from '../store/useLunaStore';

interface LunaOrbProps {
  state: AssistantState;
  size?: number;
  liveVolume?: number;
  onClick?: () => void;
}

export const LunaOrb: React.FC<LunaOrbProps> = ({ state, size = 340, liveVolume = 0, onClick }) => {
  const theme = useMemo(() => {
    switch (state) {
      case 'listening':
        return {
          core: '#00F5FF',
          outer: '#10B981',
          accent: '#06B6D4',
          glow: 'rgba(0, 245, 255, 0.9)',
          label: 'VOICE SENSORS ACTIVE',
          statusSub: 'LISTENING TO YOU',
          speed: 3,
          coreScale: [1, 1.15, 1],
        };
      case 'processing':
      case 'thinking':
        return {
          core: '#A855F7',
          outer: '#3B82F6',
          accent: '#EC4899',
          glow: 'rgba(168, 85, 247, 0.95)',
          label: 'GROQ 120B NEURAL SYNC',
          statusSub: 'THINKING...',
          speed: 1.5,
          coreScale: [1, 1.08, 0.96, 1.08, 1],
        };
      case 'speaking':
        return {
          core: '#EC4899',
          outer: '#00F5FF',
          accent: '#F43F5E',
          glow: 'rgba(236, 72, 153, 0.95)',
          label: 'ELEVENLABS NEURAL SPEECH',
          statusSub: 'SPEAKING...',
          speed: 2,
          coreScale: [1, 1.12, 0.98, 1.1, 1],
        };
      case 'executing':
        return {
          core: '#10B981',
          outer: '#00F5FF',
          accent: '#059669',
          glow: 'rgba(16, 185, 129, 0.9)',
          label: 'HARDWARE ACTION RUNNING',
          statusSub: 'EXECUTING...',
          speed: 1.2,
          coreScale: [1, 1.14, 1],
        };
      case 'error':
        return {
          core: '#EF4444',
          outer: '#F59E0B',
          accent: '#DC2626',
          glow: 'rgba(239, 68, 68, 0.9)',
          label: 'CORE SYSTEM ANOMALY',
          statusSub: 'CHECK CONSOLE',
          speed: 1,
          coreScale: [1, 1.08, 1],
        };
      case 'idle':
      default:
        return {
          core: '#00F5FF',
          outer: '#8B5CF6',
          accent: '#3B82F6',
          glow: 'rgba(0, 245, 255, 0.45)',
          label: 'STANDBY — ONLINE',
          statusSub: 'SAY "HEY LUNA"',
          speed: 8,
          coreScale: [1, 1.04, 1],
        };
    }
  }, [state]);

  // Volume-reactive scaling
  const volMultiplier = 1 + (liveVolume / 100) * 0.25;

  const soundBars = [30, 65, 95, 45, 85, 100, 60, 40, 90, 75, 45, 90, 35];

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer select-none group"
      style={{ width: size, height: size }}
      title="Click to toggle voice recording"
    >
      {/* 1. Deep Celestial Holographic Aura */}
      <motion.div
        className="absolute rounded-full pointer-events-none filter blur-3xl opacity-70"
        animate={{
          scale: (state === 'speaking' || state === 'listening' ? [1, 1.35, 1] : [1, 1.1, 1]).map(
            (v) => v * volMultiplier
          ),
          opacity: state === 'listening' ? 0.9 : 0.55,
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: size * 0.95,
          height: size * 0.95,
          background: `radial-gradient(circle, ${theme.glow} 0%, rgba(139, 92, 246, 0.25) 45%, transparent 75%)`,
        }}
      />

      {/* 2. Audio-Reactive Shockwave Ring */}
      {state === 'listening' && (
        <motion.div
          className="absolute rounded-full border border-cyan-400/40 pointer-events-none"
          style={{ width: size * 0.8, height: size * 0.8 }}
          animate={{
            scale: [1, 1.45],
            opacity: [0.8, 0],
          }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {/* 3. Futuristic Arc Reactor SVG Concentric Rings */}
      <svg
        className="absolute w-full h-full pointer-events-none overflow-visible"
        viewBox="0 0 340 340"
      >
        <defs>
          <linearGradient id="cyberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.core} />
            <stop offset="50%" stopColor={theme.outer} />
            <stop offset="100%" stopColor={theme.accent} />
          </linearGradient>
          <filter id="orbGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Orbital Measurement Ring with Precision Dash Ticks */}
        <motion.circle
          cx="170"
          cy="170"
          r="162"
          fill="none"
          stroke="url(#cyberGradient)"
          strokeWidth="1.2"
          strokeDasharray="4 8 16 8 2 12"
          strokeOpacity="0.45"
          animate={{ rotate: 360 }}
          transition={{ duration: theme.speed * 6, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '170px 170px' }}
        />

        {/* Counter-Rotating Segmented Arc Shield */}
        <motion.circle
          cx="170"
          cy="170"
          r="144"
          fill="none"
          stroke={theme.core}
          strokeWidth="2.5"
          strokeDasharray="45 55 20 80"
          strokeOpacity="0.75"
          filter="url(#orbGlow)"
          animate={{ rotate: -360 }}
          transition={{ duration: theme.speed * 4, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '170px 170px' }}
        />

        {/* Rotating Orbital Quantum Nodes */}
        <motion.circle
          cx="170"
          cy="170"
          r="122"
          fill="none"
          stroke={theme.outer}
          strokeWidth="2"
          strokeDasharray="10 25"
          strokeOpacity="0.85"
          animate={{ rotate: 360 }}
          transition={{ duration: theme.speed * 2.5, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '170px 170px' }}
        />

        {/* Inner High-Frequency Quantum Ring */}
        <motion.circle
          cx="170"
          cy="170"
          r="98"
          fill="none"
          stroke="url(#cyberGradient)"
          strokeWidth="1.5"
          strokeDasharray="14 14"
          strokeOpacity="0.6"
          animate={{ rotate: -360 }}
          transition={{ duration: theme.speed * 1.8, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '170px 170px' }}
        />
      </svg>

      {/* 4. Central Spherical Quantum Core */}
      <motion.div
        className="relative rounded-full flex flex-col items-center justify-center backdrop-blur-xl transition-all duration-200"
        animate={{
          scale: theme.coreScale.map((v) => v * volMultiplier),
          boxShadow: [
            `0 0 35px ${theme.core}66, inset 0 0 30px ${theme.outer}88`,
            `0 0 75px ${theme.core}aa, inset 0 0 50px ${theme.outer}cc`,
            `0 0 35px ${theme.core}66, inset 0 0 30px ${theme.outer}88`,
          ],
        }}
        transition={{
          duration: state === 'speaking' || state === 'listening' ? 0.6 : 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          width: size * 0.48,
          height: size * 0.48,
          background: 'radial-gradient(circle at 35% 30%, #161F38 0%, #0B1124 50%, #030612 100%)',
          border: `1.5px solid ${theme.core}`,
        }}
      >
        {/* Specular Light Reflection */}
        <div className="absolute top-2 left-6 w-14 h-7 rounded-full bg-white/20 blur-sm rotate-[-35deg] pointer-events-none" />

        {/* Core LUNA Branding */}
        <div className="relative flex flex-col items-center justify-center z-10 text-center px-2">
          <div className="font-orbitron font-black text-2xl tracking-[0.25em] text-white drop-shadow-[0_0_15px_rgba(0,245,255,0.95)]">
            LUNA
          </div>
          <div
            className="text-[9px] tracking-[0.28em] font-orbitron font-extrabold mt-0.5 uppercase drop-shadow-[0_0_8px_currentColor]"
            style={{ color: theme.core }}
          >
            {theme.statusSub}
          </div>

          {/* Dynamic Audio Visualizer Wave */}
          <div className="flex items-center gap-[3px] mt-2.5 h-4">
            {soundBars.slice(0, 9).map((val, idx) => (
              <motion.div
                key={idx}
                className="w-[2.5px] rounded-full"
                style={{ backgroundColor: theme.core }}
                animate={{
                  height:
                    state === 'speaking' || state === 'listening'
                      ? [3, Math.max(4, (val / 100) * 16 * volMultiplier), 3]
                      : [3, 5, 3],
                }}
                transition={{
                  duration: 0.3 + idx * 0.03,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Micro-hint on hover */}
          <div className="text-[7.5px] text-white/40 font-mono tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            CLICK TO TALK
          </div>
        </div>
      </motion.div>
    </div>
  );
};
