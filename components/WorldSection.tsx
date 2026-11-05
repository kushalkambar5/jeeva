"use client";

import React, { useState } from "react";
import Image from "next/image";
import PixelButton from "./PixelButton";
import { MapPin, Compass, ArrowRight, ShieldCheck, Sun, Moon } from "lucide-react";

export default function WorldSection() {
  const [selectedLocIndex, setSelectedLocIndex] = useState(0);

  const locations = [
    {
      id: "homestead",
      name: "The Main Homestead",
      tagline: "Your Starting Sanctuary & Hearth",
      character: "Ananya & Traveler",
      buildingImg: "/assets/buildings/main_house.png",
      buildingWidth: 96,
      buildingHeight: 128,
      props: [
        { name: "Ancient Oak", img: "/assets/buildings/oak_tree.png", width: 64, height: 80 },
        { name: "Storage Chest", img: "/assets/buildings/chest.png", width: 16, height: 16 },
      ],
      description:
        "Your home on the western ridge of Jeeva. Here you recover after surviving the devastating storm. A warm clay stove, a verandah overlooking the paddy fields, and a personal oak chest for your scavenged tools.",
      questHook: "Chapter 1: Gather dry firewood and check on your companion before venturing down into the flooded village.",
      atmosphere: "Warm amber lanterns, monsoon drizzle pattering on tiled terracotta shingles.",
    },
    {
      id: "workshop",
      name: "Arjun's Mechanic Workshop",
      tagline: "The Village Powerhouse & Engineering Hub",
      character: "Arjun the Mechanic",
      buildingImg: "/assets/buildings/mechanic_workshop.png",
      buildingWidth: 320,
      buildingHeight: 204,
      props: [
        { name: "Mechanic Tools", img: "/assets/tilesets/mechanic_tiles.png", width: 64, height: 64 },
        { name: "Equipment Trunk", img: "/assets/buildings/chest.png", width: 16, height: 16 },
      ],
      description:
        "Grease, copper spools, and roaring diesel engines. Arjun manages the central generator that powers the hospital and streetlights. The recent floodwater soaked the alternator coils.",
      questHook: "Chapter 3: Retrieve 4 waterproof copper coils and scavenge diesel fuel to reboot the electrical grid.",
      atmosphere: "Sparks flying, rhythmic clinking of wrenches, and the hum of a dying dynamo.",
    },
    {
      id: "farm",
      name: "Ravi's Terraced Paddy Farm",
      tagline: "The Lifeblood of Jeeva's Food Supply",
      character: "Ravi the Farmer",
      buildingImg: "/assets/tilesets/farm_objects.png",
      buildingWidth: 160,
      buildingHeight: 120,
      props: [
        { name: "Paddy Crops", img: "/assets/tilesets/farm_plants.png", width: 64, height: 64 },
        { name: "Oak Perimeter", img: "/assets/buildings/oak_tree.png", width: 64, height: 80 },
      ],
      description:
        "Sprawling green fields step down towards the riverbank. When the flood surge broke the containment bunds, Ravi's prize winter crop was submerged. He guards his remaining granaries fiercely.",
      questHook: "Chapter 2: Negotiate with Ravi to release 5 sacks of emergency grain for the clinic without bankrupting his family.",
      atmosphere: "Croaking marsh frogs, golden wheat swaying in muddy water, aroma of fresh tilled earth.",
    },
    {
      id: "clinic",
      name: "Dr. Meera's Emergency Clinic",
      tagline: "Triage Center & Medical Sanctuary",
      character: "Dr. Meera",
      buildingImg: "/assets/buildings/hospital_table.png",
      buildingWidth: 128,
      buildingHeight: 64,
      props: [
        { name: "Triage Bed", img: "/assets/buildings/hospital_bed.png", width: 32, height: 40 },
        { name: "Medical Cabinet", img: "/assets/buildings/hospital_cabinet.png", width: 32, height: 32 },
      ],
      description:
        "A converted colonial resthouse with rows of cots and emergency triage tables. Dr. Meera works day and night treating wounded neighbors, fighting off fevers, and praying for power.",
      questHook: "Chapter 1 & 2: Rush medical crates recovered from the river before sepsis infects the elderly villagers.",
      atmosphere: "Clean herbal disinfectants, boiling water vats, and urgent medical hushes.",
    },
    {
      id: "store",
      name: "Dev's General Store & Barter Bazaar",
      tagline: "The Commercial Crossroads of the Valley",
      character: "Dev the Merchant",
      buildingImg: "/assets/interiors/shop_props.png",
      buildingWidth: 140,
      buildingHeight: 100,
      props: [
        { name: "Trade Shelves", img: "/assets/interiors/shop_tiles.png", width: 64, height: 64 },
        { name: "Locked Safe", img: "/assets/buildings/chest.png", width: 16, height: 16 },
      ],
      description:
        "Sacks of lentils, brass lanterns, dry salt, batteries, and rare imported spices. Dev knows the value of every rupee and will barter anything if you have something he covets.",
      questHook: "Chapter 2 & 4: Convince Dev to freeze his wartime price inflation or track down who burglarized his spice lockers.",
      atmosphere: "Scent of cardamom and dried chili, abacus beads clicking, and competitive haggling.",
    },
  ];

  const currentLoc = locations[selectedLocIndex];

  return (
    <section id="world" className="py-20 bg-cream dark:bg-[#0F1712] border-b-4 border-[#3D3429] dark:border-[#213327] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 border-2 border-[#3D3429] dark:border-[#78A85B] bg-warmbeige dark:bg-[#16221A] shadow-[2px_2px_0px_#14271A]">
            <Compass className="w-4 h-4 text-forest dark:text-gold" />
            <span className="text-xs font-pixel uppercase tracking-widest text-forest dark:text-gold font-bold">
              The Handcrafted World
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-pixel uppercase tracking-tight text-darkbrown dark:text-cream leading-tight">
            Discover the Village of Jeeva
          </h2>
          <p className="mt-4 text-base sm:text-lg font-sans text-mutedbrown dark:text-[#BAC9B9] leading-relaxed">
            Every building has an authentic purpose, handcrafted interiors, and living characters who work, sleep, and
            react to your deeds.
          </p>
        </div>

        {/* Location Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
          {locations.map((loc, idx) => (
            <PixelButton
              key={loc.id}
              variant={selectedLocIndex === idx ? "forest" : "classic"}
              size="sm"
              onClick={() => setSelectedLocIndex(idx)}
              className={selectedLocIndex === idx ? "ring-2 ring-forest dark:ring-gold" : ""}
            >
              {loc.name.split(" ")[0]}
            </PixelButton>
          ))}
        </div>

        {/* Detailed Location Showcase Card */}
        <div className="p-6 sm:p-10 bg-warmbeige dark:bg-[#18261E] border-4 border-[#3D3429] dark:border-[#78A85B] shadow-[8px_8px_0px_#14271A] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Pixel Asset Showcase Visualizer */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-mint/50 dark:bg-[#0D1410] border-3 border-[#3D3429] dark:border-[#2C4132] shadow-inner min-h-[300px]">
            <div className="relative flex flex-col items-center justify-center py-4">
              
              {/* Primary Building Asset */}
              <div className="relative mb-6 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.4)]">
                <Image
                  src={currentLoc.buildingImg}
                  alt={currentLoc.name}
                  width={currentLoc.buildingWidth}
                  height={currentLoc.buildingHeight}
                  className="pixel-art object-contain max-h-[180px] w-auto hover:scale-105 transition-transform"
                />
              </div>

              {/* Surrounding Props Row */}
              <div className="flex items-center justify-center gap-6 pt-4 border-t-2 border-dashed border-[#6F6657]/30 w-full">
                {currentLoc.props.map((prop) => (
                  <div key={prop.name} className="flex flex-col items-center text-center">
                    <div className="h-14 flex items-center justify-center">
                      <Image
                        src={prop.img}
                        alt={prop.name}
                        width={prop.width}
                        height={prop.height}
                        className="pixel-art object-contain max-h-12 w-auto"
                      />
                    </div>
                    <span className="text-[10px] font-pixel text-mutedbrown dark:text-[#9FB19E] uppercase mt-1">
                      {prop.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 px-3 py-1 bg-white dark:bg-[#16221A] border border-[#3D3429] text-[11px] font-pixel text-forest dark:text-gold uppercase tracking-wider">
              Authentic In-Game Tiled Asset Pack
            </div>
          </div>

          {/* Right Column: Lore, resident & Quest Info */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-forest dark:text-gold" />
                <span className="text-xs font-pixel uppercase tracking-widest text-forest dark:text-gold font-bold">
                  {currentLoc.tagline}
                </span>
              </div>
              <h3 className="text-2xl sm:text-4xl font-pixel uppercase tracking-wide text-darkbrown dark:text-cream">
                {currentLoc.name}
              </h3>
              <div className="mt-1 text-xs font-pixel text-mutedbrown dark:text-[#A7BBA6]">
                Key Resident: <strong className="text-forest dark:text-gold">{currentLoc.character}</strong>
              </div>

              <p className="mt-4 text-sm sm:text-base font-sans text-mutedbrown dark:text-[#C5D5C4] leading-relaxed">
                {currentLoc.description}
              </p>
            </div>

            {/* Atmosphere box */}
            <div className="p-3 bg-white/70 dark:bg-[#111A14] border-2 border-[#3D3429] dark:border-[#2C4132]">
              <span className="text-[11px] font-pixel uppercase text-mutedbrown dark:text-[#A7BBA6] block mb-1">
                Ambient Atmosphere:
              </span>
              <p className="text-xs sm:text-sm font-sans italic text-darkbrown dark:text-cream">
                &ldquo;{currentLoc.atmosphere}&rdquo;
              </p>
            </div>

            {/* Quest teaser */}
            <div className="p-3 bg-mint dark:bg-[#203125] border-2 border-forest dark:border-meadow">
              <span className="text-[11px] font-pixel uppercase text-forest dark:text-gold block font-bold mb-1">
                Active Story Objective:
              </span>
              <p className="text-xs sm:text-sm font-sans font-medium text-darkbrown dark:text-cream">
                {currentLoc.questHook}
              </p>
            </div>

            {/* Travel / Action Button */}
            <div className="pt-2 flex items-center gap-4">
              <PixelButton
                variant="forest"
                size="md"
                onClick={() => {
                  const next = (selectedLocIndex + 1) % locations.length;
                  setSelectedLocIndex(next);
                }}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Inspect Next Sector
              </PixelButton>
              <span className="text-xs font-pixel text-mutedbrown dark:text-[#9FB19E]">
                Sector {selectedLocIndex + 1} of {locations.length}
              </span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
