import type { Metadata } from "next";
import { Almarai, Instrument_Serif } from "next/font/google";
import "./globals.css";

const almarai = Almarai({ weight: ["300", "400", "700", "800"], subsets: ["latin"], variable: "--font-almarai", display: "swap" });
const instrument = Instrument_Serif({ weight: "400", style: "italic", subsets: ["latin"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: "Movie Memory",
  description: "Save your favorite movie and read a new fact about it every minute.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${almarai.variable} ${instrument.variable}`}>
    <body className="min-h-dvh bg-screen font-sans text-ink antialiased">
      <a href="#main" className="skip-link">Skip to content</a>
      {children}
    </body>
  </html>;
}
