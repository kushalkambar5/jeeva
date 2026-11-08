/**
 * NPC World Location & Building Residence Manager
 * Controls whether NPCs (Priya, Dev, Arjun, Dr. Meera) are inside their respective buildings
 * or roaming/following the player outside in the village.
 */

export type NPCLocationId = 'village' | 'player_home' | 'shop' | 'workshop' | 'hospital';

export const RESIDENT_NPC_BUILDINGS: Record<string, NPCLocationId> = {
  priya_wife: 'player_home',
  dev_shopkeeper: 'shop',
  arjun_mechanic: 'workshop',
  meera_doctor: 'hospital',
};

export const STORAGE_NPC_LOCATIONS_KEY = 'jeeva_npc_locations_v2';

export function getNpcLocations(): Record<string, NPCLocationId> {
  if (typeof window === 'undefined') {
    return { ...RESIDENT_NPC_BUILDINGS };
  }
  try {
    let raw = localStorage.getItem(STORAGE_NPC_LOCATIONS_KEY);
    if (!raw) {
      const v1 = localStorage.getItem('jeeva_npc_locations_v1');
      if (v1) {
        try {
          const parsedV1 = JSON.parse(v1);
          const migrated: Record<string, NPCLocationId> = { ...RESIDENT_NPC_BUILDINGS, ...parsedV1 };
          if (!parsedV1.meera_doctor || parsedV1.meera_doctor === 'village') {
            migrated.meera_doctor = 'hospital';
          }
          localStorage.setItem(STORAGE_NPC_LOCATIONS_KEY, JSON.stringify(migrated));
          return migrated;
        } catch {
          // ignore parsing error and fallback
        }
      }
      return { ...RESIDENT_NPC_BUILDINGS };
    }
    const parsed = JSON.parse(raw);
    const result: Record<string, NPCLocationId> = { ...RESIDENT_NPC_BUILDINGS, ...parsed };
    if (!parsed.meera_doctor) {
      result.meera_doctor = 'hospital';
    }
    return result;
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
