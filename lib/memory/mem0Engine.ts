/**
 * Core Mem0 Memory Engine for Jeeva
 * Implements Working, Episodic, Relational, and Semantic memory with PostgreSQL & Vector Embeddings.
 */

import { db } from '@/db';
import {
  users,
  npcMemories,
  npcRelationships,
  npcWorkingMemories,
  type NPCMemory,
  type NPCRelationship,
} from '@/db/schema';
import { eq, and, or, isNull, desc, asc } from 'drizzle-orm';
import { generateEmbedding, cosineSimilarity } from './embeddings';
import {
  FullNPCMemoryContext,
  NPCRelationshipState,
  RelationshipTier,
  RetrievedMemoryItem,
  WorkingMemoryTurn,
  RelationshipDeltas,
} from './types';

/**
 * Resolves the active user ID from NextAuth session, request param, or existing player in DB.
 */
export async function resolveActiveUserId(
  sessionUserId?: string,
  requestedUserId?: string
): Promise<string> {
  const targetId = sessionUserId || requestedUserId;
  if (targetId) {
    try {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, targetId))
        .limit(1);
      if (user) return user.id;
    } catch {
      // Ignore uuid formatting error and fall through
    }
  }

  // Fallback: Use first player account in DB
  const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
  if (firstUser) return firstUser.id;

  // If DB is completely empty, create default traveler account
  const [created] = await db
    .insert(users)
    .values({
      name: 'Traveler',
      email: 'traveler@jeeva.game',
      passwordHash: 'guest_nologin',
    })
    .returning({ id: users.id });

  return created.id;
}

/**
 * Calculates the categorical relationship tier based on multi-dimensional scores.
 */
export function calculateRelationshipTier(
  trust: number,
  affection: number,
  respect: number,
  fear: number,
  familiarity: number
): RelationshipTier {
  if (trust <= -60 || affection <= -60) return 'hostile_outcast';
  if (trust <= -20) return 'distrusted_opportunist';
  if (trust >= 40 && affection >= 30) return 'trusted_friend';
  if (respect >= 50 && trust >= 10) return 'respected_partner';
  if (familiarity >= 15) return 'acquaintance';
  return 'stranger';
}

/**
 * Retrieves or initializes the psychological relationship for a (userId, npcId) pair.
 */
export async function getOrCreateRelationship(
  userId: string,
  npcId: string
): Promise<NPCRelationshipState> {
  const [existing] = await db
    .select()
    .from(npcRelationships)
    .where(and(eq(npcRelationships.userId, userId), eq(npcRelationships.npcId, npcId)))
    .limit(1);

  if (existing) {
    const tier = calculateRelationshipTier(
      existing.trust,
      existing.affection,
      existing.respect,
      existing.fear,
      existing.familiarity
    );
    return {
      trust: existing.trust,
      affection: existing.affection,
      respect: existing.respect,
      fear: existing.fear,
      familiarity: existing.familiarity,
      relationshipTier: tier,
      interactionCount: existing.interactionCount,
    };
  }

  // Initialize new relationship (Wife starts with deep devotion; others as stranger)
  const isWife = npcId === 'priya_wife';
  const initialTier: RelationshipTier = isWife ? 'trusted_friend' : 'stranger';
  const initialTrust = isWife ? 85 : 0;
  const initialAffection = isWife ? 90 : 0;
  const initialRespect = isWife ? 80 : 0;
  const initialFamiliarity = isWife ? 95 : 0;

  await db
    .insert(npcRelationships)
    .values({
      userId,
      npcId,
      trust: initialTrust,
      affection: initialAffection,
      respect: initialRespect,
      fear: 0,
      familiarity: initialFamiliarity,
      relationshipTier: initialTier,
      interactionCount: 0,
    })
    .onConflictDoNothing();

  return {
    trust: initialTrust,
    affection: initialAffection,
    respect: initialRespect,
    fear: 0,
    familiarity: initialFamiliarity,
    relationshipTier: initialTier,
    interactionCount: 0,
  };
}

