import React, { useRef, useEffect } from 'react';
import { Volume2, Trash2, Bot, User, Check, Terminal, Shield } from 'lucide-react';
import { useLunaStore } from '../store/useLunaStore';
import { speechEngine } from '../services/speech';

export const AskLunaView: React.FC = () => {
  const { messages, clearChat, language, assistantState } = useLunaStore();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleReplay = (text: string) => {
    speechEngine.speak(text, language);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 select-text">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-luna-border/60">
        <div>
          <h2 className="font-orbitron font-bold text-lg text-luna-text">
            ASK LUNA
          </h2>
          <p className="text-xs text-luna-muted font-rajdhani">
            Multilingual AI Chat with Tool Execution & Context Retention
          </p>
        </div>
        <button
          onClick={clearChat}
          className="px-3 py-1.5 rounded-lg bg-luna-surfaceHover hover:bg-luna-danger/20 border border-luna-border hover:border-luna-danger/50 text-luna-muted hover:text-luna-danger text-xs font-rajdhani font-semibold transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Chat
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                  isUser
                    ? 'bg-luna-blue/20 border-luna-blue/50 text-luna-cyan'
                    : 'bg-luna-cyan/20 border-luna-cyan/50 text-luna-cyan shadow-[0_0_10px_rgba(0,207,255,0.3)]'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[75%] space-y-2`}>
                <div
                  className={`p-3.5 rounded-2xl text-xs font-rajdhani leading-relaxed ${
                    isUser
                      ? 'bg-luna-blue/20 border border-luna-cyan/40 text-luna-text rounded-tr-none'
                      : 'bg-luna-surface border border-luna-border/80 text-luna-text rounded-tl-none shadow-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {/* Tool Call and Execution Badge */}
                  {m.toolResults && m.toolResults.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-luna-border/50 space-y-1">
                      {m.toolResults.map((tr, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-luna-border/40 text-[10px] font-mono text-luna-cyan"
                        >
                          <Terminal className="w-3 h-3 text-luna-cyan" />
                          <span>Tool: {tr.name}</span>
                          <Check className="w-3 h-3 text-emerald-400 ml-auto" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer details: time, provider, replay button */}
                <div
                  className={`flex items-center gap-2 text-[10px] text-luna-muted font-rajdhani ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <span>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {m.provider && (
                    <span className="px-1.5 py-0.2 rounded bg-luna-surfaceHover text-luna-muted font-orbitron text-[9px]">
                      {m.provider}
                    </span>
                  )}
                  {!isUser && (
                    <button
                      onClick={() => handleReplay(m.content)}
                      className="hover:text-luna-cyan transition-colors"
                      title="Replay speech"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {assistantState === 'thinking' && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-luna-cyan/20 border border-luna-cyan/50 text-luna-cyan flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="glass-panel px-4 py-2 rounded-2xl text-xs font-rajdhani text-luna-cyan flex items-center gap-2">
              <span className="animate-pulse">LUNA is processing your request...</span>
              <div className="w-1.5 h-1.5 rounded-full bg-luna-cyan animate-ping" />
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>
    </div>
  );
};
