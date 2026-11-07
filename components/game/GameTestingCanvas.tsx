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
  Sparkles,
  Info,
  X,
  HelpCircle,
  Footprints,
  Clock,
  Play,
  Pause,
  Sun,
  Moon,
  Users,
  Calendar,
  ChevronRight,
  Shield,
  Heart,
  MessageSquare,
} from 'lucide-react';
import { PhaserGame, PhaserGameRef } from './PhaserGame';
import { GameStateEvent, InteractionPoint, NPCWorldState } from './types';
import { sound } from './audio';
import PixelSprite from '../PixelSprite';
import { formatMinutesToTime, timeStringToMinutes } from './npcData';

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
  const [zoomLevel, setZoomLevel] = useState<number>(1.6);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showRoster, setShowRoster] = useState<boolean>(false);
  const [isClockPaused, setIsClockPaused] = useState<boolean>(false);
  const [timeSliderValue, setTimeSliderValue] = useState<number>(570);

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

  const handleTriggerInteraction = () => {
    if (gameState.activeInteraction) {
      const isDoor =
        gameState.activeInteraction.type === 'door' &&
        Boolean(gameState.activeInteraction.targetInterior);
      const isExit = gameState.activeInteraction.type === 'exit_door';

      gameRef.current?.triggerInteraction();

      if (!isDoor && !isExit) {
        setInspectModal(gameState.activeInteraction);
      } else {
        setInspectModal(null);
      }
    }
  };

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
      if ((e.key === 'm' || e.key === 'M') && !gameState.isInsideInterior) {
        setShowMinimap((prev) => !prev);
      }
      if (e.key === 'h' || e.key === 'H') {
        setShowHelp((prev) => !prev);
      }
      if (e.key === 'r' || e.key === 'R') {
        setShowRoster((prev) => !prev);
      }
      if (e.key === 'e' || e.key === 'E') {
        if (gameState.activeInteraction) {
          const isDoor =
            gameState.activeInteraction.type === 'door' &&
            Boolean(gameState.activeInteraction.targetInterior);
          const isExit = gameState.activeInteraction.type === 'exit_door';
          if (!isDoor && !isExit) {
            setInspectModal(gameState.activeInteraction);
          } else {
            setInspectModal(null);
          }
        }
      }
      if (e.key === 'Escape') {
        setInspectModal(null);
        setShowMinimap(false);
        setShowHelp(false);
        setShowRoster(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.activeInteraction, gameState.isInsideInterior]);

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

          {/* Help Toggle */}
          <button
            onClick={() => setShowHelp((prev) => !prev)}
            title="Controls & Village Guide (Key: H)"
            className="p-1.5 rounded bg-[#1F3B27] hover:bg-[#315B3C] border border-[#28392E] text-[#FFF8E9] transition"
          >
            <HelpCircle className="w-4 h-4 text-[#F4D477]" />
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

      {/* 3. PROXIMITY INTERACTION BANNER */}
      {gameState.activeInteraction && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <button
            onClick={handleTriggerInteraction}
            className={`px-4 py-2 bg-[#14271A]/95 border-2 rounded-lg shadow-2xl flex items-center gap-2.5 text-sm font-pixel transition cursor-pointer ${
              gameState.activeInteraction.type === 'npc'
                ? 'border-[#F4D477] text-[#FFF8E9] hover:bg-[#1F3B27] ring-2 ring-[#F4D477]/40'
                : gameState.activeInteraction.type === 'door' ||
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
            <Sparkles className="w-4 h-4 text-[#F4D477] animate-spin" />
          </button>
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
            <span className="text-[#93C476] font-mono">E / Space</span>: Talk / Inspect
          </div>
          <div>
            <span className="text-[#93C476] font-mono">R</span>: NPC Schedule
          </div>
          <div>
            <span className="text-[#93C476] font-mono">M</span>: Village Map
          </div>
          <div>
            <span className="text-[#93C476] font-mono">Esc</span>: Close Modals
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

                <button
                  onClick={() => setInspectModal(null)}
                  className="px-4 py-1.5 bg-[#315B3C] hover:bg-[#78A85B] border border-[#78A85B] rounded font-pixel text-xs text-[#FFF8E9] transition cursor-pointer"
                >
                  Close Profile
                </button>
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
                <Sparkles className="w-5 h-5 text-[#93C476]" />
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

                  <button
                    onClick={() => handleTeleportToNpc(npc)}
                    title="Jump to this NPC"
                    className="p-1.5 rounded bg-[#315B3C] hover:bg-[#78A85B] text-[#FFF8E9] transition shrink-0 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
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

      {/* 8. CONTROLS GUIDE MODAL (Press H) */}
      {showHelp && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#14271A] border-2 border-[#78A85B] rounded-xl p-6 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 p-1.5 rounded hover:bg-[#1F3B27] text-[#F3F4F1]/70 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-pixel text-xl text-[#F4D477] mb-2 font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#93C476]" />
              <span>Village Exploration & Schedule Guide</span>
            </h3>

            <div className="space-y-3 text-xs text-[#FFF8E9]/90 font-sans mt-3">
              <p>
                Welcome to <strong>Kaveripura</strong>! All 10 pre-defined NPCs roam the village and follow their <strong>default_schedule</strong> routines across morning, midday, and night.
              </p>

              <div className="bg-[#0F1712] border border-[#28392E] rounded-lg p-3 space-y-1 font-mono text-[11px]">
                <div><span className="text-[#93C476]">WASD / Arrow Keys</span>: Walk around the village</div>
                <div><span className="text-[#93C476]">Shift</span>: Sprint through pathways</div>
                <div><span className="text-[#93C476]">E / Space</span>: Speak with approaching villagers & inspect buildings</div>
                <div><span className="text-[#93C476]">R</span>: Toggle the Villagers Schedule Roster</div>
                <div><span className="text-[#93C476]">Time Bar (Header)</span>: Scrub or jump between Dawn, Morning, Midday & Night</div>
                <div><span className="text-[#93C476]">M</span>: Open the full village minimap with live NPC positions</div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-1.5 bg-[#315B3C] hover:bg-[#78A85B] border border-[#78A85B] rounded font-pixel text-xs text-[#FFF8E9] transition cursor-pointer"
              >
                Got It, Let&apos;s Play
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
