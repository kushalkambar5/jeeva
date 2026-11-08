import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const instant = false;

export const metadata = {
  title: "Login | JEEVA Living RPG",
  description: "Sign in or register for Jeeva.",
};

async function LoginCheck() {
  const session = await getServerSession(authOptions);

  if (session && session.user) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-cream dark:bg-[#0F1712]">
      <Suspense
        fallback={
          <div className="text-center font-pixel text-forest dark:text-gold">
            Loading village chronicle...
          </div>
        }
      >
        <LoginCheck />
      </Suspense>
    </main>
  );
}
