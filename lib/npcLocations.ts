/**
 * NPC World Location & Building Residence Manager
 * Controls whether NPCs (Priya, Dev, Arjun) are inside their respective buildings
 * or roaming/following the player outside in the village.
 */

export type NPCLocationId = 'village' | 'player_home' | 'shop' | 'workshop' | 'hospital';

export const RESIDENT_NPC_BUILDINGS: Record<string, NPCLocationId> = {
  priya_wife: 'player_home',
  dev_shopkeeper: 'shop',
  arjun_mechanic: 'workshop',
};

export const STORAGE_NPC_LOCATIONS_KEY = 'jeeva_npc_locations_v1';

export function getNpcLocations(): Record<string, NPCLocationId> {
  if (typeof window === 'undefined') {
    return { ...RESIDENT_NPC_BUILDINGS };
  }
  try {
    const raw = localStorage.getItem(STORAGE_NPC_LOCATIONS_KEY);
    if (!raw) return { ...RESIDENT_NPC_BUILDINGS };
    const parsed = JSON.parse(raw);
    return { ...RESIDENT_NPC_BUILDINGS, ...parsed };
  } catch {
    return { ...RESIDENT_NPC_BUILDINGS };
  }
}

export function getNpcLocation(npcId: string): NPCLocationId {
  const locs = getNpcLocations();
  return locs[npcId] || RESIDENT_NPC_BUILDINGS[npcId] || 'village';
}

export function setNpcLocation(npcId: string, location: NPCLocationId): void {
  if (typeof window === 'undefined') return;
  try {
    const locs = getNpcLocations();
    locs[npcId] = location;
    localStorage.setItem(STORAGE_NPC_LOCATIONS_KEY, JSON.stringify(locs));
    window.dispatchEvent(
      new CustomEvent('jeeva:npc-locations-updated', { detail: { npcId, location, locs } })
    );
  } catch (e) {
    console.warn('Error saving NPC location:', e);
  }
}

export function resetNpcLocation(npcId: string): void {
  const defaultLoc = RESIDENT_NPC_BUILDINGS[npcId] || 'village';
  setNpcLocation(npcId, defaultLoc);
}
