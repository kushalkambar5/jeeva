import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/gnani';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const text = json.text;
    const voice = json.voice || 'Nalini';
    const language = json.language || 'hi-IN';

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Text is required for TTS synthesis' },
        { status: 400 }
      );
    }

    const result = await synthesizeSpeech(text, { voice, language });

    if (!result.success) {
      return NextResponse.json(
        { error: 'TTS_FAILED', details: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      audioBase64: result.audioBase64,
      contentType: result.contentType,
      voice: result.voice,
      language: result.language,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: errorMsg },
      { status: 500 }
    );
  }
}
