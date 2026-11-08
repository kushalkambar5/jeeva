/**
 * Gnani AI (Vachana) Integration Helper
 * Provides Speech-to-Text (STT) via Prisma and Text-to-Speech (TTS) via Timbre.
 */

const GNANI_API_KEY = process.env.GNANI_API_KEY || '';
const GNANI_STT_URL = 'https://api.vachana.ai/stt/v3';
const GNANI_TTS_URL = 'https://api.vachana.ai/api/v1/tts/inference';

export interface TranscribeOptions {
  languageCode?: string;
  model?: string;
}

export interface TranscribeResult {
  success: boolean;
  transcript: string;
  detectedLanguage?: string;
  latency?: number;
  error?: string;
}

export interface SynthesizeOptions {
  voice?: string;
  language?: string;
  speed?: number;
}

export interface SynthesizeResult {
  success: boolean;
  audioBuffer?: ArrayBuffer;
  audioBase64?: string;
  contentType: string;
  voice: string;
  language: string;
  error?: string;
}

/**
 * Detects the language from Indic unicode script or script analysis
 */
export function detectLanguageFromText(text: string): string {
  if (!text) return 'hi-IN';

  // 1. Explicit Indic Unicode Scripts (Unambiguous)
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN'; // Kannada
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'; // Telugu
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN'; // Malayalam
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'; // Bengali
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN'; // Gujarati
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN'; // Punjabi
  if (/[\u0600-\u06FF]/.test(text)) return 'ur-IN'; // Urdu / Arabic script
  if (/[\u0900-\u097F]/.test(text)) {
    if (/\b(aahe|ahet|kay|kasa|kashi|namaskar|aamhi|pahije|dya)\b/i.test(text)) {
      return 'mr-IN'; // Marathi
    }
    return 'hi-IN'; // Hindi (Devanagari)
  }

  // 2. Romanized / Transliterated Indic Language Keywords
  const kannadaKeywords = /\b(namaskara|hegiddira|hegidiya|enu|yenu|beku|beda|kodi|kodtira|eshtu|este|bele|tumba|chennagi|chennagide|haudu|illa|oota|banni|hogi|nanna|nimma)\b/i;
  if (kannadaKeywords.test(text)) {
    return 'kn-IN';
  }

  const tamilKeywords = /\b(vanakkam|eppadi|irukkeenga|irukken|venum|vendaam|kudunga|kodu|evvalavu|nalla|nallaa|aama|illai|romba|vaanga|ponga|enga|ennathu)\b/i;
  if (tamilKeywords.test(text)) {
    return 'ta-IN';
  }

  const teluguKeywords = /\b(namaskaram|ela|unnaru|unnanu|kavali|vaddu|ivvandi|entha|bagundi|avunu|ledu|randi|vellandi|meeru|nenu)\b/i;
  if (teluguKeywords.test(text)) {
    return 'te-IN';
  }

  const marathiKeywords = /\b(namaskar|kasa|kase|aahat|kay|ahe|ahet|pahije|nako|dya|kiti|chhan|ho|aamhi|tumhi)\b/i;
  if (marathiKeywords.test(text)) {
    return 'mr-IN';
  }

  const hindiKeywords = /\b(namaste|namaskar|kaise|kaisa|kahan|kyun|aap|aapko|bhai|bhaiya|gaon|pani|khet|theek|achha|accha|shukriya|dhanyavad|kya|haan|nahi|karo|batao|chahiye|kitna|kitne|rupaye|paise|de|do|dedo|dena|le|lo|lelo|kharidna|bechna|sasta|mehenga|mitti|dibba|dibbe|tel|samaan|dukan|ghar|aur|lekin|bas|abhi)\b/i;
  if (hindiKeywords.test(text)) {
    return 'hi-IN';
  }

  // 3. Clear English Stopwords & Phrases
  const englishKeywords = /\b(the|this|that|these|those|is|are|was|were|have|has|want|buy|sell|give|can|could|would|please|how|much|what|which|where|when|who|hello|hey|shopkeeper|price|cost|item|items|quantity|canister|coil|spool)\b/i;
  if (englishKeywords.test(text) && !hindiKeywords.test(text) && !kannadaKeywords.test(text)) {
    return 'en-IN';
  }

  if (/[a-zA-Z]/.test(text)) {
    return 'hi-IN'; // Default Romanized Indian conversational speech to Hindi
  }

  return 'hi-IN';
}

/**
 * Advanced AI-Powered Language Identifier.
 * Checks script and vocabulary first (<1ms), and uses ultra-fast Groq LLM for ambiguous phrases.
 */
