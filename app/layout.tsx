import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ ONLY GTM ID (NO GA ID ANYWHERE IN CODE)
const GTM_ID = "GTM-WZ3KGPZF";

export const metadata: Metadata = {
  metadataBase: new URL("https://aipmworld.com"),
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
      <head>
        {/* ✅ Google Tag Manager (Head) */}
        <Script id="gtm-head" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `}
        </Script>
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* ✅ Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        {children}
      </body>
    </html>
  );
}
