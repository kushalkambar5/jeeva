"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import PixelButton from "@/components/PixelButton";
import {
  Sparkles,
  KeyRound,
  Languages,
  Mail,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("hi-IN");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        // Step 1: Call Register API
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            preferredLanguage,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to create account. Please try again.");
          setLoading(false);
          return;
        }

        setSuccess("Account created successfully! Signing you in...");
      }

      // Step 2: Sign in with NextAuth Credentials
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (!result) {
        setError("Failed to contact authentication service.");
        setLoading(false);
        return;
      }

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Redirect to dashboard
      router.push(result.url || callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      console.error("Auth error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-cream text-darkbrown dark:bg-[#16221A] dark:text-[#F2E8D5] border-4 border-[#3D3429] dark:border-[#78A85B] shadow-[8px_8px_0px_#14271A]">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center pb-6 border-b-2 border-dashed border-[#6F6657]/40 mb-6">
        <Link href="/" className="group flex items-center gap-3 mb-2">
          <div className="relative w-12 h-12 overflow-hidden border-2 border-[#3D3429] dark:border-[#78A85B] bg-[#FFF8E9] shadow-[2px_2px_0px_#14271A]">
            <Image
              src="/logo.png"
              alt="Jeeva Logo"
              fill
              sizes="48px"
              className="object-cover pixel-art group-hover:scale-110 transition-transform duration-200"
            />
          </div>
          <span className="text-2xl font-pixel uppercase tracking-wider text-forest dark:text-gold">
            JEEVA
          </span>
        </Link>
        <h1 className="text-xl font-pixel uppercase tracking-wide text-forest dark:text-gold">
          {mode === "login" ? "Village Gate Login" : "New Player Registration"}
        </h1>
        <p className="text-xs font-sans text-mutedbrown dark:text-[#C4D2C3] mt-1">
          {mode === "login"
            ? "Enter your credentials to continue your journey."
            : "Forge your soul and join the living village of Kaveripura."}
        </p>
      </div>

      {/* Mode switcher tabs */}
      <div className="flex mb-6 border-2 border-[#3D3429] bg-[#E5F0D9] dark:bg-[#0F1712]">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setSuccess(null);
          }}
          className={`flex-1 py-2 font-pixel text-xs sm:text-sm uppercase tracking-wide transition-all ${
            mode === "login"
              ? "bg-forest text-cream font-bold shadow-inner"
              : "text-darkbrown dark:text-cream/70 hover:bg-forest/20"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setSuccess(null);
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

      {/* Error alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-950/60 border-2 border-red-700 text-red-900 dark:text-red-200 text-xs font-sans flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success alert */}
      {success && (
        <div className="mb-4 p-3 bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-sans flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{success}</span>
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0D1410] border-2 border-[#3D3429] dark:border-[#3A5243] text-sm font-sans focus:outline-none focus:border-forest dark:focus:border-gold"
              />
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
              placeholder="player@example.com"
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

        {mode === "signup" && (
          <div>
            <label className="block text-xs font-pixel uppercase tracking-wider mb-1 text-mutedbrown dark:text-[#A7BBA6]">
              Preferred Voice Tongue
            </label>
            <div className="relative">
              <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedbrown" />
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
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
              ) : (
                <Sparkles className="w-4 h-4 text-gold" />
              )
            }
          >
            {loading
              ? "Authenticating..."
              : mode === "login"
              ? "Enter Village"
              : "Register Account"}
          </PixelButton>

          <Link
            href="/"
            className="py-1 text-xs font-pixel uppercase text-mutedbrown hover:text-forest dark:text-[#A7BBA6] dark:hover:text-gold transition-colors text-center"
          >
            ← Return to Village Overview
          </Link>
        </div>
      </form>
    </div>
  );
}
