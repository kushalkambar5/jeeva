export type InteriorType = 'player_home' | 'hospital' | 'shop' | 'workshop';

export interface InteractionPoint {
  id: string;
  name: string;
  type: 'door' | 'exit_door' | 'inspect' | 'chest' | 'resource' | 'sign';
  x: number;
  y: number;
  radius: number;
  title: string;
  description: string;
  actionLabel?: string;
  opened?: boolean;
  targetInterior?: InteriorType;
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
}
