/**
 * Minecraft-Style Player Inventory & Trading Catalog for Kaveripura
 * Enforces a strict 15-slot inventory limit, persistent in localStorage.
 */

export interface CatalogItem {
  id: string;
  name: string;
  hindiName: string;
  category: 'mechanical' | 'tool' | 'electrical' | 'resource' | 'quest' | 'utility';
  description: string;
  basePrice: number;
  sellerId: 'dev_shopkeeper' | 'arjun_mechanic' | 'both';
  icon: string; // Emoji / Icon identifier
  iconColor: string;
  maxStack: number;
  rarity: 'common' | 'uncommon' | 'rare';
}

/**
 * Exactly 15 Curated Buyable/Tradable Items across Kaveripura's Shopkeeper (Dev) and Mechanic (Arjun)
 */
export const VILLAGE_ITEMS_CATALOG: CatalogItem[] = [
  // 1. Rare mechanical component
  {
    id: 'copper_induction_coil',
    name: 'Copper Induction Coil',
    hindiName: 'तांबे की इंडक्शन कॉइल',
    category: 'electrical',
    description: 'High-conductivity pure copper coil required for life-support generators and high-voltage circuitry.',
    basePrice: 90,
    sellerId: 'dev_shopkeeper',
    icon: '⚡',
    iconColor: '#F59E0B',
    maxStack: 4,
    rarity: 'rare',
  },
  // 2. Heavy spanner set
  {
    id: 'mechanic_toolset',
    name: 'Heavy Spanners & Toolset',
    hindiName: 'भारी पाना और औजार सेट',
    category: 'tool',
    description: 'Forged chrome-vanadium spanners, socket wrenches, and pliers for workshop machinery.',
    basePrice: 75,
    sellerId: 'arjun_mechanic',
    icon: '🔧',
    iconColor: '#60A5FA',
    maxStack: 1,
    rarity: 'uncommon',
  },
  // 3. Insulated copper wire
  {
    id: 'insulated_copper_wire',
    name: 'Spool of Insulated Wire',
    hindiName: 'इंसुलेटेड कॉपर वायर रोल',
    category: 'electrical',
    description: 'Flexible rubber-sheathed copper wire for repairing transformers and house wiring.',
    basePrice: 35,
    sellerId: 'arjun_mechanic',
    icon: '🪢',
    iconColor: '#F97316',
    maxStack: 16,
    rarity: 'common',
  },
  // 4. Soldering kit
  {
    id: 'soldering_kit',
    name: 'Precision Soldering Kit',
    hindiName: 'प्रिसिजन सोल्डरिंग किट',
    category: 'tool',
    description: 'Electric soldering iron with rosin-core solder spool for delicate electrical repair.',
    basePrice: 65,
    sellerId: 'arjun_mechanic',
    icon: '🪄',
    iconColor: '#FBBF24',
    maxStack: 1,
    rarity: 'uncommon',
  },
  // 5. Scavenged brass gears
  {
    id: 'brass_gears',
    name: 'Scavenged Brass Gears',
    hindiName: 'पीतल के गियर चक्र',
    category: 'mechanical',
    description: 'Interlocking machined brass gears salvaged from irrigation pumps and clockworks.',
    basePrice: 40,
    sellerId: 'arjun_mechanic',
    icon: '⚙️',
    iconColor: '#EAB308',
    maxStack: 16,
    rarity: 'common',
  },
  // 6. Iron bolts & nuts
  {
    id: 'iron_fasteners',
    name: 'Box of Iron Fasteners',
    hindiName: 'लोहे के नट-बोल्ट का डिब्बा',
    category: 'mechanical',
    description: 'High-tensile threaded bolts, hex nuts, and lock washers for heavy assembly.',
    basePrice: 20,
    sellerId: 'arjun_mechanic',
    icon: '🔩',
    iconColor: '#94A3B8',
    maxStack: 32,
    rarity: 'common',
  },
  // 7. Sheet metal
  {
    id: 'sheet_metal',
    name: 'Scrap Sheet Metal',
    hindiName: 'टिन व लोहे की चादर',
    category: 'mechanical',
    description: 'Sturdy galvanized tin and steel sheet for patching machine casings or shelter roofs.',
    basePrice: 30,
    sellerId: 'arjun_mechanic',
    icon: '🛡️',
    iconColor: '#CBD5E1',
    maxStack: 16,
    rarity: 'common',
  },
  // 8. Kerosene canister
  {
    id: 'kerosene_canister',
    name: 'Kerosene Fuel Canister',
    hindiName: 'मिट्टी के तेल का डिब्बा',
    category: 'resource',
    description: 'Refined fuel canister used for lighting hurricane lanterns and starting diesel pumps.',
    basePrice: 30,
    sellerId: 'dev_shopkeeper',
    icon: '🛢️',
    iconColor: '#EF4444',
    maxStack: 8,
    rarity: 'common',
  },
  // 9. Hurricane lantern
  {
    id: 'earthen_lantern',
    name: 'Brass Hurricane Lantern',
    hindiName: 'पीतल की लालटेन',
    category: 'utility',
    description: 'Wind-resistant brass and glass oil lantern that cuts through heavy monsoon night mists.',
    basePrice: 45,
    sellerId: 'dev_shopkeeper',
    icon: '🏮',
    iconColor: '#F59E0B',
    maxStack: 1,
    rarity: 'uncommon',
  },
  // 10. Coarse rock salt
  {
    id: 'rock_salt_bag',
    name: 'Coarse Rock Salt Bag',
    hindiName: 'सेंधा नमक की बोरी',
    category: 'resource',
    description: 'Mineral-rich coarse salt bag from the western hills used for seasoning and preserving.',
    basePrice: 15,
    sellerId: 'dev_shopkeeper',
    icon: '🧂',
    iconColor: '#E2E8F0',
    maxStack: 16,
    rarity: 'common',
  },
  // 11. Burlap wheat sack
  {
    id: 'wheat_grain_sack',
    name: 'Burlap Sack of Wheat',
    hindiName: 'गेहूं की बोरी',
    category: 'resource',
    description: 'Sun-dried golden grain harvested from Ravi’s farm, ready for stone grinding.',
    basePrice: 25,
    sellerId: 'dev_shopkeeper',
    icon: '🌾',
    iconColor: '#D97706',
    maxStack: 8,
    rarity: 'common',
  },
  // 12. Sterile bandages
  {
    id: 'sterile_bandages',
    name: 'Sterile Cotton Bandages',
    hindiName: 'साफ सूती पट्टियां',
    category: 'utility',
    description: 'Boiled and sanitized woven cotton gauze rolls for dressing cuts and burns.',
    basePrice: 22,
    sellerId: 'dev_shopkeeper',
    icon: '🩹',
    iconColor: '#F87171',
    maxStack: 16,
    rarity: 'common',
  },
  // 13. Herbal antiseptic salve
  {
    id: 'antiseptic_salve',
    name: 'Neem & Turmeric Salve',
    hindiName: 'नीम-हल्दी का लेप',
    category: 'utility',
    description: 'Potent soothing antiseptic ointment prepared with cold-pressed neem oil and wild turmeric.',
    basePrice: 38,
    sellerId: 'dev_shopkeeper',
    icon: '🧪',
    iconColor: '#10B981',
    maxStack: 8,
    rarity: 'uncommon',
  },
  // 14. Brass compass
  {
    id: 'pocket_compass',
    name: 'Brass Magnetic Compass',
    hindiName: 'पीतल का दिशा-सूचक',
    category: 'utility',
    description: 'Pocket-sized jeweled compass that always points toward magnetic north across the valley.',
    basePrice: 60,
    sellerId: 'both',
    icon: '🧭',
    iconColor: '#38BDF8',
    maxStack: 1,
    rarity: 'uncommon',
  },
  // 15. Canvas backpack
  {
    id: 'canvas_backpack',
    name: 'Reinforced Canvas Pouch',
    hindiName: 'मजबूत कैनवास बैग',
    category: 'utility',
    description: 'Durable wax-coated canvas satchel with reinforced brass buckles for field expeditions.',
    basePrice: 50,
    sellerId: 'dev_shopkeeper',
    icon: '🎒',
    iconColor: '#A855F7',
    maxStack: 1,
    rarity: 'uncommon',
  },
];

