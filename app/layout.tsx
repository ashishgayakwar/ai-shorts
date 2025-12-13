import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Shorts — Learn AI in minutes",
    template: "%s | AI Shorts",
  },
  description:
    "AI Shorts helps you learn AI concepts through beginner-friendly reader mode and interactive swipe, quiz, compare, and visualize experiences.",

  openGraph: {
    title: "AI Shorts — Learn AI in minutes",
    description:
      "Beginner basics + interactive swipe cards, quiz, compare, and visualize AI concepts.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "AI Shorts",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "AI Shorts — Learn AI in minutes",
    description:
      "Beginner basics + interactive swipe cards, quiz, compare, and visualize AI concepts.",
    images: ["/og.png"],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
