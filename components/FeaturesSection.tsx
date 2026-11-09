"use client";

import React from "react";
import {
  Mic,
  Brain,
  Users,
  Hammer,
  Clock,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function FeaturesSection() {
  const features = [
    {
      icon: Hammer,
      badge: "Grounded Autonomy",
      title: "No More Frozen NPCs: Words Become Physical Reality",
      description:
        "Tired of NPCs saying 'I will go help the hospital' and standing frozen in place forever? In Jeeva, when an NPC promises action, they literally pathfind through town, pick up tools, gather the supplies, and deliver them before your eyes.",
      gamerQuote: "If Ravi says he'll chop wood for the barricade, you can follow him to the trees and watch him swing.",
      accent: "border-forest dark:border-meadow",
    },
    {
      icon: Mic,
      badge: "Voice in Any Tongue",
      title: "Speak Aloud in Hindi, Tamil, Telugu, or English",
      description:
        "Throw away boring dialogue trees! Tap [E], hold your mic, and speak naturally. Use slang, beg for mercy, bargain aggressively, or make jokes. Villagers understand your tone and respond out loud with distinct voices and regional accents.",
      gamerQuote: "Say 'Ravi bhai, thoda chawal clinic bhej do na' and watch him deliberate based on your friendship score.",
      accent: "border-gold dark:border-gold",
    },
    {
      icon: Brain,
      badge: "Living Memory & Gossip",
      title: "Your Deeds Echo Through The Entire Village",
      description:
        "The village is a tight-knit web. If you break a promise to Dev the shopkeeper, the Elder will question your integrity at sunset. If you rescue Dr. Meera's clinic, the constable will let minor infractions slide.",
      gamerQuote: "Lie once, and gossip travels faster than monsoon floodwater.",
      accent: "border-terracotta dark:border-terracotta",
    },
    {
      icon: Users,
      badge: "Emergent Group Debates",
      title: "Step Right Into Active Village Town Halls",
      description:
        "When disaster strikes, residents gather under the banyan tree to argue, vote, and distribute relief rations. You can walk right into an active debate, interrupt with your voice, sway the crowd, or watch alliances form dynamically.",
      gamerQuote: "No cutscenes. Just step into the circle, raise your voice, and change the vote.",
      accent: "border-sky dark:border-sky",
    },
    {
      icon: Clock,
      badge: "Circadian Routines",
      title: "Villagers Have Real Lives, Schedules & Sleep",
      description:
        "Residents don't stand in one spot waiting for you. They wake at dawn, tend cattle, open market stalls, visit sick relatives at the clinic, and lock their doors at night. Catch them at the right time and place to strike the best bargains.",
      gamerQuote: "Dev closes his shutter at dusk. If you need lanterns at midnight, you'll have to knock on his bedroom window.",
      accent: "border-cherry dark:border-cherry",
    },
    {
      icon: Zap,
      badge: "Dual Input Control",
      title: "Voice First, Seamless Retro Keyboard Fallback",
      description:
        "Gaming in a noisy room or late at night when the house is asleep? Switch instantly between natural speech-to-text and classic retro RPG keyboard chat without dropping a frame of gameplay.",
      gamerQuote: "Zero mic required when you want silent 60 FPS late-night grinding.",
      accent: "border-forest dark:border-gold",
    },
  ];

  return (
    <section id="features" className="py-20 bg-warmbeige/50 dark:bg-[#121B15] border-b-4 border-[#3D3429] dark:border-[#213327] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-5xl font-pixel uppercase tracking-tight text-darkbrown dark:text-cream leading-tight">
            Why Jeeva is Unlike Any RPG You&apos;ve Ever Played
          </h2>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className={`relative p-6 sm:p-7 bg-cream dark:bg-[#18261E] border-3 ${feat.accent} shadow-[6px_6px_0px_#14271A] flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-200`}
              >
                <div>
                  {/* Top Icon */}
                  <div className="flex items-center justify-end mb-4">
                    <div className="p-2 border-2 border-[#3D3429] dark:border-[#78A85B] bg-white dark:bg-[#111A14]">
                      <Icon className="w-5 h-5 text-forest dark:text-gold" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-pixel uppercase tracking-wide text-darkbrown dark:text-cream leading-snug">
                    {feat.title}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Callout banner */}
        <div className="mt-16 p-6 sm:p-8 bg-forest text-cream dark:bg-[#1B2920] border-4 border-[#3D3429] dark:border-[#78A85B] shadow-[8px_8px_0px_#14271A]">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center lg:text-left">
              <span className="text-xs font-pixel uppercase tracking-widest text-gold font-bold">
                The Next Leap in RPGs
              </span>
              <h3 className="text-2xl sm:text-3xl font-pixel uppercase">
                Other Games Give You Dialogue Trees. Jeeva Gives You a Living Society.
              </h3>
              <p className="text-sm sm:text-base font-sans text-cream/90 max-w-2xl leading-relaxed">
                Every action taken by an NPC is verified by the authoritative game engine: inventory diminishes, paths are traversed, and physical world states change.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <div className="text-center p-3 bg-black/30 border border-gold/40">
                <span className="block text-2xl font-pixel text-gold">0%</span>
                <span className="text-[11px] font-pixel uppercase text-cream/80">Canned Scripting</span>
              </div>
              <div className="text-center p-3 bg-black/30 border border-gold/40">
                <span className="block text-2xl font-pixel text-gold">100%</span>
                <span className="text-[11px] font-pixel uppercase text-cream/80">Authoritative Action</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
