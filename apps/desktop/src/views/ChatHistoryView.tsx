import React, { useEffect, useState } from 'react';
import { MessageSquare, Trash2, Download, ArrowRight, Clock } from 'lucide-react';
import { LunaAPI } from '../services/api';
import { useLunaStore } from '../store/useLunaStore';

export const ChatHistoryView: React.FC = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadConversationMessages, setActiveView } = useLunaStore();

  const fetchConvs = async () => {
    try {
      setLoading(true);
      const data = await LunaAPI.listConversations();
      setConversations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConvs();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await LunaAPI.deleteConversation(id);
      setConversations(conversations.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelect = async (id: string) => {
    await loadConversationMessages(id);
    setActiveView('chat');
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-orbitron font-bold text-luna-text">
            CONVERSATION ARCHIVES
          </h2>
          <p className="text-xs text-luna-muted font-rajdhani">
            Inspect, Load, or Export Previous AI Sessions & Transcripts
          </p>
        </div>
        <button
          onClick={fetchConvs}
          className="px-3 py-1.5 rounded-lg bg-luna-surfaceHover border border-luna-border text-xs font-rajdhani hover:text-luna-cyan transition-colors"
        >
          Refresh Sessions
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-luna-muted font-rajdhani animate-pulse">
          Loading conversation logs from SQLite core...
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12 text-xs text-luna-muted font-rajdhani">
          No previous sessions logged yet. Start a chat in the "Ask Luna" panel.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => handleSelect(c.id)}
              className="glass-panel p-4 rounded-xl border border-luna-border/70 hover:border-luna-cyan/60 hover:bg-luna-surfaceHover transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-luna-cyan" />
                    <span className="font-orbitron font-semibold text-xs text-luna-text group-hover:text-luna-cyan transition-colors line-clamp-1">
                      {c.title || 'Conversation Session'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(c.id, e)}
                    className="p-1 rounded text-luna-muted hover:text-luna-danger transition-colors"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-luna-muted font-rajdhani">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(c.updatedAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-luna-border/40 flex items-center justify-between text-xs font-rajdhani text-luna-cyan">
                <span>Resume Session</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
