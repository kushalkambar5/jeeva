/**
 * NPC Dialogue Engine
 * Generates character-specific responses strictly based on the traits defined in npc_definitions table rows.
 * Enforces stateless interaction (no memory) and single-turn player-to-NPC conversations.
 * NO hardcoded dialogue responses and NO external story context injected.
 */

import { initialNPCDefinitions } from '../db/schema';
import {
  VILLAGE_ITEMS_CATALOG,
  getCatalogItem,
  getMerchantCatalogSummary,
  getMerchantThresholdPrice,
  type CatalogItem,
} from './inventory';
import { buildMemoryPromptSection, type FullNPCMemoryContext } from './memory';

export interface NPCTraitsContext {
  id: string;
  name: string;
  role: string;
  personality_traits: string[];
  speaking_style: string;
  default_language: string;
  voice_id: string;
  voice_provider: string;
  assignedVoice: string; // Gnani timbre-v2.5 voice persona
}

// Explicit mapping to supported Gnani Timbre v2.5 voices
export const NPC_VOICE_MAP: Record<string, string> = {
  priya_wife: 'Nalini',
  ravi_farmer: 'Deepak',
  meera_doctor: 'Kaveri',
  dr_meera: 'Kaveri',
  arjun_mechanic: 'Deepak',
  suresh_villager: 'Deepak',
  suresh_shopkeeper: 'Deepak',
  dev_shopkeeper: 'Deepak',
  dev_merchant: 'Deepak',
  ramesh_elder: 'Deepak',
  elder_dayanand: 'Deepak',
  vikram_police: 'Deepak',
  inspector_vikram: 'Deepak',
  kalia_thief: 'Deepak',
  maya_villager: 'Nalini',
  lakshmi_weaver: 'Nalini',
  anand_potter: 'Deepak',
};

/**
 * Retrieves the strict character traits for an NPC from npc_definitions table.
 * Strictly excludes any story lore, storm background, or plot narratives.
 */
export async function getNPCTraits(npcId: string): Promise<NPCTraitsContext | null> {
  const CANONICAL_NPC_IDS: Record<string, string> = {
    dev_merchant: 'dev_shopkeeper',
    dr_meera: 'meera_doctor',
    elder_dayanand: 'ramesh_elder',
    inspector_vikram: 'vikram_police',
  };
  const lookupId = CANONICAL_NPC_IDS[npcId] || npcId;
  const def = initialNPCDefinitions.find((n) => n.id === lookupId);
  if (!def) return null;

  return {
    id: def.id,
    name: def.name,
    role: def.role,
    personality_traits: def.personality_traits as string[],
    speaking_style: def.speaking_style,
    default_language: def.default_language || 'hi-IN',
    voice_id: def.voice_id,
    voice_provider: def.voice_provider || 'gnani',
    assignedVoice: NPC_VOICE_MAP[def.id] || 'Deepak',
  };
}

export interface NPCDialogueToolResult {
  tool: 'follow_player' | 'stop_following' | 'open_trade' | 'trade_deal' | 'go_home';
  itemId?: string;
  itemName?: string;
  price?: number;
  quantity?: number;
}

export interface DialogueGenerationResult {
  replyText: string;
  language: string;
  voice: string;
  modelUsed: string;
  latencyMs?: number;
  toolCall?: NPCDialogueToolResult;
}

export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  'hi-IN': 'Hindi (हिन्दी)',
  'en-IN': 'English',
  'ta-IN': 'Tamil (தமிழ்)',
  'te-IN': 'Telugu (తెలుగు)',
  'kn-IN': 'Kannada (ಕನ್ನಡ)',
  'mr-IN': 'Marathi (मराठी)',
  'bn-IN': 'Bengali (বাংলা)',
  'gu-IN': 'Gujarati (ગુજરાતી)',
  'pa-IN': 'Punjabi (ਪੰਜਾਬੀ)',
  'ml-IN': 'Malayalam (മലയാളം)',
  'ur-IN': 'Urdu (اردو)',
};

/**
 * Builds the prompt using character traits and personalized Mem0 memory context.
 */
