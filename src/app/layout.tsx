import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai_Looped, Orbitron, Rubik } from "next/font/google";
import "./globals.css";
import SessionProvider from '@/components/SessionProvider';

const ibmPlexThaiLooped = IBM_Plex_Sans_Thai_Looped({
  variable: "--font-plex-thai-looped",
  subsets: ["latin", "thai"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "KKU EN Sport",
  description: "KKU Engineering Sports Alert System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexThaiLooped.variable} ${orbitron.variable} ${rubik.variable} antialiased`}
      >
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
