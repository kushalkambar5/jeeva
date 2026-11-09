'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Send,
  Volume2,
  X,
  Languages,
  Radio,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import PixelSprite from '../PixelSprite';
import { NPCWorldState } from './types';
import { WavRecorder } from '@/lib/wavRecorder';

export interface NPCDialogueModalProps {
  npc: NPCWorldState;
  playerDistance: number;
  thresholdRadius: number;
  onClose: () => void;
}

interface MessageEntry {
  sender: 'player' | 'npc';
  text: string;
  language: string;
  voice?: string;
  audioBase64?: string;
  timestamp: string;
  apiDetails?: {
    llmModel?: string;
    llmLatencyMs?: number;
    ttsVoice?: string;
    ttsLatencyMs?: number;
    isVoiceInput?: boolean;
  };
}

const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: '🌐 Auto Detect' },
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'mr-IN', label: 'मराठी (Marathi)' },
  { code: 'bn-IN', label: 'বাংলা (Bengali)' },
  { code: 'gu-IN', label: 'ગુજરાતી (Gujarati)' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ (Punjabi)' },
];

export default function NPCDialogueModal({
  npc,
  playerDistance,
  thresholdRadius = 60,
  onClose,
}: NPCDialogueModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [messages, setMessages] = useState<MessageEntry[]>([]);

  const wavRecorderRef = useRef<WavRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const pointerStartTimeRef = useRef<number>(0);
  const isPointerDownRef = useRef<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isWithinRadius = playerDistance <= thresholdRadius;

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Clean up recorder on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  // Play audio helper
  const playAudio = useCallback((base64: string) => {
    if (!base64) return;
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      currentAudioRef.current = audio;
      setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      audio.play().catch((err) => {
        console.warn('Audio play error:', err);
        setIsPlayingAudio(false);
      });
    } catch (e) {
      console.warn('Audio instantiation failed:', e);
      setIsPlayingAudio(false);
    }
  }, []);

  // Send message or audio to server
  const sendTurn = async (payload: { message?: string; audioBlob?: Blob }) => {
    if (!isWithinRadius) {
      setErrorMessage(`You are out of range (${playerDistance.toFixed(1)}px > ${thresholdRadius}px). Move closer.`);
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      let res: Response;

      if (payload.audioBlob) {
        const formData = new FormData();
        formData.append('npcId', npc.id);
        formData.append('language', selectedLanguage);
        formData.append('playerDistance', playerDistance.toString());
        // Standard true 16-bit PCM WAV from WavRecorder
        formData.append('audio', payload.audioBlob, 'recording.wav');

        res = await fetch('/api/npc/talk', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/npc/talk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            npcId: npc.id,
            message: payload.message,
            language: selectedLanguage,
            playerDistance,
          }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to talk with NPC');
      }

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Add player message
      const newMessages: MessageEntry[] = [
        ...messages,
        {
          sender: 'player',
          text: data.playerText,
          language: selectedLanguage,
          timestamp,
        },
        {
          sender: 'npc',
          text: data.replyText,
          language: data.language || selectedLanguage,
          voice: data.voice,
          audioBase64: data.audioBase64 || undefined,
          timestamp,
          apiDetails: data.apiDetails,
        },
      ];

      setMessages(newMessages);
      setInputText('');

      // Play synthesized audio if available
      if (data.audioBase64) {
        playAudio(data.audioBase64);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    sendTurn({ message: inputText.trim() });
  };

  // Start recording using native WavRecorder
  const startRecording = async () => {
    if (!isWithinRadius) {
      setErrorMessage('Out of talk range. Step closer to the NPC.');
      return;
    }
    setErrorMessage(null);

    try {
      if (!wavRecorderRef.current) {
        wavRecorderRef.current = new WavRecorder();
      }
      await wavRecorderRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingStartTimeRef.current = Date.now();

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Microphone access failed: ${msg}. You can type in the box below.`);
      setIsRecording(false);
    }
  };

  // Stop recording, retrieve PCM WAV blob, and submit turn
  const stopRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (!wavRecorderRef.current || !wavRecorderRef.current.isCurrentlyRecording()) {
      setIsRecording(false);
      return;
    }

    const durationMs = Date.now() - recordingStartTimeRef.current;
    setIsRecording(false);

    try {
      const wavBlob = await wavRecorderRef.current.stop();

      // Guard against accidental micro-clicks (< 400ms)
      if (durationMs < 400 || wavBlob.size < 500) {
        setErrorMessage('Recording was too short. Click the mic, speak your question, then click Stop.');
        return;
      }

      sendTurn({ audioBlob: wavBlob });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('WAV recording error:', msg);
      setErrorMessage(msg);
    }
  };

  // Pointer down: starts recording, or stops if already in toggle recording mode
  const handlePointerDown = async (e: React.PointerEvent) => {
    e.preventDefault();
    if (!isWithinRadius || isLoading) return;

    if (isRecording) {
      // If already recording, tapping/clicking again stops and submits
      await stopRecording();
      return;
    }

    pointerStartTimeRef.current = Date.now();
    isPointerDownRef.current = true;
    await startRecording();
  };

  // Pointer up: if user held button for >= 500ms, automatically stop and submit (push-to-talk)
  const handlePointerUp = async (e: React.PointerEvent) => {
    e.preventDefault();
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    const holdDuration = Date.now() - pointerStartTimeRef.current;

    // If held for 500ms or more, treat as push-to-talk release
    if (holdDuration >= 500) {
      await stopRecording();
    }
    // If < 500ms, leave recording active in click-to-talk mode until next tap
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 select-none">
      <div className="bg-[#14271A] border-3 border-[#F4D477] rounded-xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl text-[#F3F4F1] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* 1. HEADER: NPC IDENTITY & DISTANCE THRESHOLD MONITOR */}
        <div className="p-4 bg-[#0F1712] border-b border-[#28392E] flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-[#1F3B27] border-2 border-[#78A85B] rounded-lg shrink-0 flex items-center justify-center shadow-lg relative">
              <PixelSprite
                src={npc.spriteSrc}
                frameWidth={32}
                frameHeight={32}
                scale={2.4}
                animate={true}
              />
              {isPlayingAudio && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#F4D477] rounded-full animate-ping" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-pixel text-[#F4D477] font-bold tracking-wide truncate">
                  {npc.name}
                </h3>
                <span className="text-[10px] md:text-xs px-2 py-0.5 rounded bg-[#315B3C] text-[#93C476] font-pixel border border-[#78A85B]/40 shrink-0">
                  {npc.role}
                </span>
              </div>

              {/* Trait & Voice Indicators */}
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-[#BAC9B9]">
                <span className="font-pixel text-[#F4D477]/80">
                  Voice: {npc.id === 'priya_wife' ? 'Nalini' : 'Deepak'} (Gnani Timbre)
                </span>
                <span>•</span>
                <span className="truncate max-w-[220px]">
                  Traits: {npc.traits.slice(0, 3).join(', ')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Real-time Threshold Distance Pill */}
            <div
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono border flex items-center gap-1.5 shadow-sm ${
                isWithinRadius
                  ? 'bg-[#1F3B27] text-[#93C476] border-[#78A85B]/50'
                  : 'bg-red-950 text-red-300 border-red-700 animate-pulse'
              }`}
            >
              <Radio className={`w-3 h-3 ${isWithinRadius ? 'text-[#93C476]' : 'text-red-400'}`} />
              <span>
                {playerDistance.toFixed(0)}px / {thresholdRadius}px
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#1F3B27] text-[#FFF8E9]/70 hover:text-white transition cursor-pointer"
              title="Close dialogue (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. STATUTORY CONSTRAINTS BANNER */}
        <div className="px-4 py-1.5 bg-[#1A3322] border-b border-[#28392E] flex items-center justify-between text-[10px] font-mono text-[#BAC9B9]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-[#93C476]" />
            <span>Context: NPC_definitions traits only</span>
          </div>
          <div className="text-[#F4D477]">
            <span>Stateless (Memory disabled)</span>
          </div>
        </div>

        {/* OUT OF RANGE WARNING ALERT */}
        {!isWithinRadius && (
          <div className="mx-4 mt-3 p-2.5 rounded bg-red-900/60 border border-red-600 flex items-center gap-2 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-300 shrink-0" />
            <span>
              <strong>Player Out of Range:</strong> You are currently {playerDistance.toFixed(0)}px away.
              Walk back within {thresholdRadius}px to speak with {npc.name}.
            </span>
          </div>
        )}

        {/* ERROR MESSAGE NOTIFICATION */}
        {errorMessage && (
          <div className="mx-4 mt-2 p-2 rounded bg-amber-950/70 border border-amber-600 flex items-center justify-between text-xs text-amber-200">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-amber-400 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 3. DIALOGUE TRANSCRIPT AREA */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-[220px]">
          {messages.length === 0 && (
            <div className="p-6 rounded-xl bg-[#0F1712]/70 border border-[#28392E] text-center my-auto space-y-3">
              <div>
                <h4 className="font-pixel text-base text-[#F4D477]">
                  Speak or message {npc.name}
                </h4>
                <p className="text-xs text-[#BAC9B9] mt-1 max-w-sm mx-auto">
                  {npc.name}&apos;s context is bounded strictly to traits in the{' '}
                  <code className="text-[#93C476] font-mono">npc_definitions</code> table. No story or hardcoded dialogue.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 text-[10px] font-mono text-[#BAC9B9]">
                <span className="px-2 py-0.5 rounded bg-[#1F3B27] border border-[#28392E]">
                  Traits: {npc.traits.join(', ')}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1F3B27] border border-[#28392E]">
                  Role: {npc.role}
                </span>
              </div>
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'player' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[#BAC9B9] font-mono">
                <span className="font-pixel text-[#F4D477]">
                  {m.sender === 'player' ? 'You (Player)' : npc.name}
                </span>
                <span>•</span>
                <span>{m.timestamp}</span>
              </div>

              <div
                className={`max-w-[85%] rounded-xl p-3 text-sm leading-relaxed shadow-md ${
                  m.sender === 'player'
                    ? 'bg-[#315B3C] border border-[#78A85B] text-[#FFF8E9] rounded-tr-xs'
                    : 'bg-[#0F1712] border-2 border-[#78A85B]/60 text-[#FFF8E9] rounded-tl-xs'
                }`}
              >
                <p className="font-sans text-[13px] md:text-sm whitespace-pre-wrap">{m.text}</p>

                {/* NPC Audio playback controls */}
                {m.sender === 'npc' && (
                  <div className="mt-2.5 pt-2 border-t border-[#28392E] flex flex-wrap items-center justify-between gap-2 text-xs">
                    {m.audioBase64 && (
                      <button
                        onClick={() => playAudio(m.audioBase64!)}
                        className="px-2.5 py-1 rounded bg-[#1F3B27] hover:bg-[#315B3C] border border-[#78A85B]/50 text-[#F4D477] font-pixel text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#93C476]" />
                        <span>{isPlayingAudio ? 'Speaking...' : 'Hear Voice (Gnani TTS)'}</span>
                      </button>
                    )}

                    {m.apiDetails && (
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#93C476]/80 bg-[#14271A] px-2 py-0.5 rounded border border-[#28392E]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#93C476] animate-pulse" />
                        <span>
                          Live API: {m.apiDetails.llmModel} ({m.apiDetails.llmLatencyMs}ms)
                          {m.apiDetails.ttsLatencyMs ? ` • TTS: ${m.apiDetails.ttsLatencyMs}ms` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Live Recording Waves */}
          {isRecording && (
            <div className="flex items-center gap-3 p-3 bg-red-950/60 border-2 border-red-500 rounded-xl max-w-sm text-xs text-red-200 animate-pulse">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
              <div className="flex-1">
                <span className="font-pixel text-[12px] text-white block">
                  Recording microphone ({recordingSeconds}s)...
                </span>
                <span className="text-[10px] text-red-300">
                  Speak clearly in your language. Click red button when done.
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1 h-4 bg-red-400 rounded-full animate-bounce" />
                <span className="w-1 h-6 bg-red-300 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-3 bg-red-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-[#0F1712] border border-[#78A85B]/40 rounded-xl max-w-xs text-xs text-[#93C476]">
              <Loader2 className="w-4 h-4 animate-spin text-[#F4D477]" />
              <span className="font-pixel text-[11px] text-[#FFF8E9]">
                {npc.name} is listening & speaking...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. FOOTER CONTROLS: MULTILINGUAL SELECTOR & VOICE/TEXT INPUT */}
        <div className="p-3 bg-[#0F1712] border-t border-[#28392E] space-y-2.5 shrink-0">
          {/* Language Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="font-pixel text-[10px] text-[#BAC9B9] uppercase flex items-center gap-1 shrink-0">
              <Languages className="w-3 h-3 text-[#F4D477]" />
              <span>Language:</span>
            </span>

            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`px-2.5 py-1 rounded text-[11px] font-sans font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedLanguage === lang.code
                    ? 'bg-[#F4D477] text-black font-bold shadow-sm'
                    : 'bg-[#1F3B27] text-[#BAC9B9] hover:bg-[#315B3C] border border-[#28392E]'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Input Form & Push/Click-to-Talk Button */}
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            {/* Click-to-Talk / Push-to-Talk Mic Button (Native PCM WAV -> Gnani STT) */}
            <button
              type="button"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              disabled={!isWithinRadius || isLoading}
              title={
                isRecording
                  ? 'Click to stop & transcribe (Gnani Prisma)'
                  : 'Click or hold to speak (Gnani Prisma STT)'
              }
              className={`p-2.5 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 shadow-md ${
                isRecording
                  ? 'bg-red-600 border-red-300 text-white animate-pulse ring-2 ring-red-400'
                  : 'bg-[#1F3B27] hover:bg-[#315B3C] border-[#78A85B]/60 text-[#F4D477]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isRecording ? (
                <Square className="w-5 h-5 fill-current text-white" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            {/* Text Input Fallback */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isRecording
                  ? (selectedLanguage === 'auto' ? 'Recording speech... Tap red square to finish' : `Recording in ${selectedLanguage}... Click red square to send`)
                  : `Speak or type to ${npc.name} in any language (English, Hindi, etc.)...`
              }
              disabled={!isWithinRadius || isLoading || isRecording}
              className="flex-1 px-3 py-2 bg-[#14271A] border border-[#28392E] rounded-lg text-sm text-[#FFF8E9] placeholder-[#BAC9B9]/60 focus:outline-hidden focus:border-[#78A85B] transition disabled:opacity-40"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || !isWithinRadius || isLoading || isRecording}
              className="px-4 py-2 bg-[#315B3C] hover:bg-[#78A85B] border border-[#78A85B] rounded-lg font-pixel text-xs text-[#FFF8E9] transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>

          {/* Quick Helper Note */}
          <div className="flex items-center justify-between text-[10px] text-[#BAC9B9]/70 font-mono">
            <span>
              {isRecording
                ? 'Recording... Tap red button or release to send'
                : 'Click or hold mic to speak (Gnani Prisma STT), or type message'}
            </span>
            <span>Esc to exit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
