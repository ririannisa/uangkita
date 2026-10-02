import type { Metadata, Viewport } from "next";
import "./globals.css";

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
            __html: `try { document.documentElement.dataset.theme = localStorage.getItem("uangkita-theme") === "dark" ? "dark" : "light"; } catch {}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