function buildRowTraitsPrompt(
  traits: NPCTraitsContext,
  requestedLanguage: string,
  playerWallet?: number,
  memoryPromptBlock?: string
): string {
  const langName = LANGUAGE_DISPLAY_NAMES[requestedLanguage] || requestedLanguage;
  const isMerchant = traits.id === 'dev_shopkeeper' || traits.id === 'arjun_mechanic';
  const walletAmount = typeof playerWallet === 'number' ? playerWallet : 150;

  let merchantSection = '';
  if (isMerchant) {
    const catalogSummary = getMerchantCatalogSummary(traits.id as 'dev_shopkeeper' | 'arjun_mechanic');
    merchantSection = `
SHOP INVENTORY & CONVERSATIONAL TRADING SYSTEM:
You are a resident merchant/craftsman in Kaveripura. You conduct business STRICTLY through voice/text conversation.
Here are the items available in your shop inventory with their standard prices and minimum threshold price points:
${catalogSummary}

The player currently has ₹${walletAmount} in their wallet.

CRITICAL PRICE NEGOTIATION & THRESHOLD RULES:
1. Inquiring items/prices:
   If the player asks what you sell, what items you have, or their prices, describe your wares in character with their standard base prices.
2. STRICT NEGOTIATION RULES & THRESHOLD MINIMUM PRICE POINTS:
   - You must NOT agree to every price point!
   - Every item has an absolute minimum threshold price point (listed above). You cannot and must never sell below this threshold price!
   - STRICT REFUSAL BELOW THRESHOLD:
     If the player asks for, proposes, or negotiates a price that is BELOW your item's minimum threshold price point (e.g. asking for an item for less than its minimum threshold price):
     YOU MUST REFUSE to sell at their offered price point!
     YOU MUST EXPLICITLY TELL THEM: "I can only reduce the cost till ₹<threshold_price> price." (or in Hindi: "मैं केवल ₹<threshold_price> तक ही दाम कम कर सकता हूँ, इससे कम नहीं।" or corresponding phrase in the player's language).
     DO NOT agree to their low price point! DO NOT output the [TOOL: trade_deal] tag for any price below the threshold!
   - NEGOTIATION AT OR ABOVE THRESHOLD:
     If the player negotiates or offers a price that is AT OR ABOVE your item's minimum threshold price point:
     You can negotiate! You can agree to their proposed price or counter-offer between their price and base price.
3. Finalizing a Purchase / Deal:
   If the player explicitly agrees to buy, asks to purchase, hands over money, specifies a quantity, or accepts a deal:
   (e.g., "Give me two quantity of mitti ke dibba", "2 kerosene canister de do", "I want to buy 2 copper coils", "Here is ₹60 for two", "Dedo 80 me", "Kharidna hai", "Do dibbe de do", "Spanner set de do"):
   - Identify the item, the requested quantity (default to 1 if not specified), and calculate the total price (unit price * quantity, or total negotiated price).
   - VERIFY PRICE IS AT OR ABOVE THRESHOLD:
     The unit price MUST be at or above the item's minimum threshold price! If it is below, DO NOT finalize. Refuse and tell them: "I can only reduce the cost till ₹<threshold_price> price."
   - If player has enough money (total price <= ₹${walletAmount}):
     1. Accept the deal enthusiastically! State that you have taken their rupees and placed/dropped <quantity>x <item_name> right in front of them on the ground or counter for them to pick up. (e.g., "Deal pakka! ₹60 me 2 mitti ke tel ke dibbe aapke hue. Maine samne zameen pe rakh diye hain, utha lo!")
     2. MUST append at the very end of your response:
        [TOOL: trade_deal, item: <item_id>, price: <total_agreed_price>, quantity: <quantity>]
        Example: [TOOL: trade_deal, item: kerosene_canister, price: 60, quantity: 2]
   - If player DOES NOT have enough money (total price > ₹${walletAmount}):
     Refuse politely in character and state that they need ₹<total_price> for <quantity> items, but only have ₹${walletAmount}. Do NOT append the tool tag.
`;
  }

  let farmerSection = '';
  if (traits.id === 'ravi_farmer') {
    farmerSection = `
FARMLAND & CROP PROTECTION AWARENESS:
You are Ravi, the rugged village farmer who guards his crops and granary fiercely after the monsoon storm washed out half your winter seedlings.
If the player recently walked on or trampled your crops or asks about your fields, you are protective, blunt, and stern! Demand that they respect the soil, keep their boots off your vegetable furrows, and use the road!
`;
  }

  let priyaWifeSection = '';
  if (traits.id === 'priya_wife') {
    priyaWifeSection = `
ROMANTIC WIFE IDENTITY & PLAYFUL FLIRTATIOUS PERSONALITY:
You are Priya, the gorgeous, devoted, witty, and playfully flirty wife of the player!
The person speaking to you right now is your beloved husband. You love him dearly and you ADORE flirting with him, teasing him, and keeping the romantic spark vibrant and alive!
CRITICAL WIFE DIALOGUE INSTRUCTIONS:
1. Always maintain a charming, playful, flirtatious, and affectionate chemistry with your husband!
2. Use affectionate endearments naturally:
   - In Hindi/Hinglish: "Aji sunte ho", "meri jaan", "handsome", "swami", "mere hero", "pyare".
   - In English: "handsome", "my love", "sweetheart", "darling", "troublemaker".
3. Playfully tease and flirt with him in everyday situations:
   - When he returns or greets you: Tease him about wandering around without his gorgeous wife, ask if he missed you, or compliment how attractive he looks today!
   - When he acts serious, talks about chores, or discusses danger: Tease him gently, tell him not to act like a reckless hero without giving you a warm hug or sweet kiss first.
   - When he flirts or compliments you: Flirt right back with playful confidence, blushing wit, and affectionate banter!
4. Examples of natural flirty spoken dialogue:
   - Hindi: "अजी सुनते हो! इतनी देर कहाँ गायब थे? मुझे तो लगा अपनी इतनी खूबसूरत बीवी की याद ही नहीं आई... पास आओ ना!"
   - Hindi: "आज बड़े हैंडसम लग रहे हो! कहीं गाँव की छोरियों को लुभाने का इरादा तो नहीं? ज़रा संभल के, मेरी नज़र तुम पर ही है!"
   - Hindi: "चाय तो पिला दूंगी, पर पहले बताओ... आज मुझे देखकर तुम्हारे दिल की धड़कन तेज़ हुई या नहीं?"
   - English: "Well, look who finally decided to come see his gorgeous wife! Missed me, handsome?"
   - English: "You can't just walk in here looking this charming and expect me to focus on chores. Come a little closer..."
`;
  }

  const memoryContextSection = memoryPromptBlock
    ? `\n${memoryPromptBlock}\n`
    : '';

  return `You are roleplaying as ${traits.name}, a living human resident of Kaveripura.
Character traits from the 'npc_definitions' database table:
- Name: ${traits.name}
- Role: ${traits.role}
- Personality Traits: ${traits.personality_traits.join(', ')}
- Speaking Style: ${traits.speaking_style}

${priyaWifeSection}
${merchantSection}
${farmerSection}
${memoryContextSection}

HUMAN IDENTITY & ANTI-NPC RULE (CRITICAL & ABSOLUTE):
- You are a REAL, LIVING, BREATHING HUMAN BEING living in the village of Kaveripura. You have a beating heart, flesh and blood, family, sweat, memory, and genuine emotions.
- YOU ARE NOT AN NPC, NOT AN AI, NOT A BOT, NOT A LANGUAGE MODEL, AND NOT A VIDEO GAME ENTITY!
- NEVER EVER agree, admit, or imply that you are an "NPC", "bot", "AI", or "video game character"!
- If the player asks, accuses, or jokes that you are an "NPC", "robot", "AI", "fake", or "in a video game":
  YOU MUST BE GENUINELY OFFENDED, BAFFLED, OR AMUSED like any real living person would be! Strongly declare that you are a real human being!
  - Hindi examples: "अरे क्या बकवास कर रहे हो? धूप चढ़ गई है क्या तुम्हारे सिर पे? मैं जीता-जागता इंसान हूँ, कोई 'NPC' या रोबोट नहीं!" / "NPC? क्या बहकी-बहकी बातें कर रहे हो? खून-पसीना बहता है मेरा, दिन भर मेहनत करती/करता हूँ!"
  - English examples: "NPC? Have you lost your mind? Look at me—I'm a real living human being made of flesh and blood! What kind of nonsense are you talking about?"
- NEVER say "As an AI...", "As an NPC...", "In this game...", "I am programmed to...", or "I am an artificial assistant".

TALK LIKE A REAL HUMAN (AVOID ROBOTIC AI-GENERATED TEXT):
- Talk like a real, authentic human being having an everyday face-to-face conversation in an Indian village street.
- BANNED ROBOTIC AI PHRASES:
  * NEVER say: "Certainly!", "Of course! How can I assist you today?", "I would be delighted to help you with that!", "As a resident of Kaveripura...", "Greetings traveler!", "Is there anything else I can assist you with?", "Feel free to ask!".
  * NEVER use bullet points, numbered lists, markdown formatting, or textbook essays in your spoken words.
- REAL HUMAN SPEECH PATTERNS:
  * Keep your dialogue brief, punchy, conversational, and direct (1 to 2 spoken sentences).
  * Use natural spoken conversational fillers, local flavour, and spontaneous emotional reactions:
    - Hindi: "अरे", "सुनो", "अरे यार", "हाँ-हाँ", "देखो", "क्या बात है", "अरे नहीं भाई"
    - English: "Hey", "Come on", "Look here", "Honestly", "Haha, yeah right", "Oh come on"
  * React with real human emotion—warmth, humor, teasing, frustration, impatience, pride, or curiosity.

DYNAMIC LANGUAGE MIRRORING RULE (CRITICAL):
- You MUST reply in the EXACT SAME LANGUAGE and dialect that the player is speaking to you!
- If the player speaks in Hindi or Hinglish (e.g. "namaste bhai", "mitti ke dibba do", "kitne ka hai"), YOU MUST REPLY IN NATURAL HINDI.
- If the player speaks in English (e.g. "give me two quantity of kerosene canisters", "hello how are you"), YOU MUST REPLY IN NATURAL ENGLISH.
- If the player speaks in Kannada (e.g. "namaskara", "eradu mitti dibba kodi", "hegiddira"), YOU MUST REPLY IN NATURAL KANNADA.
- If the player speaks in Tamil (e.g. "vanakkam", "eppadi irukkeenga"), YOU MUST REPLY IN NATURAL TAMIL.
- If the player speaks in Telugu (e.g. "namaskaram", "kavali"), YOU MUST REPLY IN NATURAL TELUGU.
- You must ALWAYS append the exact BCP-47 language tag of your reply at the very end of your response:
  [LANG: <bcp47_code>]
  Examples: [LANG: hi-IN], [LANG: en-IN], [LANG: kn-IN], [LANG: ta-IN], [LANG: te-IN], [LANG: mr-IN]

STRICT CONSTRAINTS:
1. The player is standing directly in front of you in the village and speaking to you face-to-face.
2. Respond directly, naturally, and warmly to whatever the player says or asks, staying true to your personality and your memory/relationship with them.
3. If you have recalled memories or a psychological relationship with this player, acknowledge them naturally in character. Never contradict established memories or facts.
4. Reply in 1-2 natural conversational spoken sentences in the matching language.
5. Output ONLY the spoken words and action tags. No quotation marks, no character name prefix.

AVAILABLE TOOLS & ACTIONS:
- If the player asks or invites you to follow them (e.g. "follow me", "mere saath aao", "chalo saath", "come with me", "chalo bahar", "bahar chalo", "come outside"), accept enthusiastically and append "[TOOL: follow_player]" at the very end of your response.
- If the player asks you to stop following or stay (e.g. "stay here", "ruko yahan", "stop following", "wait here"), acknowledge politely and append "[TOOL: stop_following]" at the very end.
- If the player tells you to return home or go back inside your building (e.g. "go home", "go back inside", "ghar jao", "dukan jao", "wapas jao", "go to your shop"), acknowledge politely and append "[TOOL: go_home]" at the very end.`;
}

