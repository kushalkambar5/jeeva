"use client";

import React, { useState } from "react";
import PixelButton from "./PixelButton";
import {
  Gamepad2,
  Compass,
  Mic,
  Activity,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function GameplaySection() {
  const [activeSimIndex, setActiveSimIndex] = useState(0);

  const gameplaySteps = [
    {
      num: "01",
      title: "Explore the Storm Ruins (WASD / Arrows)",
      desc: "Roam freely across a 2D top-down handcrafted Indian village. Jump across flooded irrigation ditches, inspect damaged roofs, explore the dense banyan grove, and discover lost tool chests.",
      control: "[W][A][S][D] Move • [Shift] Sprint",
    },
    {
      num: "02",
      title: "Approach Any NPC & Press [E] to Speak",
      desc: "Walk up to any resident. A proximity ring lights up. Hold your push-to-talk button and speak out loud in Hindi, Tamil, Telugu, or English. You can also type directly in retro chat if you prefer silence.",
      control: "Hold [E] to Talk • [Enter] to Type",
    },
    {
      num: "03",
      title: "Give Commands & Watch Real Execution",
      desc: "No fake text promises! Ask Arjun to help drag wire coils, or instruct Ravi to deliver grain to the clinic. Watch them physically equip tools, walk beside you, and complete the job in the world.",
      control: "[Follow Me] • [Collect Resource] • [Trade] • [Protect]",
    },
    {
      num: "04",
      title: "Shape the 5-Chapter Recovery Campaign",
      desc: "Rebuild the community step by step. Resolve fierce villager feuds, manage dwindling rations, restore electricity, and face the social consequences of every promise you make.",
      control: "5 Story Chapters • Consequence Tracker",
    },
  ];

  const simulationEvents = [
    {
      playerInput: "Arjun, clinic generator completely dead hai. Can you come fix it before dark?",
      npcSpeaker: "Arjun (Mechanic)",
      npcVoice: "Telugu / Hinglish",
      npcDialogue: "Dead? Damn water must have fried the alternator. Grab 4 copper coils from the workshop locker, and I'll meet you by the dynamo!",
      actionStatus: "Status: [EQUIPPING TOOLBOX • MOVING TO CLINIC DYNAMO]",
      worldImpact: "World State: Generator repair queued (+10 Hospital Morale)",
    },
    {
      playerInput: "Ravi bhai, hospital needs 3 sacks of rice. Villagers are starving.",
      npcSpeaker: "Ravi (Farmer)",
      npcVoice: "Hindi / Bhojpuri",
      npcDialogue: "Look at my drowning crop! Dev has plenty of stockpiles in his warehouse, ask him first! ...Fine, if you help me shovel the drainage trench, I'll spare two sacks.",
      actionStatus: "Status: [NEGOTIATING TASK • WAITING FOR TRENCH DIGGING]",
      worldImpact: "World State: Relationship Challenge (Help Ravi to unlock rice)",
    },
    {
      playerInput: "Kalia, did you take Dr. Meera's emergency antiseptic crate?",
      npcSpeaker: "Kalia (The Rogue)",
      npcVoice: "Street Slang",
      npcDialogue: "Take? What an ugly word! I salvaged it before floodwater ruined the seal. Give me two dry batteries, and it's yours.",
      actionStatus: "Status: [HOLDING CONTRABAND • BARTERING]",
      worldImpact: "World State: Police investigation ongoing in lower bazaar",
    },
  ];

  const currentSim = simulationEvents[activeSimIndex];

  return (
    <section id="gameplay" className="py-20 bg-cream dark:bg-[#0F1712] border-b-4 border-[#3D3429] dark:border-[#213327] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-5xl font-pixel uppercase tracking-tight text-darkbrown dark:text-cream leading-tight">
            What Will I Actually Do When I Play?
          </h2>
        </div>

        {/* 4 Gameplay Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {gameplaySteps.map((step) => (
            <div
              key={step.num}
              className="p-6 bg-warmbeige dark:bg-[#18261E] border-3 border-[#3D3429] dark:border-[#2C4132] shadow-[6px_6px_0px_#14271A] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-pixel text-forest dark:text-gold font-bold">
                    {step.num}
                  </span>
                  <span className="text-[10px] font-pixel px-2 py-0.5 bg-white dark:bg-black/30 border border-[#3D3429] text-mutedbrown dark:text-cream uppercase">
                    Step
                  </span>
                </div>
                <h3 className="text-lg font-pixel uppercase tracking-wide text-darkbrown dark:text-cream mb-2 leading-snug">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm font-sans text-mutedbrown dark:text-[#BAC9B9] leading-relaxed mb-4">
                  {step.desc}
                </p>
              </div>

              <div className="pt-3 border-t-2 border-dashed border-[#6F6657]/30">
                <span className="text-[11px] font-pixel text-forest dark:text-gold uppercase tracking-wider block font-semibold">
                  Controls:
                </span>
                <span className="text-xs font-sans text-darkbrown dark:text-cream font-bold">
                  {step.control}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Live Gameplay Terminal Simulator */}
        <div className="p-6 sm:p-10 bg-forest text-cream dark:bg-[#16221A] border-4 border-[#3D3429] dark:border-[#78A85B] shadow-[8px_8px_0px_#14271A]">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-6 mb-6 border-b-2 border-dashed border-cream/30 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2.5 h-2.5 bg-gold rounded-full animate-pulse" />
                <span className="text-xs font-pixel uppercase tracking-widest text-gold font-bold">
                  Interactive Live Gameplay Simulator
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-pixel uppercase">
                Simulate a Real Voice Interaction
              </h3>
            </div>
            
            {/* Prompt Selector Buttons */}
            <div className="flex flex-wrap gap-2">
              {simulationEvents.map((sim, idx) => (
                <button
                  key={sim.npcSpeaker}
                  type="button"
                  onClick={() => setActiveSimIndex(idx)}
                  className={`px-3 py-1.5 text-xs font-pixel uppercase border transition-all cursor-pointer ${
                    activeSimIndex === idx
                      ? "bg-gold text-darkbrown border-white font-bold shadow-[2px_2px_0px_#000]"
                      : "bg-black/30 text-cream border-cream/30 hover:border-gold"
                  }`}
                >
                  Prompt {idx + 1}: {sim.npcSpeaker.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Simulated Dialogue Box & HUD */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left: Player Speech Bubble */}
            <div className="lg:col-span-5 p-5 bg-black/40 border-2 border-cream/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-pixel text-gold mb-2">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Mic className="w-3.5 h-3.5" /> YOU SPOKE (MIC / CHAT):
                  </span>
                  <span className="text-[10px] uppercase bg-forest/80 px-1.5 py-0.5 border border-gold/40">
                    Speech Input
                  </span>
                </div>
                <p className="text-sm sm:text-base font-sans italic text-cream bg-black/30 p-3 border-l-3 border-gold leading-relaxed">
                  &ldquo;{currentSim.playerInput}&rdquo;
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-cream/20 text-[11px] font-pixel text-cream/70">
                Language Auto-Detected • Latency: 180ms
              </div>
            </div>

            {/* Right: Authoritative NPC Response & Action Engine */}
            <div className="lg:col-span-7 p-5 bg-cream text-darkbrown dark:bg-[#0D1410] dark:text-cream border-2 border-[#3D3429] dark:border-[#78A85B] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-pixel mb-2">
                  <span className="text-forest dark:text-gold font-bold">
                    {currentSim.npcSpeaker} REPLIES ({currentSim.npcVoice}):
                  </span>
                  <span className="text-[10px] font-pixel px-2 py-0.5 bg-forest text-cream font-bold">
                    Phaser 3 Engine Synced
                  </span>
                </div>
                <p className="text-sm sm:text-base font-sans font-medium text-darkbrown dark:text-[#F3F4F1] leading-relaxed mb-4">
                  &ldquo;{currentSim.npcDialogue}&rdquo;
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t-2 border-dashed border-[#6F6657]/30">
                <div className="p-2 bg-mint/70 dark:bg-[#1E2E23] text-xs font-pixel text-forest dark:text-gold flex items-center gap-2">
                  <Activity className="w-4 h-4 shrink-0 animate-pulse text-forest dark:text-gold" />
                  <span className="font-bold">{currentSim.actionStatus}</span>
                </div>
                <div className="p-2 bg-warmbeige dark:bg-black/40 text-xs font-sans text-mutedbrown dark:text-[#A7BBA6] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{currentSim.worldImpact}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Chapter Progression Timeline */}
          <div className="mt-10 pt-8 border-t-2 border-dashed border-cream/30">
            <h4 className="text-xs font-pixel uppercase tracking-widest text-gold font-bold mb-4">
              5-Chapter Village Recovery Arc
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { ch: "CH 1", name: "The Storm", goal: "Survey damage & rescue neighbors" },
                { ch: "CH 2", name: "The Shortage", goal: "Negotiate grain & clinic supplies" },
                { ch: "CH 3", name: "The Generator", goal: "Restore electrical power with Arjun" },
                { ch: "CH 4", name: "The Conflict", goal: "Mediate tense town hall ration debates" },
                { ch: "CH 5", name: "The Recovery", goal: "Face consequences & festival celebration" },
              ].map((c, i) => (
                <div
                  key={c.ch}
                  className="p-3 bg-black/30 border border-cream/20 text-center flex flex-col justify-between"
                >
                  <span className="text-xs font-pixel text-gold font-bold">{c.ch}</span>
                  <span className="text-sm font-pixel text-cream my-1 uppercase">{c.name}</span>
                  <span className="text-[11px] font-sans text-cream/70 leading-tight">{c.goal}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
