import React, { useEffect, useState } from 'react';
import { Smartphone, QrCode, ShieldAlert, Wifi, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { LunaAPI } from '../services/api';

export const AndroidDevicesView: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [generating, setGenerating] = useState(false);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const data = await LunaAPI.listDevices();
      setDevices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    let timer: any;
    if (expiresIn > 0) {
      timer = setInterval(() => {
        setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [expiresIn]);

  const handleGeneratePairCode = async () => {
    try {
      setGenerating(true);
      const res = await LunaAPI.createPairRequest();
      setPairingCode(res.pairingCode);
      setExpiresIn(res.expiresInSeconds || 600);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await LunaAPI.revokeDevice(id);
      fetchDevices();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-orbitron font-bold text-luna-text flex items-center gap-2">
          ANDROID DEVICE SYNCHRONIZATION
        </h2>
        <p className="text-xs text-luna-muted font-rajdhani">
          Secure Authenticated Remote PC Control & Multi-Device Sync
        </p>
      </div>

      {/* Pairing Handshake Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pairing Code Generator */}
        <div className="glass-panel p-5 rounded-2xl border border-luna-border flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="w-5 h-5 text-luna-cyan" />
              <span className="font-orbitron font-bold text-sm text-luna-text">
                Pair Android Mobile Device
              </span>
            </div>
            <p className="text-xs text-luna-muted font-rajdhani leading-relaxed">
              Open the LUNA AI app on your Android device and enter the one-time cryptographic pairing code below.
            </p>

            {pairingCode ? (
              <div className="my-5 p-4 rounded-xl bg-black/50 border border-luna-cyan/50 text-center space-y-2">
                <span className="text-[10px] font-orbitron text-luna-muted tracking-wider">
                  ONE-TIME PAIRING CODE
                </span>
                <div className="text-3xl font-orbitron font-black tracking-widest text-luna-cyan neon-text">
                  {pairingCode}
                </div>
                <div className="text-[11px] font-rajdhani text-luna-muted">
                  Expires in: <span className="text-luna-text font-bold">{Math.floor(expiresIn / 60)}:{(expiresIn % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>
            ) : (
              <div className="my-6 text-center text-xs text-luna-muted font-rajdhani">
                No active pairing code. Click below to generate an authorization code.
              </div>
            )}
          </div>

          <button
            onClick={handleGeneratePairCode}
            disabled={generating}
            className="w-full py-2.5 rounded-xl bg-luna-cyan text-black hover:bg-cyan-400 font-orbitron font-bold text-xs transition-all shadow-[0_0_20px_rgba(0,207,255,0.3)] disabled:opacity-50"
          >
            {generating ? 'GENERATING KEY...' : 'GENERATE PAIRING CODE'}
          </button>
        </div>

        {/* Remote Command Demonstration Card */}
        <div className="glass-panel p-5 rounded-2xl border border-luna-border space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-5 h-5 text-luna-blue" />
            <span className="font-orbitron font-bold text-sm text-luna-text">
              Remote Voice & Command Workflow
            </span>
          </div>
          <p className="text-xs text-luna-muted font-rajdhani leading-relaxed">
            When your Android device is paired, you can speak to Luna from your phone:
          </p>
          <div className="space-y-2 font-mono text-[11px] bg-black/40 p-3 rounded-xl border border-luna-border/50 text-luna-text">
            <div className="text-luna-cyan font-bold">1. Android: "Luna, open VS Code on my PC."</div>
            <div className="text-luna-muted">2. Core authenticates Android JWT session token.</div>
            <div className="text-luna-muted">3. PC Agent launches VS Code and reports status.</div>
            <div className="text-emerald-400">4. Android receives Tamil voice reply: "VS Code open pannitten sir."</div>
          </div>
        </div>
      </div>

      {/* Paired Devices Table */}
      <div className="glass-panel p-4 rounded-xl border border-luna-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-orbitron font-semibold text-luna-muted uppercase tracking-wider">
            Connected Devices ({devices.length})
          </span>
          <button
            onClick={fetchDevices}
            className="text-[11px] font-rajdhani text-luna-cyan hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-6 text-xs text-luna-muted font-rajdhani animate-pulse">
            Querying paired device registry...
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-6 text-xs text-luna-muted font-rajdhani">
            No devices currently paired. Generate a pairing code above to connect your Android phone.
          </div>
        ) : (
          <div className="divide-y divide-luna-border/40">
            {devices.map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-luna-blue/20 border border-luna-blue/40 flex items-center justify-center text-luna-cyan">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-orbitron font-semibold text-xs text-luna-text flex items-center gap-2">
                      <span>{d.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-luna-surfaceHover text-luna-muted uppercase">
                        {d.platform}
                      </span>
                    </div>
                    <div className="text-[10px] text-luna-muted font-rajdhani mt-0.5">
                      Last active: {new Date(d.lastSeen).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-orbitron px-2 py-0.5 rounded-full ${
                      d.isPaired
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-luna-danger/10 text-luna-danger border border-luna-danger/30'
                    }`}
                  >
                    {d.isPaired ? 'AUTHORIZED' : 'REVOKED'}
                  </span>
                  {d.isPaired && (
                    <button
                      onClick={() => handleRevoke(d.id)}
                      className="px-2.5 py-1 rounded bg-luna-danger/20 hover:bg-luna-danger text-luna-danger hover:text-white text-xs font-rajdhani font-semibold transition-colors flex items-center gap-1"
                      title="Revoke Device Access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