export async function detectLanguageWithAI(text: string): Promise<string> {
  if (!text || !text.trim()) return 'hi-IN';

  // Fast script check
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN';
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN';
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN';
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN';
  if (/[\u0600-\u06FF]/.test(text)) return 'ur-IN';
  if (/[\u0900-\u097F]/.test(text)) return detectLanguageFromText(text);

  // If text has obvious linguistic marker words, use heuristic
  const heuristicLang = detectLanguageFromText(text);
  if (heuristicLang !== 'hi-IN' || /\b(namaste|bhai|bhaiya|kya|aap|hai|chahiye|mitti|dibba|dedo)\b/i.test(text)) {
    return heuristicLang;
  }

  // For ambiguous mixed or transliterated sentences, query fast Groq model
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (groqApiKey && text.length > 5) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content:
                'You are a language classifier for Indian dialogue. Classify the user input into exactly one BCP-47 tag: hi-IN, en-IN, kn-IN, ta-IN, te-IN, mr-IN, bn-IN, gu-IN, pa-IN, ml-IN, ur-IN. Reply with ONLY the BCP-47 code and nothing else.',
            },
            { role: 'user', content: text },
          ],
          temperature: 0,
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawCode = data.choices?.[0]?.message?.content?.trim() || '';
        const match = rawCode.match(/(hi-IN|en-IN|kn-IN|ta-IN|te-IN|mr-IN|bn-IN|gu-IN|pa-IN|ml-IN|ur-IN)/i);
        if (match) {
          return match[1];
        }
      }
    } catch (err) {
      console.warn('[Language Detect AI] Groq fallback error:', err);
    }
  }

  return heuristicLang;
}

/**
 * Normalizes language codes from Gnani STT (e.g., 'hi', 'ta', 'indic-auto') into standard BCP-47 codes.
 */
export function normalizeLanguageCode(code?: string, fallbackText?: string): string {
  if (!code || code === 'auto' || code === 'indic-auto') {
    return fallbackText ? detectLanguageFromText(fallbackText) : 'hi-IN';
  }
  const clean = code.trim().toLowerCase();
  const map: Record<string, string> = {
    hi: 'hi-IN',
    'hi-in': 'hi-IN',
    en: 'en-IN',
    'en-in': 'en-IN',
    'en-us': 'en-IN',
    ta: 'ta-IN',
    'ta-in': 'ta-IN',
    te: 'te-IN',
    'te-in': 'te-IN',
    kn: 'kn-IN',
    'kn-in': 'kn-IN',
    mr: 'mr-IN',
    'mr-in': 'mr-IN',
    bn: 'bn-IN',
    'bn-in': 'bn-IN',
    gu: 'gu-IN',
    'gu-in': 'gu-IN',
    pa: 'pa-IN',
    'pa-in': 'pa-IN',
    ml: 'ml-IN',
    'ml-in': 'ml-IN',
    ur: 'ur-IN',
    'ur-in': 'ur-IN',
  };

  return map[clean] || (fallbackText ? detectLanguageFromText(fallbackText) : 'hi-IN');
}

/**
 * Transcribes audio buffer using Gnani AI STT (Prisma v3.0 / v2.5)
 */
export async function transcribeAudio(
  audioBytes: ArrayBuffer | Uint8Array | Buffer,
  options: TranscribeOptions = {}
): Promise<TranscribeResult> {
  const apiKey = GNANI_API_KEY;
  if (!apiKey) {
    throw new Error('GNANI_API_KEY is not configured in the environment.');
  }

  const formData = new FormData();
  const blob = new Blob([audioBytes as unknown as BlobPart], { type: 'audio/wav' });
  formData.append('audio_file', blob, 'audio.wav');
  formData.append('model', options.model || 'prisma-v3.0');

  // If specific language is provided, pass it; otherwise use auto-detection
  const langCode = options.languageCode && options.languageCode !== 'auto'
    ? options.languageCode
    : 'indic-auto';
  formData.append('language_code', langCode);

  const response = await fetch(GNANI_STT_URL, {
    method: 'POST',
    headers: {
      'X-API-Key-ID': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gnani STT error:', response.status, errorText);
    return {
      success: false,
      transcript: '',
      error: `STT error (${response.status}): ${errorText}`,
    };
  }

  const data = await response.json();
  return {
    success: true,
    transcript: data.transcript || '',
    detectedLanguage: data.detected_language_code,
    latency: data.end_to_end_latency,
  };
}

/**
 * Synthesizes text into spoken audio using Gnani AI TTS (Timbre v2.5)
 */
export async function synthesizeSpeech(
  text: string,
  options: SynthesizeOptions = {}
): Promise<SynthesizeResult> {
  const apiKey = GNANI_API_KEY;
  if (!apiKey) {
    throw new Error('GNANI_API_KEY is not configured in the environment.');
  }

  const voice = options.voice || 'Nalini';
  const language = options.language || 'hi-IN';
  const speed = options.speed || 1;

  const payload = {
    text: text.trim(),
    voice,
    model: 'timbre-v2.5',
    language,
    speed,
    audio_config: {
      encoding: 'linear_pcm',
      container: 'wav',
      num_channels: 1,
      sample_rate: 16000,
      sample_width: 2,
    },
  };

  const response = await fetch(GNANI_TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key-ID': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gnani TTS error:', response.status, errorText);
    return {
      success: false,
      contentType: 'audio/wav',
      voice,
      language,
      error: `TTS error (${response.status}): ${errorText}`,
    };
  }

  const arrayBuf = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuf).toString('base64');

  return {
    success: true,
    audioBuffer: arrayBuf,
    audioBase64: base64,
    contentType: 'audio/wav',
    voice,
    language,
  };
}
