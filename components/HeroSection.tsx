"use client";

import React, { useState } from "react";
import Image from "next/image";
import PixelButton from "./PixelButton";
import { Mic, Volume2, Play, Pause, Compass, ShieldAlert, Cpu } from "lucide-react";

interface HeroSectionProps {
  onOpenLogin: () => void;
  onOpenSignup: () => void;
}

export default function HeroSection({
  onOpenLogin,
  onOpenSignup,
}: HeroSectionProps) {
  const [activeVoiceSnippet, setActiveVoiceSnippet] = useState<number | null>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const voiceDemos = [
    {
      speaker: "Ravi (The Farmer)",
      lang: "Hindi / Hinglish",
      quote: "अरे भाई! The monsoon smashed my irrigation levee. Help me drag these timber logs or the entire paddy harvest will rot in mud!",
      action: "Status: [WHEELBARROW READY • HARVESTING TIMBER]",
    },
    {
      speaker: "Dr. Meera (The Healer)",
      lang: "English / Tamil",
      quote: "Don't just stand there! Three villagers have broken bones from the clinic roof collapse. Go find Dev and demand antiseptic!",
      action: "Status: [TRIAGE CLINIC • REQUIRING BANDAGES]",
    },
    {
      speaker: "Arjun (The Mechanic)",
      lang: "Telugu / English",
      quote: "If we don't jumpstart this generator before sundown, the village will freeze in the dark. Bring me 4 copper coils now!",
      action: "Status: [REPAIRING GENERATOR • MISSING COILS]",
    },
  ];

  const handleTogglePlay = (index: number) => {
    if (activeVoiceSnippet === index && isPlaying) {
      setIsPlaying(false);
    } else {
      setActiveVoiceSnippet(index);
      setIsPlaying(true);
      // Simulate speaking for 3.5 seconds
      setTimeout(() => {
        setIsPlaying(false);
      }, 4000);
    }
  };

  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden border-b-4 border-[#3D3429] dark:border-[#213327]">
      {/* Hero Section Background Image as explicitly requested */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero_section_bg.png"
          alt="Jeeva Village Pixel Art Landscape"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center pixel-art scale-105"
        />
        {/* Layered atmospheric overlays for legibility - subtle bottom fade so the pixel art shines through */}
        <div className="absolute inset-0 bg-gradient-to-t from-cream/50 via-cream/25 to-black/15 dark:from-[#0F1712]/60 dark:via-[#0F1712]/30 dark:to-black/25 transition-colors" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/20 dark:to-black/50 pointer-events-none" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col items-center text-center">

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-pixel uppercase tracking-tight text-darkbrown dark:text-[#FFF8E9] drop-shadow-[2px_2px_0px_rgba(0,0,0,0.4)] max-w-4xl leading-tight">
          A Living Village.
          <br />
          <span className="text-forest dark:text-gold">
            NPCs That Speak &amp; Act.
          </span>
        </h1>

        {/* Call to Action Buttons: Login & Signup as requested */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {/* Sign Up Button */}
          <PixelButton
            variant="gold"
            size="lg"
            onClick={onOpenSignup}
            ariaLabel="Sign up for Jeeva Alpha"
            className="w-full sm:w-auto shadow-[4px_4px_0px_#14271A]"
          >
            Start Adventure (Sign Up)
          </PixelButton>

          {/* Playable Game Testing Link */}
          <a
            href="/game/testing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded bg-[#315B3C] hover:bg-[#78A85B] text-[#FFF8E9] border-2 border-[#14271A] font-pixel text-sm uppercase tracking-wider shadow-[4px_4px_0px_#14271A] transition active:translate-y-0.5 active:shadow-[2px_2px_0px_#14271A]"
          >
            <Compass className="w-5 h-5 text-[#F4D477]" />
            <span>Play Game Map (/game/testing)</span>
          </a>
        </div>

        {/* Gamer Feature Highlights Bar */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full max-w-4xl">
          {[
            { label: "100% Real Actions", desc: "NPCs physically walk & build" },
            { label: "Indian Voice Native", desc: "Hindi, Tamil, Telugu & English" },
            { label: "Village Memory", desc: "Gossip spreads & deeds stick" },
            { label: "Instant Browser Play", desc: "60 FPS WebGL, zero install" },
          ].map((item) => (
            <div
              key={item.label}
              className="p-3 bg-cream/90 dark:bg-[#16221A]/90 border-2 border-[#3D3429] dark:border-[#2C4132] shadow-[3px_3px_0px_#14271A] text-center"
            >
              <div className="font-pixel text-xs sm:text-sm font-bold text-forest dark:text-gold uppercase">
                {item.label}
              </div>
              <div className="text-[11px] font-sans text-mutedbrown dark:text-[#A7BBA6] mt-0.5">
                {item.desc}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
