import React, { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';

declare global {
  interface Window {
    lunaElectron?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      onWindowStateChange: (cb: (max: boolean) => void) => () => void;
    };
  }
}

export const Header: React.FC = () => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMinimize = () => window.lunaElectron?.minimize();
  const handleMaximize = () => window.lunaElectron?.maximize();
  const handleClose = () => window.lunaElectron?.close();

  return (
    <header className="h-10 border-b border-white/10 bg-[#05070E]/90 backdrop-blur-2xl flex items-center justify-between px-4 select-none z-50">
      {/* Brand Hologram */}
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00F5FF]" />
        <span className="font-orbitron font-black tracking-[0.22em] text-xs text-white">
          LUNA <span className="text-cyan-400 font-semibold">QUANTUM JARVIS</span>
        </span>
      </div>

      {/* Center Clock */}
      <div className="font-orbitron text-xs text-cyan-300 font-extrabold tracking-widest drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">
        {currentTime}
      </div>

      {/* Right Window Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleMinimize}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-600 text-slate-400 hover:text-white transition-colors"
          title="Close to Tray"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
