"use client";

import React, { useEffect, useState } from "react";

interface PixelSpriteProps {
  src: string;
  frameWidth?: number;
  frameHeight?: number;
  scale?: number;
  framesCount?: number;
  row?: number; // 0 = down, 1 = left, 2 = right, 3 = up
  animate?: boolean;
  intervalMs?: number;
  className?: string;
  alt?: string;
}

/**
 * PixelSprite renders crisp, pixelated frames from character spritesheets.
 * Supports walking/idle cycle animation.
 */
export default function PixelSprite({
  src,
  frameWidth = 32,
  frameHeight = 32,
  scale = 3,
  framesCount = 3,
  row = 0,
  animate = true,
  intervalMs = 300,
  className = "",
  alt = "Character sprite",
}: PixelSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!animate || framesCount <= 1) return;
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % framesCount);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [animate, framesCount, intervalMs]);

  const xOffset = -(frameIndex * frameWidth);
  const yOffset = -(row * frameHeight);

  return (
    <div
      role="img"
      aria-label={alt}
      className={`inline-block overflow-hidden shrink-0 select-none ${className}`}
      style={{
        width: `${frameWidth * scale}px`,
        height: `${frameHeight * scale}px`,
      }}
    >
      <div
        className="pixel-art"
        style={{
          width: `${frameWidth}px`,
          height: `${frameHeight}px`,
          backgroundImage: `url(${src})`,
          backgroundPosition: `${xOffset}px ${yOffset}px`,
          backgroundRepeat: "no-repeat",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
