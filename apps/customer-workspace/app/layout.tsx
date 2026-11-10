import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AD ASTRA — Discovery workspace preview",
  description:
    "A clearly labeled AD ASTRA workspace design preview with a sample conversation and read-only workflow.",
  robots: { index: false, follow: false, noarchive: true },
};
export const dynamic = "force-dynamic";
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
