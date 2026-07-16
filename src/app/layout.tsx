import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavigationShell from "@/components/NavigationShell";
import { TournamentProvider } from "@/context/TournamentContext";

export const metadata: Metadata = {
  title: "Mora Slams - University of Moratuwa Carrom Championship",
  description: "Live scores, match schedules, brackets, registrations, and referee controls for the Mora Slams Carrom Tournament.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
 };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#060a13] text-[#f8fafc]">
        <TournamentProvider>
          <NavigationShell>
            {children}
          </NavigationShell>
        </TournamentProvider>
      </body>
    </html>
  );
}
