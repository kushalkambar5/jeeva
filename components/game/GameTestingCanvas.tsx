'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ZoomIn,
  MapPin,
  Compass,
  ArrowLeft,
  X,
  Clock,
  Play,
  Pause,
  Sun,
  Moon,
  Users,
  Calendar,
  ChevronRight,
  MessageSquare,
  Mic,
  AlertTriangle,
  Loader2,
  Package,
  ShoppingBag,
} from 'lucide-react';
import { PhaserGame, PhaserGameRef } from './PhaserGame';
import { GameStateEvent, InteractionPoint, NPCWorldState } from './types';
import { sound } from './audio';
import PixelSprite from '../PixelSprite';
import { formatMinutesToTime } from './npcData';
import { WavRecorder } from '@/lib/wavRecorder';
import { MinecraftInventoryModal, MinecraftHotbar } from './MinecraftInventoryModal';
import { TradeNegotiationModal } from './TradeNegotiationModal';

export default function GameTestingCanvas() {
  const gameRef = useRef<PhaserGameRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<GameStateEvent>({
    playerX: 336,
    playerY: 350,
    currentZone: "Player's Homestead",
    isMoving: false,
    isSprinting: false,
    activeInteraction: null,
    gameTime: '09:30 AM',
    gameTimeMinutes: 570,
    npcs: [],
  });

  const [inspectModal, setInspectModal] = useState<InteractionPoint | null>(null);

  // Push-to-Talk Voice State
  const [voiceState, setVoiceState] = useState<{
    status: 'idle' | 'recording' | 'processing';
    recordingSeconds: number;
    error: string | null;
    targetNpc: NPCWorldState | null;
  }>({
    status: 'idle',
    recordingSeconds: 0,
    error: null,
    targetNpc: null,
  });

  // Dialogue Subtitles State (Down part of screen: "player: ..." "npc_name: ...")
  const [subtitleState, setSubtitleState] = useState<{
    playerText: string;
    npcName: string;
    replyText: string;
    language?: string;
    audioBase64?: string;
    isPlayingAudio: boolean;
    npcSpriteSrc?: string;
    npcRole?: string;
  } | null>(null);

  const wavRecorderRef = useRef<WavRecorder | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const subtitleDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1.6);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [showRoster, setShowRoster] = useState<boolean>(false);
  const [isClockPaused, setIsClockPaused] = useState<boolean>(false);
  const [timeSliderValue, setTimeSliderValue] = useState<number>(570);

  // Minecraft-Style Inventory & Trading State
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [selectedHotbarIndex, setSelectedHotbarIndex] = useState<number>(0);
  const [tradeModal, setTradeModal] = useState<{
    isOpen: boolean;
    merchantId: 'dev_shopkeeper' | 'arjun_mechanic';
    merchantName: string;
    merchantRole?: string;
    merchantSpriteSrc?: string;
  } | null>(null);

  // NPC Tool Use: Companion Following State
  const [followingNpcState, setFollowingNpcState] = useState<{
    npcId: string;
    name: string;
  } | null>(null);
  const [toolToast, setToolToast] = useState<string | null>(null);

  const handleStateChange = useCallback((event: GameStateEvent) => {
    setGameState((prev) => {
      if (event.isInsideInterior !== prev.isInsideInterior) {
        setShowMinimap(false);
        setInspectModal(null);
      }
      return event;
    });

    if (event.gameTimeMinutes !== undefined) {
      setTimeSliderValue(event.gameTimeMinutes);
    }

    if (event.followingNpcId !== undefined) {
      if (!event.followingNpcId) {
        setFollowingNpcState(null);
      } else if (event.npcs) {
        const found = event.npcs.find((n) => n.id === event.followingNpcId);
        if (found) {
          setFollowingNpcState({ npcId: found.id, name: found.name });
        }
      }
    }
  }, []);

  const handleZoomCycle = () => {
    let nextZoom = 1.2;
    if (zoomLevel === 1.2) nextZoom = 1.6;
    else if (zoomLevel === 1.6) nextZoom = 2.0;
    else nextZoom = 1.2;

    setZoomLevel(nextZoom);
    gameRef.current?.setZoom(nextZoom);
    sound.playInteractClick();
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Clean up audio & recording timers on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (subtitleDismissTimerRef.current) clearTimeout(subtitleDismissTimerRef.current);
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  const replaySubtitleAudio = useCallback((base64: string) => {
    if (!base64) return;
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      currentAudioRef.current = audio;
      setSubtitleState((prev) => (prev ? { ...prev, isPlayingAudio: true } : null));
      audio.onended = () => {
        setSubtitleState((prev) => (prev ? { ...prev, isPlayingAudio: false } : null));
      };
      audio.onerror = () => {
        setSubtitleState((prev) => (prev ? { ...prev, isPlayingAudio: false } : null));
      };
      audio.play().catch((err) => console.warn('Audio replay error:', err));
    } catch (e) {
      console.warn('Replay audio failed:', e);
    }
  }, []);

  const startVoiceRecording = useCallback(async (npc: NPCWorldState) => {
    if (isRecordingRef.current) return;

    // Pause any playing audio & clear dismiss timers
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (subtitleDismissTimerRef.current) {
      clearTimeout(subtitleDismissTimerRef.current);
      subtitleDismissTimerRef.current = null;
    }

    try {
      if (!wavRecorderRef.current) {
        wavRecorderRef.current = new WavRecorder();
      }
      await wavRecorderRef.current.start();
      isRecordingRef.current = true;
      recordingStartTimeRef.current = Date.now();

      setVoiceState({
        status: 'recording',
        recordingSeconds: 0,
        error: null,
        targetNpc: npc,
      });

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setVoiceState((prev) =>
          prev.status === 'recording'
            ? { ...prev, recordingSeconds: prev.recordingSeconds + 1 }
            : prev
        );
      }, 1000);
    } catch (err: unknown) {
      isRecordingRef.current = false;
      const msg = err instanceof Error ? err.message : String(err);
      setVoiceState({
        status: 'idle',
        recordingSeconds: 0,
        error: `Mic error: ${msg}. Check browser microphone permissions.`,
        targetNpc: null,
      });
      setTimeout(() => {
        setVoiceState((prev) => (prev.error?.includes('Mic error') ? { ...prev, error: null } : prev));
      }, 5000);
    }
  }, []);

  const stopVoiceRecordingAndSend = useCallback(async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (!isRecordingRef.current || !wavRecorderRef.current) {
      isRecordingRef.current = false;
      return;
    }

    isRecordingRef.current = false;
    const durationMs = Date.now() - recordingStartTimeRef.current;

    // Guard against accidental tap (< 350ms)
    if (durationMs < 350) {
      try {
        await wavRecorderRef.current.stop();
      } catch {}
      setVoiceState({
        status: 'idle',
        recordingSeconds: 0,
        error: 'Hold Space while speaking, then release Space to send.',
        targetNpc: null,
      });
      setTimeout(() => {
        setVoiceState((prev) => (prev.error?.includes('Hold Space') ? { ...prev, error: null } : prev));
      }, 4000);
      return;
    }

    const targetNpc =
      voiceState.targetNpc ||
      (gameState.activeInteraction?.type === 'npc' ? gameState.activeInteraction.npcData : null);

    if (!targetNpc) {
      try {
        await wavRecorderRef.current.stop();
      } catch {}
      setVoiceState({
        status: 'idle',
        recordingSeconds: 0,
        error: 'Step closer to an NPC to talk.',
        targetNpc: null,
      });
      return;
    }

    setVoiceState((prev) => ({ ...prev, status: 'processing', error: null }));

    try {
      const audioBlob = await wavRecorderRef.current.stop();

      const dist = Math.hypot(gameState.playerX - targetNpc.x, gameState.playerY - targetNpc.y);
      const formData = new FormData();
      formData.append('npcId', targetNpc.id);
      formData.append('language', 'auto');
      formData.append('playerDistance', dist.toFixed(1));
      formData.append('audio', audioBlob, 'speech.wav');

      const res = await fetch('/api/npc/talk', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to talk with NPC');
      }

      // 1. Play synthesized NPC sound reply
      if (data.audioBase64) {
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        }
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        currentAudioRef.current = audio;
        audio.onplay = () => {
          setSubtitleState((prev) => (prev ? { ...prev, isPlayingAudio: true } : null));
        };
        audio.onended = () => {
          setSubtitleState((prev) => (prev ? { ...prev, isPlayingAudio: false } : null));
          if (subtitleDismissTimerRef.current) clearTimeout(subtitleDismissTimerRef.current);
          subtitleDismissTimerRef.current = setTimeout(() => {
            setSubtitleState(null);
          }, 8000);
        };
        audio.onerror = () => {
          setSubtitleState((prev) => (prev ? { ...prev, isPlayingAudio: false } : null));
        };
        audio.play().catch((playErr) => console.warn('Audio play error:', playErr));
      }

      // 2. Display Subtitles at the bottom of the screen:
      // "player: ....................................."
      // "npc_name: ......................."
      setSubtitleState({
        playerText: data.playerText,
        npcName: data.npcName || targetNpc.name,
        replyText: data.replyText,
        language: data.language,
        audioBase64: data.audioBase64 || undefined,
        isPlayingAudio: Boolean(data.audioBase64),
        npcSpriteSrc: targetNpc.spriteSrc,
        npcRole: data.npcRole || targetNpc.activityLabel || 'Villager',
      });

      // 3. Process AI NPC Tool Use (follow_player, stop_following, open_trade)
      if (data.toolCall) {
        if (data.toolCall.tool === 'follow_player') {
          gameRef.current?.followPlayer(data.toolCall.targetNpcId);
          setFollowingNpcState({
            npcId: data.toolCall.targetNpcId,
            name: data.npcName || targetNpc.name,
          });
          setToolToast(`🐾 ${data.npcName || targetNpc.name} is now following you!`);
          setTimeout(() => setToolToast(null), 4000);
        } else if (data.toolCall.tool === 'stop_following') {
          gameRef.current?.stopFollowing();
          setFollowingNpcState(null);
          setToolToast(`${data.npcName || targetNpc.name} stopped following.`);
          setTimeout(() => setToolToast(null), 4000);
        } else if (data.toolCall.tool === 'open_trade') {
          const isMerchant = targetNpc.id === 'dev_shopkeeper' || targetNpc.id === 'arjun_mechanic';
          if (isMerchant) {
            setTradeModal({
              isOpen: true,
              merchantId: targetNpc.id as 'dev_shopkeeper' | 'arjun_mechanic',
              merchantName: targetNpc.name,
              merchantRole: targetNpc.role,
              merchantSpriteSrc: targetNpc.spriteSrc,
            });
          }
        }
      }

      setVoiceState({
        status: 'idle',
        recordingSeconds: 0,
        error: null,
        targetNpc: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setVoiceState({
        status: 'idle',
        recordingSeconds: 0,
        error: msg,
        targetNpc: null,
      });
      setTimeout(() => {
        setVoiceState((prev) => (prev.error ? { ...prev, error: null } : prev));
      }, 5000);
    }
  }, [gameState.activeInteraction, gameState.playerX, gameState.playerY, voiceState.targetNpc]);

  const handleTriggerInteraction = useCallback(() => {
    if (gameState.activeInteraction) {
      const isDoor =
        gameState.activeInteraction.type === 'door' &&
        Boolean(gameState.activeInteraction.targetInterior);
      const isExit = gameState.activeInteraction.type === 'exit_door';

      gameRef.current?.triggerInteraction();

      if (gameState.activeInteraction.type === 'npc' && gameState.activeInteraction.npcData) {
        // Prompt player to hold Space
        setVoiceState((prev) => ({
          ...prev,
          error: `Hold [Space] to speak with ${gameState.activeInteraction?.name}!`,
        }));
        setTimeout(() => setVoiceState((prev) => ({ ...prev, error: null })), 3000);
      } else if (!isDoor && !isExit) {
        setInspectModal(gameState.activeInteraction);
      } else {
        setInspectModal(null);
      }
    }
  }, [gameState.activeInteraction]);

  const handleCommandFollow = useCallback((npcId: string, npcName: string) => {
    const ok = gameRef.current?.followPlayer(npcId);
    if (ok) {
      setFollowingNpcState({ npcId, name: npcName });
      setToolToast(`🐾 ${npcName} is now following you!`);
      setTimeout(() => setToolToast(null), 4000);
      sound.playQuestAccept();
    }
  }, []);

  const handleCommandStopFollowing = useCallback(() => {
    gameRef.current?.stopFollowing();
    setFollowingNpcState(null);
    setToolToast('Companion returned to routine.');
    setTimeout(() => setToolToast(null), 3000);
    sound.playInteractClick();
  }, []);

  const handleOpenTradeForNpc = useCallback((npc: NPCWorldState) => {
    const isMerchant = npc.id === 'dev_shopkeeper' || npc.id === 'arjun_mechanic';
    if (isMerchant) {
      setTradeModal({
        isOpen: true,
        merchantId: npc.id as 'dev_shopkeeper' | 'arjun_mechanic',
        merchantName: npc.name,
        merchantRole: npc.role,
        merchantSpriteSrc: npc.spriteSrc,
      });
      setInspectModal(null);
      setSubtitleState(null);
    }
  }, []);

  const handleSetPresetTime = (minutes: number) => {
    setTimeSliderValue(minutes);
    gameRef.current?.setGameTime(minutes);
    sound.playInteractClick();
  };

  const handleTimeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setTimeSliderValue(val);
    gameRef.current?.setGameTime(val);
  };

  const handleToggleClock = () => {
    const next = !isClockPaused;
    setIsClockPaused(next);
    gameRef.current?.toggleClock(!next);
    sound.playInteractClick();
  };

  const handleTeleportToNpc = (npc: NPCWorldState) => {
    gameRef.current?.teleportTo(npc.x, npc.y);
    setShowRoster(false);
    sound.playFootstep();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept game hotkeys if the user is typing in a text field
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      // SPACEBAR: Push-to-Talk for NPCs (or Interact if object)
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (e.repeat) return;

        if (gameState.activeInteraction?.type === 'npc' && gameState.activeInteraction.npcData) {
          startVoiceRecording(gameState.activeInteraction.npcData);
        } else if (gameState.activeInteraction) {
          handleTriggerInteraction();
        }
        return;
      }

      if ((e.key === 'm' || e.key === 'M') && !gameState.isInsideInterior) {
        setShowMinimap((prev) => !prev);
      }
      if (e.key === 'r' || e.key === 'R') {
        setShowRoster((prev) => !prev);
      }
      if (e.key === 'i' || e.key === 'I' || e.key === 'b' || e.key === 'B') {
        setIsInventoryOpen((prev) => !prev);
      }
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        setSelectedHotbarIndex(parseInt(e.key, 10) - 1);
      }
      if (e.key === 'e' || e.key === 'E') {
        if (gameState.activeInteraction) {
          if (gameState.activeInteraction.type === 'npc' && gameState.activeInteraction.npcData) {
            setVoiceState((prev) => ({
              ...prev,
              error: `Hold [Space] to speak with ${gameState.activeInteraction?.name}!`,
            }));
            setTimeout(() => setVoiceState((prev) => ({ ...prev, error: null })), 3000);
          } else {
            handleTriggerInteraction();
          }
        }
      }
      if (e.key === 'Escape') {
        setInspectModal(null);
        setShowMinimap(false);
        setShowRoster(false);
        setIsInventoryOpen(false);
        setTradeModal(null);
        if (subtitleState) {
          if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
          }
          setSubtitleState(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (isRecordingRef.current) {
          stopVoiceRecordingAndSend();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    gameState.activeInteraction,
    gameState.isInsideInterior,
    handleTriggerInteraction,
    startVoiceRecording,
    stopVoiceRecordingAndSend,
    subtitleState,
  ]);

  // Mini-map coordinates scaling (1920x1440 map -> 280x210 minimap)
  const mapWidth = 1920;
  const mapHeight = 1440;
  const mmW = 280;
  const mmH = 210;
  const playerMmX = Math.min(Math.max((gameState.playerX / mapWidth) * mmW, 4), mmW - 4);
  const playerMmY = Math.min(Math.max((gameState.playerY / mapHeight) * mmH, 4), mmH - 4);

  const currentMinutes = gameState.gameTimeMinutes ?? 570;
  const isNight = currentMinutes < 360 || currentMinutes >= 1140; // before 6am or after 7pm

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-[#79C867] text-[#F3F4F1] font-sans select-none"
    >
      {/* 1. THE PHASER 3 GAME CANVAS (100% Fullscreen) */}
      <main className="absolute inset-0 w-full h-full overflow-hidden">
        <PhaserGame ref={gameRef} onStateChange={handleStateChange} />
      </main>

      {/* 2. FLOATING HUD HEADER */}
      <header className="absolute top-0 left-0 right-0 z-30 h-16 bg-transparent px-4 py-3 flex items-center justify-between pointer-events-none">
        {/* Left: Back Link & Title Pill */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#14271A]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#78A85B]/40 shadow-xl">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-[#1F3B27] hover:bg-[#315B3C] border border-[#28392E] text-[#FFF8E9] transition font-pixel"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>

          <div className="h-4 w-px bg-[#28392E]" />

          <span className="font-pixel text-sm font-bold text-[#F4D477] tracking-wider flex items-center gap-1.5">
            <span>JEEVA VILLAGE</span>
            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#315B3C] text-[#93C476] border border-[#78A85B]/40">
              Schedule Simulation
            </span>
          </span>
        </div>

        {/* Center: In-Game Clock & Schedule Time Control Pill */}
        <div className="hidden md:flex items-center gap-2.5 pointer-events-auto bg-[#14271A]/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#78A85B]/40 shadow-xl">
          <div className="flex items-center gap-1.5 font-pixel text-xs text-[#F4D477] font-bold">
            {isNight ? (
              <Moon className="w-3.5 h-3.5 text-[#75B9D0]" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-[#F4D477] animate-spin" />
            )}
            <span>{gameState.gameTime || '09:30 AM'}</span>
          </div>

          <button
            onClick={handleToggleClock}
            title={isClockPaused ? 'Resume Clock' : 'Pause Clock'}
            className="p-1 rounded bg-[#1F3B27] hover:bg-[#315B3C] border border-[#28392E] text-[#93C476] transition cursor-pointer"
          >
            {isClockPaused ? <Play className="w-3 h-3 text-[#93C476]" /> : <Pause className="w-3 h-3 text-[#F4D477]" />}
          </button>

          <div className="h-3 w-px bg-[#28392E]" />

          {/* Preset Buttons */}
          <div className="flex items-center gap-1 text-[10px] font-pixel">
            <button
              onClick={() => handleSetPresetTime(360)}
              className="px-2 py-0.5 rounded bg-[#1F3B27] hover:bg-[#315B3C] text-[#FFF8E9] border border-[#28392E] transition"
              title="Dawn - 06:00 AM"
            >
              06:00 Dawn
            </button>
            <button
              onClick={() => handleSetPresetTime(570)}
              className="px-2 py-0.5 rounded bg-[#315B3C] hover:bg-[#78A85B] text-[#F4D477] border border-[#78A85B]/50 transition font-bold"
              title="Morning - 09:30 AM"
            >
              09:30 Day
            </button>
            <button
              onClick={() => handleSetPresetTime(810)}
              className="px-2 py-0.5 rounded bg-[#1F3B27] hover:bg-[#315B3C] text-[#FFF8E9] border border-[#28392E] transition"
              title="Midday - 01:30 PM"
            >
              13:30 Noon
            </button>
            <button
              onClick={() => handleSetPresetTime(1050)}
              className="px-2 py-0.5 rounded bg-[#1F3B27] hover:bg-[#315B3C] text-[#FFF8E9] border border-[#28392E] transition"
              title="Dusk - 05:30 PM"
            >
              17:30 Dusk
            </button>
            <button
              onClick={() => handleSetPresetTime(1320)}
              className="px-2 py-0.5 rounded bg-[#1F3B27] hover:bg-[#315B3C] text-[#75B9D0] border border-[#28392E] transition"
              title="Night - 10:00 PM"
            >
              22:00 Night
            </button>
          </div>

          <div className="h-3 w-px bg-[#28392E]" />

          {/* Time Scrubber Slider */}
          <div className="flex items-center gap-1.5 w-24">
            <input
              type="range"
              min={0}
              max={1439}
              step={15}
              value={timeSliderValue}
              onChange={handleTimeSliderChange}
              title={`Scrub Schedule Time: ${formatMinutesToTime(timeSliderValue)}`}
              className="w-full h-1 bg-[#1F3B27] accent-[#F4D477] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Right: Quick Action Controls Pill */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#14271A]/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-[#78A85B]/40 shadow-xl">
          {/* Minecraft Inventory Button */}
          <button
            onClick={() => setIsInventoryOpen((prev) => !prev)}
            title="Open 15-Slot Minecraft Inventory (Key: I)"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition font-pixel ${
              isInventoryOpen
                ? 'bg-[#315B3C] border-[#78A85B] text-[#F4D477]'
                : 'bg-[#1F3B27] border-[#28392E] text-[#FFF8E9] hover:bg-[#315B3C]'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-[#F4D477]" />
            <span>Bag</span>
          </button>

          {/* NPC Roster Button */}
          <button
            onClick={() => setShowRoster((prev) => !prev)}
            title="Village Residents Schedule (Key: R)"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition font-pixel ${
              showRoster
                ? 'bg-[#315B3C] border-[#78A85B] text-[#F4D477]'
                : 'bg-[#1F3B27] border-[#28392E] text-[#FFF8E9] hover:bg-[#315B3C]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#F4D477]" />
            <span>NPCs ({gameState.npcs?.length || 10})</span>
          </button>

          {/* Zoom Control */}
          <button
            onClick={handleZoomCycle}
            title="Cycle Camera Zoom (Key: Z)"
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-[#1F3B27] hover:bg-[#315B3C] border border-[#28392E] text-[#FFF8E9] transition font-pixel"
          >
            <ZoomIn className="w-3.5 h-3.5 text-[#F4D477]" />
            <span>{zoomLevel.toFixed(1)}x</span>
          </button>

          {/* Minimap Toggle */}
          <button
            onClick={() => {
              if (!gameState.isInsideInterior) {
                setShowMinimap((prev) => !prev);
              }
            }}
            disabled={gameState.isInsideInterior}
            title={
              gameState.isInsideInterior
                ? 'Minimap (Village Exterior Only)'
                : 'Toggle Minimap (Key: M)'
            }
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition font-pixel ${
              gameState.isInsideInterior
                ? 'opacity-40 cursor-not-allowed bg-[#1F3B27] border-[#28392E] text-stone-400'
                : showMinimap
                ? 'bg-[#315B3C] border-[#78A85B] text-[#F4D477]'
                : 'bg-[#1F3B27] border-[#28392E] text-[#FFF8E9] hover:bg-[#315B3C]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Map</span>
          </button>

          {/* Sound Mute */}
          <button
            onClick={handleToggleMute}
            title="Toggle Sound Effects"
            className="p-1.5 rounded bg-[#1F3B27] hover:bg-[#315B3C] border border-[#28392E] text-[#FFF8E9] transition"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[#E98F9F]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#93C476]" />
            )}
          </button>

          {/* Fullscreen */}
          <button
            onClick={handleToggleFullscreen}
            title="Toggle Fullscreen"
            className="hidden sm:block p-1.5 rounded bg-[#1F3B27] hover:bg-[#315B3C] border border-[#28392E] text-[#FFF8E9] transition"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2B. FOLLOWER COMPANION STATUS HUD */}
      {followingNpcState && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-[#14271A]/95 backdrop-blur-md border-2 border-[#78A85B] rounded-full px-4 py-1.5 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <span className="flex items-center gap-1.5 font-pixel text-xs text-[#F4D477] font-bold">
            <span className="animate-bounce">🐾</span>
            <span>{followingNpcState.name} is following you</span>
          </span>
          <button
            onClick={handleCommandStopFollowing}
            className="px-2.5 py-0.5 rounded bg-[#3A1414] hover:bg-[#521C1C] border border-[#E05252] text-[#FFC1C1] text-[10px] font-pixel transition cursor-pointer"
          >
            Stop Following
          </button>
        </div>
      )}

      {/* 2C. TOOL ACTION TOAST NOTICE */}
      {toolToast && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-[#1F3B27]/95 backdrop-blur-md border border-[#78A85B] rounded-lg px-4 py-1.5 shadow-xl text-xs font-pixel text-[#FFF8E9] animate-in fade-in duration-150">
          {toolToast}
        </div>
      )}

      {/* 3. PROXIMITY INTERACTION BANNER & VOICE PUSH-TO-TALK HUD */}
      {/* 3A. Active Voice Recording Indicator (While Space is held) */}
      {voiceState.status === 'recording' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#14271A]/95 backdrop-blur-md border-2 border-[#E05252] rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3.5 animate-pulse">
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
          </span>
          <Mic className="w-5 h-5 text-red-400 animate-bounce" />
          <div className="text-sm font-pixel text-[#FFF8E9]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#F4D477]">Listening...</span>
              <span className="text-[11px] font-mono text-[#BAC9B9]">
                ({voiceState.recordingSeconds}s)
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#BAC9B9]">
              Release <span className="text-white font-bold">[Space]</span> when done speaking
            </div>
          </div>
        </div>
      )}

      {/* 3B. Processing Voice Indicator */}
      {voiceState.status === 'processing' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#14271A]/95 backdrop-blur-md border-2 border-[#F4D477] rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#F4D477] animate-spin" />
          <div className="text-sm font-pixel text-[#FFF8E9]">
            <div className="font-bold text-[#F4D477]">Processing & Auto-detecting Language...</div>
            <div className="text-[11px] font-mono text-[#93C476]">
              {voiceState.targetNpc?.name || 'Villager'} is preparing spoken reply
            </div>
          </div>
        </div>
      )}

      {/* 3C. Error Notice */}
      {voiceState.error && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-[#3A1414]/95 backdrop-blur-md border border-[#E05252] rounded-lg px-4 py-2 text-xs text-[#FFC1C1] font-mono shadow-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#E05252] shrink-0" />
          <span>{voiceState.error}</span>
        </div>
      )}

      {/* 3D. Dialogue Subtitle Box (Down part of screen) */}
      {subtitleState && voiceState.status === 'idle' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[94%] md:w-full bg-[#14271A]/95 backdrop-blur-md border-2 border-[#78A85B] rounded-xl p-4 md:p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#28392E]">
            <div className="flex items-center gap-2.5">
              {subtitleState.npcSpriteSrc && (
                <div className="w-7 h-7 rounded bg-[#1F3B27] border border-[#78A85B]/50 flex items-center justify-center overflow-hidden shrink-0">
                  <PixelSprite
                    src={subtitleState.npcSpriteSrc}
                    frameWidth={32}
                    frameHeight={32}
                    scale={1.1}
                    animate={false}
                  />
                </div>
              )}
              <div>
                <span className="font-pixel text-xs text-[#F4D477] font-bold tracking-wide">
                  {subtitleState.npcName}
                </span>
                {subtitleState.npcRole && (
                  <span className="text-[10px] text-[#BAC9B9] ml-2 font-mono">
                    ({subtitleState.npcRole})
                  </span>
                )}
              </div>
              {subtitleState.isPlayingAudio && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#315B3C] text-[#93C476] text-[10px] font-mono animate-pulse">
                  <Volume2 className="w-3 h-3 text-[#F4D477]" />
                  <span>Speaking</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {subtitleState.audioBase64 && (
                <button
                  onClick={() => replaySubtitleAudio(subtitleState.audioBase64!)}
                  title="Replay Voice Audio"
                  className="px-2 py-0.5 rounded bg-[#1F3B27] hover:bg-[#315B3C] border border-[#28392E] text-[#F4D477] transition cursor-pointer flex items-center gap-1 text-[10px] font-mono"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Replay Voice</span>
                </button>
              )}
              <button
                onClick={() => {
                  if (currentAudioRef.current) {
                    currentAudioRef.current.pause();
                    currentAudioRef.current = null;
                  }
                  setSubtitleState(null);
                }}
                className="p-1 rounded text-[#BAC9B9] hover:text-white hover:bg-[#1F3B27] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User Requested Format:
              "player: ....................................."
              "npc_name: ......................." */}
          <div className="space-y-1.5 text-sm md:text-[15px] font-sans leading-relaxed">
            <div className="bg-[#0F1712]/70 rounded-lg p-2.5 border border-[#28392E] flex items-start gap-2">
              <span className="font-pixel font-bold text-[#75B9D0] text-sm md:text-base shrink-0 select-none">
                player:
              </span>
              <span className="text-[#FFF8E9] leading-snug">
                {subtitleState.playerText}
              </span>
            </div>

            <div className="bg-[#0F1712]/70 rounded-lg p-2.5 border border-[#28392E] flex items-start gap-2">
              <span className="font-pixel font-bold text-[#F4D477] text-sm md:text-base shrink-0 select-none">
                {subtitleState.npcName.toLowerCase()}:
              </span>
              <span className="text-[#FFF8E9] font-medium leading-snug">
                {subtitleState.replyText}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#28392E]/60 text-[11px] font-mono text-[#93C476]/80">
            <div className="flex items-center gap-1.5">
              <span>Hold <span className="px-1.5 py-0.5 rounded bg-[#1F3B27] border border-[#78A85B]/40 text-[#F4D477] font-bold font-pixel text-[10px]">
                SPACE
              </span> to speak again</span>
            </div>
            {subtitleState.language && (
              <span className="text-[10px] text-stone-400">
                Auto-detected: {subtitleState.language}
              </span>
            )}
          </div>

          {/* Quick Tool Actions: Follow & Trade */}
          {(() => {
            const currentNpc =
              gameState.npcs?.find((n) => n.name.toLowerCase() === subtitleState.npcName.toLowerCase()) ||
              gameState.activeInteraction?.npcData;
            const isMerchant = currentNpc?.id === 'dev_shopkeeper' || currentNpc?.id === 'arjun_mechanic';
            const isCurrentlyFollowing =
              followingNpcState?.name.toLowerCase() === subtitleState.npcName.toLowerCase() ||
              (currentNpc && followingNpcState?.npcId === currentNpc.id);

            return (
              <div className="flex items-center gap-2 pt-2 mt-2 border-t border-[#28392E]">
                {/* Follow Tool Button */}
                {isCurrentlyFollowing ? (
                  <button
                    onClick={handleCommandStopFollowing}
                    className="px-2.5 py-1 rounded bg-[#3A1414] hover:bg-[#521C1C] border border-[#E05252] text-[#FFC1C1] font-pixel text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>🛑 Stop Following</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (currentNpc) {
                        handleCommandFollow(currentNpc.id, currentNpc.name);
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-[#315B3C] hover:bg-[#78A85B] border border-[#78A85B] text-[#FFF8E9] font-pixel text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>🐾 Follow Me (साथ चलो)</span>
                  </button>
                )}

                {/* Trade Tool Button for Shopkeeper & Mechanic */}
                {isMerchant && currentNpc && (
                  <button
                    onClick={() => handleOpenTradeForNpc(currentNpc)}
                    className="px-2.5 py-1 rounded bg-[#F4D477] hover:bg-[#ffe188] text-[#0F1712] font-pixel text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Trade & Negotiate (मोलभाव)</span>
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 3E. Proximity Interaction Banner (When near NPC or Object) */}
      {gameState.activeInteraction && voiceState.status === 'idle' && !subtitleState && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 animate-bounce">
          {gameState.activeInteraction.type === 'npc' && gameState.activeInteraction.npcData ? (
            <>
              <div
                onPointerDown={() => {
                  if (gameState.activeInteraction?.npcData) {
                    startVoiceRecording(gameState.activeInteraction.npcData);
                  }
                }}
                onPointerUp={stopVoiceRecordingAndSend}
                onPointerLeave={() => {
                  if (isRecordingRef.current) stopVoiceRecordingAndSend();
                }}
                className="px-4 py-2 bg-[#14271A]/95 border-2 border-[#F4D477] text-[#FFF8E9] hover:bg-[#1F3B27] rounded-lg shadow-2xl flex items-center gap-2.5 text-sm font-pixel ring-2 ring-[#F4D477]/40 transition cursor-pointer select-none"
              >
                <Mic className="w-4 h-4 text-[#F4D477]" />
                <span>
                  Hold <span className="px-2 py-0.5 rounded bg-[#F4D477] text-[#0F1712] font-bold text-xs tracking-wider">
                  SPACE
                </span> to talk with{' '}
                  <strong className="text-[#F4D477]">{gameState.activeInteraction.name}</strong>
                </span>
              </div>

              {/* Quick Trade Button if Shopkeeper or Mechanic */}
              {(gameState.activeInteraction.npcData.id === 'dev_shopkeeper' ||
                gameState.activeInteraction.npcData.id === 'arjun_mechanic') && (
                <button
                  onClick={() => handleOpenTradeForNpc(gameState.activeInteraction!.npcData!)}
                  className="px-3.5 py-2 bg-[#F4D477] hover:bg-[#ffe188] text-[#0F1712] border-2 border-[#F4D477] font-pixel text-xs font-bold rounded-lg shadow-2xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Trade</span>
                </button>
              )}

              {/* Follow Button */}
              {followingNpcState?.npcId === gameState.activeInteraction.npcData.id ? (
                <button
                  onClick={handleCommandStopFollowing}
                  className="px-3 py-2 bg-[#3A1414] hover:bg-[#521C1C] border-2 border-[#E05252] text-[#FFC1C1] font-pixel text-xs rounded-lg shadow-2xl transition cursor-pointer"
                >
                  🛑 Unfollow
                </button>
              ) : (
                <button
                  onClick={() =>
                    handleCommandFollow(
                      gameState.activeInteraction!.npcData!.id,
                      gameState.activeInteraction!.npcData!.name
                    )
                  }
                  className="px-3 py-2 bg-[#315B3C] hover:bg-[#78A85B] border-2 border-[#78A85B] text-[#FFF8E9] font-pixel text-xs rounded-lg shadow-2xl transition cursor-pointer flex items-center gap-1"
                >
                  <span>🐾 Follow</span>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleTriggerInteraction}
              className={`px-4 py-2 bg-[#14271A]/95 border-2 rounded-lg shadow-2xl flex items-center gap-2.5 text-sm font-pixel transition cursor-pointer ${
                gameState.activeInteraction.type === 'door' ||
                gameState.activeInteraction.type === 'exit_door'
                  ? 'border-[#93C476] text-[#FFF8E9] hover:bg-[#1F3B27] ring-2 ring-[#78A85B]/50'
                  : 'border-[#F4D477] text-[#FFF8E9] hover:bg-[#1F3B27]'
              }`}
            >
              <span className="w-6 h-6 rounded bg-[#F4D477] text-[#0F1712] font-bold flex items-center justify-center text-xs">
                E
              </span>
              <span>
                {gameState.activeInteraction.actionLabel || 'Interact'}:{' '}
                <strong className="text-[#F4D477]">{gameState.activeInteraction.name}</strong>
              </span>
            </button>
          )}
        </div>
      )}

      {/* 4. CONTROLS HELPER (Bottom-left overlay) */}
      <div className="hidden lg:block absolute bottom-4 left-4 z-20 bg-[#0F1712]/85 backdrop-blur-sm border border-[#28392E] rounded-md p-2.5 text-[11px] text-[#F3F4F1]/80 max-w-xs pointer-events-none shadow-xl">
        <div className="font-pixel text-[#F4D477] mb-1 font-bold flex items-center justify-between">
          <span>{gameState.isInsideInterior ? 'ROOM CONTROLS' : 'VILLAGE CONTROLS'}</span>
          <span className="text-[#93C476] text-[10px] font-mono">{gameState.gameTime}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <div>
            <span className="text-[#93C476] font-mono">WASD / Arrows</span>: Move
          </div>
          <div>
            <span className="text-[#93C476] font-mono">Shift</span>: Sprint
          </div>
          <div>
            <span className="text-[#93C476] font-mono">Hold Space</span>: Push-to-Talk (NPC)
          </div>
          <div>
            <span className="text-[#93C476] font-mono">E</span>: Open Doors / Inspect
          </div>
          <div>
            <span className="text-[#93C476] font-mono">R</span>: Villager Roster
          </div>
          <div>
            <span className="text-[#93C476] font-mono">M</span>: Village Map
          </div>
        </div>
      </div>

      {/* 5. INTERACTION MODAL POPUP */}
      {inspectModal && (
        <div className="absolute inset-0 z-40 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          {inspectModal.type === 'npc' && inspectModal.npcData ? (
            /* Dedicated Rich NPC Dialogue & Schedule Inspector Modal */
            <div className="bg-[#14271A] border-3 border-[#F4D477] rounded-xl p-6 max-w-xl w-full shadow-2xl relative text-[#F3F4F1] animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => setInspectModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded hover:bg-[#1F3B27] text-[#F3F4F1]/70 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Top Banner: Avatar + Name + Current Task */}
              <div className="flex items-start gap-4 pb-4 border-b border-[#28392E]">
                <div className="p-2 bg-[#0F1712] border-2 border-[#78A85B] rounded-lg shrink-0 flex items-center justify-center shadow-lg">
                  <PixelSprite
                    src={inspectModal.npcData.spriteSrc}
                    frameWidth={32}
                    frameHeight={32}
                    scale={2.8}
                    animate={true}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-pixel text-[#F4D477] font-bold tracking-wide">
                      {inspectModal.npcData.name}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-[#315B3C] text-[#93C476] font-pixel border border-[#78A85B]/40">
                      {inspectModal.npcData.role}
                    </span>
                  </div>

                  {/* Scheduled Activity Banner */}
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-[#F4D477]/20 border border-[#F4D477]/40 text-[#F4D477] font-pixel font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{inspectModal.npcData.timeSlot}</span>
                    </span>
                    <span className="text-[#93C476] font-pixel font-bold truncate">
                      {inspectModal.npcData.activityLabel}
                    </span>
                    <span className="text-[10px] text-[#BAC9B9] font-mono">
                      @{inspectModal.npcData.currentZone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Spoken Quote Box */}
              {inspectModal.npcData.quote && (
                <div className="my-3.5 p-3 rounded-lg bg-[#0F1712]/90 border border-[#78A85B]/40 relative">
                  <span className="text-[10px] font-pixel uppercase text-[#F4D477] block mb-1 font-bold flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-[#F4D477]" />
                    <span>Spoken Dialogue:</span>
                  </span>
                  <p className="text-xs font-sans italic text-[#FFF8E9] leading-relaxed">
                    &ldquo;{inspectModal.npcData.quote}&rdquo;
                  </p>
                </div>
              )}

              {/* Personality Traits & Backstory */}
              <div className="space-y-2 mb-4 text-xs font-sans">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-pixel text-[11px] text-[#A7BBA6]">Traits:</span>
                  {inspectModal.npcData.traits.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-[#1F3B27] border border-[#28392E] text-[10px] font-pixel uppercase text-[#E5F0D9]"
                    >
                      {t}
                    </span>
                  ))}
                  <span className="ml-auto text-[10px] text-[#75B9D0] font-mono">
                    Dialect: {inspectModal.npcData.speakingStyle.slice(0, 32)}...
                  </span>
                </div>

                <p className="text-[#BAC9B9] text-xs leading-relaxed line-clamp-3">
                  {inspectModal.npcData.bio}
                </p>
              </div>

              {/* Daily Schedule Timeline */}
              <div className="bg-[#0F1712] border border-[#28392E] rounded-lg p-3 mb-4">
                <span className="font-pixel text-xs text-[#F4D477] font-bold block mb-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#F4D477]" />
                  <span>Daily Routine Schedule:</span>
                </span>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[11px] font-sans">
                  {inspectModal.npcData.defaultSchedule.map((slot, idx) => {
                    const isActive = slot.time === inspectModal.npcData?.timeSlot;
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 p-1.5 rounded transition ${
                          isActive
                            ? 'bg-[#315B3C]/70 border border-[#F4D477] text-white shadow-sm'
                            : 'bg-[#14271A]/50 border border-transparent text-[#A7BBA6]'
                        }`}
                      >
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                            isActive ? 'bg-[#F4D477] text-[#0F1712]' : 'bg-[#1F3B27] text-[#78A85B]'
                          }`}
                        >
                          {slot.time}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-pixel uppercase text-[10px] text-[#FFF8E9] block font-bold">
                            {slot.activity.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-[#BAC9B9] block truncate">
                            {slot.description}
                          </span>
                        </div>
                        {isActive && (
                          <span className="text-[9px] font-pixel text-[#F4D477] shrink-0 font-bold">
                            CURRENT
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#28392E]">
                <div className="flex items-center gap-1 text-[10px] text-[#93C476] font-mono">
                  <span>Authorized actions:</span>
                  <span className="text-[#FFF8E9] font-bold">
                    {inspectModal.npcData.allowedActions.slice(0, 3).join(', ')}...
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Follow Tool Button */}
                  {followingNpcState?.npcId === inspectModal.npcData.id ? (
                    <button
                      onClick={handleCommandStopFollowing}
                      className="px-3 py-1.5 bg-[#3A1414] hover:bg-[#521C1C] border border-[#E05252] text-[#FFC1C1] font-pixel text-xs rounded transition cursor-pointer"
                    >
                      🛑 Unfollow
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (inspectModal.npcData) {
                          handleCommandFollow(inspectModal.npcData.id, inspectModal.npcData.name);
                        }
                      }}
                      className="px-3 py-1.5 bg-[#315B3C] hover:bg-[#78A85B] border border-[#78A85B] text-white font-pixel text-xs rounded transition cursor-pointer flex items-center gap-1"
                    >
                      <span>🐾 Follow Me</span>
                    </button>
                  )}

                  {/* Trade Button for Dev and Arjun */}
                  {(inspectModal.npcData.id === 'dev_shopkeeper' ||
                    inspectModal.npcData.id === 'arjun_mechanic') && (
                    <button
                      onClick={() => handleOpenTradeForNpc(inspectModal.npcData!)}
                      className="px-3 py-1.5 bg-[#F4D477] hover:bg-[#ffe188] text-black font-pixel text-xs font-bold rounded shadow transition cursor-pointer flex items-center gap-1"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Trade & Haggle</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (inspectModal.npcData) {
                        const target = inspectModal.npcData;
                        setInspectModal(null);
                        setVoiceState((prev) => ({
                          ...prev,
                          error: `Hold [Space] to speak with ${target.name}!`,
                        }));
                        setTimeout(() => setVoiceState((prev) => ({ ...prev, error: null })), 3000);
                      }
                    }}
                    className="px-3 py-1.5 bg-[#1F3B27] hover:bg-[#315B3C] border border-[#28392E] text-[#F4D477] font-pixel text-xs font-bold rounded shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Talk</span>
                  </button>

                  <button
                    onClick={() => setInspectModal(null)}
                    className="px-3.5 py-1.5 bg-[#1F3B27] hover:bg-[#315B3C] border border-[#28392E] rounded font-pixel text-xs text-[#BAC9B9] transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Landmark / Chest / Door Modal */
            <div className="bg-[#14271A] border-2 border-[#78A85B] rounded-xl p-6 max-w-md w-full shadow-2xl relative">
              <button
                onClick={() => setInspectModal(null)}
                className="absolute top-4 right-4 p-1 rounded hover:bg-[#1F3B27] text-[#F3F4F1]/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2 font-pixel text-xl text-[#F4D477]">
                <span>{inspectModal.title}</span>
              </div>

              <p className="text-sm text-[#FFF8E9]/90 mb-4 leading-relaxed font-sans">
                {inspectModal.description}
              </p>

              <div className="bg-[#0F1712] border border-[#28392E] rounded-lg p-3 text-xs text-[#93C476] mb-4">
                <span className="font-pixel text-[#F4D477] block mb-0.5">Status:</span>
                {inspectModal.type === 'door' ? (
                  <span>Interior level connection primed for upcoming scene load.</span>
                ) : inspectModal.type === 'chest' ? (
                  <span>Treasure cataloged in player exploration inventory!</span>
                ) : (
                  <span>Interactive landmark active. Village autonomy online.</span>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setInspectModal(null)}
                  className="px-4 py-1.5 bg-[#315B3C] hover:bg-[#78A85B] border border-[#78A85B] rounded font-pixel text-xs text-[#FFF8E9] transition cursor-pointer"
                >
                  Continue Roaming
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. NPC ROSTER & SCHEDULE INSPECTOR DRAWER (Toggle via R button) */}
      {showRoster && (
        <div className="absolute top-16 right-4 z-40 bg-[#14271A]/95 border-2 border-[#78A85B] rounded-xl p-4 shadow-2xl max-w-sm w-full animate-in slide-in-from-right-5 duration-150">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#28392E]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#F4D477]" />
              <span className="font-pixel text-xs text-[#F4D477] font-bold uppercase tracking-wider">
                Village Resident Schedules
              </span>
            </div>
            <button
              onClick={() => setShowRoster(false)}
              className="text-xs text-[#FFF8E9]/70 hover:text-white p-1 rounded hover:bg-[#1F3B27] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {gameState.npcs && gameState.npcs.length > 0 ? (
              gameState.npcs.map((npc) => (
                <div
                  key={npc.id}
                  className="p-2.5 rounded-lg bg-[#0F1712]/90 border border-[#28392E] hover:border-[#78A85B] transition flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded bg-[#1F3B27] border border-[#78A85B]/40 shrink-0 flex items-center justify-center overflow-hidden">
                    <PixelSprite
                      src={npc.spriteSrc}
                      frameWidth={32}
                      frameHeight={32}
                      scale={1.4}
                      animate={false}
                    />
                  </div>

                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-pixel font-bold text-[#F4D477] truncate">
                        {npc.name}
                      </span>
                      <span className="text-[10px] text-[#93C476] font-mono">
                        {npc.timeSlot}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#BAC9B9] truncate">
                      {npc.activityLabel}
                    </div>

                    <div className="text-[10px] text-stone-400 font-mono flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5 text-[#F4D477]" />
                      <span className="truncate">{npc.currentZone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        handleTeleportToNpc(npc);
                        setVoiceState((prev) => ({
                          ...prev,
                          error: `Hold [Space] to speak with ${npc.name}!`,
                        }));
                        setTimeout(() => setVoiceState((prev) => ({ ...prev, error: null })), 3000);
                      }}
                      title="Approach & Talk with this NPC (Hold Space)"
                      className="px-2 py-1 rounded bg-[#F4D477] hover:bg-[#ffe188] text-black font-pixel text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Mic className="w-3 h-3" />
                      <span>Talk</span>
                    </button>

                    <button
                      onClick={() => handleTeleportToNpc(npc)}
                      title="Jump to this NPC"
                      className="p-1.5 rounded bg-[#315B3C] hover:bg-[#78A85B] text-[#FFF8E9] transition cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#BAC9B9] p-4 text-center">Loading villagers...</p>
            )}
          </div>
        </div>
      )}

      {/* 7. MINIMAP OVERLAY (Press M or Click Map) */}
      {showMinimap && (
        <div className="absolute top-16 right-4 z-40 bg-[#14271A]/95 border-2 border-[#78A85B] rounded-lg p-3 shadow-2xl">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#28392E]">
            <span className="font-pixel text-xs text-[#F4D477] font-bold">KAVERIPURA MINIMAP</span>
            <button
              onClick={() => setShowMinimap(false)}
              className="text-xs text-[#FFF8E9]/70 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            className="relative rounded border border-[#28392E] bg-[#1F3B27] overflow-hidden"
            style={{ width: `${mmW}px`, height: `${mmH}px` }}
          >
            {/* Main horizontal road */}
            <div
              className="absolute bg-[#C87545]/50"
              style={{ top: '88px', left: '18px', width: '244px', height: '14px' }}
            />
            {/* North roads */}
            <div
              className="absolute bg-[#C87545]/50"
              style={{ top: '42px', left: '46px', width: '10px', height: '48px' }}
            />
            <div
              className="absolute bg-[#C87545]/50"
              style={{ top: '42px', left: '102px', width: '10px', height: '48px' }}
            />
            <div
              className="absolute bg-[#C87545]/50"
              style={{ top: '42px', left: '167px', width: '10px', height: '48px' }}
            />
            <div
              className="absolute bg-[#C87545]/50"
              style={{ top: '42px', left: '223px', width: '10px', height: '48px' }}
            />

            {/* South roads */}
            <div
              className="absolute bg-[#C87545]/50"
              style={{ top: '100px', left: '46px', width: '10px', height: '48px' }}
            />
            <div
              className="absolute bg-[#C87545]/50"
              style={{ top: '100px', left: '134px', width: '10px', height: '80px' }}
            />
            <div
              className="absolute bg-[#C87545]/50"
              style={{ top: '100px', left: '205px', width: '10px', height: '48px' }}
            />

            {/* Central Plaza Cobblestone */}
            <div
              className="absolute bg-[#F4D477]/40 border border-[#F4D477]/60 rounded-full"
              style={{ top: '78px', left: '124px', width: '32px', height: '32px' }}
              title="Central Fountain"
            />

            {/* Buildings */}
            <div
              className="absolute bg-[#93C476] border border-black text-[7px] font-bold text-black flex items-center justify-center rounded-xs"
              style={{ top: '24px', left: '40px', width: '22px', height: '22px' }}
              title="Player Cottage"
            >
              H
            </div>
            <div
              className="absolute bg-[#75B9D0] border border-black text-[7px] font-bold text-black flex items-center justify-center rounded-xs"
              style={{ top: '24px', left: '96px', width: '22px', height: '22px' }}
              title="Clinic"
            >
              +
            </div>
            <div
              className="absolute bg-[#F4D477] border border-black text-[7px] font-bold text-black flex items-center justify-center rounded-xs"
              style={{ top: '24px', left: '161px', width: '22px', height: '22px' }}
              title="General Store"
            >
              $
            </div>
            <div
              className="absolute bg-[#C87545] border border-black text-[7px] font-bold text-black flex items-center justify-center rounded-xs"
              style={{ top: '24px', left: '217px', width: '22px', height: '22px' }}
              title="Workshop"
            >
              W
            </div>
            <div
              className="absolute bg-[#E98F9F] border border-black text-[7px] font-bold text-black flex items-center justify-center rounded-xs"
              style={{ top: '124px', left: '40px', width: '22px', height: '22px' }}
              title="Farm Barn"
            >
              B
            </div>
            <div
              className="absolute bg-[#78A85B] border border-black text-[7px] font-bold text-black flex items-center justify-center rounded-xs"
              style={{ top: '124px', left: '199px', width: '22px', height: '22px' }}
              title="Police Post"
            >
              P
            </div>

            {/* Lotus Pond */}
            <div
              className="absolute bg-[#75B9D0]/70 border border-[#5293a9] rounded-sm"
              style={{ top: '154px', left: '20px', width: '60px', height: '44px' }}
              title="Lotus Pond"
            />

            {/* Live NPC Markers on Minimap */}
            {gameState.npcs?.map((npc) => {
              const nmX = Math.min(Math.max((npc.x / mapWidth) * mmW, 4), mmW - 8);
              const nmY = Math.min(Math.max((npc.y / mapHeight) * mmH, 4), mmH - 8);
              return (
                <div
                  key={npc.id}
                  className="absolute w-2.5 h-2.5 rounded-full bg-[#F4D477] border border-black flex items-center justify-center text-[6px] font-bold text-black shadow-xs cursor-pointer hover:scale-125 transition"
                  style={{
                    left: `${nmX}px`,
                    top: `${nmY}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  title={`${npc.name}: ${npc.activityLabel} (@${npc.currentZone})`}
                  onClick={() => handleTeleportToNpc(npc)}
                >
                  {npc.name.charAt(0)}
                </div>
              );
            })}

            {/* Player Blip */}
            <div
              className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg animate-ping"
              style={{
                left: `${playerMmX}px`,
                top: `${playerMmY}px`,
                transform: 'translate(-50%, -50%)',
              }}
            />
            <div
              className="absolute w-2.5 h-2.5 bg-red-500 rounded-full border border-white"
              style={{
                left: `${playerMmX}px`,
                top: `${playerMmY}px`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>

          <div className="mt-2 text-[10px] text-[#BAC9B9] font-mono flex items-center justify-between">
            <span>Red: You</span>
            <span className="text-[#F4D477]">Gold: Villagers</span>
            <span>X:{gameState.playerX} Y:{gameState.playerY}</span>
          </div>
        </div>
      )}

      {/* 8. MINECRAFT HUD HOTBAR (Bottom-right / Bottom-center) */}
      <div className="absolute bottom-4 right-4 z-30 pointer-events-auto">
        <MinecraftHotbar
          onOpenInventory={() => setIsInventoryOpen(true)}
          selectedSlotIndex={selectedHotbarIndex}
          onSelectSlot={(idx) => setSelectedHotbarIndex(idx)}
        />
      </div>

      {/* 9. MINECRAFT 15-SLOT INVENTORY MODAL */}
      <MinecraftInventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        selectedHotbarIndex={selectedHotbarIndex}
        onSelectHotbarIndex={(idx) => setSelectedHotbarIndex(idx)}
      />

      {/* 10. SHOPKEEPER & MECHANIC TRADING & NEGOTIATION MODAL */}
      {tradeModal && (
        <TradeNegotiationModal
          isOpen={tradeModal.isOpen}
          onClose={() => setTradeModal(null)}
          merchantId={tradeModal.merchantId}
          merchantName={tradeModal.merchantName}
          merchantRole={tradeModal.merchantRole}
          merchantSpriteSrc={tradeModal.merchantSpriteSrc}
        />
      )}
    </div>
  );
}
