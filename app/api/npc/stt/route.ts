import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/gnani';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio') as Blob | null;
    const languageCode = (formData.get('language') as string) || 'indic-auto';

    if (!file) {
      return NextResponse.json(
        { error: 'Audio file is required in "audio" form field' },
        { status: 400 }
      );
    }

    const audioBytes = await file.arrayBuffer();
    const result = await transcribeAudio(audioBytes, { languageCode });

    if (!result.success) {
      return NextResponse.json(
        { error: 'STT_FAILED', details: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      detectedLanguage: result.detectedLanguage,
      latency: result.latency,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: errorMsg },
      { status: 500 }
    );
  }
}
