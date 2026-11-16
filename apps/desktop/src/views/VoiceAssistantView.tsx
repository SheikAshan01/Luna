import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Sliders, Play, Radio, Check } from 'lucide-react';
import { LunaOrb } from '../components/LunaOrb';
import { useLunaStore } from '../store/useLunaStore';
import { speechEngine } from '../services/speech';

export const VoiceAssistantView: React.FC = () => {
  const {
    assistantState,
    setAssistantState,
    wakeWordEnabled,
    setWakeWordEnabled,
    language,
    setLanguage,
  } = useLunaStore();

  const [sensitivity, setSensitivity] = useState(0.6);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isTestSpeaking, setIsTestSpeaking] = useState(false);

  const testTamilVoice = async () => {
    setIsTestSpeaking(true);
    setAssistantState('speaking');
    await speechEngine.speak(
      'வணக்கம்! நான் லூனா உங்கள் தனிப்பட்ட ஏஐ உதவியாளர். உங்கள் குரல் கட்டளைகளுக்கு நான் தயாராக இருக்கிறேன்.',
      'ta-IN'
    );
    setIsTestSpeaking(false);
    setAssistantState('idle');
  };

  const testTanglishVoice = async () => {
    setIsTestSpeaking(true);
    setAssistantState('speaking');
    await speechEngine.speak(
      'Vanakkam sir, naan LUNA. Ungaloda PC control panna naan ready ah irukken.',
      'ta-IN'
    );
    setIsTestSpeaking(false);
    setAssistantState('idle');
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-orbitron font-bold text-luna-text flex items-center gap-2">
          VOICE ASSISTANT ROOM
        </h2>
        <p className="text-xs text-luna-muted font-rajdhani">
          Low-Latency Multilingual Speech Recognition & Natural Neural Tamil Voice Synthesis
        </p>
      </div>

      {/* Main Center Hologram */}
      <div className="flex-1 flex flex-col items-center justify-center glass-panel rounded-2xl p-8 border border-luna-border/70 relative">
        <LunaOrb state={assistantState} size={300} />

        <div className="mt-6 text-center space-y-1">
          <div className="font-orbitron font-bold text-base tracking-wider text-luna-cyan">
            {assistantState === 'listening'
              ? 'LISTENING TO VOICE...'
              : assistantState === 'speaking'
              ? 'SYNTHESIZING SPEECH...'
              : 'WAKE-WORD ACTIVE ("Hey Luna")'}
          </div>
          <div className="text-xs text-luna-muted font-rajdhani">
            Say <span className="text-luna-cyan font-semibold">"Hey Luna, epdi irukka?"</span> or{' '}
            <span className="text-luna-cyan font-semibold">"Luna, VS Code open pannu"</span>
          </div>
        </div>
      </div>

      {/* Configuration Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Wake-word Detection Card */}
        <div className="glass-panel p-4 rounded-xl border border-luna-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-orbitron font-semibold text-luna-text">Wake-Word Detection</span>
              <Radio className="w-4 h-4 text-luna-cyan animate-pulse" />
            </div>
            <p className="text-[11px] text-luna-muted font-rajdhani">
              Continuous background acoustic model listening for "Hey Luna".
            </p>
          </div>
          <button
            onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
            className={`mt-4 px-3 py-1.5 rounded-lg text-xs font-orbitron font-semibold transition-all ${
              wakeWordEnabled
                ? 'bg-luna-cyan/20 border border-luna-cyan text-luna-cyan'
                : 'bg-luna-surfaceHover border border-luna-border text-luna-muted'
            }`}
          >
            {wakeWordEnabled ? 'WAKE-WORD: ENABLED' : 'WAKE-WORD: DISABLED'}
          </button>
        </div>

        {/* Language Selection Card */}
        <div className="glass-panel p-4 rounded-xl border border-luna-border flex flex-col justify-between">
          <div>
            <span className="text-xs font-orbitron font-semibold text-luna-text">Speech Engine Language</span>
            <p className="text-[11px] text-luna-muted font-rajdhani mt-1">
              Select primary language dialect for recognition & synthesis.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setLanguage('ta-IN')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-orbitron font-semibold transition-all ${
                language === 'ta-IN'
                  ? 'bg-luna-cyan text-black font-bold'
                  : 'bg-luna-surfaceHover text-luna-muted border border-luna-border'
              }`}
            >
              தமிழ் (TA-IN)
            </button>
            <button
              onClick={() => setLanguage('en-US')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-orbitron font-semibold transition-all ${
                language === 'en-US'
                  ? 'bg-luna-cyan text-black font-bold'
                  : 'bg-luna-surfaceHover text-luna-muted border border-luna-border'
              }`}
            >
              ENGLISH (EN)
            </button>
          </div>
        </div>

        {/* Tamil Voice Sample Test Card */}
        <div className="glass-panel p-4 rounded-xl border border-luna-border flex flex-col justify-between">
          <div>
            <span className="text-xs font-orbitron font-semibold text-luna-text">Test Neural Voices</span>
            <p className="text-[11px] text-luna-muted font-rajdhani mt-1">
              Test natural Tamil & Tanglish Edge-TTS neural output audio.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={testTamilVoice}
              disabled={isTestSpeaking}
              className="flex-1 py-1.5 rounded-lg bg-luna-blue/20 hover:bg-luna-blue/40 border border-luna-blue text-luna-cyan text-xs font-rajdhani font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Test Tamil
            </button>
            <button
              onClick={testTanglishVoice}
              disabled={isTestSpeaking}
              className="flex-1 py-1.5 rounded-lg bg-luna-cyan/20 hover:bg-luna-cyan/40 border border-luna-cyan text-luna-cyan text-xs font-rajdhani font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Test Tanglish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