/**
 * Applies delta adjustments to an NPC's relationship metrics with a player.
 */
export async function applyRelationshipDelta(
  userId: string,
  npcId: string,
  deltas: RelationshipDeltas
): Promise<NPCRelationshipState> {
  const current = await getOrCreateRelationship(userId, npcId);

  const clamp = (val: number, min: number, max: number) =>
    Math.min(Math.max(val, min), max);

  const newTrust = clamp(current.trust + (deltas.trust || 0), -100, 100);
  const newAffection = clamp(current.affection + (deltas.affection || 0), -100, 100);
  const newRespect = clamp(current.respect + (deltas.respect || 0), -100, 100);
  const newFear = clamp(current.fear + (deltas.fear || 0), 0, 100);
  const newFamiliarity = clamp(current.familiarity + (deltas.familiarity || 0), 0, 100);
  const newCount = current.interactionCount + 1;

  const newTier = calculateRelationshipTier(
    newTrust,
    newAffection,
    newRespect,
    newFear,
    newFamiliarity
  );

  await db
    .update(npcRelationships)
    .set({
      trust: newTrust,
      affection: newAffection,
      respect: newRespect,
      fear: newFear,
      familiarity: newFamiliarity,
      relationshipTier: newTier,
      interactionCount: newCount,
      updatedAt: new Date(),
    })
    .where(and(eq(npcRelationships.userId, userId), eq(npcRelationships.npcId, npcId)));

  return {
    trust: newTrust,
    affection: newAffection,
    respect: newRespect,
    fear: newFear,
    familiarity: newFamiliarity,
    relationshipTier: newTier,
    interactionCount: newCount,
  };
}

/**
 * Records a single turn in working memory.
 */
export async function recordWorkingMemoryTurn(
  userId: string,
  npcId: string,
  role: 'user' | 'assistant' | 'action',
  content: string,
  sessionId?: string
): Promise<void> {
  await db.insert(npcWorkingMemories).values({
    userId,
    npcId,
    role,
    content,
    sessionId: sessionId || null,
  });
}

/**
 * Records an episodic past event memory with a 768-dim vector embedding.
 */
export async function recordEpisodicEvent(
  userId: string,
  npcId: string,
  params: {
    content: string;
    importance?: number;
    emotionalValence?: number;
    metadata?: Record<string, any>;
    sessionId?: string;
  }
): Promise<string> {
  const embedding = await generateEmbedding(params.content);
  const [created] = await db
    .insert(npcMemories)
    .values({
      userId,
      npcId,
      memoryType: 'episodic',
      content: params.content,
      embedding,
      importance: params.importance ?? 6,
      emotionalValence: params.emotionalValence ?? 0,
      metadata: params.metadata || {},
      sessionId: params.sessionId || null,
    })
    .returning({ id: npcMemories.id });

  return created.id;
}

/**
 * Records a persistent semantic fact or world lore entry.
 * If userId is undefined, it becomes universal village lore known by this NPC.
 */
export async function recordSemanticFact(
  npcId: string,
  fact: string,
  userId?: string,
  importance?: number
): Promise<string> {
  const embedding = await generateEmbedding(fact);
  const [created] = await db
    .insert(npcMemories)
    .values({
      userId: userId || null,
      npcId,
      memoryType: 'semantic',
      content: fact,
      embedding,
      importance: importance ?? 7,
      emotionalValence: 0,
      metadata: { is_global: !userId },
    })
    .returning({ id: npcMemories.id });

  return created.id;
}

/**
 * Retrieves the full cognitive memory context for an active conversation turn.
 */