/**
 * Single slot in the player's 15-slot Minecraft inventory
 */
export interface InventorySlot {
  slotIndex: number;
  item: CatalogItem | null;
  quantity: number;
}

export const MAX_INVENTORY_SLOTS = 15; // 3 rows x 5 columns
export const HOTBAR_SLOT_COUNT = 5;

const STORAGE_INVENTORY_KEY = 'jeeva_player_inventory_v1';
const STORAGE_WALLET_KEY = 'jeeva_player_wallet_v1';
const STORAGE_MERCHANT_PRICES_KEY = 'jeeva_merchant_negotiated_prices_v1';

/**
 * Default starting inventory for a fresh player
 */
export function getDefaultInventory(): InventorySlot[] {
  const slots: InventorySlot[] = Array.from({ length: MAX_INVENTORY_SLOTS }, (_, idx) => ({
    slotIndex: idx,
    item: null,
    quantity: 0,
  }));

  // Starter item: Brass Hurricane Lantern in slot 0 & Rock salt in slot 1
  const lantern = VILLAGE_ITEMS_CATALOG.find((i) => i.id === 'earthen_lantern');
  if (lantern) {
    slots[0] = { slotIndex: 0, item: lantern, quantity: 1 };
  }
  const salt = VILLAGE_ITEMS_CATALOG.find((i) => i.id === 'rock_salt_bag');
  if (salt) {
    slots[1] = { slotIndex: 1, item: salt, quantity: 2 };
  }

  return slots;
}

