import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, Globe } from 'lucide-react';
import { useLunaStore } from '../store/useLunaStore';
import { speechEngine } from '../services/speech';

export const QuickCommandBar: React.FC = () => {
  const {
    sendMessage,
    language,
    setLanguage,
    assistantState,
    setAssistantState,
    isAudioPlaying,
  } = useLunaStore();

  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Configure speech engine callbacks
    speechEngine.setSpeechCallback((text, isFinal) => {
      setInput(text);
      if (isFinal) {
        setIsRecording(false);
        speechEngine.stopListening();
        sendMessage(text);
        setInput('');
      }
    });

    speechEngine.setWakeWordCallback(() => {
      setAssistantState('listening');
      toggleRecording(true);
    });
  }, [sendMessage, setAssistantState]);

  const toggleRecording = (forceStart?: boolean) => {
    if (isRecording && !forceStart) {
      setIsRecording(false);
      speechEngine.stopListening();
      setAssistantState('idle');
    } else {
      setIsRecording(true);
      setAssistantState('listening');
      speechEngine.startListening();
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleStopSpeaking = () => {
    speechEngine.stopSpeaking();
    setAssistantState('idle');
  };

  return (
    <div className="p-3 border-t border-luna-border/60 bg-luna-surface/90 backdrop-blur-md flex items-center gap-3 select-none z-30">
      {/* Mic Button */}
      <button
        onClick={() => toggleRecording()}
        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 relative ${
          isRecording
            ? 'bg-luna-cyan text-black shadow-[0_0_20px_#00CFFF] scale-105'
            : 'bg-luna-surfaceHover hover:bg-luna-border text-luna-cyan border border-luna-border'
        }`}
        title={isRecording ? 'Listening... click to stop' : 'Push to talk'}
      >
        {isRecording ? <Mic className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
        {isRecording && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-luna-danger animate-ping" />
        )}
      </button>

      {/* Input Field */}
      <div className="flex-1 relative flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Luna anything in Tamil or English (e.g. 'Luna, VS Code open pannu', 'battery status sollu')..."
          className="w-full bg-luna-bg/80 border border-luna-border rounded-xl px-4 py-2.5 text-xs font-rajdhani text-luna-text placeholder:text-luna-muted/60 focus:outline-none focus:border-luna-cyan focus:shadow-[0_0_15px_rgba(0,207,255,0.2)] transition-all"
        />

        {/* Stop audio button if speaking */}
        {isAudioPlaying && (
          <button
            onClick={handleStopSpeaking}
            className="absolute right-12 text-luna-cyan hover:text-white p-1 rounded transition-colors"
            title="Interrupt speech"
          >
            <VolumeX className="w-4 h-4 animate-bounce" />
          </button>
        )}

        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="absolute right-2 px-3 py-1.5 rounded-lg bg-luna-cyan/20 hover:bg-luna-cyan text-luna-cyan hover:text-black disabled:opacity-40 disabled:hover:bg-luna-cyan/20 disabled:hover:text-luna-cyan font-semibold text-xs transition-all flex items-center gap-1"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Language Switcher */}
      <button
        onClick={() => setLanguage(language === 'ta-IN' ? 'en-US' : 'ta-IN')}
        className="px-2.5 py-2 rounded-xl bg-luna-surfaceHover border border-luna-border text-xs font-orbitron font-semibold text-luna-text hover:border-luna-cyan transition-colors flex items-center gap-1.5"
        title="Toggle Input Language"
      >
        <Globe className="w-3.5 h-3.5 text-luna-cyan" />
        <span>{language === 'ta-IN' ? 'தமிழ் (TA)' : 'ENG'}</span>
      </button>
    </div>
  );
};