export async function getNPCFullMemoryContext(
  userId: string,
  npcId: string,
  currentMessage?: string,
  sessionId?: string
): Promise<FullNPCMemoryContext> {
  // 1. Fetch Relational State
  const relationship = await getOrCreateRelationship(userId, npcId);

  // 2. Fetch Working Memory (Last 6 turns)
  const workingTurns = await db
    .select()
    .from(npcWorkingMemories)
    .where(and(eq(npcWorkingMemories.userId, userId), eq(npcWorkingMemories.npcId, npcId)))
    .orderBy(desc(npcWorkingMemories.createdAt))
    .limit(6);

  // Reverse so they read in chronological order (earliest to latest)
  const chronologicalWorking: WorkingMemoryTurn[] = workingTurns
    .reverse()
    .map((t) => ({
      role: t.role as 'user' | 'assistant' | 'action',
      content: t.content,
      createdAt: t.createdAt,
    }));

  // 3. Vector Similarity Search for Episodic & Semantic Memories
  let queryEmbedding: number[] | null = null;
  if (currentMessage && currentMessage.trim()) {
    queryEmbedding = await generateEmbedding(currentMessage);
  }

  // Fetch candidates: player-specific memories OR universal world lore (userId IS NULL)
  const memoryCandidates = await db
    .select()
    .from(npcMemories)
    .where(
      and(
        eq(npcMemories.npcId, npcId),
        or(eq(npcMemories.userId, userId), isNull(npcMemories.userId))
      )
    );

  const now = Date.now();
  const scoredMemories: RetrievedMemoryItem[] = memoryCandidates.map((m) => {
    let sim = 0.5; // Baseline if no message was provided
    if (queryEmbedding && Array.isArray(m.embedding)) {
      sim = cosineSimilarity(queryEmbedding, m.embedding);
    }

    // Mem0 Hybrid Ranking: 60% similarity + 20% importance + 20% recency
    const ageHours = (now - new Date(m.createdAt).getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - ageHours / (24 * 7)); // Decays over 7 days
    const importanceScore = (m.importance || 5) / 10;

    const hybridScore = 0.6 * Math.max(0, sim) + 0.2 * importanceScore + 0.2 * recencyScore;

    return {
      id: m.id,
      memoryType: m.memoryType as 'episodic' | 'semantic',
      content: m.content,
      importance: m.importance,
      emotionalValence: m.emotionalValence || 0,
      similarity: hybridScore,
      createdAt: m.createdAt,
      isGlobal: m.userId === null,
    };
  });

  // Sort descending by hybrid rank
  scoredMemories.sort((a, b) => b.similarity - a.similarity);

  // Top 3 Episodic and Top 3 Semantic
  const episodicMemories = scoredMemories
    .filter((m) => m.memoryType === 'episodic')
    .slice(0, 3);

  const semanticMemories = scoredMemories
    .filter((m) => m.memoryType === 'semantic')
    .slice(0, 3);

  return {
    userId,
    npcId,
    relationship,
    workingMemory: chronologicalWorking,
    episodicMemories,
    semanticMemories,
  };
}

/**
 * Post-Turn Lifecycle:
 * 1. Appends user & NPC turns to working memory.
 * 2. Updates relationship metrics based on tool calls / interactions.
 * 3. Runs an asynchronous Mem0 extraction to store new memories if significant.
 */
