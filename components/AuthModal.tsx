"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import PixelButton from "./PixelButton";
import {
  X,
  KeyRound,
  Languages,
  Mail,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react";

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
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [characterName, setCharacterName] = useState("");
  const [language, setLanguage] = useState("hi-IN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: characterName,
            email,
            password,
            preferredLanguage: language,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to create account.");
          setLoading(false);
          return;
        }
      }

      // NextAuth sign in
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: "/dashboard",
      });

      if (!result) {
        setError("Failed to communicate with authentication service.");
        setLoading(false);
        return;
      }

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Success: redirect user to dashboard
      onClose();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Modal auth error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md p-6 bg-cream text-darkbrown dark:bg-[#16221A] dark:text-[#F2E8D5] border-4 border-[#3D3429] dark:border-[#78A85B] shadow-[8px_8px_0px_#14271A] rounded-none max-h-[90vh] overflow-y-auto"
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
            className="p-1 text-darkbrown dark:text-cream hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex mb-5 border-2 border-[#3D3429] bg-[#E5F0D9] dark:bg-[#0F1712]">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 py-2 font-pixel text-xs sm:text-sm uppercase tracking-wide transition-all ${
              mode === "login"
                ? "bg-forest text-cream font-bold shadow-inner"
                : "text-darkbrown dark:text-cream/70 hover:bg-forest/20"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`flex-1 py-2 font-pixel text-xs sm:text-sm uppercase tracking-wide transition-all ${
              mode === "signup"
                ? "bg-forest text-cream font-bold shadow-inner"
                : "text-darkbrown dark:text-cream/70 hover:bg-forest/20"
            }`}
          >
            Register
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-950/60 border-2 border-red-700 text-red-900 dark:text-red-200 text-xs font-sans flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
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
          )}

          {mode === "signup" && (
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
                  <option value="hi-IN">हिन्दी (Hindi)</option>
                  <option value="en-IN">English (Indian)</option>
                  <option value="ta-IN">தமிழ் (Tamil)</option>
                  <option value="te-IN">తెలుగు (Telugu)</option>
                  <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
                  <option value="bn-IN">বাংলা (Bengali)</option>
                  <option value="mr-IN">मराठी (Marathi)</option>
                </select>
              </div>
            </div>
          )}

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

          <div>
            <label className="block text-xs font-pixel uppercase tracking-wider mb-1 text-mutedbrown dark:text-[#A7BBA6]">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedbrown" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0D1410] border-2 border-[#3D3429] dark:border-[#3A5243] text-sm font-sans focus:outline-none focus:border-forest dark:focus:border-gold"
              />
            </div>
            {mode === "signup" && (
              <p className="text-[11px] text-mutedbrown dark:text-[#A7BBA6] mt-1">
                Minimum 6 characters.
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <PixelButton
              variant={mode === "login" ? "forest" : "gold"}
              size="md"
              type="submit"
              disabled={loading}
              className="w-full"
              icon={
                loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : undefined
              }
            >
              {loading
                ? "Connecting to village..."
                : mode === "login"
                ? "Begin Play Session"
                : "Confirm Alpha Registration"}
            </PixelButton>
            <button
              type="button"
              onClick={onClose}
              className="py-1 text-xs font-pixel uppercase text-mutedbrown hover:text-forest dark:text-[#A7BBA6] dark:hover:text-gold transition-colors text-center cursor-pointer"
            >
              Cancel and return to village overview
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
