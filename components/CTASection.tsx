"use client";

import React from "react";
import PixelButton from "./PixelButton";
import { Compass, Check, ShieldCheck, Flame, Radio } from "lucide-react";

interface CTASectionProps {
  onOpenSignup: () => void;
  onOpenLogin: () => void;
}

export default function CTASection({
  onOpenSignup,
  onOpenLogin,
}: CTASectionProps) {
  return (
    <section id="story" className="py-20 sm:py-28 bg-warmbeige/70 dark:bg-[#121B15] border-b-4 border-[#3D3429] dark:border-[#213327] transition-colors relative overflow-hidden">
      
      {/* Background Pixel accents */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="p-8 sm:p-14 bg-cream dark:bg-[#18261E] border-4 border-[#3D3429] dark:border-[#78A85B] shadow-[10px_10px_0px_#14271A] text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 border-2 border-[#3D3429] dark:border-[#78A85B] bg-mint dark:bg-[#0D1410] shadow-[2px_2px_0px_#14271A]">
            <Radio className="w-4 h-4 text-forest dark:text-gold animate-pulse" />
            <span className="text-xs font-pixel uppercase tracking-widest text-forest dark:text-gold font-bold">
              Closed Alpha Playtest Now Open
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-pixel uppercase tracking-tight text-darkbrown dark:text-cream leading-tight">
            Start Your Adventure in Jeeva
          </h2>

          {/* Subtext */}
          <p className="mt-5 text-base sm:text-xl font-sans text-mutedbrown dark:text-[#C5D5C4] max-w-2xl mx-auto leading-relaxed">
            The floodwaters are receding and lanterns are flickering in the village square.
            Pick up your pack, step onto the stone path, and let the villagers hear your voice.
          </p>

          {/* Action Buttons using PixelButton */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <PixelButton
              variant="gold"
              size="lg"
              onClick={onOpenSignup}
              ariaLabel="Sign up for Jeeva Alpha"
              className="w-full sm:w-auto shadow-[4px_4px_0px_#14271A]"
            >
              Sign Up for Alpha Access
            </PixelButton>

            <PixelButton
              variant="forest"
              size="lg"
              onClick={onOpenLogin}
              ariaLabel="Login to village"
              icon={<Compass className="w-5 h-5 text-gold" />}
              className="w-full sm:w-auto shadow-[4px_4px_0px_#14271A]"
            >
              Enter Village (Login)
            </PixelButton>
          </div>

          {/* System Spec Chips */}
          <div className="mt-12 pt-8 border-t-2 border-dashed border-[#6F6657]/30 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-pixel text-mutedbrown dark:text-[#A7BBA6]">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-forest dark:text-gold" />
              Browser WebGL 2.0 (Zero Download)
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-forest dark:text-gold" />
              Any Laptop / Desktop Microphone
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-forest dark:text-gold" />
              English, Hindi, Tamil &amp; Telugu
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-forest dark:text-gold" />
              Full Save File Persistence
            </span>
          </div>

        </div>
      </div>
    </section>
  );
}
