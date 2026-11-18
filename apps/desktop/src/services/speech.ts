/**
 * LUNA Desktop - Bulletproof Cross-Platform Speech Engine (iOS, Android, macOS, Windows)
 * Features:
 * - Web Audio API Primary Pipeline: Decodes & plays audio via AudioContext, completely bypassing iOS Safari HTML5 gesture expiration
 * - Universal Audio Unlocker: Sync unlocks AudioContext & shared HTMLAudioElement on first user touch/click
 * - Non-fragmented MediaRecorder: Omits timeslices on MP4/AAC to generate 100% valid moov/mdat containers for iOS Safari
 * - Anti-Earpiece Mode: Dynamically toggles mic track during playback to prevent iOS from diverting loud speaker to telephone receiver
 * - Dynamic 850ms Silence Detection: Captures full sentences without awkward delays
 * - Acoustic Isolation: 700ms cooldown prevents assistant speaker audio from triggering mic
 */

import { getApiBaseUrl } from './api';

export type SpeechCallback = (text: string, isFinal: boolean) => void;
export type AutoSubmitCallback = (text: string, gender?: 'male' | 'female') => void;
export type VolumeCallback = (rmsPercent: number) => void;

export class LunaSpeechEngine {
  public isListening = false;
  public isRecordingChunk = false;
  public isSpeaking = false;
  public isManualRecording = false;

  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  // Audio Playback
  private currentAudio: HTMLAudioElement | null = null;
  private sharedAudioElement: HTMLAudioElement | null = null;
  private currentAudioSourceNode: AudioBufferSourceNode | null = null;
  private activePlaybackId = 0;
  private speechCooldownUntil = 0;

  private autoSubmitCallback: AutoSubmitCallback | null = null;
  private speechCallback: SpeechCallback | null = null;
  private volumeCallback: VolumeCallback | null = null;
  private selectedLanguage = 'ta-IN';

  private vadInterval: any = null;
  private baselineNoise = 8;
  private consecutiveSpeechFrames = 0;
  private silenceTimerMs = 0;
  private recordingStartTime = 0;

  // Acoustic Pitch Tracking for Speaker Gender Recognition (Sir vs Ma'am)
  private malePitchFrames = 0;
  private femalePitchFrames = 0;
  private lastDetectedGender: 'male' | 'female' = 'male';

  constructor() {
    this.setupAutoUnlock();
  }

