"use client";

import React from "react";
import Link from "next/link";

export type PixelButtonVariant = "classic" | "forest" | "gold" | "meadow" | "cherry";
export type PixelButtonSize = "sm" | "md" | "lg" | "full";

export interface PixelButtonProps {
  children: React.ReactNode;
  variant?: PixelButtonVariant;
  size?: PixelButtonSize;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  href?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  icon?: React.ReactNode;
  ariaLabel?: string;
  playClickSound?: boolean;
}

export const playRetroBeep = () => {
  try {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch {
    // AudioContext might be prevented prior to user interaction
  }
};

/**
 * PixelButton - Reusable Minecraft / Retro 3D beveled button
 * Faithfully adapted from CodePen: https://codepen.io/joexmdq/pen/EOMLzg
 * Uses beveled border box-shadows, pixelated background, and retro hover highlights.
 */
export default function PixelButton({
  children,
  variant = "forest",
  size = "md",
  onClick,
  href,
  className = "",
  type = "button",
  disabled = false,
  icon,
  ariaLabel,
  playClickSound = true,
}: PixelButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (playClickSound) {
      playRetroBeep();
    }
    if (onClick) {
      onClick(e);
    }
  };

  // Map variant to corresponding overlay class
  const variantClass = {
    classic: "",
    forest: "mc-button-forest",
    gold: "mc-button-gold",
    meadow: "mc-button-meadow",
    cherry: "mc-button-cherry",
  }[variant];

  // Map size to dimension classes (strictly NO horizontal padding on outer button so .title fills from left end to right end)
  const sizeClass = {
    sm: "h-9 min-w-[100px] text-xs sm:text-sm",
    md: "h-11 min-w-[140px] text-sm sm:text-base",
    lg: "h-14 min-w-[200px] text-base sm:text-lg",
    full: "w-full h-12 text-base",
  }[size];

  // Horizontal padding applied on inner .title so text has breathing room while bevel lines stay at extreme ends
  const paddingClass = {
    sm: "px-4",
    md: "px-6",
    lg: "px-8",
    full: "px-4",
  }[size];

  const combinedClasses = `mc-button ${variantClass} ${sizeClass} p-0! ${
    disabled ? "opacity-60 cursor-not-allowed pointer-events-none grayscale" : ""
  } ${className}`;

  const innerContent = (
    <span className={`title font-pixel uppercase tracking-wider flex items-center justify-center gap-2 ${paddingClass}`}>
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );

  if (href && !disabled) {
    if (href.startsWith("#") || href.startsWith("/")) {
      return (
        <Link
          href={href}
          onClick={handleClick}
          className={combinedClasses}
          aria-label={ariaLabel}
        >
          {innerContent}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={combinedClasses}
        aria-label={ariaLabel}
      >
        {innerContent}
      </a>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={combinedClasses}
      aria-label={ariaLabel}
    >
      {innerContent}
    </button>
  );
}