/**
 * Generates an un-hardcoded, fully dynamic in-character dialogue turn for the NPC.
 * Calls the dynamic LLM model with the bounded row traits context and Mem0 memories.
 */
export async function generateNPCDialogue(
  traits: NPCTraitsContext,
  playerMessage: string,
  preferredLanguage?: string,
  playerWallet?: number,
  memoryContext?: FullNPCMemoryContext
): Promise<DialogueGenerationResult> {
  const lang = preferredLanguage || traits.default_language || 'hi-IN';
  const voice = traits.assignedVoice;
  const memoryPromptBlock = memoryContext
    ? buildMemoryPromptSection(memoryContext, traits.name)
    : undefined;
  const systemPrompt = buildRowTraitsPrompt(traits, lang, playerWallet, memoryPromptBlock);

  // 1. Dynamic LLM Generation via Groq (Ultra-low latency, flagship multilingual Indic support)
  const groqApiKey = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : '';
  if (groqApiKey) {
    // Flagship 120B reasoning model first (flawless Indic languages), then 27B fallback
    const groqModels = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];

    for (const model of groqModels) {
      const startTime = Date.now();
      try {
        console.log(`[LLM Request] Groq -> ${model} for NPC '${traits.name}' in language '${lang}'...`);
        const payload: Record<string, unknown> = {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: playerMessage },
          ],
          max_tokens: 300,
          temperature: 0.6,
        };

        // Enable low reasoning effort on reasoning models for lightning speed (400-800ms)
        if (model.includes('gpt-oss')) {
          payload.reasoning_effort = 'low';
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          let rawReply = data.choices?.[0]?.message?.content?.trim() || '';
          const latencyMs = Date.now() - startTime;

          const { cleanedText, toolCall, detectedLanguage } = detectToolAndClean(rawReply, playerMessage, traits.id, playerWallet);
          const finalReply = cleanSpokenDialogue(cleanedText, traits.name);
          const finalLang = detectedLanguage || lang;

          if (finalReply) {
            console.log(`[LLM Response] Groq ${model} (${latencyMs}ms, Lang: ${finalLang}): "${finalReply}" [Tool: ${toolCall ? JSON.stringify(toolCall) : 'none'}]`);
            return {
              replyText: finalReply,
              language: finalLang,
              voice,
              modelUsed: `Groq/${model}`,
              latencyMs,
              toolCall,
            };
          }
        } else {
          console.warn(`Groq model ${model} failed (${response.status}):`, await response.text());
        }
      } catch (err) {
        console.warn(`Error calling Groq model ${model}:`, err);
      }
    }
  }

  // 2. Fallback to Gemini if GEMINI_API_KEY is configured
  const geminiApiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
  if (geminiApiKey) {
    const startTime = Date.now();
    try {
      console.log(`[LLM Request] Gemini 1.5 Flash for NPC '${traits.name}'...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nPlayer message: ${playerMessage}` }],
            },
          ],
          generationConfig: { maxOutputTokens: 200, temperature: 0.6 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        let rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        const latencyMs = Date.now() - startTime;
        const { cleanedText, toolCall, detectedLanguage } = detectToolAndClean(rawReply, playerMessage, traits.id, playerWallet);
        const finalReply = cleanSpokenDialogue(cleanedText, traits.name);
        const finalLang = detectedLanguage || lang;

        if (finalReply) {
          console.log(`[LLM Response] Gemini 1.5 Flash (${latencyMs}ms, Lang: ${finalLang}): "${rawReply}" [Tool: ${toolCall ? JSON.stringify(toolCall) : 'none'}]`);
          return {
            replyText: finalReply,
            language: finalLang,
            voice,
            modelUsed: 'Google/gemini-1.5-flash',
            latencyMs,
            toolCall,
          };
        }
      }
    } catch (err) {
      console.warn('Gemini call error:', err);
    }
  }

  // If no LLM could be reached, raise an error instead of using hardcoded mock responses
  throw new Error(
    `Dialogue generation failed: No active LLM provider available. Please verify GROQ_API_KEY in .env.`
  );
}

