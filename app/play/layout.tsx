import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Play Kaveripura | JEEVA RPG',
  description: 'Immersive playable RPG world for Kaveripura with living NPCs, voice dialogue, and cognitive memory.',
};

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
