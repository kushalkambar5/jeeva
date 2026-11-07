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
} from 'lucide-react';
import { PhaserGame, PhaserGameRef } from './PhaserGame';
import { GameStateEvent, InteractionPoint } from './types';
import { sound } from './audio';

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
  });

  const [inspectModal, setInspectModal] = useState<InteractionPoint | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.6);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const handleStateChange = useCallback((event: GameStateEvent) => {
    setGameState((prev) => {
      if (
        prev.playerX === event.playerX &&
        prev.playerY === event.playerY &&
        prev.currentZone === event.currentZone &&
        prev.isMoving === event.isMoving &&
        prev.isSprinting === event.isSprinting &&
        prev.activeInteraction?.id === event.activeInteraction?.id &&
        prev.activeInteraction?.opened === event.activeInteraction?.opened
      ) {
        return prev;
      }
      return event;
    });
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
      gameRef.current?.triggerInteraction();
      setInspectModal(gameState.activeInteraction);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        setShowMinimap((prev) => !prev);
      }
      if (e.key === 'h' || e.key === 'H') {
        setShowHelp((prev) => !prev);
      }
      if (e.key === 'e' || e.key === 'E') {
        if (gameState.activeInteraction) {
          setInspectModal(gameState.activeInteraction);
        }
      }
      if (e.key === 'Escape') {
        setInspectModal(null);
        setShowMinimap(false);
        setShowHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.activeInteraction]);

  // Mini-map coordinates scaling (1920x1440 map -> 280x210 minimap)
  const mapWidth = 1920;
  const mapHeight = 1440;
  const mmW = 280;
  const mmH = 210;
  const playerMmX = Math.min(Math.max((gameState.playerX / mapWidth) * mmW, 4), mmW - 4);
  const playerMmY = Math.min(Math.max((gameState.playerY / mapHeight) * mmH, 4), mmH - 4);

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-[#79C867] text-[#F3F4F1] font-sans select-none"
    >
      {/* 1. THE PHASER 3 GAME CANVAS (100% Fullscreen, Edge-to-Edge) */}
      <main className="absolute inset-0 w-full h-full overflow-hidden">
        <PhaserGame ref={gameRef} onStateChange={handleStateChange} />
      </main>

      {/* 2. FLOATING TRANSPARENT HUD HEADER (Zero solid background) */}
      <header className="absolute top-0 left-0 right-0 z-30 h-16 bg-transparent px-4 py-3 flex items-center justify-between pointer-events-none">
        {/* Left: Back Link & Title Pill */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#14271A]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#78A85B]/40 shadow-xl">
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
              Map Testing
            </span>
          </span>
        </div>

        {/* Center: Current Location & Coordinates Pill */}
        <div className="hidden md:flex items-center gap-3 pointer-events-auto bg-[#14271A]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#78A85B]/40 shadow-xl">
          <div className="flex items-center gap-1.5 text-xs text-[#93C476] font-medium">
            <MapPin className="w-3.5 h-3.5 text-[#F4D477] animate-pulse" />
            <span>{gameState.currentZone}</span>
          </div>

          <div className="h-3 w-px bg-[#28392E]" />

          <div className="flex items-center gap-1 text-[11px] font-mono text-[#F3F4F1]/70">
            <Compass className="w-3 h-3 text-[#75B9D0]" />
            <span>
              X: {gameState.playerX} | Y: {gameState.playerY}
            </span>
          </div>

          {gameState.isMoving && (
            <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-[#78A85B]/20 text-[#93C476] font-pixel">
              <Footprints className="w-3 h-3" />
              <span>{gameState.isSprinting ? 'SPRINT' : 'WALK'}</span>
            </div>
          )}
        </div>

        {/* Right: Quick Action Controls Pill */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#14271A]/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-[#78A85B]/40 shadow-xl">
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
            onClick={() => setShowMinimap((prev) => !prev)}
            title="Toggle Minimap (Key: M)"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition font-pixel ${
              showMinimap
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
            className="px-4 py-2 bg-[#14271A]/95 border-2 border-[#F4D477] rounded-lg shadow-2xl flex items-center gap-2.5 text-sm font-pixel text-[#FFF8E9] hover:bg-[#1F3B27] transition"
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
        <div className="font-pixel text-[#F4D477] mb-1 font-bold flex items-center gap-1">
          <span>VILLAGE ROAM CONTROLS</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <div>
            <span className="text-[#93C476] font-mono">WASD / Arrows</span>: Move
          </div>
          <div>
            <span className="text-[#93C476] font-mono">Shift</span>: Sprint
          </div>
          <div>
            <span className="text-[#93C476] font-mono">E / Space</span>: Interact
          </div>
          <div>
            <span className="text-[#93C476] font-mono">Z</span>: Zoom ({zoomLevel.toFixed(1)}x)
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
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#14271A] border-2 border-[#78A85B] rounded-xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setInspectModal(null)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-[#1F3B27] text-[#F3F4F1]/70 hover:text-white"
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
                className="px-4 py-1.5 bg-[#315B3C] hover:bg-[#78A85B] border border-[#78A85B] rounded font-pixel text-xs text-[#FFF8E9] transition"
              >
                Continue Roaming
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MINIMAP OVERLAY (Press M or Click Map) */}
      {showMinimap && (
        <div className="absolute top-16 right-4 z-40 bg-[#14271A]/95 border-2 border-[#78A85B] rounded-lg p-3 shadow-2xl">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#28392E]">
            <span className="font-pixel text-xs text-[#F4D477] font-bold">KAVERIPURA MINIMAP</span>
            <button
              onClick={() => setShowMinimap(false)}
              className="text-xs text-[#FFF8E9]/70 hover:text-white"
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

            {/* 1. Player House */}
            <div
              className="absolute bg-[#93C476] border border-black text-[7px] font-bold text-black flex items-center justify-center rounded-xs"
              style={{ top: '24px', left: '40px', width: '22px', height: '22px' }}
              title="Player Cottage"
            >
              H
            </div>
            {/* 2. Clinic */}
            <div
              className="absolute bg-[#75B9D0] border border-black text-[7px] font-bold text-black flex items-center justify-center rounded-xs"
              style={{ top: '24px', left: '96px', width: '22px', height: '22px' }}
              title="Clinic"
            >
              +
            </div>
            {/* 3. Shop */}
            <div
              className="absolute bg-[#F4D477] border border-black text-[7px] font-bold text-black flex items-center justify-center rounded-xs"
              style={{ top: '24px', left: '161px', width: '22px', height: '22px' }}
              title="General Store"
            >
              $
            </div>
            {/* 4. Workshop */}
            <div
              className="absolute bg-[#C87545] border border-black text-[7px] font-bold text-black flex items-center justify-center rounded-xs"
              style={{ top: '24px', left: '217px', width: '22px', height: '22px' }}
              title="Workshop"
            >
              W
            </div>
            {/* 5. Farm Barn */}
            <div
              className="absolute bg-[#E98F9F] border border-black text-[7px] font-bold text-black flex items-center justify-center rounded-xs"
              style={{ top: '124px', left: '40px', width: '22px', height: '22px' }}
              title="Farm Barn"
            >
              B
            </div>
            {/* 6. Police Post */}
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
              style={{ top: '154px', left: '28px', width: '48px', height: '32px' }}
              title="Lotus Pond"
            />

            {/* Crop Fields */}
            <div
              className="absolute bg-[#93C476]/30 border border-dashed border-[#93C476]/60 rounded-xs"
              style={{ top: '112px', left: '72px', width: '38px', height: '32px' }}
              title="Crop Fields"
            />

            {/* Secret Chest */}
            <div
              className="absolute w-2.5 h-2.5 rounded-full bg-[#F4D477] border border-black animate-ping"
              style={{ top: '184px', left: '256px' }}
              title="Secret Chest"
            />

            {/* Live Player Blip */}
            <div
              className="absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full bg-red-500 border-2 border-white shadow-md z-30 transition-all duration-75"
              style={{ left: `${playerMmX}px`, top: `${playerMmY}px` }}
            >
              <div className="w-full h-full rounded-full bg-red-400 animate-ping opacity-75" />
            </div>
          </div>

          <div className="mt-2 text-[10px] text-[#F3F4F1]/60 flex items-center justify-between">
            <span>● Red: Player</span>
            <span>1920 x 1440 px World</span>
          </div>
        </div>
      )}

      {/* 7. HELP / ABOUT MODAL */}
      {showHelp && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#14271A] border-2 border-[#78A85B] rounded-xl p-6 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-[#1F3B27] text-[#F3F4F1]/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3 font-pixel text-xl text-[#F4D477]">
              <Info className="w-5 h-5 text-[#75B9D0]" />
              <span>Kaveripura Village Testing Route</span>
            </div>

            <div className="text-xs text-[#FFF8E9]/90 space-y-3 font-sans">
              <p>
                Welcome to <strong>/game/testing</strong>, the full-screen playable map testing environment for{' '}
                <strong className="text-[#F4D477]">JEEVA</strong>.
              </p>

              <div className="bg-[#0F1712] border border-[#28392E] rounded-md p-3">
                <h4 className="font-pixel text-xs text-[#93C476] mb-1 font-bold">
                  Village Landmarks:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-[#F3F4F1]/80 text-[11px]">
                  <li>
                    <strong>Player Cottage:</strong> Your home at the northwest edge.
                  </li>
                  <li>
                    <strong>Dr. Priya&apos;s Clinic:</strong> Blue-roofed medical sanctuary.
                  </li>
                  <li>
                    <strong>Dev&apos;s General Store:</strong> Red-roofed market provisions depot.
                  </li>
                  <li>
                    <strong>Arjun&apos;s Workshop:</strong> Mechanic engineering center.
                  </li>
                  <li>
                    <strong>Central Plaza Fountain:</strong> Ancient carved stone fountain.
                  </li>
                  <li>
                    <strong>Ravi&apos;s Barn &amp; Crop Fields:</strong> Farmland &amp; produce.
                  </li>
                  <li>
                    <strong>Lotus Pond &amp; Pier:</strong> Freshwater dock with water lilies.
                  </li>
                  <li>
                    <strong>Police &amp; Guard Post:</strong> Southeast watchstation.
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-1.5 bg-[#315B3C] hover:bg-[#78A85B] border border-[#78A85B] rounded font-pixel text-xs text-[#FFF8E9] transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