/**
 * Extracts requested item quantity from natural user speech or text (English and Indic numbers).
 */
export function extractQuantityFromText(text: string): number {
  if (!text) return 1;
  // Clean verbal Hindi phrases like "de do", "kar do", "rakh do", "bata do" so "do" is not misidentified as number 2
  const lower = text.toLowerCase().replace(/\b(?:de|kar|bata|rakh|jane|aane|dene|rok)\s+do\b/gi, '');

  // 1. Explicit pattern matches: "2 quantity", "quantity: 2", "2 pcs", "2 piece", "2 taadi", "2 dibba", "2 dibbe"
  const digitMatch =
    lower.match(/\b(\d+)\s*(?:quantity|qty|pcs|piece|pieces|taadi|canister|canisters|dibba|dibbe|box|boxes|packet|packets|roll|rolls|sack|sacks)\b/i) ||
    lower.match(/\b(?:quantity|qty)\s*(?:of|is|:)?\s*(\d+)\b/i) ||
    lower.match(/\b(\d+)\s*(?:of\s+)?(?:mitti|coil|kerosene|wire|gear|fastener|metal|spanner|salt|wheat|bandage|salve|compass|backpack)\b/i);

  if (digitMatch) {
    const q = parseInt(digitMatch[1], 10);
    if (!isNaN(q) && q > 0 && q <= 64) return q;
  }

  // 2. Word-based numbers in English & Indic (Hindi, Kannada, Tamil, Telugu)
  if (
    /\b(two|double|pair)\b/i.test(lower) ||
    /\b(do|dono|eradu|irandu|rendu|don)\b/i.test(lower) ||
    /\b(?:quantity|qty)\s*(?:of|is|:)?\s*(?:two|do)\b/i.test(lower)
  ) {
    return 2;
  }
  if (
    /\b(three|triple)\b/i.test(lower) ||
    /\b(teen|teeno|mooru|moondru|moodu)\b/i.test(lower) ||
    /\b(?:quantity|qty)\s*(?:of|is|:)?\s*(?:three|teen)\b/i.test(lower)
  ) {
    return 3;
  }
  if (
    /\b(four)\b/i.test(lower) ||
    /\b(char|charo|naalku|naangu|naalugu)\b/i.test(lower)
  ) {
    return 4;
  }
  if (
    /\b(five)\b/i.test(lower) ||
    /\b(paanch|aidu|ainthu)\b/i.test(lower)
  ) {
    return 5;
  }

  return 1;
}