/**
 * Load inventory from localStorage (client-side only)
 */
export function loadPlayerInventory(): InventorySlot[] {
  if (typeof window === 'undefined') return getDefaultInventory();

  try {
    const raw = localStorage.getItem(STORAGE_INVENTORY_KEY);
    if (!raw) {
      const def = getDefaultInventory();
      savePlayerInventory(def);
      return def;
    }
    const parsed = JSON.parse(raw) as InventorySlot[];
    if (!Array.isArray(parsed) || parsed.length !== MAX_INVENTORY_SLOTS) {
      const def = getDefaultInventory();
      savePlayerInventory(def);
      return def;
    }
    return parsed;
  } catch (e) {
    console.warn('Error reading player inventory from localStorage:', e);
    return getDefaultInventory();
  }
}

/**
 * Save inventory to localStorage
 */
export function savePlayerInventory(slots: InventorySlot[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_INVENTORY_KEY, JSON.stringify(slots));
    window.dispatchEvent(new CustomEvent('jeeva:inventory-updated', { detail: { slots } }));
  } catch (e) {
    console.warn('Error saving player inventory:', e);
  }
}

/**
 * Load wallet balance (Rupees ₹). Defaults to ₹250.
 */
export function loadPlayerWallet(): number {
  if (typeof window === 'undefined') return 250;
  try {
    const raw = localStorage.getItem(STORAGE_WALLET_KEY);
    if (raw === null) {
      savePlayerWallet(250);
      return 250;
    }
    const val = parseInt(raw, 10);
    return Number.isFinite(val) ? val : 250;
  } catch {
    return 250;
  }
}

/**
 * Save wallet balance to localStorage
 */
export function savePlayerWallet(coins: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_WALLET_KEY, coins.toString());
    window.dispatchEvent(new CustomEvent('jeeva:wallet-updated', { detail: { coins } }));
  } catch (e) {
    console.warn('Error saving wallet balance:', e);
  }
}

/**
 * Add an item to the 15-slot inventory with stack merging
 */
export function addItemToInventory(
  slots: InventorySlot[],
  item: CatalogItem,
  amount: number = 1
): { success: boolean; newSlots: InventorySlot[]; message: string } {
  const cloned: InventorySlot[] = JSON.parse(JSON.stringify(slots));
  let remaining = amount;

  // 1. Try to merge into existing stacks
  for (let i = 0; i < cloned.length; i++) {
    const slot = cloned[i];
    if (slot.item && slot.item.id === item.id) {
      const space = item.maxStack - slot.quantity;
      if (space > 0) {
        const toAdd = Math.min(space, remaining);
        slot.quantity += toAdd;
        remaining -= toAdd;
        if (remaining <= 0) break;
      }
    }
  }

  // 2. Put remainder into first empty slot
  if (remaining > 0) {
    for (let i = 0; i < cloned.length; i++) {
      const slot = cloned[i];
      if (!slot.item || slot.quantity === 0) {
        const toAdd = Math.min(item.maxStack, remaining);
        slot.item = item;
        slot.quantity = toAdd;
        remaining -= toAdd;
        if (remaining <= 0) break;
      }
    }
  }

  if (remaining > 0) {
    return {
      success: false,
      newSlots: slots,
      message: `Inventory is full! Limited to ${MAX_INVENTORY_SLOTS} slots. Free up space first.`,
    };
  }

  savePlayerInventory(cloned);
  return {
    success: true,
    newSlots: cloned,
    message: `Added ${amount}x ${item.name} to inventory!`,
  };
}

/**
 * Remove an item from a specific slot
 */