  /**
   * Listens for all user interaction events to unlock audio on iOS / Safari / Chrome mobile
   */
  private setupAutoUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => this.unlockAudio();
    ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach((evt) => {
      window.addEventListener(evt, unlock, { passive: true, once: false });
    });
  }

  /**
   * Synchronously unlocks audio hardware for iOS Safari / WebKit
   */
  public unlockAudio() {
    // 1. Initialize & resume Web Audio API AudioContext
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext && AudioCtx) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext) {
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }
        // Play 1-sample silent buffer to activate iOS audio hardware
        const buffer = this.audioContext.createBuffer(1, 1, 22050);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);
      }
    } catch (e) {
      console.warn('AudioContext unlock notice:', e);
    }

    // 2. Initialize persistent HTMLAudioElement for iOS
    try {
      if (!this.sharedAudioElement) {
        this.sharedAudioElement = new Audio();
        this.sharedAudioElement.setAttribute('playsinline', 'true');
        this.sharedAudioElement.setAttribute('webkit-playsinline', 'true');
      }
      // Play 1 millisecond silent WAV
      this.sharedAudioElement.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.sharedAudioElement.play().catch(() => {});
    } catch (e) {
      console.warn('HTMLAudioElement unlock notice:', e);
    }
  }

  public async initMicrophone(): Promise<boolean> {
    try {
      if (this.mediaStream && this.mediaStream.active) return true;

      this.unlockAudio();

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext && AudioCtx) {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext) {
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 1024;
        this.analyser.smoothingTimeConstant = 0.2;
        source.connect(this.analyser);

        if (this.audioContext.state === 'suspended') {
          try {
            await this.audioContext.resume();
          } catch {}
        }
      }

      return true;
    } catch (err) {
      console.error('Microphone initialization failed:', err);
      return false;
    }
  }

  public setAutoSubmitCallback(cb: AutoSubmitCallback) {
    this.autoSubmitCallback = cb;
  }

  public setSpeechCallback(cb: SpeechCallback) {
    this.speechCallback = cb;
  }

  public setVolumeCallback(cb: VolumeCallback) {
    this.volumeCallback = cb;
  }

  public setLanguage(lang: string) {
    this.selectedLanguage = lang;
  }

  public startListening() {
    this.startContinuousAutoListen();
  }

  public stopListening() {
    this.stopContinuousAutoListen();
  }

  public setWakeWordCallback(_cb: () => void) {}

  public async toggleManualRecord(): Promise<boolean> {
    if (this.isListening) {
      this.stopContinuousAutoListen();
      return false;
    } else {
      await this.startContinuousAutoListen();
      return true;
    }
  }

  public async startContinuousAutoListen() {
    this.unlockAudio();
    const ready = await this.initMicrophone();
    if (!ready) return;

    this.isListening = true;
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch {}
    }

    this.startVADLoop();
  }

  public stopContinuousAutoListen() {
    this.isListening = false;
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    this.abortRecording();
  }

  private setMicTracksEnabled(enabled: boolean) {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  private startSpeechRecording() {
    if (!this.mediaStream || this.isSpeaking) return;
    try {
      this.audioChunks = [];
      this.silenceTimerMs = 0;
      this.recordingStartTime = Date.now();
      this.isRecordingChunk = true;
      this.malePitchFrames = 0;
      this.femalePitchFrames = 0;

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mimeType = 'audio/aac';
        }
      }

      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.mediaStream, { mimeType })
        : new MediaRecorder(this.mediaStream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecordedAudio();
      };

      // CRITICAL FOR IOS SAFARI: Do NOT pass a timeslice (e.g. 100ms) to start().
      // Timeslices with audio/mp4 fragment the container and corrupt the MP4 header on WebKit.
      // Calling start() without argument produces a single complete, valid audio file on stop().
      this.mediaRecorder.start();

      if (!this.isManualRecording && this.speechCallback) {
        this.speechCallback('🎙️ Hearing you... பேசுங்கள்...', false);
      }
    } catch (e) {
      console.error('Failed to start MediaRecorder:', e);
      this.isRecordingChunk = false;
    }
  }

  private stopSpeechRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.isRecordingChunk = false;
    this.isManualRecording = false;
    this.consecutiveSpeechFrames = 0;
    this.silenceTimerMs = 0;
    // Compute dominant vocal fundamental frequency (Male vs Female tone)
    this.lastDetectedGender = this.femalePitchFrames > this.malePitchFrames ? 'female' : 'male';
  }

  private abortRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.isRecordingChunk = false;
    this.isManualRecording = false;
    this.audioChunks = [];
  }

  /**
   * Continuous Adaptive Voice Activity Detection
   */
  private startVADLoop() {
    if (this.vadInterval) clearInterval(this.vadInterval);

    const buffer = new Uint8Array(this.analyser?.frequencyBinCount || 128);

    this.vadInterval = setInterval(() => {
      const now = Date.now();

      // Suppress mic during assistant speech or during echo cooldown
      if (!this.isListening || this.isSpeaking || now < this.speechCooldownUntil) {
        if (this.volumeCallback && (this.isSpeaking || now < this.speechCooldownUntil)) {
          this.volumeCallback(0);
        }
        return;
      }

      // Ensure AudioContext is alive
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      this.analyser?.getByteFrequencyData(buffer);

      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
      }
      const rawRms = Math.sqrt(sum / buffer.length);
      const rms = Math.round(rawRms);

      // Volume feedback for HUD Orb
      if (this.volumeCallback) {
        const norm = Math.min(100, Math.max(0, Math.round((rms / 40) * 100)));
        this.volumeCallback(norm);
      }

      // Slowly adapt ambient room noise baseline (bounded between 4 and 14)
      if (!this.isRecordingChunk) {
        this.baselineNoise = Math.max(4, Math.min(14, Math.round(this.baselineNoise * 0.95 + rms * 0.05)));
      }

      // Highly sensitive threshold: baseline + 2, minimum 5
      const dynamicThreshold = Math.max(5, this.baselineNoise + 2);

      // Track vocal fundamental pitch for Sir vs Ma'am speaker gender adaptation
      if (this.isRecordingChunk && this.audioContext && buffer.length >= 32) {
        const sampleRate = this.audioContext.sampleRate || 48000;
        const binWidth = sampleRate / 1024;
        const minBin = Math.max(1, Math.floor(75 / binWidth));
        const maxBin = Math.min(buffer.length - 1, Math.ceil(320 / binWidth));

        let maxVal = 0;
        let peakBin = minBin;
        for (let b = minBin; b <= maxBin; b++) {
          if (buffer[b] > maxVal) {
            maxVal = buffer[b];
            peakBin = b;
          }
        }

        if (maxVal > 25) {
          const estimatedPitch = peakBin * binWidth;
          if (estimatedPitch >= 165) {
            this.femalePitchFrames++;
          } else if (estimatedPitch >= 75) {
            this.malePitchFrames++;
          }
        }
      }

      if (!this.isRecordingChunk) {
        // Not recording yet: look for speech onset
        if (rms > dynamicThreshold) {
          this.consecutiveSpeechFrames++;
          if (this.consecutiveSpeechFrames >= 1) {
            this.startSpeechRecording();
          }
        } else {
          this.consecutiveSpeechFrames = 0;
        }
      } else {
        // Already recording: track speech continuation vs silence
        if (this.isManualRecording) return;

        const duration = now - this.recordingStartTime;

        // Force stop after 15 seconds
        if (duration >= 15000) {
          this.stopSpeechRecording();
          return;
        }

        if (rms > dynamicThreshold) {
          // User is actively speaking
          this.silenceTimerMs = 0;
        } else {
          // Silence detected
          this.silenceTimerMs += 40;

          // Natural 650ms silence detection: gives breathing room between Tamil words without cut-offs
          if (this.silenceTimerMs >= 650) {
            if (duration >= 300) {
              this.stopSpeechRecording();
            } else {
              this.abortRecording();
              if (this.speechCallback) this.speechCallback('', true);
            }
          }
        }
      }
    }, 40);
  }

  private async processRecordedAudio() {
    if (this.audioChunks.length === 0) {
      if (this.speechCallback) this.speechCallback('', true);
      return;
    }

    const recordedMime = this.mediaRecorder?.mimeType || 'audio/webm';
    const audioBlob = new Blob(this.audioChunks, { type: recordedMime });
    this.audioChunks = [];

    // Filter out tiny accidental noise spikes (< 250 bytes)
    if (audioBlob.size < 250) {
      if (this.speechCallback) this.speechCallback('', true);
      return;
    }

    if (this.speechCallback) {
      this.speechCallback('⚡ Processing voice...', false);
    }

    try {
      const formData = new FormData();
      let ext = 'webm';
      const typeStr = (audioBlob.type || recordedMime).toLowerCase();
      if (typeStr.includes('mp4') || typeStr.includes('m4a') || typeStr.includes('aac')) {
        ext = 'mp4';
      } else if (typeStr.includes('wav')) {
        ext = 'wav';
      } else if (typeStr.includes('ogg')) {
        ext = 'ogg';
      }
      formData.append('file', audioBlob, `speech.${ext}`);
      const cleanLang = this.selectedLanguage?.startsWith('ta') ? 'ta' : this.selectedLanguage?.startsWith('en') ? 'en' : 'auto';
      formData.append('language', cleanLang);

      const res = await fetch(`${getApiBaseUrl()}/api/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const text = (data.text || '').trim();

        if (text && text.length > 0) {
          const lower = text.toLowerCase().replace(/[^\w\s]/g, '').trim();
          const hallucinations = ['thank you', 'thanks for watching', 'subtitles by', 'amara', 'mbc', 'subscribe', 'you'];
          if (hallucinations.includes(lower)) {
            if (this.speechCallback) this.speechCallback('', true);
            return;
          }

          if (this.speechCallback) {
            this.speechCallback(text, true);
          }
          if (this.autoSubmitCallback) {
            this.autoSubmitCallback(text, this.lastDetectedGender);
          }
        } else {
          if (this.speechCallback) this.speechCallback('', true);
        }
      } else {
        if (this.speechCallback) this.speechCallback('', true);
      }
    } catch (err) {
      console.error('Speech transcription failed:', err);
      if (this.speechCallback) this.speechCallback('', true);
    }
  }

  /**
   * High-Reliability Neural Speech Synthesis Playback
   * Primary: Web Audio API (Plays reliably on iOS even after async delay)
   * Secondary: Shared persistent HTMLAudioElement fallback
   */
  public async speak(text: string, language?: string): Promise<void> {
    this.stopSpeaking();

    const playbackId = ++this.activePlaybackId;
    this.isSpeaking = true;

    // 1. Temporarily mute mic track so iOS doesn't divert audio to phone earpiece
    this.setMicTracksEnabled(false);

    try {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch {}
      }

      const res = await fetch(`${getApiBaseUrl()}/api/voice/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: language || this.selectedLanguage }),
      });

      if (!res.ok) {
        console.warn(`Speech synthesis API returned status ${res.status}`);
        return;
      }

      const blob = await res.blob();
      if (blob.size < 100) return;
      if (playbackId !== this.activePlaybackId) return;

      // Method A: Web Audio API (Primary for iOS & Desktop)
      let playedViaWebAudio = false;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!this.audioContext && AudioCtx) {
          this.audioContext = new AudioCtx();
        }

        if (this.audioContext) {
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }

          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

          if (playbackId !== this.activePlaybackId) return;

          await new Promise<void>((resolve) => {
            const source = this.audioContext!.createBufferSource();
            this.currentAudioSourceNode = source;
            source.buffer = audioBuffer;
            source.connect(this.audioContext!.destination);

            let finished = false;
            const finish = () => {
              if (finished) return;
              finished = true;
              if (this.currentAudioSourceNode === source) {
                this.currentAudioSourceNode = null;
              }
              resolve();
            };

            source.onended = finish;
            const durationSec = audioBuffer.duration || 5;
            setTimeout(finish, (durationSec + 2) * 1000);

            source.start(0);
            playedViaWebAudio = true;
          });
        }
      } catch (webAudioErr) {
        console.warn('Web Audio playback error, falling back to HTML5 Audio:', webAudioErr);
        playedViaWebAudio = false;
      }

      // Method B: Fallback to persistent HTMLAudioElement
      if (!playedViaWebAudio && playbackId === this.activePlaybackId) {
        const audioUrl = URL.createObjectURL(blob);
        const audio = this.sharedAudioElement || new Audio();
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        audio.src = audioUrl;
        this.currentAudio = audio;

        await new Promise<void>((resolve) => {
          let finished = false;
          const cleanup = () => {
            if (finished) return;
            finished = true;
            try {
              URL.revokeObjectURL(audioUrl);
            } catch {}
            resolve();
          };

          audio.onended = cleanup;
          audio.onerror = cleanup;
          const watchdog = setTimeout(cleanup, 25000);

          audio.play().catch((err) => {
            console.warn('HTML Audio play error:', err);
            clearTimeout(watchdog);
            cleanup();
          });
        });
      }
    } catch (err) {
      console.error('Speech synthesis request error:', err);
    } finally {
      if (playbackId === this.activePlaybackId) {
        this.isSpeaking = false;
        this.currentAudio = null;
        this.currentAudioSourceNode = null;
        // Re-enable microphone track
        this.setMicTracksEnabled(true);
        // Snappy 350ms cooldown so mic is immediately ready for next turn
        this.speechCooldownUntil = Date.now() + 350;
      }
    }
  }

  public stopSpeaking() {
    this.activePlaybackId++;
    if (this.currentAudioSourceNode) {
      try {
        this.currentAudioSourceNode.stop();
        this.currentAudioSourceNode.disconnect();
      } catch {}
      this.currentAudioSourceNode = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
        this.currentAudio.src = '';
      } catch {}
      this.currentAudio = null;
    }
    this.setMicTracksEnabled(true);
    this.isSpeaking = false;
  }
}

export const speechEngine = new LunaSpeechEngine();
