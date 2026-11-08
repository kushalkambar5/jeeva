import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  recordEpisodicEvent,
  applyRelationshipDelta,
  resolveActiveUserId,
} from '@/lib/memory';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const json = await req.json();

    const npcId = json.npcId;
    const event = json.event;
    const respectDelta = typeof json.respectDelta === 'number' ? json.respectDelta : 0;
    const trustDelta = typeof json.trustDelta === 'number' ? json.trustDelta : 0;

    if (!npcId || !event) {
      return NextResponse.json(
        { error: 'npcId and event description are required' },
        { status: 400 }
      );
    }

    const userId = await resolveActiveUserId(
      session?.user ? (session.user as { id?: string }).id : undefined
    );

    // Record to Mem0 Episodic Memory
    await recordEpisodicEvent(userId, npcId, {
      content: event,
      importance: 4,
      emotionalValence: -2,
    });

    // Update relationship if deltas provided
    if (respectDelta !== 0 || trustDelta !== 0) {
      await applyRelationshipDelta(userId, npcId, {
        respect: respectDelta,
        trust: trustDelta,
      });
    }

    return NextResponse.json({ success: true, npcId, userId });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error logging memory event:', errorMsg);
    return NextResponse.json(
      { error: 'MEMORY_EVENT_FAILED', message: errorMsg },
      { status: 500 }
    );
  }
}