export function removeItemFromSlot(
  slots: InventorySlot[],
  slotIndex: number,
  amount: number = 1
): { success: boolean; newSlots: InventorySlot[] } {
  const cloned: InventorySlot[] = JSON.parse(JSON.stringify(slots));
  const slot = cloned[slotIndex];
  if (!slot || !slot.item || slot.quantity < amount) {
    return { success: false, newSlots: slots };
  }

  slot.quantity -= amount;
  if (slot.quantity <= 0) {
    slot.item = null;
    slot.quantity = 0;
  }

  savePlayerInventory(cloned);
  return { success: true, newSlots: cloned };
}

/**
 * Get items sold by a specific merchant
 */
export function getMerchantItems(merchantId: 'dev_shopkeeper' | 'arjun_mechanic'): CatalogItem[] {
  return VILLAGE_ITEMS_CATALOG.filter(
    (item) => item.sellerId === merchantId || item.sellerId === 'both'
  );
}

/**
 * Returns a human-readable summary of items sold by a merchant for LLM prompt context
 */
export function getMerchantCatalogSummary(merchantId: 'dev_shopkeeper' | 'arjun_mechanic'): string {
  const items = getMerchantItems(merchantId);
  return items
    .map(
      (item) =>
        `- ${item.name} (${item.hindiName}) [ID: ${item.id}]: Base price ₹${item.basePrice}. Category: ${item.category}. Description: ${item.description}`
    )
    .join('\n');
}

/**
 * Negotiation Result definition
 */
export interface NegotiationOutcome {
  accepted: boolean;
  agreedPrice: number;
  counterOffer?: number;
  merchantReplyHindi: string;
  merchantReplyEnglish: string;
  patienceRemaining: number;
}

/**
 * Evaluates a player's negotiation / haggling attempt for Dev or Arjun
 */
export function evaluateNegotiation(
  merchantId: 'dev_shopkeeper' | 'arjun_mechanic',
  item: CatalogItem,
  currentPrice: number,
  playerOffer: number,
  tactic: string,
  patience: number
): NegotiationOutcome {
  const isDev = merchantId === 'dev_shopkeeper';
  // Dev min multiplier: 0.60; Arjun min multiplier: 0.68
  const minMultiplier = isDev ? 0.60 : 0.68;
  const absoluteFloor = Math.round(item.basePrice * minMultiplier);

  // If already at or below floor, or out of patience
  if (patience <= 1 && playerOffer < currentPrice) {
    return {
      accepted: false,
      agreedPrice: currentPrice,
      merchantReplyHindi: isDev
        ? 'बस बहुत हुआ भाई! इससे एक रुपया कम नहीं होगा। लेना है तो लो, वरना आगे बढ़ो।'
        : 'मेरी मेहनत का मजाक मत उड़ाओ! इससे कम में मैं औजार भी नहीं छूऊंगा।',
      merchantReplyEnglish: isDev
        ? "That's my final limit! Not a single rupee less. Take it or move along."
        : "Don't insult my craft! I won't even pick up a wrench for less than this.",
      patienceRemaining: 0,
    };
  }

  // 1. Player accepted or offered higher
  if (playerOffer >= currentPrice) {
    return {
      accepted: true,
      agreedPrice: currentPrice,
      merchantReplyHindi: isDev
        ? 'वाह! शानदार सौदा! देव की दुकान पर आपका स्वागत हमेशा रहेगा।'
        : 'सौदा पक्का! नकद बात, साफ काम। यह लो तुम्हारा सामान।',
      merchantReplyEnglish: isDev
        ? 'Excellent deal! You are always welcome at Dev’s General Store.'
        : 'Deal sealed! Fair payment, honest labor. Here are your parts.',
      patienceRemaining: patience,
    };
  }

  // 2. Outrageous lowball (< 50% base price)
  if (playerOffer < Math.round(item.basePrice * 0.50)) {
    const newPatience = Math.max(0, patience - 2);
    return {
      accepted: false,
      agreedPrice: currentPrice,
      counterOffer: Math.round(currentPrice * 0.90),
      merchantReplyHindi: isDev
        ? `अरे भाई रे भाई! ₹${playerOffer}? क्या मेरी दुकान लूटने आए हो? कम से कम ₹${Math.round(currentPrice * 0.90)} तो दो!`
        : `पागल हो क्या? ₹${playerOffer} में तो स्क्रैप का टुकड़ा भी नहीं मिलता! ₹${Math.round(currentPrice * 0.90)} से कम में बात मत करो।`,
      merchantReplyEnglish: isDev
        ? `Bhai re bhai! ₹${playerOffer}? Are you here to rob me? Give at least ₹${Math.round(currentPrice * 0.90)}!`
        : `Are you mad? ₹${playerOffer} wouldn't even buy scrap metal! Don't offer anything below ₹${Math.round(currentPrice * 0.90)}.`,
      patienceRemaining: newPatience,
    };
  }

  // 3. Tactic Bonus Evaluation
  let tacticEffective = false;
  if (isDev) {
    // Dev favors: bulk, loyal customer, cash upfront
    if (tactic.includes('neighbor') || tactic.includes('bulk') || tactic.includes('cash') || tactic.includes('emergency')) {
      tacticEffective = true;
    }
  } else {
    // Arjun favors: clinic emergency, respect craft, direct payment
    if (tactic.includes('clinic') || tactic.includes('hospital') || tactic.includes('urgent') || tactic.includes('craft') || tactic.includes('machine')) {
      tacticEffective = true;
    }
  }

  // If offer is above or equal to merchant floor
  if (playerOffer >= absoluteFloor) {
    if (tacticEffective || playerOffer >= Math.round(currentPrice * 0.80)) {
      return {
        accepted: true,
        agreedPrice: playerOffer,
        merchantReplyHindi: isDev
          ? `चलो ठीक है! तुम्हारे तर्कों में दम है। यह ${item.hindiName} ₹${playerOffer} में तुम्हारी हुई!`
          : `चलो माना। चूंकि यह गांव की भलाई और काम का सवाल है, ₹${playerOffer} में सौदा तय!`,
        merchantReplyEnglish: isDev
          ? `Alright, fair enough! You argue like a seasoned trader. The ${item.name} is yours for ₹${playerOffer}!`
          : `Agreed. Since you understand the real necessity and urgency, sealed at ₹${playerOffer}!`,
        patienceRemaining: Math.max(1, patience - 1),
      };
    }
  }

  // 4. Compromise Counter-Offer
  const compromisePrice = Math.max(absoluteFloor, Math.round((currentPrice + playerOffer) / 2));
  return {
    accepted: false,
    agreedPrice: currentPrice,
    counterOffer: compromisePrice,
    merchantReplyHindi: isDev
      ? `₹${playerOffer} तो बहुत कम है, पर तुम्हारे लिए मैं ₹${compromisePrice} तक आ सकता हूँ। बोलो, मंजूर है?`
      : `₹${playerOffer} में मुझे घाटा होगा। बीच का रास्ता निकालते हैं: ₹${compromisePrice}। बोलो, हां या ना?`,
    merchantReplyEnglish: isDev
      ? `₹${playerOffer} is too steep a loss, but for you I can come down to ₹${compromisePrice}. Deal?`
      : `₹${playerOffer} leaves me in the red. Let's meet in the middle: ₹${compromisePrice}. Take it or leave it!`,
    patienceRemaining: Math.max(0, patience - 1),
  };
}

