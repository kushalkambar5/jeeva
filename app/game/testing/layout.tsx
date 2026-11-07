import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Village Map Testing | JEEVA RPG',
  description: 'Playable Phaser 3 test route for exploring the Kaveripura village map, buildings, and roaming character.',
};

export default function GameTestingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
