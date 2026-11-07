import { db, sqlClient } from "./index";
import { npcDefinitions, initialNPCDefinitions } from "./schema";

/**
 * Seeds or updates NPC definitions in the database.
 * Uses ON CONFLICT DO UPDATE on the primary key `id` so seeding is idempotent.
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
        },
      });

    console.log(`[Seed] ✓ Upserted NPC: ${npc.name} (${npc.id}) - ${npc.role}`);
  }

  console.log(`[Seed] All ${initialNPCDefinitions.length} NPC definitions seeded successfully!`);
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
