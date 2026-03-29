import type { Metadata } from "next";
import { Lexend, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import Providers from "./providers";
import GlobalFooter from "./GlobalFooter";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ ONLY GTM ID (NO GA ID ANYWHERE IN CODE)
const GTM_ID = "GTM-WZ3KGPZF";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Learn AI Product Management`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
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

      <body className={`${lexend.variable} ${geistMono.variable} antialiased`}>
        {/* ✅ Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <div className="flex min-h-screen flex-col overflow-x-hidden">
          <div className="flex-1">
            <Providers>{children}</Providers>
          </div>
          <GlobalFooter />
        </div>
      </body>
    </html>
  );
}
