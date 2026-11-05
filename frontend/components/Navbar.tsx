"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import PixelButton from "./PixelButton";
import { Sun, Moon, Menu, X, ShieldAlert, Sparkles, Volume2 } from "lucide-react";

interface NavbarProps {
  onOpenLogin: () => void;
}

export default function Navbar({ onOpenLogin }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "The World", href: "#world" },
    { name: "Characters", href: "#characters" },
    { name: "Gameplay", href: "#gameplay" },
    { name: "Story", href: "#story" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-cream/90 dark:bg-[#0F1712]/90 border-b-4 border-[#3D3429] dark:border-[#213327] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Game Title */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          >
            <div className="relative w-12 h-12 overflow-hidden border-2 border-[#3D3429] dark:border-[#78A85B] bg-[#FFF8E9] shadow-[2px_2px_0px_#14271A]">
              <Image
                src="/logo.png"
                alt="Jeeva Game Logo"
                fill
                priority
                sizes="48px"
                className="object-cover pixel-art group-hover:scale-110 transition-transform duration-200"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-pixel tracking-wider text-forest dark:text-gold uppercase leading-none">
                JEEVA
              </span>
              <span className="text-[10px] font-pixel tracking-widest text-mutedbrown dark:text-[#A7BBA6] uppercase">
                जीव • Living RPG
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="px-3 py-2 text-sm font-pixel uppercase tracking-wider text-darkbrown dark:text-[#E5F0D9] hover:text-forest dark:hover:text-gold hover:bg-forest/10 dark:hover:bg-white/5 border border-transparent hover:border-[#3D3429]/20 dark:hover:border-white/10 transition-all"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Theme Toggle Button (Light/Dark Mode) */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 text-darkbrown dark:text-gold border-2 border-[#3D3429] dark:border-[#78A85B] bg-warmbeige dark:bg-[#16221A] hover:bg-gold/30 dark:hover:bg-[#78A85B]/30 shadow-[2px_2px_0px_#14271A] transition-all cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-gold animate-in spin-in-180 duration-300" />
              ) : (
                <Moon className="w-5 h-5 text-darkbrown animate-in spin-in-180 duration-300" />
              )}
            </button>

            {/* Login Button in Navbar using reusable PixelButton */}
            <div className="hidden sm:block">
              <PixelButton
                variant="forest"
                size="sm"
                onClick={onOpenLogin}
                ariaLabel="Log in to Jeeva"
              >
                Login
              </PixelButton>
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-darkbrown dark:text-cream border-2 border-[#3D3429] dark:border-[#78A85B] bg-white dark:bg-[#16221A]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-[#3D3429] dark:border-[#213327] bg-cream dark:bg-[#0F1712] p-4 space-y-3">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-pixel uppercase tracking-wide text-darkbrown dark:text-cream hover:bg-forest/20"
              >
                {link.name}
              </a>
            ))}
          </nav>
          <div className="pt-2 border-t border-dashed border-[#6F6657]/30">
            <PixelButton
              variant="forest"
              size="full"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLogin();
              }}
            >
              Login to Village
            </PixelButton>
          </div>
        </div>
      )}
    </header>
  );
}