export async function processDialogueMem0Lifecycle(params: {
  userId: string;
  npcId: string;
  userMessage: string;
  npcReply: string;
  toolCall?: {
    tool: string;
    itemId?: string;
    itemName?: string;
    price?: number;
    quantity?: number;
  };
  sessionId?: string;
}): Promise<void> {
  const { userId, npcId, userMessage, npcReply, toolCall, sessionId } = params;

  // 1. Commit both turns to Working Memory
  await recordWorkingMemoryTurn(userId, npcId, 'user', userMessage, sessionId);
  await recordWorkingMemoryTurn(userId, npcId, 'assistant', npcReply, sessionId);

  // 2. Incremental Familiarity
  const relationshipDeltas: RelationshipDeltas = { familiarity: 1 };

  // 3. Handle Tool Events (Trades, Quests, Following)
  if (toolCall) {
    if (toolCall.tool === 'trade_deal') {
      const itemDesc = toolCall.itemName || toolCall.itemId || 'goods';
      const qty = typeof toolCall.quantity === 'number' && toolCall.quantity > 0 ? toolCall.quantity : 1;
      const eventContent = `Sold ${qty > 1 ? `${qty}x ` : ''}${itemDesc} to the player for ₹${toolCall.price} after bargaining.`;
      await recordEpisodicEvent(userId, npcId, {
        content: eventContent,
        importance: 8,
        emotionalValence: 25,
        metadata: { tool: 'trade_deal', item: toolCall.itemId, price: toolCall.price, quantity: qty },
        sessionId,
      });

      // Successful trade increases trust and affection
      relationshipDeltas.trust = (relationshipDeltas.trust || 0) + 6;
      relationshipDeltas.affection = (relationshipDeltas.affection || 0) + 4;
      relationshipDeltas.respect = (relationshipDeltas.respect || 0) + 3;
    } else if (toolCall.tool === 'follow_player') {
      await recordEpisodicEvent(userId, npcId, {
        content: `Agreed to step outside and follow the player around Kaveripura.`,
        importance: 5,
        emotionalValence: 15,
        sessionId,
      });
      relationshipDeltas.trust = (relationshipDeltas.trust || 0) + 2;
      relationshipDeltas.affection = (relationshipDeltas.affection || 0) + 2;
    } else if (toolCall.tool === 'stop_following' || toolCall.tool === 'go_home') {
      relationshipDeltas.trust = (relationshipDeltas.trust || 0) + 1;
    }
  }

  // Apply Relationship Updates
  await applyRelationshipDelta(userId, npcId, relationshipDeltas);

  // 4. Background Mem0 Fact / Memory Extraction via Groq
  extractAndCommitDialogueMemories(userId, npcId, userMessage, npcReply).catch((err) => {
    console.warn('[Mem0 Extraction] Background memory extraction skipped/failed:', err);
  });
}

/**
 * Runs an asynchronous LLM extraction to identify if a significant episodic moment
 * or durable semantic fact about the player was revealed in this turn.
 */
async function extractAndCommitDialogueMemories(
  userId: string,
  npcId: string,
  userMessage: string,
  npcReply: string
): Promise<void> {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (!groqApiKey) return;

  // Filter out short trivial greetings
  if (userMessage.length < 15 && !userMessage.match(/\b(promise|rupee|money|buy|sell|help|doctor|name|police)\b/i)) {
    return;
  }

  const prompt = `Analyze this dialogue exchange between a Player and village NPC in Kaveripura:
Player: "${userMessage}"
NPC: "${npcReply}"

Did the player reveal a durable personal fact (e.g. name, job, family, intention, preference) or make a significant promise/agreement?
If YES, output ONLY a valid JSON object matching:
{
  "hasMemory": true,
  "memoryType": "episodic" or "semantic",
  "content": "A single concise factual sentence in third person about the player",
  "importance": number between 4 and 9
}
If NO significant information was shared (e.g. casual small talk, simple greeting), output:
{ "hasMemory": false }`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 150,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) return;

    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');

    if (parsed.hasMemory && parsed.content && parsed.content.trim()) {
      const type = parsed.memoryType === 'semantic' ? 'semantic' : 'episodic';
      const embedding = await generateEmbedding(parsed.content.trim());

      await db.insert(npcMemories).values({
        userId,
        npcId,
        memoryType: type,
        content: parsed.content.trim(),
        embedding,
        importance: parsed.importance || 5,
        emotionalValence: 0,
        metadata: { auto_extracted: true },
      });

      console.log(`[Mem0] Extracted & saved ${type} memory for NPC '${npcId}': "${parsed.content.trim()}"`);
    }
  } catch {
    // Non-blocking background worker
  }
}
