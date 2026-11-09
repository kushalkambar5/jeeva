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
  if (!text || !text.trim()) return 'en-IN';

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

  // 2. Romanized / Transliterated Distinctive Keywords
  const englishRegex = /\b(the|this|that|these|those|is|are|am|was|were|have|has|had|can|could|would|should|will|shall|what|where|when|which|who|whom|whose|why|how|do|does|did|give|tell|show|bring|take|help|please|thank|thanks|sorry|buy|sell|price|cost|item|items|money|canister|canisters|coil|spool|wire|tool|tools|shop|shopkeeper|merchant|mechanic|doctor|farmer|elder|wife|husband|generator|battery|village|road|bridge|river|crop|crops|house|home|you|your|yours|my|mine|me|we|our|ours|us|they|them|their|he|him|his|she|her|it|its|there|here|with|without|from|about|into|over|after|before|need|want|like|know|think|see|look|listen|stop|wait|stay|follow|come|go|run|talk|speak|friend|bro|brother|sir|madam|hello|hey|hi)\b/gi;

  const hindiRegex = /\b(namaste|namaskar|kaisa|kaise|kaisi|kahan|kyun|aap|aapko|aapka|aapke|aapki|tum|tumhara|tumko|mujhe|mera|mere|meri|hum|hamara|bhai|bhaiya|chahiye|kitna|kitne|kitni|rupaye|paise|sasta|mehenga|samaan|dukan|kharidna|bechna|dedo|lelo|rakh|rakho|batao|suno|dekho|theek|achha|accha|shukriya|dhanyavad|kya|haan|nahi|mat|karo|karte|karna|mitti|dibba|dibbe|tel|gaon|pani|khet|fasal|kheti|bijli|khana|jao|aao|chalo|yahan|wahan|idhar|udhar|kyon|samajh|bolo|boliye|hoga|honge|hogi|hai|hain)\b/gi;

  const kannadaRegex = /\b(namaskara|hegiddira|hegidiya|enu|yenu|beku|beda|kodi|kodtira|kodtini|eshtu|este|bele|tumba|chennagi|chennagide|haudu|illa|oota|banni|hogi|nanna|nimma|yaake|yaaru|ellige|elli)\b/gi;

  const tamilRegex = /\b(vanakkam|eppadi|irukkeenga|irukken|venum|vendaam|kudunga|kodu|evvalavu|nalla|nallaa|aama|illai|romba|vaanga|ponga|enga|ennathu|yaar|epdi|sollinga|theriyum)\b/gi;

  const teluguRegex = /\b(namaskaram|ela|unnaru|unnanu|kavali|vaddu|ivvandi|entha|bagundi|avunu|ledu|randi|vellandi|meeru|nenu|cheppandi|ekkada|evaru|enduku|kaavalenu)\b/gi;

  const marathiRegex = /\b(namaskar|kasa|kase|aahat|kay|ahe|ahet|pahije|nako|dya|kiti|chhan|ho|aamhi|tumhi|kuthe|kon|kashala)\b/gi;

  const engMatches = text.match(englishRegex)?.length || 0;
  const hinMatches = text.match(hindiRegex)?.length || 0;
  const kanMatches = text.match(kannadaRegex)?.length || 0;
  const tamMatches = text.match(tamilRegex)?.length || 0;
  const telMatches = text.match(teluguRegex)?.length || 0;
  const marMatches = text.match(marathiRegex)?.length || 0;

  if (kanMatches > 0 && kanMatches >= engMatches) return 'kn-IN';
  if (tamMatches > 0 && tamMatches >= engMatches) return 'ta-IN';
  if (telMatches > 0 && telMatches >= engMatches) return 'te-IN';
  if (marMatches > 0 && marMatches >= engMatches) return 'mr-IN';
  if (hinMatches > 0 && hinMatches >= engMatches) return 'hi-IN';
  if (engMatches > 0) return 'en-IN';

  return 'en-IN';
}

/**
 * Advanced AI-Powered Language Identifier.
 * Checks script and vocabulary first (<1ms), and uses ultra-fast Groq LLM (qwen/qwen3.8-27b) for ambiguous phrases.
 */
