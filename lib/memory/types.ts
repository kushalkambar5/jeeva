/**
 * NPC Cognitive Memory Types (Mem0 Architecture for Jeeva)
 */

export type MemoryType = 'working' | 'episodic' | 'relational' | 'semantic';

export type RelationshipTier =
  | 'stranger'
  | 'acquaintance'
  | 'trusted_friend'
  | 'respected_partner'
  | 'distrusted_opportunist'
  | 'hostile_outcast';

export interface NPCRelationshipState {
  trust: number; // -100 to 100
  affection: number; // -100 to 100
  respect: number; // -100 to 100
  fear: number; // 0 to 100
  familiarity: number; // 0 to 100
  relationshipTier: RelationshipTier;
  interactionCount: number;
}

export interface WorkingMemoryTurn {
  role: 'user' | 'assistant' | 'action';
  content: string;
  createdAt: Date;
}

export interface RetrievedMemoryItem {
  id: string;
  memoryType: 'episodic' | 'semantic';
  content: string;
  importance: number;
  emotionalValence: number;
  similarity: number;
  createdAt: Date;
  isGlobal: boolean;
}

export interface FullNPCMemoryContext {
  userId: string;
  npcId: string;
  relationship: NPCRelationshipState;
  workingMemory: WorkingMemoryTurn[];
  episodicMemories: RetrievedMemoryItem[];
  semanticMemories: RetrievedMemoryItem[];
}

export interface Mem0ExtractedOperation {
  action: 'ADD' | 'UPDATE' | 'DELETE' | 'NOOP';
  memoryType?: 'episodic' | 'semantic';
  content?: string;
  targetMemoryId?: string;
  importance?: number;
  emotionalValence?: number;
  category?: string;
}

export interface RelationshipDeltas {
  trust?: number;
  affection?: number;
  respect?: number;
  fear?: number;
  familiarity?: number;
}
