'use client';

import React, { useState, useEffect } from 'react';
import { X, Coins, Sparkles, Trash2, Info, Package, Check } from 'lucide-react';
import {
  InventorySlot,
  MAX_INVENTORY_SLOTS,
  HOTBAR_SLOT_COUNT,
  loadPlayerInventory,
  loadPlayerWallet,
  removeItemFromSlot,
  savePlayerInventory,
  savePlayerWallet,
} from '@/lib/inventory';
import { sound } from './audio';

interface MinecraftInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHotbarIndex?: number;
  onSelectHotbarIndex?: (idx: number) => void;
}

export function MinecraftInventoryModal({
  isOpen,
  onClose,
  selectedHotbarIndex = 0,
  onSelectHotbarIndex,
}: MinecraftInventoryModalProps) {
  const [slots, setSlots] = useState<InventorySlot[]>([]);
  const [wallet, setWallet] = useState<number>(250);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Load inventory & wallet from localStorage
  const refreshData = () => {
    setSlots(loadPlayerInventory());
    setWallet(loadPlayerWallet());
  };

  useEffect(() => {
    refreshData();

    const handleInvUpdate = () => refreshData();
    const handleWalletUpdate = () => setWallet(loadPlayerWallet());

    window.addEventListener('jeeva:inventory-updated', handleInvUpdate);
    window.addEventListener('jeeva:wallet-updated', handleWalletUpdate);
    return () => {
      window.removeEventListener('jeeva:inventory-updated', handleInvUpdate);
      window.removeEventListener('jeeva:wallet-updated', handleWalletUpdate);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshData();
      sound.playInteractClick();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedSlot = slots[selectedSlotIndex];
  const selectedItem = selectedSlot?.item;

  const handleDropOne = () => {
    if (!selectedItem || selectedSlot.quantity <= 0) return;
    const { success, newSlots } = removeItemFromSlot(slots, selectedSlotIndex, 1);
    if (success) {
      setSlots(newSlots);
      setFeedbackMsg(`Dropped 1x ${selectedItem.name}`);
      setTimeout(() => setFeedbackMsg(null), 2500);
      sound.playInteractClick();
    }
  };

  const handleUseInspect = () => {
    if (!selectedItem) return;
    setFeedbackMsg(`Used ${selectedItem.name}: ${selectedItem.description.slice(0, 45)}...`);
    setTimeout(() => setFeedbackMsg(null), 3000);
    sound.playInteractClick();
  };

  const occupiedCount = slots.filter((s) => s.item !== null && s.quantity > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      {/* MINECRAFT AUTHENTIC SLATE/STONE INVENTORY CONTAINER */}
      <div
        className="relative w-full max-w-xl bg-[#C6C6C6] text-[#1E1E1E] rounded-md shadow-2xl p-5 border-4"
        style={{
          borderColor: '#FFFFFF #555555 #555555 #FFFFFF', // Classic Minecraft 3D beveled stone panel
          boxShadow: 'inset -3px -3px 0px #373737, inset 3px 3px 0px #FFFFFF, 0 20px 40px rgba(0,0,0,0.85)',
          fontFamily: "'Courier New', Courier, monospace",
        }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-[#8B8B8B]">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#373737]" />
            <h2 className="font-pixel text-base font-bold text-[#1E1E1E] tracking-wider uppercase">
              Player Inventory ({occupiedCount}/{MAX_INVENTORY_SLOTS})
            </h2>
            <span className="text-[10px] font-mono text-[#555555] ml-2 font-bold">[E to close]</span>
          </div>

          {/* Wallet Coin Pill & Close Button */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 px-3 py-1 bg-[#8B8B8B] rounded border-2 text-xs font-pixel font-bold text-[#FFF8E9] shadow-inner"
              style={{ borderColor: '#373737 #FFFFFF #FFFFFF #373737' }}
              title="Player Rupees (Coins)"
            >
              <Coins className="w-4 h-4 text-[#F4D477]" />
              <span className="text-[#F4D477] font-mono text-sm font-bold">₹{wallet}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded bg-[#8B8B8B] hover:bg-[#A0A0A0] active:bg-[#666666] border-2 text-[#222222] transition cursor-pointer"
              style={{ borderColor: '#FFFFFF #373737 #373737 #FFFFFF' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FEEDBACK TOAST */}
        {feedbackMsg && (
          <div className="mb-3 px-3 py-1.5 rounded bg-[#2D4A22] border-2 border-[#78A85B] text-[#FFF8E9] text-xs font-pixel flex items-center gap-2 animate-in fade-in duration-100">
            <Check className="w-3.5 h-3.5 text-[#93C476]" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* MAIN BODY: 15-SLOT GRID (3 rows of 5) + ITEM DETAILS PANEL */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: 15 Minecraft Inventory Slots (3x5) */}
          <div className="md:col-span-7 flex flex-col items-center">
            <div className="text-[11px] font-pixel text-[#444444] mb-2 uppercase font-bold self-start">
              Storage Grid (15 Slots Limit)
            </div>

            <div
              className="p-3 bg-[#8B8B8B] rounded border-3 grid grid-cols-5 gap-2"
              style={{
                borderColor: '#373737 #FFFFFF #FFFFFF #373737', // Inset deep well
              }}
            >
              {slots.map((slot, idx) => {
                const isSelected = selectedSlotIndex === idx;
                const isHotbar = idx < HOTBAR_SLOT_COUNT;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedSlotIndex(idx);
                      if (onSelectHotbarIndex && isHotbar) {
                        onSelectHotbarIndex(idx);
                      }
                      sound.playInteractClick();
                    }}
                    className={`relative w-12 h-12 flex items-center justify-center transition cursor-pointer ${
                      isSelected
                        ? 'ring-3 ring-[#F4D477] z-10 scale-105'
                        : 'hover:bg-[#9E9E9E]'
                    }`}
                    style={{
                      backgroundColor: isSelected ? '#727272' : '#8B8B8B',
                      // Classic Minecraft Inset Beveled Slot
                      borderTop: '3px solid #373737',
                      borderLeft: '3px solid #373737',
                      borderRight: '3px solid #FFFFFF',
                      borderBottom: '3px solid #FFFFFF',
                    }}
                    title={slot.item ? `${slot.item.name} (${slot.quantity})` : `Slot ${idx + 1} (Empty)`}
                  >
                    {/* Hotbar Indicator Marker */}
                    {isHotbar && (
                      <span className="absolute top-0.5 left-1 text-[8px] font-pixel text-[#555555] opacity-75">
                        {idx + 1}
                      </span>
                    )}

                    {/* Item Icon */}
                    {slot.item ? (
                      <span className="text-2xl select-none" style={{ filter: 'drop-shadow(1px 2px 0px rgba(0,0,0,0.4))' }}>
                        {slot.item.icon}
                      </span>
                    ) : null}

                    {/* Quantity Badge in Bottom-Right (Minecraft Style White with Drop Shadow) */}
                    {slot.item && slot.quantity > 1 && (
                      <span
                        className="absolute bottom-0.5 right-1 font-pixel text-xs font-bold text-white tracking-wider"
                        style={{
                          textShadow: '1px 1px 0px #000000, -1px -1px 0px #000000, 1px -1px 0px #000000, -1px 1px 0px #000000',
                        }}
                      >
                        {slot.quantity}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Hotbar Legend */}
            <div className="mt-2 text-[10px] text-[#555555] font-mono text-center">
              Top 5 slots (1-5) appear on your active game HUD hotbar.
            </div>
          </div>

          {/* Right Column: Selected Item Inspection & Action Card */}
          <div className="md:col-span-5 flex flex-col justify-between">
            <div
              className="p-3.5 bg-[#8B8B8B] rounded border-2 h-full flex flex-col justify-between"
              style={{ borderColor: '#373737 #FFFFFF #FFFFFF #373737' }}
            >
              {selectedItem ? (
                <div className="space-y-3">
                  {/* Item Title & Icon Banner */}
                  <div className="flex items-center gap-2.5 pb-2 border-b border-[#777777]">
                    <div
                      className="w-10 h-10 bg-[#373737] rounded flex items-center justify-center text-2xl border-2"
                      style={{ borderColor: '#222222 #777777 #777777 #222222' }}
                    >
                      {selectedItem.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-pixel text-xs font-bold text-[#FFF8E9] leading-tight truncate">
                        {selectedItem.name}
                      </h3>
                      <div className="text-[10px] font-sans text-[#F4D477] font-semibold">
                        {selectedItem.hindiName}
                      </div>
                    </div>
                  </div>

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-pixel">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold text-white ${
                        selectedItem.rarity === 'rare'
                          ? 'bg-[#A855F7]'
                          : selectedItem.rarity === 'uncommon'
                          ? 'bg-[#3B82F6]'
                          : 'bg-[#10B981]'
                      }`}
                    >
                      {selectedItem.rarity}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#373737] text-[#93C476] uppercase">
                      {selectedItem.category}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#373737] text-[#F4D477]">
                      Val: ₹{selectedItem.basePrice}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#373737] text-white">
                      Qty: {selectedSlot.quantity}
                    </span>
                  </div>

                  {/* Lore & Description */}
                  <div
                    className="p-2.5 bg-[#1F1F1F] text-[#E5F0D9] text-xs font-sans rounded border leading-relaxed min-h-[70px]"
                    style={{ borderColor: '#000000 #555555 #555555 #000000' }}
                  >
                    {selectedItem.description}
                  </div>

                  {/* Item Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={handleUseInspect}
                      className="px-2 py-1.5 bg-[#4B6B38] hover:bg-[#5C8245] active:bg-[#38522A] text-white font-pixel text-[11px] font-bold rounded border-2 shadow transition cursor-pointer flex items-center justify-center gap-1"
                      style={{ borderColor: '#78A85B #2B3D20 #2B3D20 #78A85B' }}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#F4D477]" />
                      <span>Use / Examine</span>
                    </button>

                    <button
                      onClick={handleDropOne}
                      className="px-2 py-1.5 bg-[#8A3333] hover:bg-[#A83E3E] active:bg-[#682626] text-white font-pixel text-[11px] font-bold rounded border-2 shadow transition cursor-pointer flex items-center justify-center gap-1"
                      style={{ borderColor: '#E05252 #4D1D1D #4D1D1D #E05252' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Drop (1x)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#555555]">
                  <Info className="w-8 h-8 mb-2 opacity-50" />
                  <p className="font-pixel text-xs font-bold text-[#444444]">Empty Inventory Slot</p>
                  <p className="text-[11px] font-sans mt-1">
                    Purchase tools and supplies from Dev’s Store or Arjun’s Workshop to fill this slot!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info & Instructions */}
        <div className="flex items-center justify-between pt-3 mt-4 border-t-2 border-[#8B8B8B] text-[10px] font-mono text-[#555555]">
          <div>Press <kbd className="px-1.5 py-0.5 bg-[#373737] text-white rounded font-bold">I</kbd> or <kbd className="px-1.5 py-0.5 bg-[#373737] text-white rounded font-bold">ESC</kbd> to toggle</div>
          <div className="text-[#373737] font-bold">Items saved automatically in local storage</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Minecraft Hotbar Component rendered persistently at the bottom of the game screen
 */
export function MinecraftHotbar({
  selectedSlotIndex,
  onSelectSlot,
}: {
  onOpenInventory?: () => void;
  selectedSlotIndex: number;
  onSelectSlot: (idx: number) => void;
}) {
  const [slots, setSlots] = useState<InventorySlot[]>([]);

  useEffect(() => {
    setSlots(loadPlayerInventory());

    const update = () => {
      setSlots(loadPlayerInventory());
    };

    window.addEventListener('jeeva:inventory-updated', update);
    return () => {
      window.removeEventListener('jeeva:inventory-updated', update);
    };
  }, []);

  const hotbarSlots = slots.slice(0, HOTBAR_SLOT_COUNT);

  return (
    <div className="pointer-events-auto flex items-center gap-2">
      {/* 5-Slot Hotbar Well */}
      <div
        className="flex items-center gap-1 p-1 bg-[#8B8B8B]/95 backdrop-blur-md rounded border-3 shadow-2xl"
        style={{
          borderColor: '#373737 #FFFFFF #FFFFFF #373737', // Minecraft 3D Inset
        }}
      >
        {hotbarSlots.map((slot, idx) => {
          const isSelected = selectedSlotIndex === idx;
          return (
            <button
              key={idx}
              onClick={() => {
                onSelectSlot(idx);
                sound.playInteractClick();
              }}
              className={`relative w-10 h-10 flex items-center justify-center transition cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-[#F4D477] scale-105 z-10'
                  : 'hover:bg-[#9E9E9E]'
              }`}
              style={{
                backgroundColor: isSelected ? '#6B6B6B' : '#8B8B8B',
                borderTop: '2px solid #373737',
                borderLeft: '2px solid #373737',
                borderRight: '2px solid #FFFFFF',
                borderBottom: '2px solid #FFFFFF',
              }}
              title={slot.item ? `${slot.item.name} (${slot.quantity})` : `Slot ${idx + 1}`}
            >
              <span className="absolute top-0.5 left-1 text-[8px] font-pixel text-[#373737] font-bold opacity-70">
                {idx + 1}
              </span>

              {slot.item && (
                <span className="text-xl select-none" style={{ filter: 'drop-shadow(1px 1px 0px rgba(0,0,0,0.5))' }}>
                  {slot.item.icon}
                </span>
              )}

              {slot.item && slot.quantity > 1 && (
                <span
                  className="absolute bottom-0 right-0.5 font-pixel text-[10px] font-bold text-white tracking-wider"
                  style={{
                    textShadow: '1px 1px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000',
                  }}
                >
                  {slot.quantity}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
