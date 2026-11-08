"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import PixelButton from "./PixelButton";
import {
  Gamepad2,
  LogOut,
  Sparkles,
  User,
  Languages,
  Shield,
  Clock,
  Compass,
} from "lucide-react";

interface DashboardClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    preferredLanguage?: string | null;
  };
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const router = useRouter();
  const [clicked, setClicked] = useState(false);

  const handlePlayGame = () => {
    // "in that for now only keep play game button, which will do nothing for now"
    setClicked(true);
    router.push("/play");
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream dark:bg-[#0F1712] text-darkbrown dark:text-[#F3F4F1] transition-colors duration-200">
      {/* Header bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-cream/90 dark:bg-[#0F1712]/90 border-b-4 border-[#3D3429] dark:border-[#213327]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-11 h-11 overflow-hidden border-2 border-[#3D3429] dark:border-[#78A85B] bg-[#FFF8E9] shadow-[2px_2px_0px_#14271A]">
                <Image
                  src="/logo.png"
                  alt="Jeeva Logo"
                  fill
                  sizes="44px"
                  className="object-cover pixel-art group-hover:scale-110 transition-transform duration-200"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-pixel tracking-wider text-forest dark:text-gold uppercase leading-none">
                  JEEVA
                </span>
                <span className="text-[10px] font-pixel tracking-widest text-mutedbrown dark:text-[#A7BBA6] uppercase">
                  Village Dashboard
                </span>
              </div>
            </Link>

            {/* User quick pill & Sign Out */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border-2 border-[#3D3429] dark:border-[#3A5243] bg-warmbeige dark:bg-[#16221A] text-xs font-pixel">
                <User className="w-3.5 h-3.5 text-forest dark:text-gold" />
                <span className="text-darkbrown dark:text-cream font-bold">
                  {user.name || "Adventurer"}
                </span>
                <span className="text-mutedbrown dark:text-[#A7BBA6]">
                  ({user.role || "player"})
                </span>
              </div>

              <PixelButton
                variant="cherry"
                size="sm"
                onClick={handleSignOut}
                icon={<LogOut className="w-3.5 h-3.5" />}
                ariaLabel="Sign out of Jeeva"
              >
                Sign Out
              </PixelButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Hero */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col justify-center items-center">
        {/* Profile overview card */}
        <div
          className="w-full max-w-xl p-8 bg-warmbeige dark:bg-[#16221A] border-4 border-[#3D3429] dark:border-[#78A85B] shadow-[8px_8px_0px_#14271A] text-center space-y-6"
          style={{ imageRendering: "pixelated" }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 border-2 border-dashed border-[#3D3429] dark:border-[#78A85B] bg-white/60 dark:bg-black/30 text-xs font-pixel uppercase tracking-widest text-forest dark:text-gold">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            Session Authenticated
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-pixel uppercase tracking-wider text-forest dark:text-gold">
              Welcome, {user.name || "Traveler"}!
            </h1>
            <p className="text-sm font-sans text-mutedbrown dark:text-[#C4D2C3]">
              Your soul is bound to the village chronicle. Ready to step into Kaveripura?
            </p>
          </div>

          {/* User Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-left pt-2">
            <div className="p-3 bg-white/80 dark:bg-[#0D1410] border-2 border-[#3D3429] dark:border-[#3A5243]">
              <div className="flex items-center gap-1.5 text-xs font-pixel uppercase text-mutedbrown dark:text-[#A7BBA6]">
                <Languages className="w-3.5 h-3.5" />
                Language
              </div>
              <p className="text-sm font-sans font-bold text-darkbrown dark:text-[#F3F4F1] mt-0.5">
                {user.preferredLanguage || "hi-IN"}
              </p>
            </div>

            <div className="p-3 bg-white/80 dark:bg-[#0D1410] border-2 border-[#3D3429] dark:border-[#3A5243]">
              <div className="flex items-center gap-1.5 text-xs font-pixel uppercase text-mutedbrown dark:text-[#A7BBA6]">
                <Shield className="w-3.5 h-3.5" />
                Role
              </div>
              <p className="text-sm font-sans font-bold capitalize text-darkbrown dark:text-[#F3F4F1] mt-0.5">
                {user.role || "player"}
              </p>
            </div>
          </div>

          {/* Centerpiece: PLAY GAME BUTTON */}
          <div className="pt-4 pb-2 flex flex-col items-center gap-3">
            <PixelButton
              variant="gold"
              size="lg"
              onClick={handlePlayGame}
              icon={<Gamepad2 className="w-6 h-6" />}
              className="w-full sm:w-auto px-10 text-lg shadow-[6px_6px_0px_#14271A]"
              ariaLabel="Play Game"
            >
              Play Game
            </PixelButton>

            {clicked && (
              <p className="text-xs font-pixel uppercase text-forest dark:text-gold tracking-wide animate-in fade-in duration-200">
                ✨ Play Game button pressed! (Game loop standby)
              </p>
            )}
          </div>

          <div className="pt-2 border-t-2 border-dashed border-[#6F6657]/40 text-xs font-sans text-mutedbrown dark:text-[#A7BBA6]">
            Signed in as <span className="font-semibold text-darkbrown dark:text-cream">{user.email}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