export async function detectLanguageWithAI(text: string): Promise<string> {
  if (!text || !text.trim()) return 'en-IN';

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
  if (heuristicLang !== 'en-IN') {
    return heuristicLang;
  }

  // If text already has clear English markers, return en-IN immediately without extra latency
  const englishMarkerRegex = /\b(the|this|that|is|are|am|was|were|have|has|had|can|could|would|should|will|what|where|when|which|who|why|how|do|does|did|give|tell|help|please|buy|sell|price|item|items|shop|mechanic|doctor|farmer|wife|husband|generator|you|your|my|me|we|they|hello|hey|hi)\b/i;
  if (englishMarkerRegex.test(text)) {
    return 'en-IN';
  }

  // For ambiguous mixed or transliterated sentences, query fast Groq model (qwen/qwen3.8-27b)
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (groqApiKey && text.length > 3) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [
            {
              role: 'system',
              content:
                'You are an accurate language identifier. Classify the user text into exactly one BCP-47 tag from: en-IN (English), hi-IN (Hindi/Hinglish), te-IN (Telugu), ta-IN (Tamil), kn-IN (Kannada), mr-IN (Marathi), bn-IN (Bengali), gu-IN (Gujarati), pa-IN (Punjabi), ml-IN (Malayalam), ur-IN (Urdu). If the text is in English, you MUST classify it as en-IN. Reply with ONLY the BCP-47 tag and nothing else.',
            },
            { role: 'user', content: text },
          ],
          temperature: 0,
          max_tokens: 15,
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
  // If fallbackText has clear English or script markers, don't let a faulty STT code override it!
  if (fallbackText && fallbackText.trim()) {
    const textLang = detectLanguageFromText(fallbackText);
    if (textLang === 'en-IN' || /[\u0C80-\u0CFF\u0B80-\u0BFF\u0C00-\u0C7F\u0900-\u097F]/.test(fallbackText)) {
      return textLang;
    }
  }

  if (!code || code === 'auto' || code === 'indic-auto') {
    return fallbackText ? detectLanguageFromText(fallbackText) : 'en-IN';
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

  return map[clean] || (fallbackText ? detectLanguageFromText(fallbackText) : 'en-IN');
}

/**
 * Transcribes audio buffer using Gnani AI STT (Prisma v3.0 / v2.5)
 */
export async function transcribeAudio(
  audioBytes: ArrayBuffer | Uint8Array | Buffer,
  options: TranscribeOptions = {}
): Promise<TranscribeResult> {
  const apiKey = GNANI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY?.trim();

  // 1. Primary Attempt: Sovereign Indian-language STT via Gnani AI Prisma v3.0
  if (apiKey) {
    try {
      const formData = new FormData();
      const blob = new Blob([audioBytes as unknown as BlobPart], { type: 'audio/wav' });
      formData.append('audio_file', blob, 'audio.wav');
      formData.append('model', options.model || 'prisma-v3.0');

      // Prisma v3.0 allows up to 4 comma-separated language candidates.
      // We pass the top 4 candidate languages including Indian English so English speech is accurately recognized!
      const langCode =
        options.languageCode && options.languageCode !== 'auto' && options.languageCode !== 'indic-auto'
          ? options.languageCode
          : 'en-IN,hi-IN,te-IN,ta-IN';
      formData.append('language_code', langCode);

      const response = await fetch(GNANI_STT_URL, {
        method: 'POST',
        headers: {
          'X-API-Key-ID': apiKey,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const transcript = data.transcript?.trim() || '';
        if (transcript) {
          return {
            success: true,
            transcript,
            detectedLanguage: data.detected_language_code,
            latency: data.end_to_end_latency,
          };
        }
      } else {
        const errorText = await response.text();
        console.warn('Gnani STT returned error response:', response.status, errorText);
      }
    } catch (gnaniErr) {
      console.warn('Gnani STT request failure:', gnaniErr);
    }
  }

  // 2. High-Accuracy Multilingual Fallback: Groq Whisper Large v3 Turbo
  if (groqApiKey) {
    try {
      const groqFormData = new FormData();
      const blob = new Blob([audioBytes as unknown as BlobPart], { type: 'audio/wav' });
      groqFormData.append('file', blob, 'audio.wav');
      groqFormData.append('model', 'whisper-large-v3-turbo');
      groqFormData.append('response_format', 'verbose_json');

      const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}` },
        body: groqFormData,
      });

      if (whisperRes.ok) {
        const whisperData = await whisperRes.json();
        const transcript = whisperData.text?.trim() || '';
        const whisperLang = whisperData.language?.toLowerCase();
        let detectedLanguage: string | undefined;
        if (whisperLang === 'english') detectedLanguage = 'en-IN';
        else if (whisperLang === 'hindi') detectedLanguage = 'hi-IN';
        else if (whisperLang === 'telugu') detectedLanguage = 'te-IN';
        else if (whisperLang === 'tamil') detectedLanguage = 'ta-IN';
        else if (whisperLang === 'kannada') detectedLanguage = 'kn-IN';

        if (transcript) {
          console.log(`[STT Fallback -> Groq Whisper] Transcribed: "${transcript}" (Lang: ${detectedLanguage || whisperLang})`);
          return {
            success: true,
            transcript,
            detectedLanguage,
          };
        }
      }
    } catch (whisperErr) {
      console.warn('Groq Whisper fallback failed:', whisperErr);
    }
  }

  return {
    success: false,
    transcript: '',
    error: 'Speech recognition failed on both Gnani STT and Whisper fallback.',
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
