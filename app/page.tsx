"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WorldSection from "@/components/WorldSection";
import CharactersSection from "@/components/CharactersSection";
import GameplaySection from "@/components/GameplaySection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const handleOpenLogin = () => {
    setAuthMode("login");
    setAuthOpen(true);
  };

  const handleOpenSignup = () => {
    setAuthMode("signup");
    setAuthOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthOpen(false);
  };

  return (
    <div id="top" className="flex flex-col min-h-screen">
      {/* Top Navigation Bar with Logo, Theme Toggle & Login Button */}
      <Navbar onOpenLogin={handleOpenLogin} />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* 1. Hero Section (background: hero_section_bg.png, with Login & Signup buttons) */}
        <HeroSection
          onOpenLogin={handleOpenLogin}
          onOpenSignup={handleOpenSignup}
        />

        {/* 2. Unbeatable Features Section (AI features tailored for gamers) */}
        <FeaturesSection />

        {/* 3. Discover the World Section (interactive village landmarks) */}
        <WorldSection />

        {/* 4. Meet the Characters Section (animated character sprites & lore) */}
        <CharactersSection />

        {/* 5. Experience the Gameplay Section (Answers: What will I actually do when I play?) */}
        <GameplaySection />

        {/* 6. Call to Action — Start your adventure */}
        <CTASection
          onOpenSignup={handleOpenSignup}
          onOpenLogin={handleOpenLogin}
        />
      </main>

      {/* 7. Footer */}
      <Footer />

      {/* Authentication & Alpha Registration Modal */}
      <AuthModal
        isOpen={authOpen}
        initialMode={authMode}
        onClose={handleCloseAuth}
      />
    </div>
  );
}
