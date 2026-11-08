/**
 * Prompt Builder for NPC Memory Context
 * Compiles Working, Episodic, Relational, and Semantic memories into a compact LLM prompt block.
 */

import { FullNPCMemoryContext, RelationshipTier } from './types';

export function getRelationshipGuidance(tier: RelationshipTier, trust: number, npcName?: string): string {
  if (npcName === 'Priya') {
    return 'You are the player\'s devoted, playfully flirty, and loving wife. You adore your husband, tease him with charming romantic chemistry, banter affectionately, and share deep marital love and warmth.';
  }
  switch (tier) {
    case 'trusted_friend':
      return 'You consider this player a trusted, loyal friend. Greet them warmly, show genuine affection, and be willing to offer favors or fair bargains.';
    case 'respected_partner':
      return 'You hold high respect for this player as a capable and reliable person. Speak with professional esteem and cooperation.';
    case 'distrusted_opportunist':
      return 'You deeply distrust this player. Be guarded, curt, and suspicious of their intentions. Do not offer discounts or easily accept their claims.';
    case 'hostile_outcast':
      return 'You consider this player hostile or a threat to the village. Warn them to stay away or speak with cold hostility.';
    case 'acquaintance':
      return 'You recognize this player from around Kaveripura. Speak naturally with cordial village familiarity.';
    case 'stranger':
    default:
      return 'You do not know this player well yet. Speak politely, courteously, but maintain normal conversational boundaries as with any new visitor.';
  }
}

/**
 * Formats the memory block to inject into the NPC system prompt.
 * Kept concise (<300 tokens) to minimize latency and token consumption.
 */
export function buildMemoryPromptSection(context: FullNPCMemoryContext, npcName: string): string {
  const { relationship, workingMemory, episodicMemories, semanticMemories } = context;

  const guidance = getRelationshipGuidance(relationship.relationshipTier, relationship.trust, npcName);

  // 1. Relational Standing
  let relationalBlock = `
=== NPC MEMORY & PSYCHOLOGICAL RELATIONSHIP ===
YOUR STANDING TOWARD THIS PLAYER:
- Relationship: ${relationship.relationshipTier.toUpperCase().replace('_', ' ')} (Familiarity: ${relationship.familiarity}/100)
- Trust Score: ${relationship.trust > 0 ? '+' : ''}${relationship.trust} (-100 to +100)
- Emotional Tone Guidance: ${guidance}
`.trim();

  // 2. Episodic Memories (Past events experienced with this player)
  let episodicBlock = '';
  if (episodicMemories.length > 0) {
    const list = episodicMemories
      .map((m) => `- ${m.content}`)
      .join('\n');
    episodicBlock = `\nRECALLED PAST EVENTS WITH THIS PLAYER:\n${list}`;
  }

  // 3. Semantic Memories (Learned facts & universal lore)
  let semanticBlock = '';
  if (semanticMemories.length > 0) {
    const list = semanticMemories
      .map((m) => `- ${m.content}${m.isGlobal ? ' [Village Fact]' : ''}`)
      .join('\n');
    semanticBlock = `\nKNOWN FACTS & BELIEFS:\n${list}`;
  }

  // 4. Working Memory (Recent conversational turns)
  let workingBlock = '';
  if (workingMemory.length > 0) {
    const turns = workingMemory
      .map((t) => {
        const speaker = t.role === 'user' ? 'Player' : npcName;
        return `${speaker}: "${t.content}"`;
      })
      .join('\n');
    workingBlock = `\nRECENT CONVERSATION HISTORY (Most recent turns):\n${turns}`;
  }

  return `
${relationalBlock}
${episodicBlock}
${semanticBlock}
${workingBlock}
================================================
`.trim();
}
