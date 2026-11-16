import React, { useState } from 'react';
import { Eye, Camera, Upload, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { LunaAPI } from '../services/api';
import { useLunaStore } from '../store/useLunaStore';

export const VisionView: React.FC = () => {
  const { setAssistantState } = useLunaStore();
  const [screenshotB64, setScreenshotB64] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Luna, indha screen la enna error irukku? Explain pannu.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleCaptureScreen = async () => {
    setLoading(true);
    setAssistantState('processing');
    try {
      const res = await LunaAPI.executeAction('system.capture_screenshot', {});
      if (res.success && res.data?.imageBase64) {
        setScreenshotB64(res.data.imageBase64);
        // Automatically analyze
        await analyzeImage(res.data.imageBase64);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setAssistantState('idle');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const b64 = event.target?.result as string;
      setScreenshotB64(b64);
      await analyzeImage(b64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (b64: string) => {
    setLoading(true);
    setAssistantState('thinking');
    try {
      const res = await LunaAPI.analyzeVision(b64, prompt);
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setAssistantState('idle');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-orbitron font-bold text-luna-text flex items-center gap-2">
          MULTIMODAL VISION & SCREEN ANALYZER
        </h2>
        <p className="text-xs text-luna-muted font-rajdhani">
          Screen Capture, UI Inspection, OCR, and Tamil Error Troubleshooting
        </p>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleCaptureScreen}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-luna-cyan text-black hover:bg-cyan-400 font-orbitron font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,207,255,0.3)] flex items-center gap-2 disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          Capture Active Screen
        </button>

        <label className="px-4 py-2 rounded-xl bg-luna-surfaceHover hover:bg-luna-border border border-luna-border text-xs font-orbitron font-semibold text-luna-text transition-colors flex items-center gap-2 cursor-pointer">
          <Upload className="w-4 h-4 text-luna-cyan" />
          Upload Image File
          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Screenshot Preview */}
        <div className="glass-panel p-4 rounded-xl border border-luna-border flex flex-col">
          <span className="text-xs font-orbitron font-semibold text-luna-muted mb-2 uppercase">
            Image Display Canvas
          </span>
          <div className="flex-1 min-h-[260px] bg-black/60 rounded-lg border border-luna-border/50 flex items-center justify-center overflow-hidden relative">
            {screenshotB64 ? (
              <img
                src={screenshotB64}
                alt="Captured screen"
                className="w-full h-full object-contain rounded"
              />
            ) : (
              <div className="text-center text-xs text-luna-muted font-rajdhani space-y-1">
                <Camera className="w-8 h-8 mx-auto text-luna-muted/50" />
                <div>No screen capture in buffer.</div>
                <div className="text-[10px]">Click 'Capture Active Screen' above.</div>
              </div>
            )}
          </div>
        </div>

        {/* Vision Analysis Results */}
        <div className="glass-panel p-4 rounded-xl border border-luna-border flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-orbitron font-semibold text-luna-muted uppercase">
              LUNA Visual Diagnostics
            </span>

            {loading ? (
              <div className="py-12 text-center text-xs text-luna-cyan font-rajdhani animate-pulse space-y-2">
                <Eye className="w-8 h-8 mx-auto animate-spin-slow" />
                <div>Scanning display pixels & analyzing stack traces...</div>
              </div>
            ) : result ? (
              <div className="mt-3 space-y-3 font-rajdhani text-xs">
                {/* Summary */}
                <div className="p-3 rounded-lg bg-black/40 border border-luna-border leading-relaxed text-luna-text">
                  <div className="font-orbitron font-semibold text-luna-cyan text-[11px] mb-1">
                    Analysis Summary
                  </div>
                  <div>{result.summary}</div>
                </div>

                {/* Tamil Explanation */}
                {result.tamilExplanation && (
                  <div className="p-3 rounded-lg bg-luna-blue/10 border border-luna-blue/40 leading-relaxed text-luna-text">
                    <div className="font-orbitron font-semibold text-luna-cyan text-[11px] mb-1">
                      Tamil Explanation (விளக்கம்)
                    </div>
                    <div>{result.tamilExplanation}</div>
                  </div>
                )}

                {/* Suggested Action */}
                {result.suggestedAction && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                    <div className="font-orbitron font-semibold text-[11px] mb-1 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Recommended Next Step
                    </div>
                    <div>{result.suggestedAction}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-luna-muted font-rajdhani">
                Capture or upload an image to receive detailed multimodal analysis.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
