import type { Metadata } from "next";
import { Pixelify_Sans, Nunito } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const pixelifySans = Pixelify_Sans({
  variable: "--font-pixelify-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "JEEVA | The Living AI Village RPG",
  description: "Step into an Indian village where NPCs have minds, memories, voices, and grounded autonomy. Speak in your tongue and watch your words physically shape the world.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${pixelifySans.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-cream text-darkbrown dark:bg-[#0F1712] dark:text-[#F3F4F1] transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
