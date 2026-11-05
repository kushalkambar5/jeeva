"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Compass, Shield } from "lucide-react";

export default function Footer() {
  const brandColors = [
    { name: "Forest", hex: "#315B3C" },
    { name: "Meadow", hex: "#78A85B" },
    { name: "Gold", hex: "#F4D477" },
    { name: "Cream", hex: "#FFF8E9" },
    { name: "Terracotta", hex: "#C87545" },
    { name: "Sky", hex: "#75B9D0" },
    { name: "Dark Brown", hex: "#3D3429" },
  ];

  return (
    <footer className="bg-cream dark:bg-[#0A100C] text-darkbrown dark:text-[#E2EDE1] border-t-4 border-[#3D3429] dark:border-[#213327] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b-2 border-dashed border-[#6F6657]/30">
          
          {/* Logo & Pitch */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 overflow-hidden border-2 border-[#3D3429] dark:border-[#78A85B] bg-[#FFF8E9] shadow-[2px_2px_0px_#14271A]">
                <Image
                  src="/logo.png"
                  alt="Jeeva Logo"
                  fill
                  sizes="48px"
                  className="object-cover pixel-art"
                />
              </div>
              <div>
                <span className="text-3xl font-pixel uppercase tracking-wider text-forest dark:text-gold block leading-none">
                  JEEVA
                </span>
                <span className="text-xs font-pixel uppercase tracking-widest text-mutedbrown dark:text-[#A7BBA6]">
                  जीव • The Living AI Village RPG
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm font-sans text-mutedbrown dark:text-[#A7BBA6] max-w-sm leading-relaxed">
              A 2D top-down Indian village simulation with voice-enabled, grounded autonomous AI NPCs.
              Characters don&apos;t just talk; they physically move, harvest, trade, and remember.
            </p>

            {/* Brand Color Palette Swatch */}
            <div className="pt-2">
              <span className="text-[10px] font-pixel uppercase tracking-wider text-mutedbrown dark:text-[#7A8E7A] block mb-1.5">
                Village Palette Identity:
              </span>
              <div className="flex items-center gap-1.5">
                {brandColors.map((c) => (
                  <div
                    key={c.name}
                    title={`${c.name} (${c.hex})`}
                    className="w-5 h-5 border border-[#3D3429] dark:border-white/20 shadow-xs cursor-help"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Nav Column 1 */}
          <div className="space-y-3">
            <h4 className="text-xs font-pixel uppercase tracking-widest text-forest dark:text-gold font-bold">
              Village Navigation
            </h4>
            <ul className="space-y-2 text-xs font-pixel uppercase text-mutedbrown dark:text-[#C4D2C3]">
              <li>
                <a href="#features" className="hover:text-forest dark:hover:text-gold transition-colors">
                  AI Features
                </a>
              </li>
              <li>
                <a href="#world" className="hover:text-forest dark:hover:text-gold transition-colors">
                  Discover World
                </a>
              </li>
              <li>
                <a href="#characters" className="hover:text-forest dark:hover:text-gold transition-colors">
                  Meet Characters
                </a>
              </li>
              <li>
                <a href="#gameplay" className="hover:text-forest dark:hover:text-gold transition-colors">
                  Gameplay Loop
                </a>
              </li>
              <li>
                <a href="#story" className="hover:text-forest dark:hover:text-gold transition-colors">
                  5-Chapter Story
                </a>
              </li>
            </ul>
          </div>

          {/* Nav Column 2: Supported Languages */}
          <div className="space-y-3">
            <h4 className="text-xs font-pixel uppercase tracking-widest text-forest dark:text-gold font-bold">
              Voice Tongues
            </h4>
            <ul className="space-y-1.5 text-xs font-sans text-mutedbrown dark:text-[#C4D2C3]">
              <li>हिन्दी (Hindi)</li>
              <li>English</li>
              <li>தமிழ் (Tamil)</li>
              <li>తెలుగు (Telugu)</li>
              <li>ಕನ್ನಡ (Kannada)</li>
              <li>বাংলা (Bengali)</li>
              <li>मराठी (Marathi)</li>
            </ul>
          </div>

          {/* Nav Column 3: Tech & Engine */}
          <div className="space-y-3">
            <h4 className="text-xs font-pixel uppercase tracking-widest text-forest dark:text-gold font-bold">
              Architecture
            </h4>
            <div className="text-xs font-sans text-mutedbrown dark:text-[#C4D2C3] space-y-2 leading-relaxed">
              <p>
                Rendered with <strong className="font-semibold text-darkbrown dark:text-cream">Phaser 3 &amp; WebGL</strong>.
              </p>
              <p>
                Grounded Autonomy &amp; authoritative action validation.
              </p>
              <div className="p-2 bg-mint/50 dark:bg-[#16221A] border border-forest/30 text-[11px] font-pixel text-forest dark:text-gold">
                Browser Native • 60 FPS
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-pixel text-mutedbrown dark:text-[#7A8E7A] gap-4">
          <p>
            © 2026 JEEVA GAME. All rights reserved. Handcrafted with love for Indian narratives &amp; AI gaming.
          </p>
          <div className="flex items-center gap-4">
            <a href="#top" className="hover:text-forest dark:hover:text-gold transition-colors">
              Back to Top ↑
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