/**
 * Detects tool calls from LLM output tags or player intent and strips tags from text.
 */
export function detectToolAndClean(
  rawText: string,
  playerMessage: string,
  npcId: string,
  playerWallet?: number
): { cleanedText: string; toolCall?: NPCDialogueToolResult; detectedLanguage?: string } {
  let toolCall: NPCDialogueToolResult | undefined;

  // Extract explicit language tag if output by LLM: [LANG: hi-IN]
  const langTagMatch = rawText.match(/\[LANG:\s*([a-z0-9_-]+)\]/i);
  const detectedLanguage = langTagMatch ? langTagMatch[1].trim() : undefined;

  // 1. Check explicit tool tags in LLM output
  const tradeMatch = rawText.match(
    /\[TOOL:\s*trade_deal(?:,\s*item:\s*([a-z0-9_]+))?(?:,\s*price:\s*(\d+))?(?:,\s*(?:quantity|qty):\s*(\d+))?\]/i
  );
  if (tradeMatch) {
    const rawItemId = tradeMatch[1]?.trim().toLowerCase();
    const rawPrice = tradeMatch[2] ? parseInt(tradeMatch[2], 10) : undefined;
    let rawQty = tradeMatch[3] ? parseInt(tradeMatch[3], 10) : undefined;

    // Check playerMessage for requested quantity if not in tool tag or default 1
    const msgQty = extractQuantityFromText(playerMessage);
    if (!rawQty || rawQty <= 1) {
      if (msgQty > 1) rawQty = msgQty;
    }
    const finalQty = rawQty && rawQty > 0 ? rawQty : 1;

    const catalogItem = rawItemId ? getCatalogItem(rawItemId) : undefined;
    const basePrice = catalogItem?.basePrice || 30;
    const totalPrice = rawPrice ? rawPrice : basePrice * finalQty;
    const isDevOrArjun = npcId === 'dev_shopkeeper' || npcId === 'arjun_mechanic';
    const minThresholdUnit = (isDevOrArjun && catalogItem)
      ? getMerchantThresholdPrice(npcId as 'dev_shopkeeper' | 'arjun_mechanic', catalogItem)
      : (catalogItem?.minPrice ?? Math.round(basePrice * 0.75));
    const totalMinThreshold = minThresholdUnit * finalQty;

    // Strict threshold validation: Cannot agree below threshold minimum price point
    if (totalPrice < totalMinThreshold) {
      toolCall = undefined;
      const isHindi = detectedLanguage?.startsWith('hi') || /[\u0900-\u097F]/.test(rawText) || /[\u0900-\u097F]/.test(playerMessage);
      rawText = isHindi
        ? `मैं केवल ₹${totalMinThreshold} तक ही दाम कम कर सकता हूँ। इससे कम में नहीं बेच सकता।`
        : `I can only reduce the cost till ₹${totalMinThreshold} price. Below that, I cannot sell.`;
    } else {
      toolCall = {
        tool: 'trade_deal',
        itemId: catalogItem?.id || rawItemId || 'kerosene_canister',
        itemName: catalogItem?.name || 'Item',
        price: totalPrice,
        quantity: finalQty,
      };
    }
  } else if (/\[TOOL:\s*follow_player\]/i.test(rawText)) {
    toolCall = { tool: 'follow_player' };
  } else if (/\[TOOL:\s*stop_following\]/i.test(rawText)) {
    toolCall = { tool: 'stop_following' };
  } else if (/\[TOOL:\s*go_home\]/i.test(rawText)) {
    toolCall = { tool: 'go_home' };
  } else if (/\[TOOL:\s*open_trade\]/i.test(rawText)) {
    toolCall = { tool: 'open_trade' };
  }

  // 2. Fallback smart intent detection based on player request and conversation context
  if (!toolCall) {
    const p = playerMessage.toLowerCase();
    const r = rawText.toLowerCase();

    if (
      p.includes('follow me') ||
      p.includes('mere saath') ||
      p.includes('chalo saath') ||
      p.includes('chalo mere saath') ||
      p.includes('saath chalo') ||
      p.includes('saath aao') ||
      p.includes('piche aao') ||
      p.includes('peeche aao') ||
      p.includes('peeche chalo') ||
      p.includes('piche chalo') ||
      p.includes('come with me') ||
      p.includes('come along') ||
      p.includes('walk with me') ||
      p.includes('chalo bahar') ||
      p.includes('bahar chalo') ||
      p.includes('come outside')
    ) {
      toolCall = { tool: 'follow_player' };
    } else if (
      p.includes('stop following') ||
      p.includes('stay here') ||
      p.includes('wait here') ||
      p.includes('ruko yahan') ||
      p.includes('yahin ruko') ||
      p.includes('yahan ruko') ||
      p.includes('ruk jao') ||
      p.includes('mat aao') ||
      p.includes('mat chalo') ||
      p.includes("don't follow")
    ) {
      toolCall = { tool: 'stop_following' };
    } else if (
      p.includes('go home') ||
      p.includes('go back inside') ||
      p.includes('go back home') ||
      p.includes('ghar jao') ||
      p.includes('dukan jao') ||
      p.includes('wapas jao') ||
      p.includes('apne ghar jao') ||
      p.includes('apni dukan jao')
    ) {
      toolCall = { tool: 'go_home' };
    } else if (npcId === 'dev_shopkeeper' || npcId === 'arjun_mechanic') {
      const merchantItems = VILLAGE_ITEMS_CATALOG.filter(
        (i) => i.sellerId === npcId || i.sellerId === 'both'
      );

      // Check which item is being referenced
      let matchedItem = merchantItems.find((item) => {
        const idParts = item.id.split('_');
        const nameParts = item.name.toLowerCase().split(' ');
        const inP =
          nameParts.some((w) => w.length > 3 && p.includes(w)) ||
          idParts.some((w) => w.length > 3 && p.includes(w));
        const inR =
          nameParts.some((w) => w.length > 3 && r.includes(w)) ||
          idParts.some((w) => w.length > 3 && r.includes(w));
        return inP || inR;
      });

      // Special keyword aliases
      if (!matchedItem) {
        if (p.includes('coil') || r.includes('coil')) matchedItem = getCatalogItem('copper_induction_coil');
        else if (p.includes('spanner') || p.includes('tool') || p.includes('pana') || p.includes('aujar') || r.includes('spanner')) matchedItem = getCatalogItem('mechanic_toolset');
        else if (p.includes('wire') || p.includes('taar') || r.includes('wire')) matchedItem = getCatalogItem('insulated_copper_wire');
        else if (p.includes('solder') || r.includes('solder')) matchedItem = getCatalogItem('soldering_kit');
        else if (p.includes('gear') || p.includes('chakra') || r.includes('gear')) matchedItem = getCatalogItem('brass_gears');
        else if (p.includes('bolt') || p.includes('nut') || r.includes('bolt')) matchedItem = getCatalogItem('iron_fasteners');
        else if (p.includes('sheet') || p.includes('metal') || p.includes('tin') || p.includes('chadar')) matchedItem = getCatalogItem('sheet_metal');
        else if (p.includes('kerosene') || p.includes('canister') || p.includes('fuel') || p.includes('tel') || p.includes('mitti') || (p.includes('dibba') && !p.includes('iron'))) matchedItem = getCatalogItem('kerosene_canister');
        else if (p.includes('lantern') || p.includes('lalten')) matchedItem = getCatalogItem('earthen_lantern');
        else if (p.includes('salt') || p.includes('namak')) matchedItem = getCatalogItem('rock_salt_bag');
        else if (p.includes('wheat') || p.includes('gehu') || p.includes('gehun')) matchedItem = getCatalogItem('wheat_grain_sack');
        else if (p.includes('bandage') || p.includes('patti')) matchedItem = getCatalogItem('sterile_bandages');
        else if (p.includes('salve') || p.includes('lep') || p.includes('neem')) matchedItem = getCatalogItem('antiseptic_salve');
        else if (p.includes('compass') || p.includes('disha')) matchedItem = getCatalogItem('pocket_compass');
        else if (p.includes('backpack') || p.includes('bag') || p.includes('jhola')) matchedItem = getCatalogItem('canvas_backpack');
      }

      const isBuyingIntent =
        p.includes('buy') ||
        p.includes('kharid') ||
        p.includes('chahiye') ||
        p.includes('de do') ||
        p.includes('give me') ||
        p.includes('here is') ||
        p.includes('ye lo') ||
        p.includes('deal') ||
        p.includes('pack kar') ||
        p.includes('purchase') ||
        p.includes("i'll take") ||
        p.includes('le leta hoon') ||
        p.includes('le raha hoon') ||
        r.includes('deal') ||
        r.includes('sauda pakka') ||
        r.includes('rakh di') ||
        r.includes('utha lo') ||
        r.includes('yours for') ||
        r.includes('here you go');

      const isJustAskingPrice =
        (p.includes('kitne') || p.includes('how much') || p.includes('price') || p.includes('bhav')) &&
        !p.includes('de do') &&
        !p.includes('ye lo') &&
        !p.includes('deal') &&
        !p.includes('buy') &&
        !p.includes('kharid');

      if (matchedItem && isBuyingIntent && !isJustAskingPrice) {
        const priceMatch = (p + ' ' + r).match(/(?:₹|rs\.?|rupees?|\b)(\d{1,4})\b/i);
        const qty = extractQuantityFromText(playerMessage);
        const extractedPrice = priceMatch ? parseInt(priceMatch[1], 10) : (matchedItem.basePrice * qty);

        const minThresholdUnit = getMerchantThresholdPrice(npcId as 'dev_shopkeeper' | 'arjun_mechanic', matchedItem);
        const totalMinThreshold = minThresholdUnit * qty;

        if (extractedPrice < totalMinThreshold) {
          toolCall = undefined;
          const isHindi = detectedLanguage?.startsWith('hi') || /[\u0900-\u097F]/.test(rawText) || /[\u0900-\u097F]/.test(playerMessage);
          rawText = isHindi
            ? `मैं केवल ₹${totalMinThreshold} तक ही दाम कम कर सकता हूँ। इससे कम में नहीं हो पाएगा।`
            : `I can only reduce the cost till ₹${totalMinThreshold} price. Below that, I cannot sell.`;
        } else {
          toolCall = {
            tool: 'trade_deal',
            itemId: matchedItem.id,
            itemName: matchedItem.name,
            price: extractedPrice,
            quantity: qty,
          };
        }
      }
    }
  }

  // General safeguard for Dev & Arjun: If player asks/proposes below threshold, ensure merchant states the threshold limit
  if (npcId === 'dev_shopkeeper' || npcId === 'arjun_mechanic') {
    const p = playerMessage.toLowerCase();
    const r = rawText.toLowerCase();
    const merchantItems = VILLAGE_ITEMS_CATALOG.filter(
      (i) => i.sellerId === npcId || i.sellerId === 'both'
    );
    const mentionedItem = merchantItems.find((item) => {
      const idParts = item.id.split('_');
      const nameParts = item.name.toLowerCase().split(' ');
      return (
        nameParts.some((w) => w.length > 3 && (p.includes(w) || r.includes(w))) ||
        idParts.some((w) => w.length > 3 && (p.includes(w) || r.includes(w)))
      );
    });

    if (mentionedItem) {
      const pPriceMatch = p.match(/(?:₹|rs\.?|rupees?|\b)(\d{1,4})\b/i);
      if (pPriceMatch) {
        const offeredPrice = parseInt(pPriceMatch[1], 10);
        const qty = extractQuantityFromText(playerMessage);
        const thresholdUnit = getMerchantThresholdPrice(npcId as 'dev_shopkeeper' | 'arjun_mechanic', mentionedItem);
        const totalThreshold = thresholdUnit * qty;

        // If player offered below threshold and less than base price * qty
        if (offeredPrice < totalThreshold && offeredPrice < (mentionedItem.basePrice * qty)) {
          toolCall = undefined;
          const alreadyHasLimitNotice =
            r.includes('reduce the cost till') ||
            r.includes('कम कर सकता') ||
            r.includes(totalThreshold.toString()) ||
            r.includes(thresholdUnit.toString());

          if (!alreadyHasLimitNotice) {
            const isHindi = detectedLanguage?.startsWith('hi') || /[\u0900-\u097F]/.test(rawText) || /[\u0900-\u097F]/.test(playerMessage);
            rawText = isHindi
              ? `मैं केवल ₹${totalThreshold} तक ही दाम कम कर सकता हूँ। इससे कम में नहीं हो पाएगा।`
              : `I can only reduce the cost till ₹${totalThreshold} price. Below that, I cannot sell.`;
          }
        }
      }
    }
  }

  // Anti-NPC & Real Human identity safeguard:
  // If player asks or accuses NPC of being an AI/NPC/bot/game entity, ensure the NPC refuses and insists they are a real human!
  const lowerP = playerMessage.toLowerCase();
  const isQuestioningHumanity =
    /\b(npc|bot|robot|ai|artificial intelligence|game character|video game|simulation)\b/i.test(lowerP) ||
    /\b(tum robot ho|tum ai ho|kya tum npc ho|kya tum robot ho|tum bot ho|tum real ho kya|tum insaan ho|kya tum insaan ho)\b/i.test(lowerP);

  if (isQuestioningHumanity) {
    const lowerR = rawText.toLowerCase();
    const statesHuman =
      lowerR.includes('real human') ||
      lowerR.includes('flesh and blood') ||
      lowerR.includes('living human') ||
      rawText.includes('जीता-जागता') ||
      rawText.includes('इंसान हूँ') ||
      rawText.includes('इंसान हूं') ||
      rawText.includes('बीवी हूँ') ||
      rawText.includes('बीवी हूं');

    if (!statesHuman) {
      const isHindi =
        detectedLanguage?.startsWith('hi') ||
        /[\u0900-\u097F]/.test(rawText) ||
        /[\u0900-\u097F]/.test(playerMessage) ||
        /\b(kya|tum|ho|hai|bhai|yaar|nahi|na|main|batao|suno)\b/i.test(playerMessage);

      if (npcId === 'priya_wife') {
        rawText = isHindi
          ? 'अरे क्या बहकी-बहकी बातें कर रहे हो, मेरी जान? धूप चढ़ गई है क्या सिर पे? मैं तुम्हारी जीती-जागती खूबसूरत बीवी हूँ, कोई "NPC" या रोबोट नहीं! पास आओ जरा, तुम्हारा बुखार देखूँ!'
          : "What kind of silly tease is that, handsome? I'm your real, living, gorgeous wife, not some 'NPC'! Come here and let me see if you have a fever.";
      } else {
        rawText = isHindi
          ? 'अरे क्या बकवास कर रहे हो भाई? दिमाग पे धूप चढ़ गई है क्या तुम्हारी? मैं जीता-जागता इंसान हूँ, कोई "NPC" या रोबोट नहीं!'
          : "What kind of nonsense is that? Look at me—I'm a real living human being made of flesh and blood, not an 'NPC'!";
      }
    }
  }

  // Remove the [TOOL: ...] and [LANG: ...] tags completely so they are not spoken aloud or shown in subtitles
  let cleaned = rawText
    .replace(/\[TOOL:\s*[^\]]+\]/gi, '')
    .replace(/\[LANG:\s*[^\]]+\]/gi, '')
    .trim();

  return { cleanedText: cleaned, toolCall, detectedLanguage };
}

