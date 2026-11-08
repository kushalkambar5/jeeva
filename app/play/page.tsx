import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import PlayClient from './PlayClient';

export const instant = false;

async function PlayContent() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login?callbackUrl=/play');
  }

  return <PlayClient user={session.user} />;
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen bg-[#0F1712] flex flex-col items-center justify-center text-[#F3F4F1] font-sans">
          <div className="relative mb-4">
            <div className="w-12 h-12 border-4 border-[#315B3C] border-t-[#F4D477] rounded-full animate-spin" />
          </div>
          <h2 className="font-pixel text-xl text-[#F4D477] mb-2">Authenticating Player...</h2>
          <p className="text-xs text-[#93C476] font-mono">Connecting to Kaveripura</p>
        </div>
      }
    >
      <PlayContent />
    </Suspense>
  );
}
