import React, { useEffect, useState } from 'react';
import { CalendarCheck, Plus, Trash2, Power, Clock, Play } from 'lucide-react';
import { LunaAPI } from '../services/api';

export const AutomationView: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleType, setScheduleType] = useState('interval');
  const [scheduleExpression, setScheduleExpression] = useState('3600');
  const [actionId, setActionId] = useState('system.get_health');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await LunaAPI.listAutomations();
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await LunaAPI.toggleAutomation(id);
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await LunaAPI.deleteAutomation(id);
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await LunaAPI.createAutomation({
        name,
        description,
        scheduleType,
        scheduleExpression,
        actionId,
        actionParameters: {},
      });
      setIsAdding(false);
      setName('');
      setDescription('');
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-orbitron font-bold text-luna-text flex items-center gap-2">
            AUTOMATION & SCHEDULING ENGINE
          </h2>
          <p className="text-xs text-luna-muted font-rajdhani">
            Proactive Reminders, Scheduled Workflows, and Background Monitoring
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3.5 py-1.5 rounded-lg bg-luna-cyan text-black hover:bg-cyan-400 font-orbitron font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,207,255,0.3)] flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Create Automation
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="glass-panel p-4 rounded-xl border border-luna-cyan/40 space-y-3">
          <div className="text-xs font-orbitron font-semibold text-luna-cyan">New Automated Task</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-orbitron text-luna-muted">Task Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hourly Health Check or Project Reminder"
                className="w-full bg-luna-bg border border-luna-border rounded-lg px-3 py-1.5 text-xs text-luna-text focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-orbitron text-luna-muted">Action to Trigger</label>
              <select
                value={actionId}
                onChange={(e) => setActionId(e.target.value)}
                className="w-full bg-luna-bg border border-luna-border rounded-lg px-3 py-1.5 text-xs text-luna-text focus:outline-none"
              >
                <option value="system.get_health">System Health Check (READ_ONLY)</option>
                <option value="system.get_battery">Battery Status Alert (READ_ONLY)</option>
                <option value="app.open">Launch Work App (LOW_RISK)</option>
                <option value="pc.lock">Auto Lock Workstation (LOW_RISK)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-orbitron text-luna-muted">Schedule Mode</label>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value)}
                className="w-full bg-luna-bg border border-luna-border rounded-lg px-3 py-1.5 text-xs text-luna-text focus:outline-none"
              >
                <option value="interval">Periodic Interval (seconds)</option>
                <option value="once">Run Once</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-orbitron text-luna-muted">Interval Seconds</label>
              <input
                type="text"
                required
                value={scheduleExpression}
                onChange={(e) => setScheduleExpression(e.target.value)}
                placeholder="3600 (1 hour)"
                className="w-full bg-luna-bg border border-luna-border rounded-lg px-3 py-1.5 text-xs text-luna-text focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1 rounded bg-luna-surfaceHover text-xs text-luna-muted"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-1 rounded bg-luna-cyan text-black font-semibold text-xs">
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      {loading ? (
        <div className="text-center py-12 text-xs text-luna-muted font-rajdhani animate-pulse">
          Loading background automations...
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-xs text-luna-muted font-rajdhani">
          No automated tasks active. Create one above to automate routine operations.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((t) => (
            <div
              key={t.id}
              className={`glass-panel p-4 rounded-xl border flex flex-col justify-between transition-all ${
                t.enabled ? 'border-luna-cyan/40 bg-luna-surface' : 'border-luna-border/50 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-luna-cyan" />
                    <span className="font-orbitron font-semibold text-xs text-luna-text">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(t.id)}
                      className={`p-1 rounded text-xs transition-colors ${
                        t.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-luna-muted'
                      }`}
                      title={t.enabled ? 'Disable Task' : 'Enable Task'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1 rounded text-luna-muted hover:text-luna-danger transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-luna-muted font-rajdhani mb-2">
                  Action: <code className="text-luna-cyan">{t.actionId}</code>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-luna-muted font-rajdhani">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Every {t.scheduleExpression}s
                  </span>
                  {t.lastRun && <span>Last: {new Date(t.lastRun).toLocaleTimeString()}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
