import { NextRequest, NextResponse } from 'next/server';
import { getNPCTraits, generateNPCDialogue } from '@/lib/npcDialogue';
import { transcribeAudio, synthesizeSpeech, normalizeLanguageCode } from '@/lib/gnani';

// Configured threshold radius for speaking with an NPC in pixels
export const TALK_THRESHOLD_RADIUS = 60;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let npcId = '';
    let playerDistance: number | undefined;
    let language = 'auto';
    let messageText = '';
    let audioFile: Blob | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      npcId = (formData.get('npcId') as string) || '';
      language = (formData.get('language') as string) || 'auto';
      messageText = (formData.get('message') as string) || '';
      const distStr = formData.get('playerDistance') as string;
      if (distStr) {
        playerDistance = parseFloat(distStr);
      }
      const file = formData.get('audio');
      if (file && typeof file === 'object' && 'arrayBuffer' in file) {
        audioFile = file as Blob;
      }
    } else {
      const json = await req.json();
      npcId = json.npcId || '';
      language = json.language || 'auto';
      messageText = json.message || '';
      playerDistance = json.playerDistance;
    }

    if (!npcId) {
      return NextResponse.json(
        { error: 'npcId is required' },
        { status: 400 }
      );
    }

    // Constraint 1: Strict Threshold Radius Check
    if (playerDistance !== undefined && playerDistance > TALK_THRESHOLD_RADIUS) {
      return NextResponse.json(
        {
          error: 'OUT_OF_RANGE',
          message: `Player is outside the threshold radius (${playerDistance.toFixed(1)}px > ${TALK_THRESHOLD_RADIUS}px). Move closer to talk.`,
          thresholdRadius: TALK_THRESHOLD_RADIUS,
          currentDistance: playerDistance,
        },
        { status: 403 }
      );
    }

    // Constraint 3: NPC context bounded ONLY to traits in NPC_definitions table
    const traits = await getNPCTraits(npcId);
    if (!traits) {
      return NextResponse.json(
        { error: `NPC definition for '${npcId}' not found in NPC_definitions.` },
        { status: 404 }
      );
    }

    // 1. Process Voice Input via Gnani STT (if audio was uploaded)
    let transcribedText = messageText;
    let detectedLang = language;

    if (audioFile) {
      const audioBytes = await audioFile.arrayBuffer();
      const sttResult = await transcribeAudio(audioBytes, {
        languageCode: language,
      });

      if (sttResult.success && sttResult.transcript && sttResult.transcript.trim()) {
        transcribedText = sttResult.transcript.trim();
        if (sttResult.detectedLanguage) {
          detectedLang = sttResult.detectedLanguage;
        }
      } else {
        console.warn('STT could not transcribe audio:', sttResult.error);
        if (!transcribedText) {
          return NextResponse.json(
            {
              error: 'STT_FAILED',
              message:
                sttResult.error ||
                'No speech was detected. Please speak closer to your microphone or type your message.',
              details: sttResult.error,
            },
            { status: 400 }
          );
        }
      }
    }

    if (!transcribedText || !transcribedText.trim()) {
      return NextResponse.json(
        { error: 'Message or audio input is required to talk with the NPC.' },
        { status: 400 }
      );
    }

    // Normalize and auto-detect the language
    const resolvedLanguage = normalizeLanguageCode(
      detectedLang !== 'auto' ? detectedLang : undefined,
      transcribedText
    );

    // 2. Generate NPC reply strictly using the NPC's traits (stateless, no memory)
    const dialogueResult = await generateNPCDialogue(
      traits,
      transcribedText,
      resolvedLanguage
    );

    // 3. Synthesize spoken audio for the NPC reply via Gnani TTS (Timbre v2.5)
    let audioBase64: string | null = null;
    let ttsLatencyMs = 0;
    try {
      const ttsStart = Date.now();
      const ttsResult = await synthesizeSpeech(dialogueResult.replyText, {
        voice: dialogueResult.voice,
        language: dialogueResult.language,
      });
      ttsLatencyMs = Date.now() - ttsStart;
      if (ttsResult.success && ttsResult.audioBase64) {
        audioBase64 = ttsResult.audioBase64;
        console.log(`[Gnani TTS] Voice audio generated for ${traits.name} (${dialogueResult.voice}, ${ttsLatencyMs}ms)`);
      }
    } catch (ttsErr) {
      console.warn('Gnani TTS synthesis error (continuing with text):', ttsErr);
    }

    return NextResponse.json({
      success: true,
      npcId: traits.id,
      npcName: traits.name,
      npcRole: traits.role,
      playerText: transcribedText,
      replyText: dialogueResult.replyText,
      language: dialogueResult.language,
      voice: dialogueResult.voice,
      audioBase64,
      thresholdRadius: TALK_THRESHOLD_RADIUS,
      playerDistance,
      toolCall: dialogueResult.toolCall
        ? {
            tool: dialogueResult.toolCall,
            targetNpcId: traits.id,
            targetNpcName: traits.name,
          }
        : null,
      apiDetails: {
        llmModel: dialogueResult.modelUsed,
        llmLatencyMs: dialogueResult.latencyMs,
        ttsVoice: dialogueResult.voice,
        ttsLatencyMs,
        isVoiceInput: Boolean(audioFile),
      },
      traitsSummary: {
        personality: traits.personality_traits,
        speakingStyle: traits.speaking_style,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('API /api/npc/talk error:', errorMsg);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: errorMsg },
      { status: 500 }
    );
  }
}
