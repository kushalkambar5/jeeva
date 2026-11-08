import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import DashboardClient from "@/components/DashboardClient";

export const instant = false;

export const metadata = {
  title: "Dashboard | JEEVA Living RPG",
  description: "Player sanctuary and game launcher for Jeeva.",
};

async function DashboardContent() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return <DashboardClient user={session.user} />;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center font-pixel text-forest dark:text-gold">
          Entering village sanctuary...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
