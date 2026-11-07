export interface InteractionPoint {
  id: string;
  name: string;
  type: 'door' | 'inspect' | 'chest' | 'resource' | 'sign';
  x: number;
  y: number;
  radius: number;
  title: string;
  description: string;
  actionLabel?: string;
  opened?: boolean;
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
}
