import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import { Analytics } from "@/components/analytics";
import "./globals.css";

// SF Pro is the face on Apple devices (system font); Inter Tight stands in elsewhere.
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.casdey.com"),
  title: "Casdey: glow up in 90 days",
  description: "A real plan for your body, skin and style. Checked every day. No fake scores. Join the waitlist for a free face and physique analysis.",
  openGraph: {
    title: "Casdey: glow up in 90 days",
    description: "A real plan for your body, skin and style. Checked every day. No fake scores.",
    url: "https://www.casdey.com",
    siteName: "Casdey",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={interTight.variable}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
