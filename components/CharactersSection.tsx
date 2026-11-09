"use client";

import React, { useState } from "react";
import PixelSprite from "./PixelSprite";
import PixelButton from "./PixelButton";
import { Users, Heart, MessageSquare, Shield, Volume2 } from "lucide-react";

export default function CharactersSection() {
  const [selectedCharIndex, setSelectedCharIndex] = useState(0);

  const characters = [
    {
      id: "ananya",
      name: "Ananya",
      devanagari: "अनन्या",
      role: "Loving Companion & Moral Compass",
      sprite: "/assets/characters/wife.png",
      layout: "3x4",
      personality: ["Warmhearted", "Resourceful", "Witty", "Perceptive"],
      relationshipBase: 95,
      voiceLang: "Hindi / English",
      quote: "The storm tore down half the verandah, but as long as we're safe, timber can always be replaced. Here, drink this warm ginger tea before you go back outside.",
      dailyLife: "Maintains the homestead, tends the medicinal garden, coordinates emergency relief packages for village children.",
      gamerSecret: "Her relationship meter directly unlocks bonus survival provisions and special quest hints.",
    },
    {
      id: "ravi",
      name: "Ravi",
      devanagari: "रवि",
      role: "Village Farmer & Granary Keeper",
      sprite: "/assets/characters/farmer.png",
      layout: "3x4",
      personality: ["Hardworking", "Stubborn", "Fierce", "Protective"],
      relationshipBase: 40,
      voiceLang: "Hindi / Bhojpuri dialect",
      quote: "Every monsoon is a test, but this one took my winter seedlings! I'm not donating grain to anyone who sits around gossiping while my ditches are still flooded.",
      dailyLife: "Dawn till dusk out on the terraces. Re-digging drainage canals, guarding grain stores from looters.",
      gamerSecret: "If you help him haul fallen trees away from his levee, he grants a 50% discount on food trades.",
    },
    {
      id: "meera",
      name: "Dr. Meera",
      devanagari: "डॉ. मीरा",
      role: "Village Physician & Healer",
      sprite: "/assets/characters/doctor.png",
      layout: "4x8",
      personality: ["Compassionate", "Sharp-tongued", "Selfless", "Overworked"],
      relationshipBase: 65,
      voiceLang: "Tamil / English",
      quote: "I haven't slept in thirty hours. If Dev doesn't release his crate of antibiotics immediately, tell him I'll come drag it out of his warehouse myself!",
      dailyLife: "Stationed in the triage clinic, concocting herbal dressings, checking on feverish children.",
      gamerSecret: "Fulfill her emergency supply requests to earn medical salve that boosts your stamina and village renown.",
    },
    {
      id: "arjun",
      name: "Arjun",
      devanagari: "अर्जुन",
      role: "Master Mechanic & Electrician",
      sprite: "/assets/characters/mechanic.png",
      layout: "3x4",
      personality: ["Genius Tinkerer", "Impatient", "Blunt", "Loyal"],
      relationshipBase: 50,
      voiceLang: "Telugu / English",
      quote: "Look at this commutator ring—it's roasted. Without fresh copper wire, you won't get a single volt to the hospital. Stop talking and find me tools!",
      dailyLife: "Buried inside the workshop grease pit, soldering coils, tuning the diesel pump.",
      gamerSecret: "Command Arjun to follow you with the tool kit to unlock repair actions on damaged bridges across the map.",
    },
    {
      id: "dev",
      name: "Dev",
      devanagari: "देव",
      role: "General Merchant & Trader",
      sprite: "/assets/characters/shopkeeper.png",
      layout: "4x8",
      personality: ["Shrewd", "Cunning", "Silver-tongued", "Opportunistic"],
      relationshipBase: 30,
      voiceLang: "Gujarati / Hindi",
      quote: "Supply and demand, bhai! The highway bridge collapsed—freight costs double! But for you... a small discount if you bring me rare dry tea leaves.",
      dailyLife: "Balancing his ledger, guarding his lockbox, haggling on every sack of salt.",
      gamerSecret: "Dev will buy anything you scavenge from storm ruins, but compare his prices before accepting.",
    },
    {
      id: "elder",
      name: "Ramesh Kaka",
      devanagari: "रमेश काका",
      role: "Respected Village Elder",
      sprite: "/assets/characters/elder.png",
      layout: "3x4",
      personality: ["Wise", "Patient", "Cautious", "Revered"],
      relationshipBase: 70,
      voiceLang: "Hindi / Sanskrit-inflected",
      quote: "Anger is like rainwater behind a frail mud wall—it rises fast and breaks everything. Sit with me. Tell me what your eyes saw in the lower village.",
      dailyLife: "Chopal meetings under the ancient banyan tree, counseling distressed neighbors, settling property disputes.",
      gamerSecret: "His blessing is required to pass community emergency ordinances in Chapter 4.",
    },
    {
      id: "policeman",
      name: "Inspector Vikram",
      devanagari: "विक्रम",
      role: "Village Constable",
      sprite: "/assets/characters/policeman.png",
      layout: "3x4",
      personality: ["Disciplined", "Vigilant", "Procedural", "Firm"],
      relationshipBase: 55,
      voiceLang: "Marathi / Hindi",
      quote: "Curfew is in effect until power returns. If you're roaming past midnight with a torch, you better have a good explanation for my logbook.",
      dailyLife: "Patrolling perimeter dikes, recording missing livestock, questioning suspicious silhouettes.",
      gamerSecret: "Give him accurate reports about thefts to recruit his help for checkpoint security.",
    },
    {
      id: "thief",
      name: "Kalia",
      devanagari: "कालिया",
      role: "Shadow & Lock Specialist",
      sprite: "/assets/characters/thief.png",
      layout: "3x4",
      personality: ["Secretive", "Agile", "Mischievous", "Streetwise"],
      relationshipBase: 20,
      voiceLang: "Street Slang / Hinglish",
      quote: "Dropped something during the flood? I might know where it washed up. Everything in this village has an owner... until water moves it.",
      dailyLife: "Lurks near alley shadows, trades in lost keys, knows every hidden crawlspace.",
      gamerSecret: "Catch him red-handed or hire his lockpicking skills to bypass jammed warehouse doors.",
    },
  ];

  const currentChar = characters[selectedCharIndex];

  return (
    <section id="characters" className="py-20 bg-warmbeige/50 dark:bg-[#121B15] border-b-4 border-[#3D3429] dark:border-[#213327] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-5xl font-pixel uppercase tracking-tight text-darkbrown dark:text-cream leading-tight">
            Distinct Minds. Deep Motives. Real Personalities.
          </h2>
        </div>

        {/* Character Selection Carousel / Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-10">
          {characters.map((char, idx) => (
            <button
              key={char.id}
              type="button"
              onClick={() => setSelectedCharIndex(idx)}
              className={`p-3 flex flex-col items-center border-3 transition-all cursor-pointer ${
                selectedCharIndex === idx
                  ? "bg-forest text-cream border-[#3D3429] dark:bg-[#203426] dark:border-gold shadow-[4px_4px_0px_#14271A] -translate-y-1"
                  : "bg-cream dark:bg-[#18261E] border-[#3D3429]/40 dark:border-[#2C4132] hover:border-forest"
              }`}
            >
              <div className="h-16 flex items-center justify-center">
                <PixelSprite
                  src={char.sprite}
                  frameWidth={32}
                  frameHeight={32}
                  scale={2}
                  animate={selectedCharIndex === idx}
                />
              </div>
              <span className="mt-2 text-xs font-pixel uppercase tracking-wider text-center truncate w-full">
                {char.name}
              </span>
              <span className="text-[10px] font-sans opacity-70 truncate w-full text-center">
                {char.devanagari}
              </span>
            </button>
          ))}
        </div>

        {/* Selected Character Spotlight Card */}
        <div className="p-6 sm:p-10 bg-cream dark:bg-[#18261E] border-4 border-[#3D3429] dark:border-[#78A85B] shadow-[8px_8px_0px_#14271A] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left: Animated Character Avatar Box */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-8 bg-mint/40 dark:bg-[#0D1410] border-3 border-[#3D3429] dark:border-[#2C4132] text-center">
            <div className="p-4 bg-white/80 dark:bg-[#16221A] border-2 border-[#3D3429] dark:border-[#78A85B] shadow-[4px_4px_0px_#14271A] mb-4">
              <PixelSprite
                src={currentChar.sprite}
                frameWidth={32}
                frameHeight={32}
                scale={3.5}
                animate={true}
              />
            </div>

            <h3 className="text-2xl font-pixel uppercase tracking-wide text-darkbrown dark:text-gold">
              {currentChar.name} <span className="text-base text-forest dark:text-cream">({currentChar.devanagari})</span>
            </h3>
            <span className="mt-1 text-xs font-pixel uppercase tracking-widest text-mutedbrown dark:text-[#A7BBA6]">
              {currentChar.role}
            </span>

            {/* Relationship Meter */}
            <div className="w-full mt-6 pt-4 border-t-2 border-dashed border-[#6F6657]/30">
              <div className="flex justify-between items-center text-xs font-pixel mb-1">
                <span className="text-mutedbrown dark:text-[#A7BBA6]">Starting Trust:</span>
                <span className="text-forest dark:text-gold font-bold">{currentChar.relationshipBase} / 100</span>
              </div>
              <div className="w-full h-3 bg-warmbeige dark:bg-black/50 border border-[#3D3429]">
                <div
                  className="h-full bg-forest dark:bg-gold transition-all duration-300"
                  style={{ width: `${currentChar.relationshipBase}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: Character Story & Interactions */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
            
            {/* Personality Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-pixel text-mutedbrown dark:text-[#A7BBA6] mr-1">
                Traits:
              </span>
              {currentChar.personality.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 text-xs font-pixel uppercase bg-warmbeige dark:bg-[#203125] text-darkbrown dark:text-[#E2EDE1] border border-[#3D3429]/30 font-bold"
                >
                  {tag}
                </span>
              ))}
              <span className="ml-auto px-2 py-0.5 text-xs font-pixel bg-mint text-forest border border-forest font-bold">
                Voice: {currentChar.voiceLang}
              </span>
            </div>

            {/* In-Character Dialogue */}
            <div className="p-4 bg-white/70 dark:bg-[#111A14] border-2 border-[#3D3429] dark:border-[#2C4132]">
              <span className="text-[11px] font-pixel uppercase tracking-wider text-forest dark:text-gold block mb-1 font-bold">
                Signature Spoken Line:
              </span>
              <p className="text-sm sm:text-base font-sans italic text-darkbrown dark:text-cream leading-relaxed">
                &ldquo;{currentChar.quote}&rdquo;
              </p>
            </div>

            {/* Daily Routine */}
            <div className="space-y-1">
              <span className="text-xs font-pixel uppercase text-mutedbrown dark:text-[#A7BBA6] block">
                Daily Routine &amp; Social Behavior:
              </span>
              <p className="text-xs sm:text-sm font-sans text-mutedbrown dark:text-[#BAC9B9] leading-relaxed">
                {currentChar.dailyLife}
              </p>
            </div>

            {/* Gamer Pro-tip / Secret */}
            <div className="p-3 bg-mint/60 dark:bg-[#1E2E23] border-l-4 border-forest dark:border-gold">
              <span className="text-xs font-pixel uppercase tracking-wider text-forest dark:text-gold block font-bold mb-0.5">
                Gamer Pro-Tip:
              </span>
              <p className="text-xs font-sans text-darkbrown dark:text-cream">
                {currentChar.gamerSecret}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <PixelButton
                variant="forest"
                size="md"
                onClick={() => {
                  const next = (selectedCharIndex + 1) % characters.length;
                  setSelectedCharIndex(next);
                }}
              >
                Inspect Next Villager
              </PixelButton>
              <span className="text-xs font-pixel text-mutedbrown dark:text-[#9FB19E]">
                Resident {selectedCharIndex + 1} of {characters.length}
              </span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
