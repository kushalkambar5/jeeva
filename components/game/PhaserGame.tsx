'use client';

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type * as PhaserTypes from 'phaser';
import { GameStateEvent } from './types';

export interface PhaserGameRef {
  cycleZoom: () => void;
  setZoom: (zoom: number) => void;
  triggerInteraction: () => void;
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
  const sceneRef = useRef<import('./VillageScene').VillageScene | null>(null);

  useImperativeHandle(ref, () => ({
    cycleZoom: () => {
      sceneRef.current?.cycleZoom();
    },
    setZoom: (zoom: number) => {
      sceneRef.current?.setZoomLevel(zoom);
    },
    triggerInteraction: () => {
      sceneRef.current?.triggerActiveInteraction();
    },
  }));

  useEffect(() => {
    let isMounted = true;

    async function initPhaser() {
      if (!containerRef.current || gameRef.current) return;

      const Phaser = (await import('phaser')).default;
      const { VillageScene } = await import('./VillageScene');

      if (!isMounted || !containerRef.current) return;

      const scene = new VillageScene();
      sceneRef.current = scene;

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
        scene: [scene],
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      game.events.once('ready', () => {
        if (!isMounted) return;
        scene.init({ onStateChange });
      });
    }

    initPhaser();

    return () => {
      isMounted = false;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
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
