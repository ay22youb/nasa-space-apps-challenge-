import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Digital Twin City — Offline AI",
  description: "Local AI over sample GeoJSON. No API keys required.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
