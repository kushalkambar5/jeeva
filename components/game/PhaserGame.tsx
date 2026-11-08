'use client';

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type * as PhaserTypes from 'phaser';
import { GameStateEvent } from './types';

export interface PhaserGameRef {
  cycleZoom: () => void;
  setZoom: (zoom: number) => void;
  triggerInteraction: () => void;
  exitInterior: () => void;
  setGameTime: (minutes: number) => void;
  toggleClock: (running: boolean) => void;
  teleportTo: (x: number, y: number) => void;
  followPlayer: (npcId: string) => boolean;
  stopFollowing: (npcId?: string) => boolean;
  getFollowingNpc: () => string | null;
}

interface PhaserGameProps {
  onStateChange?: (event: GameStateEvent) => void;
}

export const PhaserGame = forwardRef<PhaserGameRef, PhaserGameProps>(function PhaserGame(
  { onStateChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserTypes.Game | null>(null);

  useImperativeHandle(ref, () => ({
    cycleZoom: () => {
      const activeScenes = gameRef.current?.scene.getScenes(true) || [];
      const current = activeScenes[0] as any;
      if (current?.cycleZoom) {
        current.cycleZoom();
      }
    },
    setZoom: (zoom: number) => {
      const activeScenes = gameRef.current?.scene.getScenes(true) || [];
      const current = activeScenes[0] as any;
      if (current?.setZoomLevel) {
        current.setZoomLevel(zoom);
      }
    },
    triggerInteraction: () => {
      const activeScenes = gameRef.current?.scene.getScenes(true) || [];
      const current = activeScenes[0] as any;
      if (current?.triggerActiveInteraction) {
        current.triggerActiveInteraction();
      }
    },
    exitInterior: () => {
      const activeScenes = gameRef.current?.scene.getScenes(true) || [];
      const current = activeScenes[0] as any;
      if (current?.exitToVillage) {
        current.exitToVillage();
      }
    },
    setGameTime: (minutes: number) => {
      const activeScenes = gameRef.current?.scene.getScenes(true) || [];
      const current = activeScenes[0] as any;
      if (current?.setGameTime) {
        current.setGameTime(minutes, true);
      }
    },
    toggleClock: (running: boolean) => {
      const activeScenes = gameRef.current?.scene.getScenes(true) || [];
      const current = activeScenes[0] as any;
      if (current) {
        current.isClockRunning = running;
      }
    },
    teleportTo: (x: number, y: number) => {
      const activeScenes = gameRef.current?.scene.getScenes(true) || [];
      const current = activeScenes[0] as any;
      if (current?.teleportTo) {
        current.teleportTo(x, y);
      }
    },
    followPlayer: (npcId: string) => {
      const activeScenes = gameRef.current?.scene.getScenes(true) || [];
      const current = activeScenes[0] as any;
      if (current?.commandFollowPlayer) {
        return current.commandFollowPlayer(npcId);
      }
      return false;
    },
    stopFollowing: (npcId?: string) => {
      const activeScenes = gameRef.current?.scene.getScenes(true) || [];
      const current = activeScenes[0] as any;
      if (current?.commandStopFollowing) {
        return current.commandStopFollowing(npcId);
      }
      return false;
    },
    getFollowingNpc: () => {
      const activeScenes = gameRef.current?.scene.getScenes(true) || [];
      const current = activeScenes[0] as any;
      if (current?.getFollowingNpcId) {
        return current.getFollowingNpcId();
      }
      return null;
    },
  }));

  useEffect(() => {
    let isMounted = true;

    async function initPhaser() {
      if (!containerRef.current || gameRef.current) return;

      const Phaser = (await import('phaser')).default;
      const { VillageScene } = await import('./VillageScene');
      const { InteriorScene } = await import('./InteriorScene');

      if (!isMounted || !containerRef.current) return;

      const villageScene = new VillageScene();
      const interiorScene = new InteriorScene();

      const config: PhaserTypes.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        backgroundColor: '#79C867', // Exact meadow grass green: zero black space
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
          },
        },
        render: {
          pixelArt: true,
          antialias: false,
          roundPixels: true,
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
          width: '100%',
          height: '100%',
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [villageScene, interiorScene],
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      game.events.once('ready', () => {
        if (!isMounted) return;
        villageScene.init({ onStateChange });
      });
    }

    initPhaser();

    return () => {
      isMounted = false;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onStateChange]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden select-none bg-[#79C867]"
      style={{ imageRendering: 'pixelated' }}
    />
  );
});
