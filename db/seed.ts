import { db, sqlClient } from "./index";
import { npcDefinitions, initialNPCDefinitions, npcMemories } from "./schema";
import { generateEmbedding } from "../lib/memory/embeddings";
import { eq, and, isNull } from "drizzle-orm";

export const initialVillageLore = [
  {
    npcId: "meera_doctor",
    content: "The hospital backup generator was damaged in the storm and clinic medicine refrigeration needs power urgently.",
    importance: 9,
  },
  {
    npcId: "dev_shopkeeper",
    content: "Dev's general store stocks the only working copper induction coil remaining in the village.",
    importance: 8,
  },
  {
    npcId: "arjun_mechanic",
    content: "Arjun can repair village generators and mechanical pumps if supplied with the correct tools and copper coils.",
    importance: 8,
  },
  {
    npcId: "ramesh_elder",
    content: "A severe thunderstorm damaged Kaveripura's electrical grid and flooded the low-lying agricultural fields.",
    importance: 8,
  },
  {
    npcId: "vikram_police",
    content: "Village curfew is strictly enforced after dark to protect damaged homes and warehouses from opportunistic thieves.",
    importance: 7,
  },
  {
    npcId: "ravi_farmer",
    content: "The farm pump is idle without power, risking the remaining standing grain harvest in the lower fields.",
    importance: 7,
  },
];

/**
 * Seeds or updates NPC definitions and baseline semantic lore in the database.
 */
export async function seedNPCDefinitions() {
  console.log(`[Seed] Starting seed for ${initialNPCDefinitions.length} NPC definitions...`);

  for (const npc of initialNPCDefinitions) {
    await db
      .insert(npcDefinitions)
      .values(npc)
      .onConflictDoUpdate({
        target: npcDefinitions.id,
        set: {
          name: npc.name,
          role: npc.role,
          bio: npc.bio,
          personality_traits: npc.personality_traits,
          speaking_style: npc.speaking_style,
          system_prompt: npc.system_prompt,
          core_goals: npc.core_goals,
          fears: npc.fears,
          moral_values: npc.moral_values,
          voice_provider: npc.voice_provider,
          voice_id: npc.voice_id,
          default_language: npc.default_language,
          sprite_key: npc.sprite_key,
          allowed_actions: npc.allowed_actions,
          home_zone: npc.home_zone,
          default_schedule: npc.default_schedule,
          negotiation_profile: npc.negotiation_profile,
          starting_inventory: npc.starting_inventory,
        },
      });

    console.log(`[Seed] ✓ Upserted NPC: ${npc.name} (${npc.id}) - ${npc.role}`);
  }

  console.log(`[Seed] Seeding universal village semantic lore for NPCs...`);
  for (const lore of initialVillageLore) {
    // Check if this global lore already exists
    const [existing] = await db
      .select()
      .from(npcMemories)
      .where(
        and(
          eq(npcMemories.npcId, lore.npcId),
          isNull(npcMemories.userId),
          eq(npcMemories.content, lore.content)
        )
      )
      .limit(1);

    if (!existing) {
      const embedding = await generateEmbedding(lore.content);
      await db.insert(npcMemories).values({
        userId: null,
        npcId: lore.npcId,
        memoryType: "semantic",
        content: lore.content,
        embedding,
        importance: lore.importance,
        emotionalValence: 0,
        metadata: { is_global: true, seed: true },
      });
      console.log(`[Seed] ✓ Seeded global lore for '${lore.npcId}': "${lore.content}"`);
    }
  }

  console.log(`[Seed] All NPC definitions and semantic memories seeded successfully!`);
}

// Allow running directly via `npx tsx db/seed.ts`
if (require.main === module || process.argv[1]?.includes("seed")) {
  seedNPCDefinitions()
    .then(async () => {
      await sqlClient.end();
      process.exit(0);
    })
    .catch(async (error) => {
      console.warn(
        `[Seed] Notice: Could not connect to PostgreSQL instance (${error.message || error}).`
      );
      console.warn(
        `[Seed] Note: Make sure PostgreSQL is running with DATABASE_URL configured in .env.`
      );
      console.warn(
        `[Seed] The npcDefinitions schema and initialNPCDefinitions dataset are exported and ready in db/schema.ts.`
      );
      await sqlClient.end().catch(() => {});
      process.exit(0);
    });
}
