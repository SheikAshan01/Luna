import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useLunaStore } from '../store/useLunaStore';

export const ConfirmationModal: React.FC = () => {
  const { pendingConfirmation, confirmPendingAction, cancelPendingAction } = useLunaStore();

  if (!pendingConfirmation) return null;

  const isDestructive = pendingConfirmation.permissionLevel === 'DESTRUCTIVE';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`w-full max-w-lg rounded-xl border p-6 bg-luna-surface shadow-2xl relative select-none ${
            isDestructive
              ? 'border-luna-danger/70 shadow-[0_0_35px_rgba(255,51,102,0.3)]'
              : 'border-luna-warning/70 shadow-[0_0_35px_rgba(255,176,32,0.3)]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isDestructive ? 'bg-luna-danger/20 text-luna-danger' : 'bg-luna-warning/20 text-luna-warning'
              }`}
            >
              {isDestructive ? <ShieldAlert className="w-6 h-6 animate-pulse" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-base text-luna-text">
                {isDestructive ? 'DESTRUCTIVE ACTION CHALLENGE' : 'SENSITIVE ACTION AUTHORIZATION'}
              </h3>
              <p className="text-xs text-luna-muted font-rajdhani">
                Security Policy Level: <span className="font-semibold text-luna-text">{pendingConfirmation.permissionLevel}</span>
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4 text-xs font-rajdhani text-luna-text/90 leading-relaxed bg-luna-bg/60 p-3 rounded-lg border border-luna-border">
            {pendingConfirmation.message || 'LUNA requires your explicit confirmation before executing this sensitive command.'}
          </div>

          {/* Parameters Detail */}
          <div className="mb-6 space-y-1.5 font-mono text-[11px] bg-black/40 p-3 rounded-lg border border-luna-border/50 text-luna-muted">
            <div className="text-luna-cyan font-semibold">Action: {pendingConfirmation.actionId}</div>
            <div>
              Parameters: {JSON.stringify(pendingConfirmation.parameters, null, 2)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 font-rajdhani font-semibold text-xs">
            <button
              onClick={cancelPendingAction}
              className="px-4 py-2 rounded-lg border border-luna-border bg-luna-surfaceHover hover:bg-luna-border text-luna-muted hover:text-white transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              Cancel & Abort
            </button>
            <button
              onClick={confirmPendingAction}
              className={`px-5 py-2 rounded-lg text-white font-bold transition-all shadow-lg flex items-center gap-1.5 ${
                isDestructive
                  ? 'bg-luna-danger hover:bg-rose-700 shadow-[0_0_15px_rgba(255,51,102,0.5)]'
                  : 'bg-luna-cyan hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,207,255,0.5)]'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Authorize & Proceed
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
