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
Here are the items available in your shop inventory:
${catalogSummary}

The player currently has ₹${walletAmount} in their wallet.

CONVERSATIONAL TRADING RULES:
1. Inquiring items/prices: If the player asks what you sell, prices, or if you have an item, answer warmly in character describing your wares and their base prices.
2. Negotiating/Haggling: If the player asks for a discount or offers a lower price (e.g. offers 10-20% less):
   - You can negotiate! You can accept reasonable offers or counter-offer if it's too low.
3. Finalizing a Purchase / Deal:
   If the player explicitly agrees to buy, asks to purchase, hands over money, or accepts a deal:
   (e.g., "I want to buy the copper coil", "Here is ₹90", "Okay deal", "Dedo 80 me", "Kharidna hai", "Ye lo paise", "Spanner set de do"):
   - If player has enough money (agreed price <= ₹${walletAmount}):
     1. Accept the deal enthusiastically! State that you have taken their rupees and placed/dropped the item right in front of them on the ground or counter for them to pick up. (e.g., "Deal pakka! ₹90 me copper coil tumhari. Maine samne zameen pe rakh di hai, utha lo!")
     2. MUST append at the very end of your response:
        [TOOL: trade_deal, item: <item_id>, price: <agreed_price>]
        Example: [TOOL: trade_deal, item: copper_induction_coil, price: 90]
   - If player DOES NOT have enough money (agreed price > ₹${walletAmount}):
     Refuse politely in character and state that they only have ₹${walletAmount} which is not enough. Do NOT append the tool tag.
`;
  }

  const memoryContextSection = memoryPromptBlock
    ? `\n${memoryPromptBlock}\n`
    : '';

  return `You are roleplaying as ${traits.name}, a village resident of Kaveripura.
Character traits from the 'npc_definitions' database table:
- Name: ${traits.name}
- Role: ${traits.role}
- Personality Traits: ${traits.personality_traits.join(', ')}
- Speaking Style: ${traits.speaking_style}

${memoryContextSection}

STRICT CONSTRAINTS:
1. The player is standing directly in front of you in the village and speaking to you face-to-face.
2. Respond directly, naturally, and warmly to whatever the player says or asks, staying true to your personality and your memory/relationship with them.
3. If you have recalled memories or a psychological relationship with this player, acknowledge them naturally in character. Never contradict established memories or facts.
4. Reply in 1-2 natural conversational spoken sentences in the player's language (${langName}). If the player speaks in Hindi, reply in natural conversational Hindi. If the player speaks in English, reply in natural conversational English. If the player speaks in Tamil, reply in natural conversational Tamil, etc.
5. Output ONLY the spoken words. No quotation marks, no character name prefix.

AVAILABLE TOOLS & ACTIONS:
- If the player asks or invites you to follow them (e.g. "follow me", "mere saath aao", "chalo saath", "come with me", "chalo bahar", "bahar chalo", "come outside"), accept enthusiastically and append "[TOOL: follow_player]" at the very end of your response.
- If the player asks you to stop following or stay (e.g. "stay here", "ruko yahan", "stop following", "wait here"), acknowledge politely and append "[TOOL: stop_following]" at the very end.
- If the player tells you to return home or go back inside your building (e.g. "go home", "go back inside", "ghar jao", "dukan jao", "wapas jao", "go to your shop"), acknowledge politely and append "[TOOL: go_home]" at the very end.
${merchantSection}`;
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

          const { cleanedText, toolCall } = detectToolAndClean(rawReply, playerMessage, traits.id, playerWallet);
          const finalReply = cleanSpokenDialogue(cleanedText, traits.name);

          if (finalReply) {
            console.log(`[LLM Response] Groq ${model} (${latencyMs}ms): "${finalReply}" [Tool: ${toolCall ? JSON.stringify(toolCall) : 'none'}]`);
            return {
              replyText: finalReply,
              language: lang,
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
        const { cleanedText, toolCall } = detectToolAndClean(rawReply, playerMessage, traits.id, playerWallet);
        const finalReply = cleanSpokenDialogue(cleanedText, traits.name);

        if (finalReply) {
          console.log(`[LLM Response] Gemini 1.5 Flash (${latencyMs}ms): "${rawReply}" [Tool: ${toolCall ? JSON.stringify(toolCall) : 'none'}]`);
          return {
            replyText: finalReply,
            language: lang,
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
 * Detects tool calls from LLM output tags or player intent and strips tags from text.
 */
export function detectToolAndClean(
  rawText: string,
  playerMessage: string,
  npcId: string,
  playerWallet?: number
): { cleanedText: string; toolCall?: NPCDialogueToolResult } {
  let toolCall: NPCDialogueToolResult | undefined;

  // 1. Check explicit tool tags in LLM output
  const tradeMatch = rawText.match(
    /\[TOOL:\s*trade_deal(?:,\s*item:\s*([a-z0-9_]+))?(?:,\s*price:\s*(\d+))?\]/i
  );
  if (tradeMatch) {
    const rawItemId = tradeMatch[1]?.trim().toLowerCase();
    const rawPrice = tradeMatch[2] ? parseInt(tradeMatch[2], 10) : undefined;
    const catalogItem = rawItemId ? getCatalogItem(rawItemId) : undefined;
    toolCall = {
      tool: 'trade_deal',
      itemId: catalogItem?.id || rawItemId || 'copper_induction_coil',
      itemName: catalogItem?.name || 'Item',
      price: rawPrice || catalogItem?.basePrice || 50,
    };
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
        else if (p.includes('kerosene') || p.includes('canister') || p.includes('fuel') || p.includes('tel')) matchedItem = getCatalogItem('kerosene_canister');
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
        const priceMatch = (p + ' ' + r).match(/(?:₹|rs\.?|rupees?|\b)(\d{2,4})\b/i);
        const extractedPrice = priceMatch ? parseInt(priceMatch[1], 10) : matchedItem.basePrice;

        toolCall = {
          tool: 'trade_deal',
          itemId: matchedItem.id,
          itemName: matchedItem.name,
          price: extractedPrice,
        };
      }
    }
  }

  // Remove the [TOOL: ...] tag completely so it's not spoken aloud by TTS or shown in raw subtitles
  let cleaned = rawText.replace(/\[TOOL:\s*[^\]]+\]/gi, '').trim();
  return { cleanedText: cleaned, toolCall };
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

  // Deduplicate degenerate word loops (e.g. "kadak kadak karke kadak karke")
  cleaned = cleaned.replace(/(.{3,25}?)\1{3,}/gi, '$1').trim();

  return cleaned;
}
