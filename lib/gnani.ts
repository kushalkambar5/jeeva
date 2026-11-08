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
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'; // Telugu
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN'; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN'; // Malayalam
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'; // Bengali
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN'; // Gujarati
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN'; // Punjabi
  if (/[\u0900-\u097F]/.test(text)) {
    if (/\b(aahe|ahet|kay|kasa|kashi|namaskar|aamhi)\b/i.test(text)) {
      return 'mr-IN'; // Marathi
    }
    return 'hi-IN'; // Hindi (Devanagari)
  }

  // Latin script (English or transliterated Hindi)
  const hindiKeywords = /\b(namaste|namaskar|kaise|kaisa|kahan|kyun|aap|bhai|gaon|pani|khet|theek|achha|accha|shukriya|dhanyavad|kya|haan|nahi|karo|batao)\b/i;
  if (hindiKeywords.test(text)) {
    return 'hi-IN';
  }

  if (/[a-zA-Z]/.test(text)) {
    return 'en-IN';
  }

  return 'hi-IN';
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
