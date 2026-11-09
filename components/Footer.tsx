"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp, Compass, Gamepad2, Sparkles, MessageSquare } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-cream dark:bg-[#0A100C] text-darkbrown dark:text-[#E2EDE1] border-t-4 border-[#3D3429] dark:border-[#213327] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 pb-10 border-b-2 border-dashed border-[#6F6657]/30">
          {/* Col 1: Logo & Overview */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="relative w-11 h-11 overflow-hidden border-2 border-[#3D3429] dark:border-[#78A85B] bg-[#FFF8E9] shadow-[2px_2px_0px_#14271A]">
                <Image
                  src="/logo.png"
                  alt="Jeeva Logo"
                  fill
                  sizes="44px"
                  className="object-cover pixel-art group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <span className="text-2xl font-pixel uppercase tracking-wider text-forest dark:text-gold block leading-none">
                  JEEVA
                </span>
                <span className="text-[10px] font-pixel uppercase tracking-widest text-mutedbrown dark:text-[#A7BBA6]">
                  जीव • Living AI Village RPG
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm font-sans text-mutedbrown dark:text-[#A7BBA6] leading-relaxed">
              An immersive 2D top-down Indian village simulation with voice-enabled, grounded autonomous AI NPCs who converse, trade, and remember.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-pixel uppercase tracking-widest text-forest dark:text-gold font-bold flex items-center gap-2">
              <Compass className="w-3.5 h-3.5" />
              Explore Village
            </h4>
            <ul className="space-y-2 text-xs font-pixel uppercase text-mutedbrown dark:text-[#C4D2C3]">
              <li>
                <Link href="/play" className="hover:text-forest dark:hover:text-gold transition-colors inline-block">
                  Enter Game &amp; Play
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-forest dark:hover:text-gold transition-colors inline-block">
                  AI Features
                </a>
              </li>
              <li>
                <a href="#world" className="hover:text-forest dark:hover:text-gold transition-colors inline-block">
                  Discover World
                </a>
              </li>
              <li>
                <a href="#characters" className="hover:text-forest dark:hover:text-gold transition-colors inline-block">
                  Meet Characters
                </a>
              </li>
              <li>
                <a href="#story" className="hover:text-forest dark:hover:text-gold transition-colors inline-block">
                  Story &amp; Quests
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Key Features */}
          <div className="space-y-3">
            <h4 className="text-xs font-pixel uppercase tracking-widest text-forest dark:text-gold font-bold flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Living Systems
            </h4>
            <ul className="space-y-2 text-xs font-sans text-mutedbrown dark:text-[#C4D2C3]">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-forest dark:bg-gold" />
                Voice &amp; Text NPC Conversations
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-forest dark:bg-gold" />
                Physical Routines &amp; Schedules
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-forest dark:bg-gold" />
                Dynamic Village Barter Economy
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-forest dark:bg-gold" />
                Persistent NPC Long-term Memory
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-forest dark:bg-gold" />
                Multilingual Speech Recognition
              </li>
            </ul>
          </div>

          {/* Col 4: Quick Controls & Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-pixel uppercase tracking-widest text-forest dark:text-gold font-bold flex items-center gap-2">
              <Gamepad2 className="w-3.5 h-3.5" />
              Quick Controls
            </h4>
            <div className="space-y-2 text-xs font-pixel text-mutedbrown dark:text-[#C4D2C3]">
              <div className="flex items-center justify-between border-b border-dashed border-[#6F6657]/20 pb-1">
                <span>Move</span>
                <span className="px-1.5 py-0.5 bg-warmbeige dark:bg-[#16221A] border border-[#3D3429]/30 dark:border-white/20 text-[10px]">
                  WASD / Arrows
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-[#6F6657]/20 pb-1">
                <span>Talk / Interact</span>
                <span className="px-1.5 py-0.5 bg-warmbeige dark:bg-[#16221A] border border-[#3D3429]/30 dark:border-white/20 text-[10px]">
                  E
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-[#6F6657]/20 pb-1">
                <span>Trade Goods</span>
                <span className="px-1.5 py-0.5 bg-warmbeige dark:bg-[#16221A] border border-[#3D3429]/30 dark:border-white/20 text-[10px]">
                  B
                </span>
              </div>
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="inline-block hover:text-forest dark:hover:text-gold transition-colors underline underline-offset-4"
                >
                  Player Dashboard →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs font-pixel text-mutedbrown dark:text-[#7A8E7A] gap-4">
          <p>
            © {currentYear} JEEVA. All rights reserved. Handcrafted for rich Indian narratives &amp; emergent AI gaming.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#top"
              className="inline-flex items-center gap-1 hover:text-forest dark:hover:text-gold transition-colors cursor-pointer"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
