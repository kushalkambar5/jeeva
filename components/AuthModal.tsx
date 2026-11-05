"use client";

import React, { useState } from "react";
import PixelButton from "./PixelButton";
import { X, Sparkles, KeyRound, Languages, Mail, User } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: "login" | "signup";
  onClose: () => void;
}

export default function AuthModal({
  isOpen,
  initialMode = "login",
  onClose,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [characterName, setCharacterName] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md p-6 bg-cream text-darkbrown dark:bg-[#16221A] dark:text-[#F2E8D5] border-4 border-[#3D3429] dark:border-[#78A85B] shadow-[8px_8px_0px_#14271A] rounded-none"
        style={{ imageRendering: "pixelated" }}
      >
        {/* Top Header bar with pixel aesthetic */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-dashed border-[#6F6657]/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏮</span>
            <h2 className="text-2xl font-pixel uppercase tracking-wider text-forest dark:text-gold">
              {mode === "login" ? "Enter Jeeva" : "Alpha Registration"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-darkbrown dark:text-cream hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex mb-6 border-2 border-[#3D3429] bg-[#E5F0D9] dark:bg-[#0F1712]">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setSubmitted(false);
            }}
            className={`flex-1 py-2 font-pixel text-sm uppercase tracking-wide transition-all ${
              mode === "login"
                ? "bg-forest text-cream font-bold shadow-inner"
                : "text-darkbrown dark:text-cream/70 hover:bg-forest/20"
            }`}
          >
            Village Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setSubmitted(false);
            }}
            className={`flex-1 py-2 font-pixel text-sm uppercase tracking-wide transition-all ${
              mode === "signup"
                ? "bg-forest text-cream font-bold shadow-inner"
                : "text-darkbrown dark:text-cream/70 hover:bg-forest/20"
            }`}
          >
            Join Closed Alpha
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-gold/20 rounded-full flex items-center justify-center text-3xl">
              🌾
            </div>
            <h3 className="text-xl font-pixel text-forest dark:text-gold">
              {mode === "login"
                ? `Welcome back, ${characterName || "Traveler"}!`
                : "Alpha Pass Confirmed!"}
            </h3>
            <p className="text-sm font-sans text-mutedbrown dark:text-[#C4D2C3] leading-relaxed">
              {mode === "login"
                ? "Your save session is synchronized with the village chronicle. Preparing the world state..."
                : `Thank you for signing up with ${email || "your address"}. The village council has sent your invitation key to test multilingual voice dialogue.`}
            </p>
            <div className="pt-4">
              <PixelButton
                variant="forest"
                size="md"
                onClick={handleReset}
                className="w-full"
              >
                Return to Surface
              </PixelButton>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-pixel uppercase tracking-wider mb-1 text-mutedbrown dark:text-[#A7BBA6]">
                Character Name / Handle
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedbrown" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav, Maya, or Rahul"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0D1410] border-2 border-[#3D3429] dark:border-[#3A5243] text-sm font-sans focus:outline-none focus:border-forest dark:focus:border-gold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-pixel uppercase tracking-wider mb-1 text-mutedbrown dark:text-[#A7BBA6]">
                Preferred Voice Tongue
              </label>
              <div className="relative">
                <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedbrown" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0D1410] border-2 border-[#3D3429] dark:border-[#3A5243] text-sm font-sans focus:outline-none focus:border-forest dark:focus:border-gold"
                >
                  <option value="Hindi">हिन्दी (Hindi)</option>
                  <option value="English">English</option>
                  <option value="Tamil">தமிழ் (Tamil)</option>
                  <option value="Telugu">తెలుగు (Telugu)</option>
                  <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
                  <option value="Bengali">বাংলা (Bengali)</option>
                  <option value="Marathi">मराठी (Marathi)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-pixel uppercase tracking-wider mb-1 text-mutedbrown dark:text-[#A7BBA6]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedbrown" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0D1410] border-2 border-[#3D3429] dark:border-[#3A5243] text-sm font-sans focus:outline-none focus:border-forest dark:focus:border-gold"
                />
              </div>
            </div>

            {mode === "login" && (
              <div>
                <label className="block text-xs font-pixel uppercase tracking-wider mb-1 text-mutedbrown dark:text-[#A7BBA6]">
                  Secret Passcode / Alpha Token
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedbrown" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    defaultValue="demo-access-2026"
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0D1410] border-2 border-[#3D3429] dark:border-[#3A5243] text-sm font-sans focus:outline-none focus:border-forest dark:focus:border-gold"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <PixelButton
                variant={mode === "login" ? "forest" : "gold"}
                size="md"
                type="submit"
                className="w-full"
                icon={<Sparkles className="w-4 h-4 text-gold" />}
              >
                {mode === "login" ? "Begin Play Session" : "Confirm Alpha Reservation"}
              </PixelButton>
              <button
                type="button"
                onClick={onClose}
                className="py-1 text-xs font-pixel uppercase text-mutedbrown hover:text-forest dark:text-[#A7BBA6] dark:hover:text-gold transition-colors text-center"
              >
                Cancel and return to village overview
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