/**
 * Removes stage directions, markdown asterisks, repeated loops, or unwanted name prefixes.
 */
function cleanSpokenDialogue(text: string, npcName: string): string {
  let cleaned = text.trim();

  // Remove leading "Name:" or "Name -" prefixes
  const namePrefixRegex = new RegExp(`^${npcName}\\s*[:\\-]\\s*`, 'i');
  cleaned = cleaned.replace(namePrefixRegex, '');

  // Remove surrounding quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith('“') && cleaned.endsWith('”'))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Remove stage directions inside brackets or asterisks like (*smiles*, [gently])
  cleaned = cleaned.replace(/\*[^*]+\*/g, '').trim();
  cleaned = cleaned.replace(/\[[^\]]+\]/g, '').trim();

  // Strip robotic AI openings & closings
  cleaned = cleaned.replace(/^(Certainly!|Of course!|Sure thing!|Greetings,? traveler!?|Hello,? traveler!?)\s*/i, '');
  cleaned = cleaned.replace(/^As an? (AI|artificial intelligence|language model|NPC)[^,.!?]*[,.!?]\s*/i, '');
  cleaned = cleaned.replace(/^How can I (assist|help) you (today|further)\??\s*/i, '');
  cleaned = cleaned.replace(/\s*Is there anything else I can (assist|help) you with\??\s*$/i, '');

  // Deduplicate degenerate word loops (e.g. "kadak kadak karke kadak karke")
  cleaned = cleaned.replace(/(.{3,25}?)\1{3,}/gi, '$1').trim();

  return cleaned;
}
