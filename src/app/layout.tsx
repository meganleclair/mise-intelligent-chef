import type { Metadata } from "next";
import { DM_Sans, Fredoka, Capriola, Geist_Mono } from "next/font/google";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["700"],
});

const capriola = Capriola({
  variable: "--font-capriola",
  subsets: ["latin"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mise — Cook with clarity",
  description:
    "Turn messy recipes into a calmer, step-by-step cooking experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fredoka.variable} ${capriola.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
