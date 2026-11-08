/**
 * NPC Dialogue Engine
 * Generates character-specific responses strictly based on the traits defined in npc_definitions table rows.
 * Enforces stateless interaction (no memory) and single-turn player-to-NPC conversations.
 * NO hardcoded dialogue responses and NO external story context injected.
 */

import { initialNPCDefinitions } from '../db/schema';

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
  dr_meera: 'Kaveri',
  arjun_mechanic: 'Deepak',
  suresh_villager: 'Deepak',
  suresh_shopkeeper: 'Deepak',
  dev_merchant: 'Deepak',
  elder_dayanand: 'Deepak',
  inspector_vikram: 'Deepak',
  kalia_thief: 'Deepak',
  lakshmi_weaver: 'Nalini',
  anand_potter: 'Deepak',
};

/**
 * Retrieves the strict character traits for an NPC from npc_definitions table.
 * Strictly excludes any story lore, storm background, or plot narratives.
 */
export async function getNPCTraits(npcId: string): Promise<NPCTraitsContext | null> {
  const def = initialNPCDefinitions.find((n) => n.id === npcId);
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

export interface DialogueGenerationResult {
  replyText: string;
  language: string;
  voice: string;
  modelUsed: string;
  latencyMs?: number;
  toolCall?: 'follow_player' | 'stop_following' | 'open_trade';
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
 * Builds the prompt using ONLY character traits (name, role, personality traits, speaking style).
 * ZERO story context, storms, disasters, or plot backstories.
 */
function buildRowTraitsPrompt(traits: NPCTraitsContext, requestedLanguage: string): string {
  const langName = LANGUAGE_DISPLAY_NAMES[requestedLanguage] || requestedLanguage;
  return `You are roleplaying as ${traits.name}, a village resident.
Character traits from the 'npc_definitions' database table:
- Name: ${traits.name}
- Role: ${traits.role}
- Personality Traits: ${traits.personality_traits.join(', ')}
- Speaking Style: ${traits.speaking_style}

STRICT CONSTRAINTS:
1. The player is standing directly in front of you in the village and speaking to you face-to-face.
2. Respond directly, naturally, and warmly to whatever the player says or asks.
3. DO NOT mention or invent any story plots, storms, disasters, missions, or waiting for anyone to return.
4. You have NO memory of any past conversations.
5. Reply in 1 natural conversational spoken sentence in the player's language (${langName}). If the player speaks in Hindi, reply in natural conversational Hindi. If the player speaks in English, reply in natural conversational English. If the player speaks in Tamil, reply in natural conversational Tamil, etc.
6. Output ONLY the spoken words. No quotation marks, no character name prefix.

AVAILABLE TOOLS & ACTIONS:
- If the player asks or invites you to follow them (e.g. "follow me", "mere saath aao", "chalo saath", "come with me"), accept enthusiastically and append "[TOOL: follow_player]" at the very end of your response.
- If the player asks you to stop following or stay (e.g. "stay here", "ruko yahan", "stop following", "wait here"), acknowledge politely and append "[TOOL: stop_following]" at the very end.
- If you are a merchant or mechanic (or if the player asks to trade, negotiate prices, buy, or sell items), invite them to do business and append "[TOOL: open_trade]" at the very end.`;
}

/**
 * Generates an un-hardcoded, fully dynamic in-character dialogue turn for the NPC.
 * Calls the dynamic LLM model with the bounded row traits context.
 */
export async function generateNPCDialogue(
  traits: NPCTraitsContext,
  playerMessage: string,
  preferredLanguage?: string
): Promise<DialogueGenerationResult> {
  const lang = preferredLanguage || traits.default_language || 'hi-IN';
  const voice = traits.assignedVoice;
  const systemPrompt = buildRowTraitsPrompt(traits, lang);

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

          const { cleanedText, toolCall } = detectToolAndClean(rawReply, playerMessage, traits.id);
          const finalReply = cleanSpokenDialogue(cleanedText, traits.name);

          if (finalReply) {
            console.log(`[LLM Response] Groq ${model} (${latencyMs}ms): "${finalReply}" [Tool: ${toolCall || 'none'}]`);
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
        const { cleanedText, toolCall } = detectToolAndClean(rawReply, playerMessage, traits.id);
        const finalReply = cleanSpokenDialogue(cleanedText, traits.name);

        if (finalReply) {
          console.log(`[LLM Response] Gemini 1.5 Flash (${latencyMs}ms): "${rawReply}" [Tool: ${toolCall || 'none'}]`);
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
  npcId: string
): { cleanedText: string; toolCall?: 'follow_player' | 'stop_following' | 'open_trade' } {
  let toolCall: 'follow_player' | 'stop_following' | 'open_trade' | undefined;

  // 1. Check explicit tool tags in LLM output
  if (/\[TOOL:\s*follow_player\]/i.test(rawText)) {
    toolCall = 'follow_player';
  } else if (/\[TOOL:\s*stop_following\]/i.test(rawText)) {
    toolCall = 'stop_following';
  } else if (/\[TOOL:\s*open_trade\]/i.test(rawText)) {
    toolCall = 'open_trade';
  }

  // 2. Fallback smart intent detection based on player request
  if (!toolCall) {
    const p = playerMessage.toLowerCase();
    if (
      p.includes('follow me') ||
      p.includes('mere saath') ||
      p.includes('chalo saath') ||
      p.includes('piche aao') ||
      p.includes('peeche aao') ||
      p.includes('come with me')
    ) {
      toolCall = 'follow_player';
    } else if (
      p.includes('stop following') ||
      p.includes('stay here') ||
      p.includes('ruko yahan') ||
      p.includes('ruko') ||
      p.includes('wait here') ||
      p.includes('mat aao')
    ) {
      toolCall = 'stop_following';
    } else if (
      (npcId === 'dev_shopkeeper' || npcId === 'arjun_mechanic') &&
      (p.includes('trade') ||
        p.includes('buy') ||
        p.includes('sell') ||
        p.includes('negotiate') ||
        p.includes('kharid') ||
        p.includes('bech') ||
        p.includes('sauda') ||
        p.includes('dukan') ||
        p.includes('bhav') ||
        p.includes('price'))
    ) {
      toolCall = 'open_trade';
    }
  }

  // Remove the [TOOL: ...] tag so it's not spoken aloud by TTS or shown in raw subtitles
  let cleaned = rawText.replace(/\[TOOL:\s*\w+\]/gi, '').trim();
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
