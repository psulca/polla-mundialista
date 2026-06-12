import type { Metadata } from "next";
import { Space_Grotesk, Anton, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/brand/bottom-nav";
import { TopBar } from "@/components/brand/top-bar";
import { getCurrentPlayer } from "@/lib/auth/current-player";

const sans = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const display = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polla Mundial 2026",
  description: "Predicciones del Mundial 2026 entre amigos. 3 pts al exacto, 1 al resultado.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const player = await getCurrentPlayer();
  return (
    <html
      lang="es"
      className={`dark ${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex h-dvh flex-col overflow-hidden">
        <TopBar name={player?.displayName} loggedIn={!!player} />
        <div className="relative z-0 min-h-0 flex-1">{children}</div>
        <BottomNav isAdmin={player?.isAdmin} />
      </body>
    </html>
  );
}
