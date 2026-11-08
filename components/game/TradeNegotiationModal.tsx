'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Coins,
  Sparkles,
  ShoppingBag,
  TrendingDown,
  MessageCircle,
  Package,
  Check,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  CatalogItem,
  InventorySlot,
  getMerchantItems,
  loadPlayerInventory,
  loadPlayerWallet,
  savePlayerWallet,
  addItemToInventory,
  removeItemFromSlot,
  evaluateNegotiation,
  addDroppedItem,
} from '@/lib/inventory';
import PixelSprite from '../PixelSprite';
import { sound } from './audio';

interface TradeNegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchantId: 'dev_shopkeeper' | 'arjun_mechanic';
  merchantName: string;
  merchantRole?: string;
  merchantSpriteSrc?: string;
  playerX?: number;
  playerY?: number;
  currentScene?: string;
}

export function TradeNegotiationModal({
  isOpen,
  onClose,
  merchantId,
  merchantName,
  merchantRole,
  merchantSpriteSrc,
  playerX,
  playerY,
  currentScene,
}: TradeNegotiationModalProps) {
  const isDev = merchantId === 'dev_shopkeeper';
  const merchantCatalog = getMerchantItems(merchantId);

  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [playerWallet, setPlayerWallet] = useState<number>(250);
  const [playerSlots, setPlayerSlots] = useState<InventorySlot[]>([]);
  const [selectedItem, setSelectedItem] = useState<CatalogItem>(merchantCatalog[0]);

  // Current session negotiated prices for items (defaults to starting asking price)
  const [itemPrices, setItemPrices] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    merchantCatalog.forEach((item) => {
      // Dev starts with ~15% markup; Arjun starts with ~10% markup
      const markup = isDev ? 1.15 : 1.10;
      map[item.id] = Math.round(item.basePrice * markup);
    });
    return map;
  });

  // Negotiation state
  const [playerOffer, setPlayerOffer] = useState<number>(
    Math.round((merchantCatalog[0]?.basePrice || 50) * 0.85)
  );
  const [selectedTactic, setSelectedTactic] = useState<string>(
    isDev ? 'neighbor' : 'clinic'
  );
  const [patienceStars, setPatienceStars] = useState<number>(isDev ? 5 : 4);
  const [speechBubble, setSpeechBubble] = useState<{
    textHindi: string;
    textEnglish: string;
    status: 'neutral' | 'accepted' | 'rejected' | 'compromise';
  }>({
    textHindi: isDev
      ? 'आइये, पधारिये! देव की दुकान में सर्वोत्तम माल ही मिलेगा। दाम में क्या रखा है, बैठ कर तय कर लेंगे!'
      : 'वर्कशॉप में स्वागत है! अगर कोई मशीन खराब है या स्पेयर पार्ट्स चाहिए, तो बताओ। काम में कोई समझौता नहीं होता।',
    textEnglish: isDev
      ? 'Welcome, neighbor! Dev’s store offers only the finest goods. Let’s negotiate a price that works for both of us!'
      : 'Welcome to the workshop. Tell me what parts or repairs you need. Honest craftsmanship doesn’t come for free.',
    status: 'neutral',
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync wallet and player inventory from localStorage
  const refreshUserData = () => {
    setPlayerWallet(loadPlayerWallet());
    setPlayerSlots(loadPlayerInventory());
  };

  useEffect(() => {
    if (isOpen) {
      refreshUserData();
      setSelectedItem(merchantCatalog[0]);
      const initialPrice = itemPrices[merchantCatalog[0]?.id] || merchantCatalog[0]?.basePrice || 50;
      setPlayerOffer(Math.max(10, Math.round(initialPrice * 0.85)));
      setPatienceStars(isDev ? 5 : 4);
      sound.playInteractClick();
    }
  }, [isOpen, merchantId]);

  if (!isOpen) return null;

  const currentAskingPrice = itemPrices[selectedItem?.id] ?? selectedItem?.basePrice ?? 50;

  // Handle selecting an item to inspect/haggle
  const handleSelectItem = (item: CatalogItem) => {
    setSelectedItem(item);
    const price = itemPrices[item.id] || item.basePrice;
    setPlayerOffer(Math.max(10, Math.round(price * 0.85)));
    setFeedback(null);
    sound.playInteractClick();
  };

  // Perform Negotiation / Haggling
  const handleNegotiate = () => {
    if (!selectedItem) return;

    const outcome = evaluateNegotiation(
      merchantId,
      selectedItem,
      currentAskingPrice,
      playerOffer,
      selectedTactic,
      patienceStars
    );

    setPatienceStars(outcome.patienceRemaining);

    if (outcome.accepted) {
      // Price reduced to agreed price!
      setItemPrices((prev) => ({ ...prev, [selectedItem.id]: outcome.agreedPrice }));
      setSpeechBubble({
        textHindi: outcome.merchantReplyHindi,
        textEnglish: outcome.merchantReplyEnglish,
        status: 'accepted',
      });
      setFeedback({
        type: 'success',
        message: `Success! Price negotiated down to ₹${outcome.agreedPrice}!`,
      });
      sound.playQuestAccept();
    } else if (outcome.counterOffer) {
      setItemPrices((prev) => ({ ...prev, [selectedItem.id]: outcome.counterOffer! }));
      setSpeechBubble({
        textHindi: outcome.merchantReplyHindi,
        textEnglish: outcome.merchantReplyEnglish,
        status: 'compromise',
      });
      setFeedback({
        type: 'error',
        message: `Counter-offer: Merchant agrees to drop price to ₹${outcome.counterOffer}.`,
      });
      sound.playInteractClick();
    } else {
      setSpeechBubble({
        textHindi: outcome.merchantReplyHindi,
        textEnglish: outcome.merchantReplyEnglish,
        status: 'rejected',
      });
      setFeedback({
        type: 'error',
        message: 'Offer declined. The merchant rejected your terms.',
      });
      sound.playInteractClick();
    }
  };

  // Perform Item Purchase (Merchant Drops into World for Pickup)
  const handleBuyItem = () => {
    if (!selectedItem) return;

    if (playerWallet < currentAskingPrice) {
      setFeedback({
        type: 'error',
        message: `Insufficient funds! You need ₹${currentAskingPrice}, but have ₹${playerWallet}.`,
      });
      sound.playInteractClick();
      return;
    }

    // Deduct coins & persist
    const newWallet = playerWallet - currentAskingPrice;
    savePlayerWallet(newWallet);
    setPlayerWallet(newWallet);

    // Drop the item into the world in front of merchant/player for player to pick up!
    const dropX = playerX ?? 336;
    const dropY = (playerY ?? 350) + 16;
    addDroppedItem(selectedItem.id, 1, dropX, dropY, currentScene || 'village', 0);

    setSpeechBubble({
      textHindi: isDev
        ? `पैसे मिल गए भाई! मैंने ${selectedItem.hindiName} सामने रख दी है, उठा लीजिए!`
        : `पैसा मिल गया। यह लो तुम्हारी ${selectedItem.hindiName}, जमीन से उठा लो।`,
      textEnglish: isDev
        ? `Payment received! I've dropped the ${selectedItem.name} on the ground for you. Walk over to pick it up!`
        : `Payment verified. I've dropped the ${selectedItem.name} right in front of you. Go ahead and pick it up.`,
      status: 'accepted',
    });

    setFeedback({
      type: 'success',
      message: `${merchantName} dropped 1x ${selectedItem.name}! Step over it to pick up into your inventory.`,
    });
    sound.playQuestAccept();
  };

  // Perform Item Sale (From Player Inventory to Merchant for 75% base price)
  const handleSellItem = (slotIndex: number) => {
    const slot = playerSlots[slotIndex];
    if (!slot || !slot.item) return;

    const sellPrice = Math.max(5, Math.round(slot.item.basePrice * 0.75));
    const { success, newSlots } = removeItemFromSlot(playerSlots, slotIndex, 1);
    if (success) {
      const newWallet = playerWallet + sellPrice;
      savePlayerWallet(newWallet);
      setPlayerWallet(newWallet);
      setPlayerSlots(newSlots);

      setFeedback({
        type: 'success',
        message: `Sold 1x ${slot.item.name} to ${merchantName} for ₹${sellPrice}!`,
      });
      sound.playQuestAccept();
    }
  };

  const occupiedSlots = playerSlots.filter((s) => s.item !== null).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200">
      {/* TRADING & NEGOTIATION WORKBENCH MODAL */}
      <div className="relative w-full max-w-4xl bg-[#14271A] border-3 border-[#F4D477] text-[#FFF8E9] rounded-2xl shadow-2xl p-6 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header: Merchant Identity & Player Balance */}
        <div className="flex items-center justify-between pb-4 border-b border-[#28392E]">
          <div className="flex items-center gap-3.5">
            {merchantSpriteSrc ? (
              <div className="w-12 h-12 rounded-xl bg-[#0F1712] border-2 border-[#78A85B] flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                <PixelSprite
                  src={merchantSpriteSrc}
                  frameWidth={32}
                  frameHeight={32}
                  scale={1.8}
                  animate={true}
                />
              </div>
            ) : null}

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-pixel text-lg font-bold text-[#F4D477] tracking-wider">
                  {merchantName}&apos;s {isDev ? 'Trading Counter' : 'Machine Works'}
                </h2>
                <span className="text-[10px] font-pixel uppercase px-2 py-0.5 rounded bg-[#315B3C] text-[#93C476] border border-[#78A85B]/40">
                  {merchantRole || (isDev ? 'Merchant' : 'Mechanic')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#BAC9B9] mt-0.5">
                <span>Patience:</span>
                <span className="text-[#F4D477] tracking-widest font-bold">
                  {'★'.repeat(patienceStars)}
                  <span className="text-stone-600">{'★'.repeat(Math.max(0, 5 - patienceStars))}</span>
                </span>
                <span className="text-[10px] text-stone-400">
                  ({patienceStars > 2 ? 'Receptive' : patienceStars > 0 ? 'Impatient' : 'Stubborn'})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Player Wallet Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F1712] border border-[#78A85B]/50 font-pixel text-xs text-[#F4D477] shadow-inner">
              <Coins className="w-4 h-4 text-[#F4D477]" />
              <span className="font-mono text-sm font-bold">₹{playerWallet}</span>
            </div>

            {/* Inventory Slot Usage Pill */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1F3B27] border border-[#28392E] text-xs font-mono text-[#93C476]">
              <Package className="w-3.5 h-3.5" />
              <span>{occupiedSlots}/15 Slots</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#BAC9B9] hover:text-white hover:bg-[#1F3B27] border border-transparent hover:border-[#28392E] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MERCHANT IN-CHARACTER SPEECH BUBBLE */}
        <div
          className={`my-3 p-3 rounded-xl border flex items-start gap-3 transition ${
            speechBubble.status === 'accepted'
              ? 'bg-[#193B22]/90 border-[#78A85B]'
              : speechBubble.status === 'rejected'
              ? 'bg-[#3A1414]/90 border-[#E05252]'
              : speechBubble.status === 'compromise'
              ? 'bg-[#3B3214]/90 border-[#F4D477]'
              : 'bg-[#0F1712]/90 border-[#28392E]'
          }`}
        >
          <MessageCircle
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              speechBubble.status === 'accepted'
                ? 'text-[#93C476]'
                : speechBubble.status === 'rejected'
                ? 'text-[#E05252]'
                : 'text-[#F4D477]'
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs md:text-sm font-sans font-medium text-[#FFF8E9] leading-snug">
              &ldquo;{speechBubble.textHindi}&rdquo;
            </div>
            <div className="text-[11px] font-sans italic text-[#BAC9B9] mt-0.5">
              &ldquo;{speechBubble.textEnglish}&rdquo;
            </div>
          </div>
        </div>

        {/* FEEDBACK NOTICE */}
        {feedback && (
          <div
            className={`mb-3 px-3 py-1.5 rounded-lg text-xs font-pixel flex items-center gap-2 animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-[#2D4A22] border border-[#78A85B] text-[#FFF8E9]'
                : 'bg-[#4A1D1D] border border-[#E05252] text-[#FFD0D0]'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 text-[#93C476] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#E05252] shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* NAVIGATION TABS: Buy & Haggle / Sell */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => {
              setActiveTab('buy');
              sound.playInteractClick();
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-pixel text-xs transition cursor-pointer ${
              activeTab === 'buy'
                ? 'bg-[#315B3C] text-[#F4D477] border border-[#78A85B]'
                : 'bg-[#0F1712] text-[#BAC9B9] hover:bg-[#1F3B27] border border-[#28392E]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Buy & Haggle (खरीदें और मोलभाव)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('sell');
              sound.playInteractClick();
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-pixel text-xs transition cursor-pointer ${
              activeTab === 'sell'
                ? 'bg-[#315B3C] text-[#F4D477] border border-[#78A85B]'
                : 'bg-[#0F1712] text-[#BAC9B9] hover:bg-[#1F3B27] border border-[#28392E]'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Sell from Inventory (सामान बेचें)</span>
          </button>
        </div>

        {/* TAB 1: BUY & HAGGLE INTERFACE */}
        {activeTab === 'buy' ? (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden">
            {/* Left: Merchant Stock List */}
            <div className="md:col-span-6 flex flex-col overflow-hidden">
              <span className="text-[11px] font-pixel uppercase text-[#93C476] mb-2 font-bold">
                Available Stock ({merchantCatalog.length} Items)
              </span>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {merchantCatalog.map((item) => {
                  const price = itemPrices[item.id] ?? item.basePrice;
                  const isSelected = selectedItem?.id === item.id;
                  const isNegotiatedDown = price < item.basePrice;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`w-full text-left p-2.5 rounded-xl border transition flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-[#1F3B27] border-[#F4D477] ring-1 ring-[#F4D477]/40 shadow-md'
                          : 'bg-[#0F1712]/90 border-[#28392E] hover:border-[#78A85B]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#14271A] border border-[#78A85B]/40 flex items-center justify-center text-2xl shrink-0">
                        {item.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-pixel text-xs font-bold text-[#FFF8E9] truncate">
                            {item.name}
                          </span>
                          <span
                            className={`font-mono text-xs font-bold ${
                              isNegotiatedDown ? 'text-[#93C476]' : 'text-[#F4D477]'
                            }`}
                          >
                            ₹{price}
                          </span>
                        </div>
                        <div className="text-[10px] font-sans text-[#BAC9B9] truncate">
                          {item.hindiName} • {item.category}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Negotiation & Purchase Panel */}
            <div className="md:col-span-6 bg-[#0F1712]/95 border-2 border-[#28392E] rounded-xl p-4 flex flex-col justify-between overflow-y-auto">
              {selectedItem ? (
                <div className="space-y-3.5">
                  {/* Selected Item Header */}
                  <div className="flex items-center gap-3 pb-2.5 border-b border-[#28392E]">
                    <span className="text-3xl">{selectedItem.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-pixel text-sm font-bold text-[#F4D477]">
                          {selectedItem.name}
                        </h3>
                        <span className="font-pixel text-xs text-[#FFF8E9] bg-[#1F3B27] px-2 py-0.5 rounded border border-[#28392E]">
                          Base: ₹{selectedItem.basePrice}
                        </span>
                      </div>
                      <p className="text-[11px] font-sans text-[#BAC9B9] line-clamp-2 mt-0.5">
                        {selectedItem.description}
                      </p>
                    </div>
                  </div>

                  {/* Price Banner */}
                  <div className="p-2.5 rounded-lg bg-[#14271A] border border-[#78A85B]/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-pixel uppercase text-[#93C476] block">
                        Current Asking Price:
                      </span>
                      <span className="text-lg font-pixel font-bold text-[#F4D477]">
                        ₹{currentAskingPrice}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-stone-400 block">Your Funds:</span>
                      <span className="text-sm font-mono font-bold text-[#FFF8E9]">
                        ₹{playerWallet}
                      </span>
                    </div>
                  </div>

                  {/* Negotiation Control Box */}
                  <div className="p-3 rounded-lg bg-[#14271A] border border-[#28392E] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-xs text-[#F4D477] font-bold flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5 text-[#93C476]" />
                        <span>Haggle / Offer Counter-Price</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-[#93C476]">
                        Offer: ₹{playerOffer}
                      </span>
                    </div>

                    {/* Price Slider */}
                    <input
                      type="range"
                      min={Math.max(5, Math.round(selectedItem.basePrice * 0.4))}
                      max={currentAskingPrice}
                      value={playerOffer}
                      onChange={(e) => setPlayerOffer(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-[#0F1712] accent-[#F4D477] rounded cursor-pointer"
                    />

                    {/* Bargaining Tactics Buttons */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-pixel text-stone-400">Choose Tactic:</span>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-sans">
                        {isDev ? (
                          <>
                            <button
                              onClick={() => setSelectedTactic('neighbor')}
                              className={`p-1.5 rounded border text-left transition cursor-pointer ${
                                selectedTactic === 'neighbor'
                                  ? 'bg-[#315B3C] border-[#78A85B] text-white'
                                  : 'bg-[#0F1712] border-[#28392E] text-[#BAC9B9] hover:bg-[#1F3B27]'
                              }`}
                            >
                              🤝 Village Neighbor Discount
                            </button>
                            <button
                              onClick={() => setSelectedTactic('bulk')}
                              className={`p-1.5 rounded border text-left transition cursor-pointer ${
                                selectedTactic === 'bulk'
                                  ? 'bg-[#315B3C] border-[#78A85B] text-white'
                                  : 'bg-[#0F1712] border-[#28392E] text-[#BAC9B9] hover:bg-[#1F3B27]'
                              }`}
                            >
                              📦 Bulk Order Promise
                            </button>
                            <button
                              onClick={() => setSelectedTactic('cash')}
                              className={`p-1.5 rounded border text-left transition cursor-pointer ${
                                selectedTactic === 'cash'
                                  ? 'bg-[#315B3C] border-[#78A85B] text-white'
                                  : 'bg-[#0F1712] border-[#28392E] text-[#BAC9B9] hover:bg-[#1F3B27]'
                              }`}
                            >
                              💰 Immediate Cash in Hand
                            </button>
                            <button
                              onClick={() => setSelectedTactic('emergency')}
                              className={`p-1.5 rounded border text-left transition cursor-pointer ${
                                selectedTactic === 'emergency'
                                  ? 'bg-[#315B3C] border-[#78A85B] text-white'
                                  : 'bg-[#0F1712] border-[#28392E] text-[#BAC9B9] hover:bg-[#1F3B27]'
                              }`}
                            >
                              🏥 Urgent Clinic Emergency
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setSelectedTactic('clinic')}
                              className={`p-1.5 rounded border text-left transition cursor-pointer ${
                                selectedTactic === 'clinic'
                                  ? 'bg-[#315B3C] border-[#78A85B] text-white'
                                  : 'bg-[#0F1712] border-[#28392E] text-[#BAC9B9] hover:bg-[#1F3B27]'
                              }`}
                            >
                              🏥 For Hospital Machine Repair
                            </button>
                            <button
                              onClick={() => setSelectedTactic('craft')}
                              className={`p-1.5 rounded border text-left transition cursor-pointer ${
                                selectedTactic === 'craft'
                                  ? 'bg-[#315B3C] border-[#78A85B] text-white'
                                  : 'bg-[#0F1712] border-[#28392E] text-[#BAC9B9] hover:bg-[#1F3B27]'
                              }`}
                            >
                              🛠️ Respecting Artisan Craft
                            </button>
                            <button
                              onClick={() => setSelectedTactic('urgent')}
                              className={`p-1.5 rounded border text-left transition cursor-pointer ${
                                selectedTactic === 'urgent'
                                  ? 'bg-[#315B3C] border-[#78A85B] text-white'
                                  : 'bg-[#0F1712] border-[#28392E] text-[#BAC9B9] hover:bg-[#1F3B27]'
                              }`}
                            >
                              ⚡ Power Generator Crisis
                            </button>
                            <button
                              onClick={() => setSelectedTactic('cash')}
                              className={`p-1.5 rounded border text-left transition cursor-pointer ${
                                selectedTactic === 'cash'
                                  ? 'bg-[#315B3C] border-[#78A85B] text-white'
                                  : 'bg-[#0F1712] border-[#28392E] text-[#BAC9B9] hover:bg-[#1F3B27]'
                              }`}
                            >
                              💰 Clean Upfront Cash
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Negotiate Action Button */}
                    <button
                      onClick={handleNegotiate}
                      disabled={patienceStars <= 0}
                      className={`w-full py-2 rounded-lg font-pixel text-xs font-bold transition flex items-center justify-center gap-1.5 shadow ${
                        patienceStars <= 0
                          ? 'opacity-50 cursor-not-allowed bg-stone-700 text-stone-400'
                          : 'bg-[#F4D477] hover:bg-[#ffe28b] active:bg-[#e0be5a] text-[#0F1712] cursor-pointer'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Negotiate / Haggle Price (मोलभाव करें)</span>
                    </button>
                  </div>

                  {/* Immediate Buy Button */}
                  <button
                    onClick={handleBuyItem}
                    disabled={playerWallet < currentAskingPrice || occupiedSlots >= 15}
                    className={`w-full py-2.5 rounded-xl font-pixel text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                      playerWallet < currentAskingPrice || occupiedSlots >= 15
                        ? 'opacity-40 cursor-not-allowed bg-[#1F3B27] border border-[#28392E] text-stone-400'
                        : 'bg-[#315B3C] hover:bg-[#78A85B] active:bg-[#25462E] text-white border-2 border-[#78A85B]'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-[#F4D477]" />
                    <span>
                      {occupiedSlots >= 15
                        ? 'Inventory Full (15/15)'
                        : `Buy for ₹${currentAskingPrice} (खरीदें)`}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          /* TAB 2: SELL INTERFACE (FROM MINECRAFT INVENTORY) */
          <div className="flex-1 flex flex-col overflow-hidden">
            <span className="text-[11px] font-pixel uppercase text-[#93C476] mb-2 font-bold">
              Items from your Minecraft Inventory (Sell for 75% Value)
            </span>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {playerSlots.filter((s) => s.item !== null && s.quantity > 0).length === 0 ? (
                <div className="p-8 text-center text-stone-400 font-pixel text-xs">
                  Your inventory has no items to sell right now!
                </div>
              ) : (
                playerSlots.map((slot, idx) => {
                  if (!slot.item || slot.quantity <= 0) return null;
                  const sellPrice = Math.max(5, Math.round(slot.item.basePrice * 0.75));

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#0F1712] border border-[#28392E] hover:border-[#78A85B] flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{slot.item.icon}</span>
                        <div>
                          <div className="font-pixel text-xs font-bold text-[#FFF8E9]">
                            {slot.item.name}
                            {slot.quantity > 1 && (
                              <span className="text-[#93C476] ml-1.5 font-mono">
                                (x{slot.quantity})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-sans text-[#BAC9B9]">
                            {slot.item.category} • Slot {idx + 1}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-[#93C476]">
                          +₹{sellPrice}
                        </span>

                        <button
                          onClick={() => handleSellItem(idx)}
                          className="px-3 py-1.5 rounded-lg bg-[#315B3C] hover:bg-[#78A85B] border border-[#78A85B] text-white font-pixel text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow"
                        >
                          <Coins className="w-3.5 h-3.5 text-[#F4D477]" />
                          <span>Sell 1x</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#28392E] text-[10px] font-mono text-[#BAC9B9]">
          <span>Purchases are stored instantly in your 15-slot local Minecraft inventory</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#1F3B27] hover:bg-[#315B3C] rounded border border-[#28392E] text-[#FFF8E9] font-pixel text-xs cursor-pointer transition"
          >
            Leave Shop
          </button>
        </div>
      </div>
    </div>
  );
}
