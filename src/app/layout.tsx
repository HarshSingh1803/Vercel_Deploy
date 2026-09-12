import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Outfit } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const ibm = IBM_Plex_Mono({
  variable: "--font-ibm",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "GET-RISE — Private Video Metadata Cleaner",
    template: "%s · GET-RISE",
  },
  description:
    "Rise above your metadata. GET-RISE inspects and cleans video metadata in your browser so files stay on your device.",
  keywords: [
    "video metadata cleaner",
    "strip GPS from video",
    "browser ffmpeg",
    "privacy",
    "GET-RISE",
  ],
  openGraph: {
    title: "GET-RISE — Rise Above Your Metadata",
    description:
      "Privacy-focused, browser-based video metadata cleaning. No default video uploads.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GET-RISE",
    description: "Private video metadata cleaning in your browser.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c10",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${fraunces.variable} ${ibm.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('get-rise-theme');var d=t?t==='dark':!matchMedia('(prefers-color-scheme:light)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}",
          }}
        />
        <AppProviders>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
