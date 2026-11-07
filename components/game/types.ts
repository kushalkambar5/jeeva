export type InteriorType = 'player_home' | 'hospital' | 'shop' | 'workshop';

export interface ScheduleItem {
  time: string;
  activity: string;
  targetZone?: string;
  x?: number;
  y?: number;
  state?: 'idle' | 'walking' | 'working' | 'talking' | 'sleeping';
  description?: string;
}

export interface NPCWorldState {
  id: string;
  name: string;
  role: string;
  spriteKey: string;
  spriteSrc: string;
  homeZone: string;
  currentZone: string;
  x: number;
  y: number;
  activity: string;
  activityLabel: string;
  activityDescription: string;
  timeSlot: string;
  state: 'idle' | 'walking' | 'working' | 'talking' | 'sleeping';
  traits: string[];
  speakingStyle: string;
  bio: string;
  quote?: string;
  allowedActions: string[];
  defaultSchedule: ScheduleItem[];
}

export interface InteractionPoint {
  id: string;
  name: string;
  type: 'door' | 'exit_door' | 'inspect' | 'chest' | 'resource' | 'sign' | 'npc';
  x: number;
  y: number;
  radius: number;
  title: string;
  description: string;
  actionLabel?: string;
  opened?: boolean;
  targetInterior?: InteriorType;
  npcData?: NPCWorldState;
}

export interface LocationZone {
  name: string;
  zoneId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  description: string;
}

export interface GameStateEvent {
  playerX: number;
  playerY: number;
  currentZone: string;
  isMoving: boolean;
  isSprinting: boolean;
  activeInteraction: InteractionPoint | null;
  isInsideInterior?: boolean;
  interiorId?: InteriorType | null;
  gameTime?: string;
  gameTimeMinutes?: number;
  npcs?: NPCWorldState[];
  selectedNpc?: NPCWorldState | null;
}
