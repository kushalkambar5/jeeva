'use client';

import dynamic from 'next/dynamic';

const GameTestingCanvas = dynamic(
  () => import('@/components/game/GameTestingCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen bg-[#0F1712] flex flex-col items-center justify-center text-[#F3F4F1] font-sans">
        <div className="relative mb-4">
          <div className="w-12 h-12 border-4 border-[#315B3C] border-t-[#F4D477] rounded-full animate-spin" />
        </div>
        <h2 className="font-pixel text-xl text-[#F4D477] mb-2">Loading Kaveripura Village...</h2>
        <p className="text-xs text-[#93C476] font-mono">Initializing Phaser 3 Game World</p>
      </div>
    ),
  }
);

interface PlayClientProps {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export default function PlayClient({ user }: PlayClientProps) {
  return <GameTestingCanvas />;
}
