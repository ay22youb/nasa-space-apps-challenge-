import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Digital Twin City — Prototype",
  description: "Interactive map, simulations, heatmap, and AI dock.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
