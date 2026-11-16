import React, { useEffect, useState } from 'react';
import { Brain, Plus, Trash2, Search, Download, ShieldCheck, Tag } from 'lucide-react';
import { LunaAPI } from '../services/api';

export const MemoryView: React.FC = () => {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [category, setCategory] = useState('project_context');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const data = await LunaAPI.listMemories(selectedCategory || undefined, search || undefined);
      setMemories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [selectedCategory, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
      await LunaAPI.createMemory(category, key, value, tags);
      setIsAdding(false);
      setKey('');
      setValue('');
      setTagInput('');
      fetchMemories();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save memory.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await LunaAPI.deleteMemory(id);
      setMemories(memories.filter((m) => m.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async () => {
    try {
      const data = await LunaAPI.exportMemories();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `luna-memory-export-${Date.now()}.json`;
      a.click();
    } catch (e) {
      console.error(e);
    }
  };

  const categories = [
    { id: '', label: 'All Categories' },
    { id: 'project_context', label: 'Project Context' },
    { id: 'user_preference', label: 'User Preferences' },
    { id: 'communication_preference', label: 'Communication' },
    { id: 'frequently_used_command', label: 'Frequent Commands' },
    { id: 'personal_note', label: 'Personal Notes' },
  ];

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-orbitron font-bold text-luna-text flex items-center gap-2">
            PERSISTENT MEMORY ENGINE
          </h2>
          <p className="text-xs text-luna-muted font-rajdhani">
            Inspect, Edit, and Control What LUNA Remembers Across Restarts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 rounded-lg bg-luna-surfaceHover border border-luna-border hover:border-luna-cyan text-xs font-rajdhani font-semibold text-luna-muted hover:text-luna-text transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 rounded-lg bg-luna-cyan text-black hover:bg-cyan-400 text-xs font-orbitron font-bold transition-all shadow-[0_0_15px_rgba(0,207,255,0.3)] flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Memory
          </button>
        </div>
      </div>

      {/* Security Banner */}
      <div className="p-3 rounded-xl bg-luna-blue/10 border border-luna-blue/30 flex items-center gap-3 text-xs font-rajdhani text-luna-cyan">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <span>
          Security Policy: Conversational memory is strictly filtered. Passwords, API keys, and sensitive tokens are prohibited and blocked automatically.
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 text-luna-muted absolute left-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search remembered facts, project names, or preferences..."
            className="w-full bg-luna-surface border border-luna-border rounded-xl pl-9 pr-4 py-2 text-xs font-rajdhani text-luna-text focus:outline-none focus:border-luna-cyan"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-luna-surface border border-luna-border rounded-xl px-3 py-2 text-xs font-rajdhani text-luna-text focus:outline-none focus:border-luna-cyan"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Add Memory Modal / Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="glass-panel p-4 rounded-xl border border-luna-cyan/40 space-y-3"
        >
          <div className="text-xs font-orbitron font-semibold text-luna-cyan">Add New Memory Item</div>
          {errorMsg && <div className="text-xs text-luna-danger">{errorMsg}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-orbitron text-luna-muted">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-luna-bg border border-luna-border rounded-lg px-3 py-1.5 text-xs text-luna-text focus:outline-none"
              >
                <option value="project_context">Project Context (e.g. MechFind)</option>
                <option value="user_preference">User Preference</option>
                <option value="communication_preference">Communication Style</option>
                <option value="frequently_used_command">Frequent Command</option>
                <option value="personal_note">Personal Note</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-orbitron text-luna-muted">Key Identifier</label>
              <input
                type="text"
                required
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. preferred_ide or active_project"
                className="w-full bg-luna-bg border border-luna-border rounded-lg px-3 py-1.5 text-xs text-luna-text focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-orbitron text-luna-muted">Memory Value / Details</label>
            <textarea
              required
              rows={2}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="What should LUNA remember about this?"
              className="w-full bg-luna-bg border border-luna-border rounded-lg p-2 text-xs text-luna-text focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-orbitron text-luna-muted">Tags (Comma-separated)</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. development, priority, work"
              className="w-full bg-luna-bg border border-luna-border rounded-lg px-3 py-1.5 text-xs text-luna-text focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1 rounded bg-luna-surfaceHover text-xs text-luna-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 rounded bg-luna-cyan text-black font-semibold text-xs"
            >
              Save Memory
            </button>
          </div>
        </form>
      )}

      {/* Memories Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs text-luna-muted font-rajdhani animate-pulse">
          Querying SQLite memory engine...
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-12 text-xs text-luna-muted font-rajdhani">
          No memories stored yet. Add one above or tell Luna in chat (e.g. "En project name MechFind").
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map((m) => (
            <div
              key={m.id}
              className="glass-panel p-4 rounded-xl border border-luna-border/70 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-luna-cyan/10 border border-luna-cyan/30 text-luna-cyan font-orbitron">
                    {m.category}
                  </span>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1 rounded text-luna-muted hover:text-luna-danger transition-colors"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="font-orbitron font-semibold text-xs text-luna-text mb-1">
                  {m.key}
                </div>
                <p className="text-xs text-luna-muted font-rajdhani whitespace-pre-wrap">
                  {m.value}
                </p>
              </div>

              {m.tags && m.tags.length > 0 && (
                <div className="mt-3 pt-2 border-t border-luna-border/40 flex items-center gap-1.5 flex-wrap">
                  {m.tags.map((t: string, i: number) => (
                    <span
                      key={i}
                      className="text-[9px] font-rajdhani px-1.5 py-0.5 rounded bg-luna-surfaceHover text-luna-muted flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