/**
 * Dropped World Item representation in Phaser and LocalStorage
 */
export interface DroppedWorldItem {
  id: string;
  itemId: string;
  quantity: number;
  x: number;
  y: number;
  scene: string; // 'village' | 'shop' | 'workshop' | 'player_home' | 'hospital'
  droppedAt: number;
  canPickupAt: number; // timestamp after which player can pick it up (3s default)
}

export const STORAGE_DROPPED_ITEMS_KEY = 'jeeva_dropped_items_v1';

export function getCatalogItem(itemId: string): CatalogItem | undefined {
  return VILLAGE_ITEMS_CATALOG.find((i) => i.id === itemId);
}

export function loadDroppedItems(): DroppedWorldItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_DROPPED_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Error reading dropped items:', e);
    return [];
  }
}

export function saveDroppedItems(items: DroppedWorldItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_DROPPED_ITEMS_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('jeeva:dropped-items-updated', { detail: { items } }));
  } catch (e) {
    console.warn('Error saving dropped items:', e);
  }
}

export function addDroppedItem(
  itemId: string,
  quantity: number,
  x: number,
  y: number,
  scene: string = 'village',
  delayMs: number = 3000
): DroppedWorldItem {
  const items = loadDroppedItems();
  const now = Date.now();
  const newDrop: DroppedWorldItem = {
    id: `drop_${now}_${Math.random().toString(36).substring(2, 7)}`,
    itemId,
    quantity,
    x: Math.round(x),
    y: Math.round(y),
    scene,
    droppedAt: now,
    canPickupAt: now + delayMs,
  };
  items.push(newDrop);
  saveDroppedItems(items);
  return newDrop;
}

export function removeDroppedItem(dropId: string): void {
  const items = loadDroppedItems();
  const filtered = items.filter((d) => d.id !== dropId);
  saveDroppedItems(filtered);
}

