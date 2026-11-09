import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getNPCTraits, generateNPCDialogue } from '@/lib/npcDialogue';
import {
  transcribeAudio,
  synthesizeSpeech,
  normalizeLanguageCode,
  detectLanguageWithAI,
} from '@/lib/gnani';
import {
  getNPCFullMemoryContext,
  processDialogueMem0Lifecycle,
  resolveActiveUserId,
} from '@/lib/memory';

// Configured threshold radius for speaking with an NPC in pixels
export const TALK_THRESHOLD_RADIUS = 60;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let npcId = '';
    let playerDistance: number | undefined;
    let language = 'auto';
    let messageText = '';
    let playerWallet: number | undefined;
    let requestedUserId = '';
    let sessionId = '';
    let audioFile: Blob | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      npcId = (formData.get('npcId') as string) || '';
      language = (formData.get('language') as string) || 'auto';
      messageText = (formData.get('message') as string) || '';
      requestedUserId = (formData.get('userId') as string) || '';
      sessionId = (formData.get('sessionId') as string) || '';
      const distStr = formData.get('playerDistance') as string;
      if (distStr) {
        playerDistance = parseFloat(distStr);
      }
      const walletStr = formData.get('playerWallet') as string;
      if (walletStr) {
        playerWallet = parseFloat(walletStr);
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
      playerWallet = json.playerWallet;
      requestedUserId = json.userId || '';
      sessionId = json.sessionId || '';
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
    let sttDetectedLang: string | undefined;

    if (audioFile) {
      const audioBytes = await audioFile.arrayBuffer();
      const sttResult = await transcribeAudio(audioBytes, {
        languageCode: language,
      });

      if (sttResult.success && sttResult.transcript && sttResult.transcript.trim()) {
        transcribedText = sttResult.transcript.trim();
        sttDetectedLang = sttResult.detectedLanguage;
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

    // Resolve Player Spoken/Written Language accurately:
    // If the player explicitly selected a specific target language (not 'auto' / 'indic-auto'), respect it.
    // In 'auto' mode (the default for voice chat and exploration), dynamically classify the player's actual words!
    let resolvedLanguage: string;
    if (language && language !== 'auto' && language !== 'indic-auto') {
      resolvedLanguage = normalizeLanguageCode(language, transcribedText);
    } else {
      resolvedLanguage = await detectLanguageWithAI(transcribedText);
    }

    console.log(`[Talk API] Player: "${transcribedText}" | STT Tag: ${sttDetectedLang || 'none'} | Resolved Lang: ${resolvedLanguage}`);

    // 2. Resolve Active Player Identity (Session or Request or Default Player)
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as any)?.id;
    const activeUserId = await resolveActiveUserId(sessionUserId, requestedUserId);

    // 3. Retrieve Mem0 Cognitive Context (Working, Episodic, Relational, Semantic)
    let memoryContext: any = null;
    try {
      memoryContext = await getNPCFullMemoryContext(
        activeUserId,
        traits.id,
        transcribedText,
        sessionId
      );
    } catch (memErr) {
      console.warn('[Mem0] Could not load memory context (continuing gracefully):', memErr);
    }

    // 4. Generate NPC reply with traits and personalized Mem0 context
    const dialogueResult = await generateNPCDialogue(
      traits,
      transcribedText,
      resolvedLanguage,
      playerWallet,
      memoryContext
    );

    // 5. Post-Dialogue Mem0 Lifecycle (Working memory append, relationship delta, memory extraction)
    processDialogueMem0Lifecycle({
      userId: activeUserId,
      npcId: traits.id,
      userMessage: transcribedText,
      npcReply: dialogueResult.replyText,
      toolCall: dialogueResult.toolCall,
      sessionId,
    }).catch((lifecycleErr) => {
      console.warn('[Mem0 Lifecycle] Background processing error:', lifecycleErr);
    });

    // 6. Synthesize spoken audio for the NPC reply via Gnani TTS (Timbre v2.5)
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
      memory: memoryContext
        ? {
            userId: activeUserId,
            relationshipTier: memoryContext.relationship.relationshipTier,
            trust: memoryContext.relationship.trust,
            affection: memoryContext.relationship.affection,
            respect: memoryContext.relationship.respect,
            familiarity: memoryContext.relationship.familiarity,
            recalledEpisodesCount: memoryContext.episodicMemories.length,
            recalledSemanticCount: memoryContext.semanticMemories.length,
            recalledEpisodes: memoryContext.episodicMemories.map((m: any) => m.content),
            recalledFacts: memoryContext.semanticMemories.map((m: any) => m.content),
          }
        : null,
      toolCall: dialogueResult.toolCall
        ? {
            tool: dialogueResult.toolCall.tool,
            targetNpcId: traits.id,
            targetNpcName: traits.name,
            itemId: dialogueResult.toolCall.itemId,
            itemName: dialogueResult.toolCall.itemName,
            price: dialogueResult.toolCall.price,
            quantity: dialogueResult.toolCall.quantity || 1,
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
