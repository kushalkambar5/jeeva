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
