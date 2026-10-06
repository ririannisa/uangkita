import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "UangKita — Keuangan lebih terarah",
  description:
    "Catat transaksi, pantau realisasi anggaran, dan bangun tabunganmu dalam satu tempat.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0864a5",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `const root = document.documentElement; let stored; try { stored = localStorage.getItem("uangkita-theme"); } catch {} const preference = ["auto","light","dark","neon"].includes(stored) ? stored : "auto"; const media = matchMedia("(prefers-color-scheme: dark)"); root.dataset.themePreference = preference; root.dataset.theme = preference === "auto" ? (media.matches ? "dark" : "light") : preference; media.addEventListener("change", () => { if (root.dataset.themePreference === "auto") root.dataset.theme = media.matches ? "dark" : "light"; });`,
          }}
        />
      </head>
      <body>{children}</body>
      <SpeedInsights />
      <Analytics />
    </html>
  );
}
